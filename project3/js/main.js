"use strict";
//Append additional HTML, for things such as control explanations and credits
let gameContainer = document.querySelector("#game");

const app = new PIXI.Application({
    width: 1200,
    height: 600,
    backgroundColor: 0x7777777,
});
gameContainer.appendChild(app.view);

//A bit of code to prevent arrow key scrolling, because oh my god it just hit me how annoying it is once the page needs to scroll
window.addEventListener("keydown", function(e) {
    if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
}, false);

//constants
const sceneWidth = app.view.width;
const sceneHeight = app.view.height;

//Controls
document.addEventListener('keydown', movePlayer);

//image preload
app.loader.
    add([
        "media/images/player.png",
        "media/images/obstacle.png"
    ]);
app.loader.onProgress.add(e => { console.log(`progress=${e.progress}`) });
app.loader.onComplete.add(setup);
app.loader.load();

//aliases
let stage;

//game vars
let startScene;
let gameScene, playerPosition, scoreLabel, timeLabel, intensityLabel, moveSound, reflectSound, dieSound, music;
let gameOverScene;

let player = new Player();

let statLabel;

let obstacles = [];
let yAxes = [60, 180, 300, 420, 540];
let yAxesVisuals = [yAxes.length];

let score = 0;
var startTime;
let time;
let intensity = 0;
let paused = true;

let shouldSpawnObstacles = true;

let graceTimer = 0;
let baseSpawnTimer = 0.75;
let spawnTimer, spawnBuffer;
let intensityTimer;
let intensityTimerCap = 20;
let invulnTimer, collideTimer;
let invulnBuffer = 0.08;
let colliding = false;

//setup function
function setup()
{
    stage = app.stage;

    //Create the scenes
    startScene = new PIXI.Container();
    stage.addChild(startScene);

    gameScene = new PIXI.Container();
    gameScene.visible = false;
    stage.addChild(gameScene);

    gameOverScene = new PIXI.Container();
    gameOverScene.visible = false;
    stage.addChild(gameOverScene);

    createLabelsAndButtons();

    //Create the player
    player = new Player();
    gameScene.addChild(player);

    //Load sounds
    moveSound = new Howl({
        src: [`media/sfx/move.wav`],
        volume: 0.60
    });
    reflectSound = new Howl({
        src: [`media/sfx/reflect.wav`],
        volume: 0.50
    });
    dieSound = new Howl({
        src: [`media/sfx/die.wav`],
        volume: 0.75
    });
    music = new Howl({
        src: [`media/sfx/music.mp3`],
        volume: 0.25,
        loop: true
    });

    //Start update loop
    app.ticker.add(gameLoop);

    //Start looping music
    music.play();
}



