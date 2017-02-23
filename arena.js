function Arena(x1, y1, x2, y2) {
  this.x1 = x1;
  this.y1 = y1;
  this.x2 = x2;
  this.y2 = y2;
  this.width = x2 - x1;
  this.height = y2 - y1;

  this.outOfBounds = function (x, y) {
    if (x < this.x1 ||
        y < this.y1 ||
        x > this.x2 ||
        y > this.y2) {
      return true;
    }

    return false;
  }
}

module.exports = Arena;
