var express = require('express');
var socket = require('socket.io');
var Player = require('./player.js');
var Arena = require('./arena.js');

var app = express();

app.set('port', process.env.PORT || 8080);

var server = app.listen(app.get('port'), function() {
  console.log("Server listening on port: " + app.get('port'));
});

app.use(express.static('public'));

var io = socket(server);

var players = [];
var arena = new Arena(0, 0, 900, 900);

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

    // Signal client to start game
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

    // Control acceleration
    deltaVelX = data.velX - player.velX;
    deltaVelY = data.velY - player.velY;
    player.velX += deltaVelX * 0.1;
    player.velY += deltaVelY * 0.1;
    
    var speed = getMag(player.velX, player.velY);
    var speedLimit = 7;

    if (Math.abs(speed) > speedLimit) {
      var k = speedLimit / Math.abs(speed);
      player.velX *= k;
      player.velY *= k;
    }

    for (var i = 0; i < players.length; i++) {
      if (socket.id !== players[i].id) {
        if (overlap(player, players[i])) {
          resolveCollision(player, players[i]);
        }
      }
    }

    // Stop movement if dead
    if (arena.outOfBounds(player.x, player.y)) {
      return;
    }

    player.x += player.velX;
    player.y += player.velY;

    // Constrain players for testing
    if (player.x < 2) player.x = 2;
    if (player.x > 897) player.x = 897;
    if (player.y < 2) player.y = 2;
    if (player.y > 897) player.y = 897;
  });

  // Player hit retry button after death
  socket.on('restartClicked', function() {
    // Get sender player
    players.forEach(function(p, i) {
      if (socket.id === p.id) {
        player = p;
      }
    });

    // Place player somewhere near the center
    var randX = getRandomInt(arena.width/2 * 0.2, arena.width/2 * 1.2);
    var randY = getRandomInt(arena.height/2 * 0.2, arena.height/2 * 1.2);
    player.x = randX;
    player.y = randY;

    // Signal client to restart
    socket.emit('restartGame', player);
  });

  socket.on('disconnect', function() {
    for (var i = 0; i < players.length; i++) {
      if (socket.id === players[i].id) {
        players.splice(i, 1);
      }
    }

    io.sockets.emit('disconnected', socket.id);
    console.log('user disconnected: ' + socket.id);
  });
});

function getMag(x, y) {
  return Math.sqrt(x*x + y*y);
}

function getDist(obj1, obj2) {
  return Math.sqrt((obj1.x-obj2.x)*(obj1.x-obj2.x) + (obj1.y-obj2.y)*(obj1.y-obj2.y));
}

// Find midpoint between 2 overlapping circles
function getMidpoint(obj1, obj2) {
  var midpoint = {};
  midpoint.x = (obj1.x + obj2.x) / 2;
  midpoint.y = (obj1.y + obj2.y) / 2;
  return midpoint;
}

// Move circles away from eachother if overlapping
function resolveCollision(obj1, obj2) {
  var dist = getDist(obj1, obj2);
  var midpoint = getMidpoint(obj1, obj2);

  //obj1.x = midpoint.x + obj1.r * (obj1.x - obj2.x) / dist;
  //obj1.y = midpoint.y + obj1.r * (obj1.y - obj2.y) / dist;
  //obj2.x = midpoint.x + obj2.r * (obj2.x - obj1.x) / dist;
  //obj2.y = midpoint.y + obj2.r * (obj2.y - obj1.y) / dist;
  
  console.log(obj1.velX + " " + obj1.velY);
  var velocities = collisionVelocity(obj1, obj2);
  obj1.velX = velocities.vx1 * 2;
  obj1.velY = velocities.vy1 * 2;
  obj2.velX = velocities.vx2 * 2;
  obj2.velY = velocities.vy2 * 2;
  console.log(velocities);
}

function overlap(obj1, obj2) {
  // Check if bounding boxes overlap - not the circles themselves
  if (obj1.x + obj1.r + obj2.r > obj2.x
    && obj1.x < obj2.x + obj1.r + obj2.r
    && obj1.y + obj1.r + obj2.r > obj2.y
    && obj1.y < obj2.y + obj1.r + obj2.r)
  {
    var dist = getDist(obj1, obj2);

    return dist < obj1.r + obj2.r;
  }

  return false;
}

