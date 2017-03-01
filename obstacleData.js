function ObstacleData(id, x, y, r) {
  this.id = id;
  this.x = x;
  this.y = y;
  this.r = r;

  this.update = function(body) {
    this.x = body.position.x;
    this.y = body.position.y;
    this.r = body.circleRadius;
  }
};

module.exports = ObstacleData;
