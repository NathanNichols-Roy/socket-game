function Arena(x1, y1, x2, y2) {
  this.x1 = x1;
  this.y1 = y1;
  this.x2 = x2;
  this.y2 = y2;
  this.width = x2 - x1;
  this.height = y2 - y1;

  this.show = function() {
    // Floor
    fill('#B0BEC5');
    noStroke();
    rect(this.x1, this.y1, this.x2, this.y2);


    //stroke('rgba(0, 0, 0, .3)');
    for (var i = 0; i < this.width; i += this.width/10) {
      if (i === this.width/2) {
        // Center lines
        stroke('#B71C1C');
        strokeWeight(4);
        line(this.width/2, 0, this.width/2, this.height);
        line(0, this.height/2, this.width, this.height/2);
      } else {
        // Checkered lines
        stroke('#9E9E9E');
        strokeWeight(2);
        line(i, 0, i, this.height);
        line(0, i, this.width, i);
      }
    }
  }

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
