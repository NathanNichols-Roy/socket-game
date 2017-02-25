var express = require('express');
var socket = require('socket.io');
var PlayerData = require('./player.js');
var Arena = require('./arena.js');
var Matter = require('matter-js');

var app = express();
app.set('port', process.env.PORT || 8080);

var server = app.listen(app.get('port'), function() {
  console.log("Server listening on port: " + app.get('port'));
});

app.use(express.static('public'));

// Init socket.io
var io = socket(server);

// Matter.js engine and world creation
var engine = Matter.Engine.create();
// Set y gravity to zero becuase it defaults as 1
engine.world.gravity.y = 0;

// Send all player statuses to client ~60 times a second
setInterval(serverTick, 16);

function serverTick() {
  //Matter.Events.trigger(engine, 'tick', {timestamp: engine.timing.timestamp});
  Matter.Engine.update(engine, engine.timing.delta);
  //Matter.Events.trigger(engine, 'afterTick', {timestamp: engine.timing.timestamp});

  io.sockets.emit('serverTick', players);
}

// Game variables
var players = [];
var arena = new Arena(0, 0, 900, 900);

//---------------
// Events
//---------------

Matter.Events.on(engine, 'beforeUpdate', function(event) {
  var allBodies = engine.world.bodies;

  // Apply forces to all bodies
  for (var i = 0; i < allBodies.length; i++) {
    for (var j = 0; j < players.length; j++) {
      if (players[j].socketId === allBodies[i].socketId) {
        Matter.Body.applyForce(allBodies[i], allBodies[i].position, allBodies[i].forceToBeApplied);
        players[j].update(allBodies[i]);
      }
    }
  }
});

// Socket.io events
io.on('connection', function(socket) {
  console.log("New connection! ID: " + socket.id);

  socket.on('start', function(data) {
    var options = { 
      mass: 10,
      restitution: 1
    };
    var playerBody = createPlayerBody(socket.id, data.name, data.x, data.y, data.r, options);

    // Create obj to store player data. This gets sent to client to render
    var playerData = new PlayerData(
      playerBody.socketId,
      playerBody.name,
      playerBody.position.x,
      playerBody.position.y, 
      playerBody.circleRadius,
      playerBody.score);

    Matter.World.addBody(engine.world, playerBody);
    players.push(playerData);
    console.log(engine.world.bodies);

    // Signal client to start game
    socket.emit('clientStart', players);
    console.log(socket.id + " Game started!");
  });

  socket.on('inputData', function(data) {
    var allBodies = engine.world.bodies;
    var playerBody;
    var playerData;

    // Get sender body
    allBodies.forEach(function(b, i) {
      if (socket.id === b.socketId) {
        playerBody = b;
      }
    });

    // Get sender playerData
    players.forEach(function(p, i) {
      if (socket.id === p.socketId) {
        playerData = p;
      }
    });
 
    playerBody.score++;

    // Apply force to player from center of body to mouse position.
    // Think of force like acceleration
    // fix so that player can stop moving
    var force = {
      x: data.mousex / 10000,
      y: data.mousey / 10000
    };

    // Died. Make static, scale to 0
    if (arena.outOfBounds(playerBody.position.x, playerBody.position.y)) {
      if (!playerBody.isStatic) {
        Matter.Body.scale(playerBody, 0.1, 0.1);
        Matter.Body.setStatic(playerBody, true);
        playerBody.score = 0;

        playerData.update(playerBody);
      }
    }

    playerBody.forceToBeApplied = force;

    // Limit force
    //var forceMag = Matter.Vector.magnitude(force);
    //var forceLimit = .005;
    //if (forceMag > forceLimit) {
    //  var k = forceLimit / forceMag;
    //  force.x *= k;
    //  force.y *= k;
    //}
    // Limit velocity 
    //var speedMag = Matter.Vector.magnitude(playerBody.velocity);
    //var speedLimit = 6;
    //if (speedMag > speedLimit) {
    //  var j = speedLimit / speedMag;
    //  var velocityNew = Matter.Vector.mult(playerBody.velocity, j);
    //  Matter.Body.setVelocity(playerBody, velocityNew);
    //}

    //TESTING
    //var force = {
    //  x: .001,
    //  y: 0
    //};
    //if (playerBody.score % 500 >= 250) {
    //  force.x = -.001;
    //}
    //if (playerBody.position.x < 2)   force.x = 0;
    //if (playerBody.position.x > 897) force.x = 0;
    //if (playerBody.position.y < 2)   force.y = 0;
    //if (playerBody.position.y > 897) force.y = 0;

    // Update playerData that gets sent back to clients
    //playerData.update(playerBody);

  });

  // Player hit retry button after death
  socket.on('restartClicked', function() {
    var allBodies = engine.world.bodies;
    var playerData;
    var playerBody;

    // Get sender body
    allBodies.forEach(function(b, i) {
      if (socket.id === b.socketId) {
        playerBody = b;
      }
    });

    // Get sender playerdata
    players.forEach(function(p, i) {
      if (socket.id === p.socketId) {
        playerData = p;
      }
    });

    // Reset player
    Matter.Body.setStatic(playerBody, false);
    Matter.Body.scale(playerBody, 10, 10);
    Matter.Body.setVelocity(playerBody, {x: 0, y:0});
    var randx = Matter.Common.random(arena.width/2*0.2, arena.width/2*1.2);
    var randy = Matter.Common.random(arena.height/2*0.2, arena.height/2*1.2);
    playerBody.forceToBeApplied = {x: 0, y:0};
    playerBody.position.x = randx;
    playerBody.position.y = randy;

    playerData.update(playerBody);

    // Signal client to restart
    socket.emit('restartGame', playerData);
    console.log(playerBody);
  });

  socket.on('disconnect', function() {
    for (var i = 0; i < players.length; i++) {
      if (socket.id === players[i].socketId) {
        players.splice(i, 1);
      }
    }

    io.sockets.emit('disconnected', socket.id);
    console.log('user disconnected: ' + socket.id);
  });
});

function createPlayerBody(socketId, name, x, y, r, options) {
    var playerBody = Matter.Bodies.circle(x, y, r, options);

    // Custom properties
    playerBody.socketId = socketId;
    playerBody.name = name;
    playerBody.score = 0;
    playerBody.forceToBeApplied = Matter.Vector.create(0, 0);
    return playerBody;
}

