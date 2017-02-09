function Punch (x, y) {
  this.pos = createVector(x, y);
  this.vel = createVector(mouseX - width/2, mouseY - height/2);
  this.duration = 200;
  this.punching = true;

  setTimeout(function(punch) { punch.punching = false; }, this.duration, this);

  this.update = function() {
    if (this.punching) {
      this.vel.setMag(10);
      this.pos.add(this.vel);

      this.show();
    }
  }

  this.show = function() {
    noStroke();
    fill(255, 0, 0);
    ellipse(this.pos.x, this.pos.y, 40, 40);
  }
}
