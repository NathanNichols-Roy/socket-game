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

var enemies;
var playerX;
var playerY;

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
  player = new Player(name, randX, randY, 20);

  var data = player.getData();
  socket.emit('start', data);
  gameStarted = 1;

  // Start score
  scoreInterval = setInterval(function() { score++ }, 1000);

  menuItems = selectAll('.menu');
  menuItems.forEach(function(item) {
    item.hide()
  });

  otherPlayerSprites = new Group();

  enemies = new Group();
  for (var i = 0; i < 5; i++) {
    var enemy = createSprite(0, i*100, 20, 20)
    enemy.setCollider('circle', 0, 0, 20);
    enemy.setSpeed(random(1, 2), 0);
    enemy.scale = 1;
    enemy.mass = 1;
    enemies.add(enemy);
  }
}

function draw() {
  background(0);

  if (gameStarted) {
    var playerX = player.sprite.position.x;
    var playerY = player.sprite.position.y;
    
    // Center camera on player
    translate(width/2 - playerX, height/2 - playerY);

    console.log(players);

    arena.show();
    
    sendServerUpdate();

    if (arena.outOfBounds(playerX, playerY)) {
      player.dead = true;
      clearInterval(scoreInterval);

      if (player.gameOver) {
        showGameOver();
      }
    }

    enemies.collide(player.sprite);
    player.sprite.collide(enemies);
    player.sprite.collide(otherPlayerSprites);
    otherPlayerSprites.collide(player.sprite);
    player.update();

    drawOtherPlayers();
    drawSprites();

    drawScore();
  }
}

function sendServerUpdate() {
  var data = player.getData();
  data.score = score;

  socket.emit('update', data);
}

function drawOtherPlayers() {
  players.forEach(function(p, i) {
    if (p.id !== socket.id) {
      if (!spriteIds.hasOwnProperty(p.id)) {
        var playerSprite = createSprite(p.x, p.y, p.r, p.r);
        spriteIds[p.id] = playerSprite;
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
    spriteIds[p.id].position.x = p.x;
    spriteIds[p.id].position.y = p.y;

    fill(255);
    noStroke();
    textAlign(CENTER);
    textSize(14);
    text(p.name, spriteIds[p.id].position.x, spriteIds[p.id].position.y + 35);

    }
  });
      //strokeWeight(2);
      //stroke(0, 155, 255);
      //fill(255, 0, 0);
      //ellipse(players[i].x, players[i].y, 40, 40);

      //fill(255);
      //noStroke();
      //textAlign(CENTER);
      //textSize(14);
      //text(players[i].name, players[i].x, players[i].y + 35);
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
  text('You Died', player.x, player.y - 50);

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
  var restartBtn = select('#restartBtn');
  restartBtn.hide();

  var randX = random(arena.width/2 * 0.2, arena.width/2 * 1.2);
  var randY = random(arena.height/2 * 0.2, arena.height/2 * 1.2);
  player.sprite.position.x = randX;
  player.sprite.position.y = randY;
  player.dead = false;
  player.gameOver = false;
  player.sprite.scale = 1;

  score = 0;
  scoreInterval = setInterval(function() { score++ }, 1000);
}

// Controls
//function mouseClicked() {
//  if (gameStarted) {
//    player.attack();
//  }
//}