//create labels and buttons for all scenes
function createLabelsAndButtons()
{
    let buttonStyle = new PIXI.TextStyle({
        fill: 0xFFFFFF,
        fontSize: 48,
        fontFamily: "Verdana",
        stroke: 0x000000,
        strokeThickness: 5
    });

    //1 - set up `startScene`
    //1A - make top start label
    let startLabel1 = new PIXI.Text("QUIKKSTEP");
    startLabel1.style = new PIXI.TextStyle ({
        fill: 0xFFFFFF,
        fontSize: 96,
        fontFamily: "Verdana",
        stroke: 0x000000,
        strokeThickness: 6
    });
    startLabel1.x = 325;
    startLabel1.y = 120;
    startScene.addChild(startLabel1);

    //1B - make middle start label
    let startLabel2 = new PIXI.Text("Up/Down to quickstep, bounce and dodge as long as\n                               you can");
    startLabel2.style = new PIXI.TextStyle({
        fill: 0xFFFFFF,
        fontSize: 32,
        fontFamily: "Verdana",
        fontStyle: "italic",
        stroke: 0x000000,
        strokeThickness: 4,
        //align: center
    });
    startLabel2.x = 175;
    startLabel2.y = 300;
    startScene.addChild(startLabel2);

    //1C - make start game button
    let startButton = new PIXI.Text("START");
    startButton.style = buttonStyle;
    startButton.x = 500;
    startButton.y = sceneHeight - 100;
    startButton.interactive = true;
    startButton.buttonMode = true;
    startButton.on("pointerup", startGame);
    startButton.on('pointerover', e => e.target.alpha = 0.7);
    startButton.on('pointerout', e => e.currentTarget.alpha = 1.0);
    startScene.addChild(startButton);

    //2 - set up gameScene

    for (let i = 0; i < yAxes.length; i++)
    {
        //Draw all of the axes in the background
        yAxesVisuals[i] = new PIXI.Graphics();
        gameScene.addChild(yAxesVisuals[i]);
        yAxesVisuals[i].position.set(0, yAxes[i]);
        yAxesVisuals[i].lineStyle(2, 0xC7E0EB)
            .lineTo(sceneWidth, 0);
    }

    let textStyle = new PIXI.TextStyle({
        fill: 0xFFFFFF,
        fontSize: 18,
        fontFamily: "Verdana",
        stroke: 0x000000,
        strokeThickness: 2
    });
    //Make labels
    scoreLabel = new PIXI.Text();
    scoreLabel.style = textStyle;
    scoreLabel.x = 5;
    scoreLabel.y = 5;
    gameScene.addChild(scoreLabel);
    increaseScoreBy(0);

    timeLabel = new PIXI.Text();
    timeLabel.style = textStyle;
    timeLabel.x = 575;
    timeLabel.y = 5;
    gameScene.addChild(timeLabel);
    refreshTime();

    intensityLabel = new PIXI.Text();
    intensityLabel.style = textStyle;
    intensityLabel.x = 1075;
    intensityLabel.y = 5;
    gameScene.addChild(intensityLabel);
    increaseIntensityBy(0);

    // 3 - set up `gameOverScene`
    // 3A - make game over text
    let gameOverText = new PIXI.Text("Game Over!");
    textStyle = new PIXI.TextStyle({
        fill: 0xFFFFFF,
        fontSize: 64,
        fontFamily: "Verdana",
        stroke: 0x000000,
        strokeThickness: 6
    });
    gameOverText.style = textStyle;
    gameOverText.x = 375;
    gameOverText.y = 100;
    gameOverScene.addChild(gameOverText);

    // //Make game over score label
    // gameOverScoreLabel = new PIXI.Text("Your final score: " + gameOverScoreLabel);
    // gameOverScoreLabel.style = textStyle;
    // gameOverScoreLabel.x = 75;
    // gameOverScoreLabel.y = sceneHeight - 175;
    // gameOverScene.addChild(gameOverScoreLabel);

    // 3B - make "play again?" button
    let playAgainButton = new PIXI.Text("Play Again?");
    playAgainButton.style = buttonStyle;
    playAgainButton.x = 400;
    playAgainButton.y = sceneHeight - 100;
    playAgainButton.interactive = true;
    playAgainButton.buttonMode = true;
    playAgainButton.on("pointerup",startGame); // startGame is a function reference
    playAgainButton.on('pointerover',e=>e.target.alpha = 0.7); // concise arrow function with no brackets
    playAgainButton.on('pointerout',e=>e.currentTarget.alpha = 1.0); // ditto
    gameOverScene.addChild(playAgainButton);
}

function startGame()
{
    startScene.visible = false;
    gameOverScene.visible = false;
    gameScene.visible = true;

    gameOverScene.removeChild(statLabel);

    paused = false;

    intensity = 0;
    intensityTimer = 0;
    score = 0;
    increaseScoreBy(0);
    increaseIntensityBy(0);
    time = 0;
    refreshTime(0);
    spawnTimer = 0;
    spawnBuffer = baseSpawnTimer;
    //Spawn the player on the middle axis and set the grace timer to 3 seconds
    player.x = 30;
    player.y = yAxes[2];
    playerPosition = 2;
    player.speed = 175;
    player.direction = 1;
    player.scale.x = Math.abs(player.scale.x);
    player.invuln = false;
    colliding = false;
    collideTimer = 0;

    graceTimer = 3;
}

