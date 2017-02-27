function Player(name, x, y, r) {
  this.name = name;
  this.x = x;
  this.y = y;
  this.r = r;
  this.sprite = createSprite(x, y, r, r);
  this.dead = false;
  this.gameOver = false;
  
  // Setup
  this.sprite.setCollider('circle', 0, 0, r);
  this.sprite.scale = 1;
  this.sprite.mass = 1;

  this.update = function(serverPlayer) {
    this.movement(serverPlayer);
    
    if (serverPlayer.dead) {
      this.sprite.scale = lerp(this.sprite.scale, 0, 0.1);

      if (this.sprite.scale <= 0.2) {
        this.gameOver = true;
      }

      return;
    }
  }

  this.movement = function(serverPlayer) {
    this.sprite.position.x = serverPlayer.x;
    this.sprite.position.y = serverPlayer.y;
  }

  this.show = function() {
    this.sprite.draw = function() {
      fill(255);
      ellipse(0, 0, 40, 40);
    };

    fill(255);
    noStroke();
    textAlign(CENTER);
    textSize(14);
    text(this.name, this.sprite.position.x, this.sprite.position.y + 35);
  }

  this.getData = function() {
    var data = {
      name: this.name,
      x: this.sprite.position.x, 
      y: this.sprite.position.y,
      r: this.r
    };

    return data;
  }
}

