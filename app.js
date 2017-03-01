var express = require('express');
var socket = require('socket.io');
var db = require('./db.js');
var PlayerData = require('./player.js');
var ObstacleData = require('./obstacleData.js');
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

// Game variables
var arena = new Arena(0, 0, 900, 900);
var bodies = {};
var players = [];
var obstacles = [];
var playersGroup = Matter.Composite.create();
var obstaclesGroup = Matter.Composite.create();
// Define collision categories
var playerCategory = 0x0001,
    obstacleCategory = 0x0002,
    staticCategory = 0x0003;

createStaticObstacles(0);
createObstacles(10);

function createStaticObstacles() {
  var obstacle;
  var obstacleData;
  var radius = 40;
  var options = {
    collisionFilter: {
      category: staticCategory
    },
    friction: 0,
    frictionAir: 0,
    mass: 1000,
    restitution: 0,
    isStatic: true
  };

  for (var i = arena.width/4; i < arena.width; i += arena.width/4) {
    for (var j = arena.height/4; j < arena.height; j += arena.height/4) {
      if (i !== arena.width/2 && j !== arena.height/2) {
        obstacle = createObstacleBody(i, j, radius, options);
        obstacleData = createObstacleData(obstacle);
        obstacleData.color = '#1B5E20';
      }
    }
  }
}

function createObstacles(num) {
  var obstacle;
  var obstacleData;
  var randx;
  var randy;
  var angle;
  var radius = 25;
  var options = {
    // only collide with players
    collisionFilter: {
      category: obstacleCategory,
      mask: playerCategory
    },
    friction: 0,
    frictionAir: 0,
    mass: 100,
    restitution: 1
  };

  for (var i = 0; i < num; i++) {
    randx = Matter.Common.random(0, arena.width);
    randy = Matter.Common.random(0, arena.height);
    obstacle = createObstacleBody(randx, randy, radius, options);
    obstacleData = createObstacleData(obstacle);

    angle = Matter.Common.random(0, 1) * (2 * Math.PI);
    var force = {
      x: Math.cos(angle),
      y: Math.sin(angle)
    };

    obstacle.forceToBeApplied = force;
  }
}

function createPlayerBody(socketId, name, x, y, r) {
  var options = { 
    collisionFilter: {
      category: playerCategory
    },
    friction: 0,
    frictionAir: 0.2,
    mass: 10,
    restitution: 1
  };
  var playerBody = Matter.Bodies.circle(x, y, r, options);

  // Custom properties
  playerBody.socketId = socketId;
  playerBody.name = name;
  playerBody.score = 0
  playerBody.rawScore = 0;
  playerBody.input = {
    w: false,
    a: false,
    s: false,
    d: false
  };
  playerBody.shooting = false;
  playerBody.shootCD = 400;
  playerBody.forceToBeApplied = Matter.Vector.create(0, 0);
  playerBody.velocityToBeApplied = Matter.Vector.create(0, 0);

  Matter.Composite.add(playersGroup, playerBody);
  Matter.World.addBody(engine.world, playerBody);
  return playerBody;
}

function createObstacleBody(x, y, r, options) {
  var obstacleBody = Matter.Bodies.circle(x, y, r, options);

  //Custom properties
  obstacleBody.forceToBeApplied = Matter.Vector.create(0, 0);

  Matter.Composite.add(obstaclesGroup, obstacleBody);
  Matter.World.addBody(engine.world, obstacleBody);
  return obstacleBody;
}

function createObstacleData(body) {
  var obstacleData = new ObstacleData(body.id, body.position.x, body.position.y, body.circleRadius);
  obstacles.push(obstacleData);
  return obstacleData;
}

// Server tick rate 60hz
setInterval(serverTick, engine.timing.delta);

function serverTick() {
  Matter.Engine.update(engine, engine.timing.delta);

  bodies.players = players;
  bodies.obstacles = obstacles;

  var connectedUsers = Object.keys(io.sockets.connected).length;
  if (connectedUsers >= 1) {
    io.sockets.emit('serverTick', bodies);
  }
}

