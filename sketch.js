//Random Ball placement
let xBall = 50;
let yBall = 50;
let xSpeed = (2, 7);
let ySpeed = (-7, -2);
let score = 0;

const bar_width = 90;
const bar_height = 15;
const width = 400;
const height = 400;

//Canvas
function setup() {
    createCanvas(width, height);
}

//Background
function draw() {
    isGameOver = checkGameOver();
    //Background
    background(0);

    if (!isGameOver) {
        //Paddle
        fill('#ffffff');
        rect(mouseX, mouseY, bar_width, bar_height);


        //Functions
        move();
        display();
        bounce();
        //resetBall();
        paddle();
    } else {
        //Score
        fill('#ffffff');
        textSize(24);
        text("Game Over", width/2, height/2);
    }


    //Score
    fill('#d9c3f7');
    textSize(24);
    text("Score: " + score, 10, 25);
}

function checkGameOver(){
    if (yBall >= height) {
        return true;
    } else {
        return false;
    }
}

function move(){
    xBall += xSpeed
    yBall += ySpeed
}

function bounce(){
    if(xBall < 10 ||
        xBall > width - 10){
        xSpeed *= -1;
    }
    if(yBall < 10){
        ySpeed *= -1;
    }
}

function display(){
    fill('#d9c3f7');
    ellipse (xBall, yBall, 20, 20)
}

//Bounce off paddle
function paddle(){
    // 当たり判定
    if (
        (xBall > mouseX && xBall < mouseX + bar_width) && 
        (xBall > mouseY && xBall < mouseY + bar_height)
    ){
        xSpeed *= -1;
        ySpeed *= -1;
        score ++;
    }
}
