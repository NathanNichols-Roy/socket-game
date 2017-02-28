function Player(name, x, y, r) {
  this.name = name;
  this.x = x;
  this.y = y;
  this.r = r;
  this.score = 0;
  this.dashed = false;
  this.dead = false;
  this.gameOver = false;

  this.update = function(playerData) {
    this.x = playerData.x;
    this.y = playerData.y;
    this.r = playerData.r;
    this.score = playerData.score;
    this.dashed = playerData.dashed;
    this.dead = playerData.dead;
    
    if (this.dead && this.r <= 0.1) {
      this.gameOver = true;
    }
  }

  this.show = function() {
    if (this.dashed) fill (0, 0, 150);
    else fill(0, 0, 255);
    stroke(0)
    strokeWeight(2);
    ellipse(this.x, this.y, this.r*2, this.r*2);

    if (!this.gameOver) {
      fill(255);
      noStroke();
      textAlign(CENTER);
      textSize(14);
      text(this.name, this.x, this.y + 35);
    }
  }

  this.getData = function() {
    var data = {
      name: this.name,
      x: this.x, 
      y: this.y,
      r: this.r
    };

    return data;
  }
}

