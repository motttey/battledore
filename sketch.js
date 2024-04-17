const bar_width = 50;
const bar_height = 50;
const width = 1000;
const height = 600;

let xBall = width/2;
let yBall = height/2;
let zBall = 200; // ボールのz座標（手前側）
let xSpeed = 0; // X軸方向の速度
let ySpeed = -5; // Y軸方向の速度
let zSpeed = -1; // Z軸方向の速度（手前に向かう）
let gravity = 0.2; // 重力
let score = 0;

let img; // 画像データを格納する変数
// スプライトを格納する変数
let aodanuki;
// ゲームオーバー判定
let isGameOver = false;

let canvasFont;

let overlay;

function preload() {
    img = loadImage("assets/doraemon.jpg");

    // トゥルータイプフォントを読み込む
    // https://fonts.google.com/specimen/Trade+Winds
    // WEBGL: you must load and set a font before drawing text.
    const fontUrl = "https://fonts.gstatic.com/ea/notosansjapanese/v6/NotoSansJP-Bold.otf";
    canvasFont = loadFont(fontUrl);
}

// Canvasの初期化
function setup() {
    createCanvas(width, height, WEBGL); // 3Dキャンバスの作成

    textFont(canvasFont);

    aodanuki = createSprite(bar_width, bar_height);
    aodanuki.addImage(img);

    xBall = 0;
    yBall = 0;

    // 2Dグラフィックス用のオフスクリーンキャンバスを作成
    overlay = createGraphics(windowWidth, windowHeight);
}

function draw() {
    //Background
    background(0);

    if (!isGameOver) {
        //Paddle
        fill('#ffffff');
        rect(mouseX - bar_width / 2, mouseY - bar_height / 2, bar_width, bar_height);

        //Functions
        move();
        isGameOver = checkGameOver();

        display();
        bounce();
        paddle();
    } else {
        //Game Over
        fill('#ffffff');
        textSize(24);
        textAlign(CENTER, CENTER);
        text("Game Over", 0, 0); // WEBGLモードでは、原点がキャンバスの中心になります
    }

    // 固定のメッセージを表示する際にスケールを調整する
    // p5.jsでは 3D空間では、オブジェクトはそのz座標に応じて大きさが変わるように描画される
    // 現在の描画設定を保存
    push();
    // z軸のスケールを1に固定
    scale(1, 1, 1);
    
    // WEBGLモードでは、原点がキャンバスの中心になるため、マウスの位置を調整
    aodanuki.position.x = mouseX - width / 2;
    aodanuki.position.y = mouseY - height / 2;
    aodanuki.position.z = 0;

    // スプライトを描画
    drawSprites();

    overlay.clear();
    overlay.fill('#d9c3f7');
    overlay.textSize(24);
    overlay.textAlign(CENTER, TOP);
    overlay.text("Score: " + score, 0, -height / 2 + 25);

    // 2Dオーバーレイを3Dシーンに適用
    image(overlay, -windowWidth / 2, -windowHeight / 2);
}

function mousePressed(event) {
    // ゲームがオーバー状態であれば、再度ゲームを開始する
    if (isGameOver) {
        isGameOver = false; // ゲームオーバー状態を解除してゲームを再開
        // スコアをリセット
        score = 0;
        // 位置をリセット
        xBall = 0;
        yBall = 0;
        zBall = 200;
        // 速度をリセット
        xSpeed = 0; // X軸方向の速度
        ySpeed = -5; // Y軸方向の速度
        zSpeed = -1; // Z軸方向の速度（手前に向かう）
    }
    return false;
}

function checkGameOver() {
    if (yBall >= height / 2) {
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
    xSpeed = Math.random() * 5;
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
    fill(255); // 白色を指定
    noStroke(); // 線を非表示にする
    translate(xBall, yBall, zBall); // 3D空間内での位置を指定
    sphere(20); // 半径20の球を描画
    // translate(-xBall, -yBall, -zBall); // 位置を元に戻す
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
