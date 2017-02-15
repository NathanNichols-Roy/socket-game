function Player(id, name, x, y, r, velX, velY, score) {
  this.id = id;
  this.name = name;
  this.x = x;
  this.y = y;
  this.r = r;
  this.velX = velX;
  this.velY = velY;
  this.score = score;
};

module.exports = Player;