//-----------------
// EVENTS
//-----------------

Matter.Events.on(engine, 'beforeUpdate', function(event) {
  var allBodies = engine.world.bodies;
  var playerBodies = playersGroup.bodies;
  var obstacleBodies = obstaclesGroup.bodies;

  // Apply forces to player bodies
  for (var i = 0; i < playerBodies.length; i++) {
    for (var j = 0; j < players.length; j++) {
      if (players[j].socketId === playerBodies[i].socketId) {
        doMovement(playerBodies[i]);

        // Reset shooting force. Body force gets reset every update
        playerBodies[i].forceToBeApplied = Matter.Vector.create(0, 0);

        updateScore(playerBodies[i]);

        players[j].update(playerBodies[i]);
      }
    }
  }

  // Apply force to obstacle bodies
  for (var i = 0; i < obstacleBodies.length; i++) {
    for (var j = 0; j < obstacles.length; j++) {
      if (obstacles[j].id === obstacleBodies[i].id) {
        Matter.Body.applyForce(obstacleBodies[i], obstacleBodies[i].position, obstacleBodies[i].forceToBeApplied);
        obstacleBodies[i].forceToBeApplied = Matter.Vector.create(0, 0);

        bounceOffBoundaries(obstacleBodies[i]);

        obstacles[j].update(obstacleBodies[i]);
      }
    }
  }
});

Matter.Events.on(engine, 'afterUpdate', function(event) {
  var allBodies = engine.world.bodies;
  var playerBodies = playersGroup.bodies;
  var obstacleBodies = obstaclesGroup.bodies;
  var playerData;

    for (var i = 0; i < playerBodies.length; i++) {
      // Died. Make static, scale to 0
      if (arena.outOfBounds(playerBodies[i].position.x, playerBodies[i].position.y)) {
        if (!playerBodies[i].isStatic) {
          Matter.Body.setStatic(playerBodies[i], true);

          playerData = getPlayerDataById(playerBodies[i].socketId);
          playerData.update(playerBodies[i]);
          
          addHighScore(playerData);

          if (io.sockets.connected[playerData.socketId]) {
            db.getHighScores(function(scores) {
              io.sockets.connected[playerData.socketId].emit('scores', scores);
            });
          }
        }

        // Fall off the map
        Matter.Body.scale(playerBodies[i], .9, .9);
      }
    }
});