//Score value functions
function increaseScoreBy(value)
{
    score += value;
    score = Math.ceil(score);
    scoreLabel.text = `Score ${score}`;
}

function increaseIntensityBy(value)
{
    intensity += value;
    intensity = parseInt(intensity);
    intensityLabel.text = `Intensity ${intensity}`;

    //Recalculate the spawn buffer
    spawnBuffer = clamp(baseSpawnTimer - (intensity * 0.05), 0.5, baseSpawnTimer);

    //Speed up the player slightly
    player.speed += 5;
}

function refreshTime(value)
{
    // time = moment(startTime, "mm:ss").fromNow();
    time += value;
    time = parseFloat(time);
    timeLabel.text = time.toFixed(2);
}

//End function
function end()
{
    paused = true;

    startScene.visible = false;
    gameScene.visible = false;
    gameOverScene.visible = true;

    statLabel = new PIXI.Text(`Your stats\nScore: ${score}\nTime: ${time.toFixed(2)}\nIntensity: ${intensity}`);
    statLabel.style = new PIXI.TextStyle({
        fill: 0xFFFFFF,
        fontSize: 32,
        fontFamily: "Verdana",
        stroke: 0x000000,
        strokeThickness: 4,
    });
    statLabel.x = 425;
    statLabel.y = 200;
    gameOverScene.addChild(statLabel);

    //clean up the scene
    obstacles.forEach(o=>gameScene.removeChild(o));
    obstacles = [];
}

