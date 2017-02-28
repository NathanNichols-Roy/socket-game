var express = require('express');
var socket = require('socket.io');
var db = require('./db.js');
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
engine.world.gravity.y = 0;
engine.timing.delta = 1000 / 60;

// Server tick rate 60hz
setInterval(serverTick, engine.timing.delta);

function serverTick() {
  Matter.Engine.update(engine, engine.timing.delta);

  var connectedUsers = Object.keys(io.sockets.connected).length;
  if (connectedUsers >= 1) {
    io.sockets.emit('serverTick', players);
  }
}

// Game variables
var players = [];
var arena = new Arena(0, 0, 900, 900);

function createPlayerBody(socketId, name, x, y, r) {
  var options = { 
    friction: 0.5,
    frictionAir: 0.3,
    mass: 10,
    restitution: 1
  };
  var playerBody = Matter.Bodies.circle(x, y, r, options);

  // Custom properties
  playerBody.socketId = socketId;
  playerBody.name = name;
  playerBody.score = 0
  playerBody.rawScore = 0;
  playerBody.mousex = arena.width/2;
  playerBody.mousey = arena.height/2;
  playerBody.dashed = false;
  playerBody.dashCD = 1500;
  playerBody.forceToBeApplied = Matter.Vector.create(0, 0);
  playerBody.velocityToBeApplied = Matter.Vector.create(0, 0);
  return playerBody;
}

//-----------------
// EVENTS
//-----------------

Matter.Events.on(engine, 'beforeUpdate', function(event) {
  var allBodies = engine.world.bodies;

  // Apply forces to all bodies
  for (var i = 0; i < allBodies.length; i++) {
    for (var j = 0; j < players.length; j++) {
      if (players[j].socketId === allBodies[i].socketId) {
        var force = Matter.Vector.create(allBodies[i].mousex, allBodies[i].mousey);
        force = Matter.Vector.div(force, 2000);
        force = limitVectorMagnitude(force, 0.1);
        force = Matter.Vector.add(force, allBodies[i].forceToBeApplied);

        // Apply force to player from center of body to mouse position
        Matter.Body.applyForce(allBodies[i], allBodies[i].position, force);

        // Reset dashing force. Body force gets reset every update
        allBodies[i].forceToBeApplied = Matter.Vector.create(0, 0);

        updateScore(allBodies[i]);

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
          Matter.Body.setStatic(allBodies[i], true);

          playerData = getPlayerDataById(allBodies[i].socketId);
          playerData.update(allBodies[i]);
          
          addHighScore(playerData);

          if (io.sockets.connected[playerData.socketId]) {
            db.getHighScores(function(scores) {
              io.sockets.connected[playerData.socketId].emit('scores', scores);
            });
          }
        }

        // Fall off the map
        Matter.Body.scale(allBodies[i], .9, .9);
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
  });

  // Mouse data sent from client
  socket.on('mousePos', function(data) {
    var playerBody = getPlayerBodyById(socket.id);
    playerBody.mousex = data.mousex;
    playerBody.mousey = data.mousey;
  });

  // Dashing
  socket.on('mouseClicked', function(data) {
    var playerBody = getPlayerBodyById(socket.id);

    if (!playerBody.dashed) {
      // Apply burst of force in dir of mouse
      var force = Matter.Vector.create(data.mousex, data.mousey);
      force = Matter.Vector.normalise(force);
      playerBody.forceToBeApplied = force;

      playerBody.dashed = true;
      setTimeout(resetDashCD, playerBody.dashCD, playerBody);
    }
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
  });

  socket.on('disconnect', function() {
    var playerBody = getPlayerBodyById(socket.id);

    // Remove player and data objects if they exist
    if (playerBody) {
      removePlayerData(socket.id);
      removePlayerBody(playerBody);
    }

    io.sockets.emit('disconnected', socket.id);
    console.log('user disconnected: ' + socket.id);
  });
});

//-----------------
// HELPER FUNCTIONS
//-----------------

function resetDashCD(playerBody) {
  playerBody.dashed = false;
}

function removePlayerBody(playerBody) {
  Matter.Composite.remove(engine.world, playerBody);
}

function removePlayerData(socketId) {
  for (var i = 0; i < players.length; i++) {
    if (socketId === players[i].socketId) {
      players.splice(i, 1);
    }
  }
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

function updateScore(playerBody) {
  // Add score if alive
  if (!playerBody.isStatic) {
    playerBody.rawScore++;
    playerBody.score = Math.floor(playerBody.rawScore / 60);
  }
}

// Limits a vectors magnitude to a given maximum
function limitVectorMagnitude(vector, max) {
  var mag = Matter.Vector.magnitude(vector);
  if (mag > max) {
    var ratio = max / mag;
    vector = Matter.Vector.mult(vector, ratio);
  }

  return vector;
}

// Only add if in top 5 highest scores this week
function addHighScore(playerData) {
  db.getHighScores(function(scores) {
    if (playerData.score > scores[scores.length - 1].score) {
      db.addScore(playerData);
    }
  });
}

