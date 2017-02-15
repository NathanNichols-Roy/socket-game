var express = require('express');
var socket = require('socket.io');
var Player = require('./player.js');

var app = express();

app.set('port', 8080);

var server = app.listen(app.get('port'), function() {
  console.log("Server listening on port: " + app.get('port'));
});

app.use(express.static('public'));

var io = socket(server);

var players = [];

// Update client 100 times a second
setInterval(heartbeat, 10);

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
      data.velX,
      data.velY,
      0);
    players.push(player);
  });

  socket.on('update', function(data) {
    var player;

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

  socket.on('disconnect', function(data) {
    for (var i = 0; i < players.length; i++) {
      if (socket.id === players[i].id) {
        players.splice(i, 1);
      }
    }

    console.log('user disconnected: ' + socket.id);
  });
});
