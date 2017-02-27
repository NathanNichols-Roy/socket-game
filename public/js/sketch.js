var socket;

var player;
var players = [];
var otherPlayerSprites;
var spriteIds = {};
var arena;
var arenaSize = 900;
var score = 0;
var scoreInterval;
var gameStarted = 0;

var playerX;
var playerY;

function setup() {
  // Open client connection
  socket = io.connect('http://localhost:8080');
  socket.on('clientStart', startGame);
  socket.on('serverTick', getServerData);
  socket.on('disconnected', playerDisconnected);
  socket.on('restartGame', restartGame);

  createCanvas(600, 600);

  var nameEntry = createInput();
  nameEntry.id('name-entry');
  nameEntry.class('menu');
  nameEntry.attribute('maxlength', '10');
  nameEntry.attribute('placeholder', 'Enter your name');
  nameEntry.position(width/2 - 100, height/2 - 25);
  nameEntry.size(200, 50);

  var submitBtn = createButton('Play');
  submitBtn.class('menu');
  submitBtn.position(width/2 - 50, height/2 + 50);
  submitBtn.size(100, 50);
  submitBtn.mousePressed(setupEnvironment);
}

function getServerData(data) {
  players = data;
}

function setupEnvironment() {
  var name = document.getElementById('name-entry').value;
  if (!name) return;

  // Create arena
  arena = new Arena(0, 0, arenaSize, arenaSize);

  // Create instance of the player
  var randX = random(arena.width/2 * 0.2, arena.width/2 * 1.2);
  var randY = random(arena.height/2 * 0.2, arena.height/2 * 1.2);
  player = new Player(name, randX, randY, 20);

  var data = player.getData();
  socket.emit('start', data);

  menuItems = selectAll('.menu');
  menuItems.forEach(function(item) {
    item.hide()
  });
}

function startGame(data) {
  // Get player data from server
  players = data; 

  gameStarted = 1;

  // Start score
  scoreInterval = setInterval(function() { score++ }, 1000);

  // Set server update interval
  //setInterval(sendServerUpdate, 5);

  otherPlayerSprites = new Group();
}

function draw() {
  background(0);

  if (gameStarted) {
    var playerX = player.sprite.position.x;
    var playerY = player.sprite.position.y;
    
    // Center camera on player
    translate(width/2 - playerX, height/2 - playerY);

    arena.show();
    
    sendServerUpdate();

    var serverPlayer = getSelfFromServer();
    player.update(serverPlayer);
      
    if (arena.outOfBounds(player.sprite.position.x, player.sprite.position.y)) {
      player.dead = true;
      clearInterval(scoreInterval);

      if (player.gameOver) {
        showGameOver();
      }
    }

    drawScore();
    drawOtherPlayers();
    drawSprites();
  }
}

function sendServerUpdate() {
  var data = player.getInputData();
  socket.emit('inputData', data);
}

function getSelfFromServer() {
  for (var i = 0; i < players.length; i++) {
    if (players[i].socketId === socket.id) {
      return players[i];
    }
  }
}

function drawOtherPlayers() {
  players.forEach(function(p, i) {
    if (p.socketId !== socket.id) {
      if (!spriteIds.hasOwnProperty(p.socketId)) {
        var playerSprite = createSprite(p.x, p.y, p.r, p.r);
        spriteIds[p.socketId] = playerSprite;
        playerSprite.setCollider('circle', 0, 0, p.r);
        playerSprite.scale = 1;
        playerSprite.mass = 1;
        playerSprite.draw = function() {
          fill(255, 0, 0);
          ellipse(0, 0, 40, 40);
        }
        otherPlayerSprites.add(playerSprite);
      }
    
    // Update other player sprite positions
    spriteIds[p.socketId].position.x = p.x;
    spriteIds[p.socketId].position.y = p.y;

    fill(255);
    noStroke();
    textAlign(CENTER);
    textSize(14);
    text(p.name, spriteIds[p.socketId].position.x, spriteIds[p.socketId].position.y + 35);
    }
  });
}

function playerDisconnected(id) {
  // Remove sprite from the canvas
  spriteIds[id].remove();
}

function drawScore() {
  fill(255);
  stroke(0);
  strokeWeight(4);
  textSize(50);
  text(score, player.sprite.position.x, player.sprite.position.y - height*0.3);
}

function showGameOver() {
  fill(255);
  stroke(0);
  strokeWeight(4);
  textAlign(CENTER);
  textSize(90);
  text('You Died', player.sprite.position.x, player.sprite.position.y - 50);

  var restartBtn = select('#restartBtn');
  if (restartBtn) {
    restartBtn.show();
  } else {
    restartBtn = createButton('Try again');
    restartBtn.id('restartBtn');
    restartBtn.position(width/2 - 50, height/2 + 70);
    restartBtn.size(100, 50);
    restartBtn.mousePressed(restartClicked);
  }
}

function restartClicked() {
  socket.emit('restartClicked');
}

// Called after server sends signal
function restartGame(data) {
  var restartBtn = select('#restartBtn');
  restartBtn.hide();

  for (var i = 0; i < players.length; i++) {
    if (players[i].socketId === socket.id) {
      players[i] = data;
    }
  }

  player.sprite.position.x = data.x;
  player.sprite.position.y = data.y;
  player.dead = false;
  player.gameOver = false;
  player.sprite.scale = 1;

  score = 0;
  scoreInterval = setInterval(function() { score++ }, 1000);
}

function mouseClicked() {
  if (gameStarted) {
    // Mouse position relative to center
    var mousePos = {
      mousex: mouseX - width/2,
      mousey: mouseY - height/2
    };

    socket.emit('mouseClicked', mousePos);
    setTimeout(resetDashCD, 2000);
  }
}

