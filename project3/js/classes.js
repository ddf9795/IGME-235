class Player extends PIXI.Sprite {
    constructor(x = 0, y = 0) {
        super(app.loader.resources["media/images/player.png"].texture);
        this.anchor.set(.5,.5);
        this.scale.set(.15);
        this.x = x;
        this.y = y;

        //Current movement direction (1 = right, -1 = left)
        //Assume right
        this.direction = 1;
        //Movement speed
        this.speed = 175;

        //Invulnerable state
        this.invuln = false;
    }

    move(dt = 1/60) {
        this.x += this.direction * this.speed * dt;
    }

    //Reflect method for when the player reaches the end of the screen (checked externally)
    reflect() {
        this.direction = -this.direction;
        this.scale.x = -this.scale.x;
    }
}

class Obstacle extends PIXI.Sprite {
    constructor(x = 0, y = 0) {
        super(app.loader.resources["media/images/obstacle.png"].texture);
        this.anchor.set(.5,.5);
        this.scale.set(0.15);
        this.x = x;
        this.y = y;

        //Current movement direction (1 = right, -1 = left)
        //Assume left
        this.direction = -1;
        //Movement speed
        this.speed = 125;
        //Alive status
        this.isAlive = true;
        //passed status
        this.passed = false;
    }

    move(dt = 1/60) {
        this.x += this.direction * this.speed * dt;
    }

    //Reflect method for turning the opposite movement direction (activated externally)
    reflect() {
        this.direction = -this.direction;
        this.scale.x = -this.scale.x;
    }
}