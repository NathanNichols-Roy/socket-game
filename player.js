function PlayerData(socketId, name, x, y, r, score) {
  this.socketId = socketId;
  this.name = name;
  this.x = x;
  this.y = y;
  this.r = r;
  this.score = score;
  this.shooting = false
  this.dead = false;

  this.update = function(playerBody) {
    this.x = playerBody.position.x;
    this.y = playerBody.position.y;
    this.r = playerBody.circleRadius;
    this.score = playerBody.score;
    this.shooting = playerBody.shooting;
    this.dead = playerBody.isStatic;
  }

  this.setDead = function(flag) {
    this.dead = flag;
  }
};

module.exports = PlayerData;
