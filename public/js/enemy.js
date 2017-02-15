function Enemy(x, y, r) {
  this.pos = createVector(x, y);
  this.r = r;
  this.vel = createVector(5, 0);
  this.vel.setMag(3);

  this.update = function() {
    this.pos.add(this.vel);

    this.show();
    this.respawn();
  }

  this.respawn = function(maxX, maxY) {
    // hardcoded values
    if (this.pos.x < -350 || this.pos.x > 1250)
      this.vel.x = -this.vel.x;
    if (this.pos.y < -350 || this.pos.y > 1250)
      this.vel.y = -this.vel.y;
  }

  this.show = function() {
    stroke(0);
    strokeWeight(2);
    fill(255, 50, 50);
    ellipse(this.pos.x, this.pos.y, r*2, r*2);
  }
}

