//Random Ball placement
let xBall = 50;
let yBall = 50;
let xSpeed = (2, 7);
let ySpeed = (-7, -2);
let score = 0;

//Canvas
function setup() {
    createCanvas(400, 400);
}

//Background
function draw() {
    //Background
    background(0);

    //Paddle
    fill('#ffffff');//#ffffff = BLACK
    rect(mouseX, mouseY, 90, 15);


    //Functions
    move();
    display();
    bounce();
    //resetBall();
    paddle();

    //Score
    fill('#d9c3f7');
    textSize(24);
    text("Score: " + score, 10, 25);

}

function move(){
    xBall += xSpeed
    yBall += ySpeed
}

function bounce(){
    if(xBall < 10 ||
        xBall > 400 - 10){
        xSpeed *= -1;
    }
    if(yBall < 10 ||
        yBall > 400 - 10){
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
    if((xBall > mouseX && xBall < mouseX + 90) && (xBall > mouseY && xBall < mouseY + 15)){
        xSpeed *= -1;
        ySpeed *= -1;
        score ++;
    }
}
