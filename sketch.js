const width = 1000;
const height = 600;
const japaneseFont = '"Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif';

// z = 0 は手前（プレイヤー）、z = 1 は奥（相手）。
// 3D は使わず、深度に応じた縮尺で 2D のコートに投影する。
const court = {
  centerX: width / 2,
  nearY: height - 102,
  farY: 316,
  nearScale: 1.16,
  farScale: 0.60,
  halfWidth: 185
};

const maxLife = 5;
let playerLife = maxLife;
let opponentLife = maxLife;
let gameState = "playing"; // playing, win, lose
let ball;
let playerX;
let opponentX;
let message = "";
let messageTimer = 0;

function setup() {
  createCanvas(width, height);
  // 日本語を標準搭載しているフォントを優先し、未読込の Web フォントに依存しない。
  textFont(japaneseFont);
  playerX = width / 2;
  opponentX = width / 2;
  resetBall("opponent");
}

function draw() {
  drawBackground();
  drawCourt();

  if (gameState === "playing") {
    playerX = constrain(mouseX, 290, 710);
    updateOpponent();
    updateBall();
  }

  drawOpponent();
  drawBall();
  drawPlayer();
  drawHud();

  if (messageTimer > 0 && gameState === "playing") {
    messageTimer--;
    drawMessage(message, 28, color(255));
  }

  if (gameState !== "playing") drawEndScreen();
}

function resetBall(server) {
  // 高さ(h)と上下速度(vh)に重力を加えることで、放物線の軌道を作る。
  ball = {
    x: random(-55, 55),
    // 相手の位置から大きく打ち上げ、手前へ落ちてくるサーブ。
    z: server === "opponent" ? 0.95 : 0.05,
    h: 20,
    vx: random(-1.0, 1.0),
    vz: server === "opponent" ? -0.010 : 0.010,
    vh: 12.85,
    sway: 0,
    swayPhase: 0,
    trail: []
  };
}

function updateBall() {
  ball.x += ball.vx + ball.sway * sin(frameCount * 0.18 + ball.swayPhase);
  ball.z += ball.vz;
  ball.h += ball.vh;
  ball.vh -= 0.271; // 約90フレームかけて頂点から落ちる重力加速度
  ball.trail.push({ x: ball.x, z: ball.z, h: ball.h });
  if (ball.trail.length > 30) ball.trail.shift();

  if (abs(ball.x) > court.halfWidth) {
    ball.x = constrain(ball.x, -court.halfWidth, court.halfWidth);
    ball.vx *= -1;
  }

  // 地面に触れたら、その側のプレイヤーが落とした扱いにする。
  if (ball.h <= 0) {
    if (ball.vz < 0) playerMiss();
    else opponentMiss();
    return;
  }

  if (ball.vz < 0 && ball.z <= 0.045) {
    if (canPlayerHit()) returnBallByPlayer();
    else if (ball.z < -0.035) playerMiss();
  }

  if (ball.vz > 0 && ball.z >= 0.955) returnBallByOpponent();
}

function updateOpponent() {
  // 奥の相手は少し遅れてシャトルを追うので、完全には機械的に見えない。
  const target = project(ball.x, ball.z).x;
  opponentX = lerp(opponentX, target, 0.055);
  opponentX = constrain(opponentX, 405, 595);
}

function canPlayerHit() {
  const p = project(ball.x, ball.z);
  // 手前のラケットの届く高さにあるときだけ打ち返せる。
  return abs(p.x - playerX) < 78 && ball.h < 205;
}

function returnBallByPlayer() {
  opponentLife--;

  if (opponentLife <= 0) {
    gameState = "win";
    return;
  }

  ball.z = 0.05;
  ball.vz = 0.010;
  ball.vx = constrain((ball.x - screenToWorldX(playerX, 0)) * 0.045, -4.2, 4.2);
  // 各ラリーを同じ高さから打ち上げ、重力で弧を描かせる。
  ball.h = 20;
  ball.vh = 12.85;
  ball.sway = 0;
  ball.trail = [];
}

function returnBallByOpponent() {
  ball.z = 0.95;
  ball.vz = -0.010;
  // 相手の返球は中央付近を狙いつつ、毎回左右へ異なる小さな揺れを加える。
  ball.x = constrain(ball.x, -90, 90);
  ball.vx = random(-1.0, 1.0);
  ball.h = 20;
  ball.vh = 12.85;
  ball.sway = random(0.12, 0.32) * (random() < 0.5 ? -1 : 1);
  ball.swayPhase = random(TWO_PI);
  ball.trail = [];
}

function playerMiss() {
  playerLife--;
  showMessage("MISS!  自分のライフ -1");
  if (playerLife <= 0) gameState = "lose";
  else resetBall("opponent");
}

function opponentMiss() {
  opponentLife--;
  if (opponentLife <= 0) gameState = "win";
  else resetBall("opponent");
}

function project(worldX, z) {
  const scale = lerp(court.nearScale, court.farScale, z);
  return {
    x: court.centerX + worldX * scale,
    floorY: lerp(court.nearY, court.farY, z),
    scale: scale
  };
}

function screenToWorldX(screenX, z) {
  return (screenX - court.centerX) / lerp(court.nearScale, court.farScale, z);
}

