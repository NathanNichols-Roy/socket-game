function Arena(x1, y1, x2, y2) {
  this.x1 = x1;
  this.y1 = y1;
  this.x2 = x2;
  this.y2 = y2;
  this.width = x2 - x1;
  this.height = y2 - y1;

  this.show = function() {
    // Floor
    fill(169, 153, 138);
    noStroke();
    rect(this.x1, this.y1, this.x2, this.y2);

    // Center lines
    stroke(135, 13, 18);
    strokeWeight(4);
    line(this.width/2, 0, this.width/2, this.height);
    line(0, this.height/2, this.width, this.height/2);

    // Checkered lines
    stroke('rgba(0, 0, 0, .3)');
    strokeWeight(2);
    for (var i = 0; i < this.width; i += this.width/10) {
      line(i, 0, i, this.height);
      line(0, i, this.width, i);
    }
  }
}
