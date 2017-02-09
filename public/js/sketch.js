var socket;

var player;
var players = [];
var arenaSize = 900;
var score = 0;
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

  // Create instance of the player
  player = new Character(name, 0, 0, 20);

  var data = player.getData();
  socket.emit('start', data);
  gameStarted = 1;

  // Start score
  setInterval(function() { score++ }, 1000);

  menuItems = selectAll('.menu');
  menuItems.forEach(function(item) {
    item.hide()
  });
}

function draw() {
  background(0);

  if (gameStarted) {
    translate(width/2 - player.pos.x, height/2 - player.pos.y);
    
    sendServerUpdate();

    player.show();
    player.update();

    drawOtherPlayers();

    // boundary
    noFill();
    stroke(255, 255, 255);
    strokeWeight(3);
    rect(0, 0, arenaSize, arenaSize);

    // score
    fill(255);
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

function restart() {
  player.pos.x = 0;
  player.pos.y = 0;

  score = 0;
}

// Controls
function mouseClicked() {
  if (gameStarted) {
    player.attack();
  }
}

