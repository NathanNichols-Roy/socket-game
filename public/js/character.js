function Character(name, x, y, r) {
  this.name = name;
  this.pos = createVector(x, y);
  this.r = r;
  this.defaultR = r;
  this.vel = createVector(0, 0);
  this.attacked = false;
  this.punch;
  this.punchCD = 1000;
  this.dead = false;
  this.gameOver = false;

  this.update = function() {
    if (this.dead) {
      this.r = lerp(this.r, 0, 0.1);

      if (this.r > 0.5) {
        this.show();
      } else {
        this.gameOver = true;
      }

      return;
    }

    this.show();

    var newVel = createVector(mouseX - width/2, mouseY - height/2);
    newVel.setMag(4);
    this.vel.lerp(newVel, 0.1);
    this.pos.add(this.vel);

    if (this.attacked) {
      this.punch.update();
    }
  }

  this.outOfBounds = function(arena) {
    if (this.pos.x < arena.x1 ||
        this.pos.y < arena.y1 ||
        this.pos.x > arena.x2 ||
        this.pos.y > arena.y2) {
      return true;
    }

    return false;
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

  this.getData = function() {
    var data = {
      name: this.name,
      x: this.pos.x, 
      y: this.pos.y
    }

    return data;
  }
}