// Finds the closest point on a line (x1, y1, x2, y2)
// given a point (px, py)
function closestPointOnLine(x1, y1, x2, y2, px, py) {
  var A1 = y2 - y1;
  var B1 = x1 - x2;
  var C1 = (y2 - y1)*x1 + (x1 - x2)*y1;
  var C2 = -B1*px + A1*py;
  var determinant = A1*A1 - -B1*B1;

  var cx;
  var cy;
  var point = {};

  if (determinant !== 0) {
    cx = ((A1*C1 - B1*C2)/determinant);
    cy = ((A1*C2 - -B1*C1)/determinant);
  } else {
    cx = px;
    cy = py;
  }
  
  point.x = cx;
  point.y = cy;
  return point;
}

function getCollisionPoint(obj1, obj2) {
  var d = closestPointOnLine(
    obj1.x,
    obj1.y,
    obj1.x+obj1.velX,
    obj1.y+obj1.velY,
    obj2.x, obj2.y); 

  // Distance squared between circle 2 midpoint and closest point on 
  // circle 1 velocity vector
  var distSquared = Math.pow(obj2.x - d.x, 2) + Math.pow(obj2.y - d.y, 2);
  if (distSquared <= Math.pow(obj1.r + obj2.r, 2)) {
    // Collision
    var backDist = Math.sqrt(Math.pow(obj1.r + obj2.r, 2) - distSquared);
    var velMag = getMag(obj1.velX, obj1.velY);
    var colx = d.x - backDist * (obj1.velX / velMag);
    var coly = d.y - backDist * (obj1.velY / velMag);

    var collisionPoint = {x: colx, y: coly };
    return collisionPoint;
  } 
}

function collisionVelocity (obj1, obj2) {
  // need positions of both circles!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  var collisionPoint = getCollisionPoint(obj1, obj2);
  var dist = getDist(obj1, obj2);
  var normx = (obj2.x - obj1.x) / dist;
  var normy = (obj2.y - obj1.y) / dist;
  var pVal = 2 * (obj1.velX * normx + obj2.velY * normy - obj2.velX * normx - obj2.velY * normy) / 2;

  var vx1 = obj1.velX - pVal * normx;
  var vy1 = obj1.velY - pVal * normy;
  var vx2 = obj2.velX + pVal * normx;
  var vy2 = obj2.velY + pVal * normy;

  var velocities = {
    vx1: vx1,
    vy1: vy1,
    vx2: vx2,
    vy2: vy2
  };
  return velocities;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function newCollision(circle1, circle2) {
  var velMag = getMag(circle1.velX, circle1.velY);
  var dist = getDist(circle1, circle2);
  var sumRadii = circle1.r + circle2.r;
  dist -= sumRadii;

  // First collision check
  if (velMag < dist) {
    return false;
  }

  // Velocity normalized
  var velocity = {x: circle1.velX, y: circle1.velY};
  var nx = velocity.x / velMag;
  var ny = velocity.y / velMag;
  var veln = {x: nx , y: ny};

  // c = vector from center of circle1 to center of circle2
  var cx = circle2.x - circle1.x;
  var cy = circle2.y - circle1.y;
  var c = {x: cx, y:cy};

  // d = veln (dot) c
  var d = (veln.x * c.x) + (veln.y * c.y);

  // Check if circles are moving toward eachother
  if (d <= 0) {
    return false;
  }

  var cMag = getMag(c.x, c.y);
  
  // f = distance circle2 center from circle1 velocity vector
  var f = (cMag * cMag) - (d * d);

  if (f >= sumRadii * sumRadii) {
    return false;
  }

  var t = (sumRadii * sumRadii) - f;

  if (t < 0) {
    return false;
  }

  var distance = d - Math.sqrt(t);

  if (velMag < distance) {
    return false;
  }

  return true;
}