//Game loop function
function gameLoop()
{
    if (paused) return;

    //Calculate delta time
    let dt = 1/app.ticker.FPS;
    if (dt > 1/12) dt = 1/12;

    //If the grace timer is active, count it down using dt and prevent anything else from happening until its empty
    if (graceTimer > 0)
    {
        graceTimer -= dt;
        return;
    }

    //If the invuln timer is active, count it down
    if (invulnTimer > 0)
    {
        invulnTimer -= dt;
        //If the timer expires, deactivate invuln
        //We try doing this here to optimize code, so invuln isn't being set to false every frame the timer isn't active for no reason
        if (invulnTimer <= 0)
        {
            player.invuln = false;
        }
    }

    //Add the delta time to the timer as well as the intensity timer
    refreshTime(dt);
    intensityTimer += dt;

    //If the player has reached the furthest thresholds of the left/right sides of the screen, prevent obstacles from spawning as to prevent BS deaths from obstacles spawning
    //on top of the player
    //The speed of the player should also be factored in, as without that, after a point the player can surpass the threshold while having a projectile spawn simultaneously
    //due to their sheer speed
    if (player.x < 150 + (intensity * 5) || player.x > sceneWidth - 150 - (intensity * 5)) shouldSpawnObstacles = false;
    else shouldSpawnObstacles = true;

    //Count down the obstacle spawn timer
    spawnTimer -= dt;
    //If it has reached 0, reset it to the spawnBuffer and spawn an obstacle (if they're allowed to spawn, otherwise just reset the timer)
    if (spawnTimer <= 0)
    {
        spawnTimer = spawnBuffer
        if (shouldSpawnObstacles)
        {
            let newObstacle = new Obstacle();
            if (player.direction == 1)
            {
                newObstacle.x = sceneWidth - 30;
                newObstacle.y = yAxes[randomRange(0, yAxes.length)];
                newObstacle.direction = -1;
            }
            else
            {
                newObstacle.x = 30;
                newObstacle.y = yAxes[randomRange(0, yAxes.length)];
                newObstacle.direction = 1;
            }
            obstacles.push(newObstacle);
            gameScene.addChild(obstacles[obstacles.length - 1]);
        }
    }

    //If the intensity timer reaches its cap, reset it and increase the intensity, as well as doing appropriate calculations
    if (intensityTimer > intensityTimerCap)
    {
        intensityTimer = 0;
        increaseIntensityBy(1);
    }

    //Move the player
    player.move(dt);
    //Move the obstacles
    for (let i = 0; i < obstacles.length; i++)
    {
        obstacles[i].move(dt);
    }

    let w2 = player.width / 2;
    player.x = clamp(player.x, 0+w2, sceneWidth-w2);


    //If the player has reached the furthest edges of the screen, reflect everything in the opposite direction
    if (player.x <= 0+w2 || player.x >= sceneWidth-w2)
    {
        player.reflect();
        for (let i = 0; i < obstacles.length; i++)
        {
            obstacles[i].reflect();
            //Additionally, reset all obstacle's passed status to false
            obstacles[i].passed = false;
        }
        reflectSound.play();
    }

    colliding = false;
    //Check for player/border collisions and passes
    for (let o of obstacles)
    {
        //Player collision
        if (rectsIntersect(o, player))
        {
            //If the player collides with an obstacle and they do not have invulnerability, start ticking a collision buffer to give the player some leeway to
            //react to otherwise unfair scenarios, as well as preventing abrupt game ends
            colliding = true;
            // //If the timer has surpassed its threshold, end the game
            // if (collideTimer >= 0.05)
            // {
            //     player.isAlive = false;
            //     end();
            // }
        }
        //If the obstacle almost fully goes offscreen, delete them
        if (o.x < 0 - o.width + (o.width / 12) || o.x > sceneWidth + o.width - (o.width / 12))
        {
            o.isAlive = false;
            gameScene.removeChild(o);
        }
        //if the player has gone past this obstacle, mark this obstacle as passed until the next reflect and give the player score
        if (o.passed == false)
        {
            //Right
            if (o.direction == 1)
            {
                if (player.x < o.x) 
                {
                    o.passed = true;
                    increaseScoreBy(10 * (intensity + 1) * 1.5);
                }
            }
            //Left
            else
            {
                if (player.x > o.x)
                {
                    o.passed = true;
                    increaseScoreBy(10 * (intensity + 1) * 1.5);
                }
            }
        }
    }
    //If we've collided, increment the timer
    //We do it here to prevent dt being added multiple times in the case of multiple collisions
    if (colliding)
    {
        collideTimer += dt;
        if (player.invuln) colliding = false;
    }
    //If we still aren't colliding and arent invulnerable (to prevent exploits), set the timer to 0
    if (colliding == false)
    {
        if (player.invuln == false) collideTimer = 0;
    }

    //If the collide timer has surpassed its threshold, end the game
    if (collideTimer >= 0.1)
    {
        player.isAlive = false;
        dieSound.play();
        end();
    }

    //Get rid of dead obstacles
    obstacles = obstacles.filter(o=>o.isAlive);
}

function movePlayer(e)
{
    //If up arrow is pressed
    if (e.keyCode == 38)
    {
        //Can we get much higher?
        if (playerPosition > 0)
        {
            //If so, change the player position to the next highest axis
            playerPosition--;
            player.y = yAxes[playerPosition];
            //Activate invulnerability and start the invuln timer if we arent already invuln (to prevent exploits)
            if (player.invuln == false)
            {
                player.invuln = true;
                invulnTimer = invulnBuffer;
            }
            
            //Play move sound
            moveSound.play();
        }
        //If already on the highest axis, do nothing
    }
    //If down arrow is pressed
    if (e.keyCode == 40)
    {
        //Can we go lower?
        if (playerPosition < yAxes.length - 1)
        {
            //If so, change the player position to the next lowest axis
            playerPosition++;
            player.y = yAxes[playerPosition];
            //Activate invulnerability and start the invuln timer
            player.invuln = true;
            invulnTimer = invulnBuffer;
            //Play move sound
            moveSound.play();
        }
        //If already on the lowest axis, do nothing
    }
}

function randomRange(min, max)
{
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}