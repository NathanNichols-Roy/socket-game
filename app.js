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

Matter.Events.on(engine, 'afterUpdate', function(event) {
  var allBodies = engine.world.bodies;
  var playerData;

    for (var i = 0; i < allBodies.length; i++) {
      // Died. Make static, scale to 0
      if (arena.outOfBounds(allBodies[i].position.x, allBodies[i].position.y)) {
        if (!allBodies[i].isStatic) {
          Matter.Body.scale(allBodies[i], 0, 0);
          Matter.Body.setStatic(allBodies[i], true);
          allBodies[i].score = 0;

          playerData = getPlayerDataById(allBodies[i].socketId);
          console.log(playerData);
          playerData.update(allBodies[i]);
        }
      }
    }
});

// Socket.io events
io.on('connection', function(socket) {
  console.log("New connection! ID: " + socket.id);

  socket.on('start', function(data) {
    var playerBody = createPlayerBody(socket.id, data.name, data.x, data.y, data.r);

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

    // Signal client to start game
    socket.emit('clientStart', players);
    console.log(socket.id + " Game started!");
  });

  socket.on('inputData', function(data) {
    var allBodies = engine.world.bodies;
    var playerBody = getPlayerBodyById(socket.id);
    var playerData = getPlayerDataById(socket.id);
 
    playerBody.score++;

    // Apply force to player from center of body to mouse position.
    // Think of force like acceleration
    // fix so that player can stop moving
    var force = {
      x: data.mousex / 10000,
      y: data.mousey / 10000
    };

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
  });

  // Player hit retry button after death
  socket.on('restartClicked', function() {
    var playerBody = getPlayerBodyById(socket.id);
    var playerData = getPlayerDataById(socket.id);

    // Reset player
    var randx = Matter.Common.random(arena.width/2*0.2, arena.width/2*1.2);
    var randy = Matter.Common.random(arena.height/2*0.2, arena.height/2*1.2);
    var newPlayerBody = createPlayerBody(socket.id, playerData.name, randx, randy, 20);

    // Remove player
    removePlayerBody(playerBody);
    // Add player
    Matter.World.addBody(engine.world, newPlayerBody);
    playerData.update(newPlayerBody);

    // Signal client to restart
    socket.emit('restartGame', playerData);
    console.log(newPlayerBody);
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

function createPlayerBody(socketId, name, x, y, r) {
  var options = { 
    mass: 10,
    restitution: 1
  };
  var playerBody = Matter.Bodies.circle(x, y, r, options);

  // Custom properties
  playerBody.socketId = socketId;
  playerBody.name = name;
  playerBody.score = 0;
  playerBody.forceToBeApplied = Matter.Vector.create(0, 0);
  return playerBody;
}

function removePlayerBody(playerBody) {
  Matter.Composite.remove(engine.world, playerBody);
}

// Returns playerData object
function getPlayerBodyById(socketId) {
  var allBodies = engine.world.bodies;
  var playerBody;

  allBodies.forEach(function(b) {
    if (socketId === b.socketId) {
      playerBody = b;
    }
  });

  return playerBody;
}

// Returns playerData object
function getPlayerDataById(socketId) {
  var playerData;

  players.forEach(function(p) {
    if (socketId === p.socketId) {
      playerData = p;
    }
  });

  return playerData;
}

