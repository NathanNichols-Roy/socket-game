function PlayerData(socketId, name, x, y, r, score) {
  this.socketId = socketId;
  this.name = name;
  this.x = x;
  this.y = y;
  this.r = r;
  this.score = score;

  this.update = function(playerBody) {
    this.x = playerBody.position.x;
    this.y = playerBody.position.y;
    this.r = playerBody.circleRadius;
    this.score = playerBody.score;
  }
};

module.exports = PlayerData;
