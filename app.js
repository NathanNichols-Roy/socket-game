var express = require('express');
var socket = require('socket.io');
var Player = require('./player.js');

var app = express();

app.set('port', process.env.PORT || 8080);

var server = app.listen(app.get('port'), function() {
  console.log("Server listening on port: " + app.get('port'));
});

app.use(express.static('public'));

var io = socket(server);

var players = [];

// Send all player statuses to client ~60 times a second
setInterval(heartbeat, 16);

function heartbeat() {
  io.sockets.emit('heartbeat', players);
}

io.on('connection', function(socket) {
  console.log("New connection! ID: " + socket.id);

  socket.on('start', function(data) {
    var player = new Player(
      socket.id,
      data.name,
      data.x,
      data.y,
      data.r,
      0,
      0,
      0);
    players.push(player);

    // Signal to start game on client
    socket.emit('clientStart', players);
  });

  socket.on('update', function(data) {
    var player;

    // Get sender player
    players.forEach(function(p, i) {
      if (socket.id === p.id) {
        player = p;
      }
    });

    player.x = data.x;
    player.y = data.y;
    player.score = data.score;
    player.velX = data.velX;
    player.velY = data.velY;

    // Send data to clients excluding sender
    //socket.broadcast.emit('playerPositions', data);

    // Send data back to all clients including sender
    //io.sockets.emit('position', data);
    //console.log(data);
  });

  socket.on('inputData', function(data) {
    var player;

    // Get sender player
    players.forEach(function(p, i) {
      if (socket.id === p.id) {
        player = p;
      }
    });

    deltaVelX = data.velX - player.velX;
    deltaVelY = data.velY - player.velY;
    player.velX += deltaVelX;
    player.velY += deltaVelY;
    //player.velX = data.velX;
    //player.velY = data.velY;
    
    var speed = getSpeed(player.velX, player.velY);
    var speedLimit = 7;

    if (Math.abs(speed) > speedLimit) {
      var k = speedLimit / Math.abs(speed);
      player.velX *= k;
      player.velY *= k;
    }

    for (var i = 0; i < players.length; i++) {
      if (socket.id !== players[i].id) {
        if (overlap(
            player.x,
            player.y,
            player.r,
            players[i].x,
            players[i].y,
            players[i].r)) {
          console.log('overlap');
        }
      }
    }

    player.x += player.velX;
    player.y += player.velY;

    // Constrain players for testing
    if (player.x < 2) player.x = 2;
    if (player.x > 897) player.x = 897;
    if (player.y < 2) player.y = 2;
    if (player.y > 897) player.y = 897;
  });

  socket.on('disconnect', function(data) {
    for (var i = 0; i < players.length; i++) {
      if (socket.id === players[i].id) {
        players.splice(i, 1);
      }
    }

    io.sockets.emit('disconnected', socket.id);
    console.log('user disconnected: ' + socket.id);
  });
});

function getSpeed(velX, velY) {
  return Math.sqrt(velX*velX + velY*velY);
}

// Need to do after all players are updated
// update -> calculate collision
function overlap(x1, y1, r1, x2, y2, r2) {
  // Check if bounding boxes overlap - not the circles themselves
  if (x1 + r1 + r2 > x2
    && x1 < x2 + r1 + r2
    && y1 + r1 + r2 > y2
    && y1 < y2 + r1 + r2)
  {
    var dist = Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));

    if (dist < r1 + r2) {
      return true;
    } else {
      return false;
    }
  }

  return false;
}

function collisionPoint(x1, y1, r1, x2, y2, r2) {
  var point = {};

  point.x = ((x1 * r2) + (x2 * r1) / (r1 + r2));
  point.y = ((y1 * r2) + (y2 * r1) / (r1 + r2));

  return point;
}

function bounce(m1, vx1, vy1, m2, vx2, vy2) {
  var newVel = {};

  newVel.x1 = (vx1 * (m1 - m2) + (2 * m2 * vx2)) / (m1 + m2);
  newVel.y1 = (vy1 * (m1 - m2) + (2 * m2 * vy2)) / (m1 + m2);
  newVel.x2 = (vx2 * (m2 - m1) + (2 * m1 * vx1)) / (m2 + m1);
  newVel.y2 = (vy2 * (m2 - m1) + (2 * m1 * vy1)) / (m2 + m1);

  return newVel;
}

