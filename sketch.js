const bar_width = 50;
const bar_height = 50;
const width = 1000;
const height = 600;

let xBall = width/2;
let yBall = height/2;
let zBall = 200; // ボールのz座標（手前側）
let xSpeed = 5; // X軸方向の速度
let ySpeed = 0; // Y軸方向の速度
let zSpeed = -2; // Z軸方向の速度（手前に向かう）
let gravity = 0.1; // 重力
let score = 0;

let img; // 画像データを格納する変数
// スプライトを格納する変数
let aodanuki;

function preload() {
    img = loadImage("assets/doraemon.jpg");
}

// Canvasの初期化
function setup() {
    createCanvas(width, height, WEBGL); // 3Dキャンバスの作成

    aodanuki = createSprite(bar_width, bar_height);
    aodanuki.addImage(img);

    xBall = 0;
    yBall = 0;
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
    drawSprites();
    aodanuki.position.x = mouseX;
    aodanuki.position.y = mouseY;
}

function mousePressed(event) {
    // ゲームがオーバー状態であれば、再度ゲームを開始する
    console.log(event);
    if (isGameOver) {
        isGameOver = false; // ゲームオーバー状態を解除してゲームを再開
        score = 0; // スコアをリセット
        xBall = width/2; // ボールの位置をリセット
        yBall = height/2;
        zBall = 200;
        xSpeed = 5; // ボールの速度をリセット
        ySpeed = 0;
        zSpeed = -2;
    }
}

function checkGameOver() {
    if (yBall >= height) {
        console.log("true");
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
    if (xBall < -width / 2 || xBall > width / 2) {
        xSpeed *= -1;
    }
    if (yBall < -height / 2 || yBall > height / 2) {
        ySpeed *= -1;
    }
    if (zBall < 0 || zBall > 200) { // z軸方向の当たり判定
        zSpeed *= -1;
    }
}

function display() {
    fill('#d9c3f7');
    translate(xBall, yBall, zBall); // 3D空間内での位置を指定
    sphere(20); // 半径20の球を描画
    translate(-xBall, -yBall, -zBall); // 位置を元に戻す
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
