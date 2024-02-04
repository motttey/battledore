const bar_width = 100;
const bar_height = 100;
const width = 800;
const height = 500;

let xBall = width / 2;
let yBall = 50;
let zBall = 200; // ボールのz座標（手前側）
let xSpeed = 5; // X軸方向の速度
let ySpeed = 0; // Y軸方向の速度
let zSpeed = -2; // Z軸方向の速度（手前に向かう）
let gravity = 0.1; // 重力
let score = 0;

let img; // 画像データを格納する変数
let aodanuki;

function preload() {
    img = loadImage("assets/doraemon.jpg");
}

// Canvasの初期化
function setup() {
    createCanvas(width, height);

    aodanuki = createSprite(bar_width, bar_height);
    aodanuki.addImage(img);

    drawSprites();
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
        paddle();
    } else {
        //Score
        fill('#ffffff');
        textSize(24);
        text("Game Over", width / 2, height / 2);
    }

    //Score
    fill('#d9c3f7');
    textSize(24);
    text("Score: " + score, 10, 25);

    // スプライトを描画
    // drawSprites();
    aodanuki.position.x = mouseX;
    aodanuki.position.y = mouseY;
}

function mousePressed(event) {
    // ゲームがオーバー状態であれば、再度ゲームを開始する
    console.log(event);
    if (isGameOver) {
        isGameOver = false; // ゲームオーバー状態を解除してゲームを再開
        score = 0; // スコアをリセット
        xBall = 50; // ボールの位置をリセット
        yBall = 50;
        zBall = 200;
        xSpeed = 5; // ボールの速度をリセット
        ySpeed = 0;
        zSpeed = -2;
    }
}

function checkGameOver() {
    if (yBall >= height) {
        return true;
    } else {
        return false;
    }
}

function move() {
    xBall += xSpeed;
    yBall += ySpeed;
    zBall += zSpeed; // z軸方向の移動

    ySpeed += gravity; // 重力を加える
}

function bounce() {
    if (xBall < 10 || xBall > width - 10) {
        xSpeed *= -1;
    }
    if (yBall < 10) {
        ySpeed *= -1;
    }
    if (zBall < 0 || zBall > 200) { // z軸方向の当たり判定
        zSpeed *= -1;
    }
}

function display() {
    fill('#d9c3f7');
    ellipse(xBall, yBall, 20, 20);
}

//Bounce off paddle
function paddle() {
    // 当たり判定
    // スプライトの範囲を計算
    let spriteLeft = aodanuki.position.x - aodanuki.width / 2;
    let spriteRight = aodanuki.position.x + aodanuki.width / 2;
    let spriteTop = aodanuki.position.y - aodanuki.height / 2;
    let spriteBottom = aodanuki.position.y + aodanuki.height / 2;

    // ボールがスプライトの範囲内にあるかをチェック
    if (
        (xBall > spriteLeft && xBall < spriteRight) &&
        (yBall > spriteTop && yBall < spriteBottom) &&
        ySpeed > 0 // 下向きの速度のみ当たり判定
    ) {
        xSpeed *= -1;
        ySpeed *= -1;
        score++;
    }
}