function drawBackground() {
  const horizon = 275;
  noStroke();
  for (let y = 0; y < horizon; y += 4) {
    const amount = map(y, 0, horizon, 0, 1);
    fill(lerpColor(color(115, 198, 242), color(230, 246, 255), amount));
    rect(0, y, width, 4);
  }

  // 遠くの富士山と木立で、正月の原っぱらしい遠景を作る。
  fill(126, 163, 185);
  triangle(590, horizon, 745, 111, 900, horizon);
  fill(247, 250, 251);
  triangle(685, 193, 745, 111, 805, 193);
  fill(97, 145, 108);
  for (let x = -20; x < width + 30; x += 44) {
    const treeHeight = 27 + (x % 3) * 8;
    ellipse(x, horizon - treeHeight / 2, 62, treeHeight + 22);
  }

  fill(110, 181, 83);
  rect(0, horizon, width, height - horizon);
  // 水平の草のレイヤー。上から見下ろす格子ではなく、地平線へ続く芝にする。
  for (let i = 0; i < 7; i++) {
    const y = horizon + i * i * 7;
    stroke(76, 154, 67, 105);
    strokeWeight(3 + i);
    line(0, y, width, y);
  }
  noStroke();
}

function drawCourt() {
  // 羽根突きはネットを挟まず向かい合う遊びなので、足元の目印だけを置く。
  stroke(245, 250, 222, 180);
  strokeWeight(3);
  line(115, court.nearY + 26, 885, court.nearY + 26);
  stroke(245, 250, 222, 105);
  strokeWeight(2);
  line(290, court.farY + 13, 710, court.farY + 13);
  noStroke();
}

function drawBall() {
  for (let i = 0; i < ball.trail.length; i++) {
    const previous = ball.trail[i];
    const p = project(previous.x, previous.z);
    const alpha = map(i, 0, ball.trail.length, 8, 72);
    fill(255, 255, 255, alpha);
    circle(p.x, p.floorY - previous.h * p.scale, 3 + i * 0.16);
  }

  const p = project(ball.x, ball.z);
  const ballY = p.floorY - ball.h * p.scale;
  const size = 18 * p.scale + 4;

  // 高さに応じて影が羽根から離れ、浮遊感を出す。
  noStroke();
  fill(0, 0, 0, 65);
  ellipse(p.x, p.floorY + 3, size * 1.8, size * 0.5);
  fill(68, 37, 19);
  ellipse(p.x, ballY + size * 0.29, size * 0.48, size * 0.4);
  fill(245, 75, 72);
  triangle(p.x - size * 0.52, ballY + size * 0.18, p.x, ballY - size * 1.05, p.x + size * 0.16, ballY + size * 0.2);
  fill(255, 239, 95);
  triangle(p.x - size * 0.08, ballY + size * 0.18, p.x + size * 0.46, ballY - size * 0.92, p.x + size * 0.52, ballY + size * 0.23);
}

function drawPlayer() {
  const paddleY = court.nearY - 23;
  push();
  translate(playerX, paddleY);
  scale(1.38); // 手前の人物を大きく描き、キャラクターに寄った構図にする。
  noStroke();
  fill(20, 27, 48, 185);
  ellipse(0, 37, 74, 19);
  fill(255, 172, 72);
  circle(0, 0, 42);
  fill(255, 236, 200);
  circle(0, -26, 31);
  fill(245, 88, 92);
  rect(-23, 15, 46, 26, 8);
  // 羽子板は縦長の木札。花模様を加えて、ラケットではなく羽子板に見せる。
  stroke(107, 55, 23);
  strokeWeight(8);
  line(19, 16, 42, -37);
  noStroke();
  fill(232, 94, 67);
  ellipse(48, -65, 31, 76);
  fill(255, 228, 112);
  circle(48, -65, 10);
  circle(39, -52, 7);
  circle(57, -52, 7);
  pop();
}

function drawOpponent() {
  const y = court.farY - 7;
  push();
  translate(opponentX, y);
  scale(1.18);
  noStroke();
  fill(5, 15, 31, 170);
  ellipse(0, 17, 40, 9);
  fill(104, 176, 255);
  circle(0, 0, 24);
  fill(255, 222, 178);
  circle(0, -16, 18);
  fill(53, 91, 184);
  rect(-12, 10, 24, 16, 4);
  stroke(107, 55, 23);
  strokeWeight(4);
  line(10, 8, 24, -18);
  noStroke();
  fill(235, 105, 73);
  ellipse(28, -29, 17, 38);
  fill(255, 228, 112);
  circle(28, -29, 5);
  pop();
}

function drawHud() {
  drawLifeIndicator("YOU", playerLife, 34, 28, color(255, 111, 112));
  drawLifeIndicator("OPPONENT", opponentLife, width - 294, 28, color(104, 176, 255));
  fill(255, 245);
  textAlign(CENTER, TOP);
  textSize(15);
  text("マウスでラケットを動かしてシャトルを打ち返そう", width / 2, 24);
}

function drawLifeIndicator(label, life, x, y, lifeColor) {
  fill(255);
  textAlign(LEFT, TOP);
  textSize(16);
  text(label, x, y);
  for (let i = 0; i < maxLife; i++) {
    fill(i < life ? lifeColor : color(255, 255, 255, 55));
    rect(x + i * 42, y + 27, 31, 12, 6);
  }
}

function showMessage(nextMessage) {
  message = nextMessage;
  messageTimer = 70;
}

function drawMessage(label, size, ink) {
  textAlign(CENTER, CENTER);
  textSize(size);
  fill(0, 120);
  text(label, width / 2 + 2, height / 2 + 2);
  fill(ink);
  text(label, width / 2, height / 2);
}

function drawEndScreen() {
  noStroke();
  fill(0, 0, 0, 165);
  rect(0, 0, width, height);
  const won = gameState === "win";
  drawMessage(won ? "YOU WIN" : "YOU LOSE", 64, won ? color(255, 229, 92) : color(255, 120, 120));
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(19);
  text("クリックしてもう一度プレイ", width / 2, height / 2 + 57);
}

function mousePressed() {
  if (gameState === "playing") return false;
  playerLife = maxLife;
  opponentLife = maxLife;
  gameState = "playing";
  messageTimer = 0;
  resetBall("opponent");
  return false;
}
