function Character(name, x, y, r) {
  this.name = name;
  this.pos = createVector(x, y);
  this.r = r;
  this.vel = createVector(0, 0);
  this.attacked = false;
  this.punch;
  this.punchCD = 1000;

  this.update = function() {
    var newVel = createVector(mouseX - width/2, mouseY - height/2);
    newVel.setMag(4);
    this.vel.lerp(newVel, 0.1);
    this.pos.add(this.vel);

    if (this.attacked) {
      this.punch.update();
    }

    console.log(this.attacked);

    this.constrain(900, 900);
  }

  this.constrain = function(maxX, maxY) {
    var left = this.pos.x - this.r,
        right = this.pos.x + this.r,
        top =  this.pos.y - this.r,
        bottom = this.pos.y + this.r;

    if (right >= maxX)
      this.pos.x = maxX - this.r;
    if (left <= 0)
      this.pos.x = 0 + this.r;
    if (bottom >= maxY)
      this.pos.y = maxY - this.r;
    if (top <= 0)
      this.pos.y = 0 + this.r;
  }

  this.attack = function() {
    if (this.attacked) {
      return;
    }

    this.punch = new Punch(this.pos.x, this.pos.y);

    this.attacked = true;
    setTimeout(function(player) { player.attacked = false; },
      this.punchCD, this);
  }

  this.getHit = function(other) {
    var d = p5.Vector.dist(this.pos, other.pos);

    if (other.r + this.r > d) {
      this.dead = true;
      return true;
    } else {
      return false;
    }
  }

  this.show = function() {
    strokeWeight(2);
    stroke(0, 155, 255);
    fill(255);
    ellipse(this.pos.x, this.pos.y, this.r * 2, this.r * 2);

    noStroke();
    textAlign(CENTER);
    textSize(14);
    text(this.name, this.pos.x, this.pos.y + 35);
  }

  this.getData = function () {
    var data = {
      name: this.name,
      x: this.pos.x, 
      y: this.pos.y
    }

    return data;
  }
}

