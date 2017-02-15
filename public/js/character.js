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

  this.update = function() {
    this.show();
    this.movement();
    
    if (this.dead) {
      this.sprite.velocity.set(0,0);
      this.sprite.scale = lerp(this.sprite.scale, 0, 0.1);

      if (this.sprite.scale <= 0.2) {
        this.gameOver = true;
      }

      return;
    }

    //if (this.attacked) {
    //  this.punch.update();
    //}
  }

  this.movement = function() {
    this.sprite.velocity.x = (mouseX - width/2)/20;
    this.sprite.velocity.y = (mouseY - height/2)/20;
    this.sprite.limitSpeed(7);
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
      r: this.r,
      velX: this.sprite.velocity.x,
      velY: this.sprite.velocity.y
    }

    return data;
  }

  //this.attack = function() {
  //  if (this.attacked) {
  //    return;
  //  }

  //  this.punch = new Punch(this.pos.x, this.pos.y);

  //  this.attacked = true;
  //  setTimeout(function(player) { player.attacked = false; },
  //    this.punchCD, this);
  //}
  //this.getPunch = function() {
  //  if (this.punch) return this.punch;
  //  else return null;
  //}
}