Matter.Events.on(engine, 'collisionStart', function(event) {
  var pairs = event.pairs;
  var force;

  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i];

    // Player/Player collision
    if (pair.bodyA.collisionFilter.category === playerCategory &&
        pair.bodyB.collisionFilter.category === playerCategory) {
    } else {
      // Player/Obstacle collision
      // Increase the impact of the collision
      if (pair.bodyA.collisionFilter.category === playerCategory) {
        force = Matter.Vector.sub(pair.bodyA.position, pair.bodyB.position);
        force = Matter.Vector.normalise(force);
        pair.bodyA.forceToBeApplied = force;
      } else {
        force = Matter.Vector.sub(pair.bodyB.position, pair.bodyA.position);
        force = Matter.Vector.normalise(force);
        pair.bodyB.forceToBeApplied = force;
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

    players.push(playerData);

    // Signal client to start game
    socket.emit('clientStart', players);
  });

  // Keyboard input from client
  socket.on('keyboardInput', function(input) {
    var playerBody = getPlayerBodyById(socket.id);
    playerBody.input = input;
  });

  // shooting
  socket.on('mouseClicked', function(data) {
    var playerBody = getPlayerBodyById(socket.id);

    if (!playerBody.shooting) {
      var options = {
        // only collide with players
        collisionFilter: {
          category: obstacleCategory,
          mask: playerCategory
        },
        friction: 0,
        frictionAir: 0,
        mass: 100,
        restitution: 1
      };
      // Shoot force in dir of mouse
      var shotPosition = Matter.Vector.create(data.mousex, data.mousey);
      // Magnitude = rad * 2
      shotPosition = limitVectorMagnitude(shotPosition, 2*playerBody.circleRadius);
      shotPosition = Matter.Vector.add(playerBody.position, shotPosition);
      
      var shot = createObstacleBody(shotPosition.x, shotPosition.y, playerBody.circleRadius, options);
      createObstacleData(shot);

      var force = Matter.Vector.create(data.mousex, data.mousey);
      force = Matter.Vector.normalise(force);
      force = Matter.Vector.mult(force, 5);

      shot.forceToBeApplied = force;

      playerBody.shooting = true;
      setTimeout(resetShootCD, playerBody.shootCD, playerBody);
      setTimeout(removeObstacleBody, 400, shot);
    }
  });

  // Player hit retry button after death
  socket.on('restartClicked', function() {
    var playerBody = getPlayerBodyById(socket.id);
    var playerData = getPlayerDataById(socket.id);

    // Remove player
    removePlayerBody(playerBody);

    // Reset player
    var randx = Matter.Common.random(arena.width/2*0.2, arena.width/2*1.2);
    var randy = Matter.Common.random(arena.height/2*0.2, arena.height/2*1.2);
    var newPlayerBody = createPlayerBody(socket.id, playerData.name, randx, randy, 20);

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

function resetShootCD(playerBody) {
  playerBody.shooting = false;
}

function removePlayerBody(body) {
  Matter.Composite.remove(playersGroup, body);
  Matter.Composite.remove(engine.world, body);
}

function removePlayerData(socketId) {
  for (var i = 0; i < players.length; i++) {
    if (socketId === players[i].socketId) {
      players.splice(i, 1);
    }
  }
}

function removeObstacleBody(body) {
  Matter.Composite.remove(obstaclesGroup, body);
  Matter.Composite.remove(engine.world, body);

  removeObstacleData(body.id);
}

function removeObstacleData(id) {
  for (var i = 0; i < obstacles.length; i++) {
    if (id === obstacles[i].id) {
      obstacles.splice(i, 1);
    }
  }
}

// Returns playerData object
function getPlayerBodyById(socketId) {
  var playerBodies = playersGroup.bodies;
  var playerBody;

  playerBodies.forEach(function(p) {
    if (socketId === p.socketId) {
      playerBody = p;
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

function bounceOffBoundaries(body) {
  var newVel;

  if (body.position.x < arena.x1 || body.position.x > arena.width) {
    newVel = Matter.Vector.create(-body.velocity.x, body.velocity.y);
    Matter.Body.setVelocity(body, newVel);
  }
  if (body.position.y < arena.y1 || body.position.y > arena.height) {
    newVel = Matter.Vector.create(body.velocity.x, -body.velocity.y);
    Matter.Body.setVelocity(body, newVel);
  }
}

function doMovement(body) {
  var force = Matter.Vector.create(0, 0);
  var fmag = .05;

  if (body.input.w) {
    var upForce = Matter.Vector.create(0, -fmag);
    force = Matter.Vector.add(force, upForce);
  }
  if (body.input.a) {
    var leftForce = Matter.Vector.create(-fmag, 0);
    force = Matter.Vector.add(force, leftForce);
  }
  if (body.input.s) {
    var downForce = Matter.Vector.create(0, fmag);
    force = Matter.Vector.add(force, downForce);
  }
  if (body.input.d) {
    var rightForce = Matter.Vector.create(fmag, 0);
    force = Matter.Vector.add(force, rightForce);
  }

  // limit mag if 2 buttons pressed
  force = limitVectorMagnitude(force, fmag);

  // Add movement force to forces that were going to be applied
  force = Matter.Vector.add(force, body.forceToBeApplied);

  // Apply force to player from center of body 
  Matter.Body.applyForce(body, body.position, force);
}

