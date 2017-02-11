var socket;

var player;
var players = [];
var arena;
var arenaSize = 900;
var score = 0;
var scoreInterval;
var gameStarted = 0;

function setup() {
  // Open client connection
  socket = io.connect('http://localhost:8080')
  socket.on('heartbeat', getServerData);

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
  submitBtn.mousePressed(startGame);
}

function getServerData(data) {
  players = data;
}

function startGame() {
  var name = document.getElementById('name-entry').value;
  if (!name) return;

  // Create arena
  arena = new Arena(0, 0, arenaSize, arenaSize);

  // Create instance of the player
  var randX = random(arena.width/2 * 0.2, arena.width/2 * 1.2);
  var randY = random(arena.height/2 * 0.2, arena.height/2 * 1.2);
  player = new Character(name, randX, randY, 20);

  var data = player.getData();
  socket.emit('start', data);
  gameStarted = 1;

  // Start score
  scoreInterval = setInterval(function() { score++ }, 1000);

  menuItems = selectAll('.menu');
  menuItems.forEach(function(item) {
    item.hide()
  });
}

function draw() {
  background(0);

  if (gameStarted) {
    translate(width/2 - player.pos.x, height/2 - player.pos.y);
    arena.show();
    
    sendServerUpdate();

    if (player.outOfBounds(arena)) {
      player.dead = true;
      clearInterval(scoreInterval);

      if (player.gameOver) {
        showGameOver();
      }
    }

    player.update();

    drawOtherPlayers();

    // score
    fill(255);
    stroke(0);
    strokeWeight(4);
    textSize(50);
    text(score, player.pos.x, player.pos.y - height*0.3);
  }
}

function sendServerUpdate() {
  var data = player.getData();
  data.score = score;
  socket.emit('update', data);
}

function drawOtherPlayers() {
  for (var i = 0; i < players.length; i++) {
    // Dont draw self
    if (players[i].id !== socket.id) {
      strokeWeight(2);
      stroke(0, 155, 255);
      fill(0, 255, 0);
      ellipse(players[i].x, players[i].y, 40, 40);

      fill(255);
      noStroke();
      textAlign(CENTER);
      textSize(14);
      text(players[i].name, players[i].x, players[i].y + 35);
    }
  }
}

function showGameOver() {
  fill(255);
  stroke(0);
  strokeWeight(4);
  textAlign(CENTER);
  textSize(90);
  text('You Died', player.pos.x, player.pos.y - 50);

  var restartBtn = select('#restartBtn');
  if (restartBtn) {
    restartBtn.show();
  } else {
    restartBtn = createButton('Try again');
    restartBtn.id('restartBtn');
    restartBtn.position(width/2 - 50, height/2 + 70);
    restartBtn.size(100, 50);
    restartBtn.mousePressed(restart);
  }
}

function restart() {
  console.log('restart called');
  var restartBtn = select('#restartBtn');
  restartBtn.hide();

  var randX = random(arena.width/2 * 0.2, arena.width/2 * 1.2);
  var randY = random(arena.height/2 * 0.2, arena.height/2 * 1.2);
  player.pos = createVector(randX, randY);
  player.attacked = false;
  player.dead = false;
  player.gameOver = false;
  player.r = player.defaultR;

  score = 0;
  scoreInterval = setInterval(function() { score++ }, 1000);
}

// Controls
function mouseClicked() {
  if (gameStarted) {
    player.attack();
  }
}

