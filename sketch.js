const width = 1000;
const height = 600;
const japaneseFont = '"Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif';

// z = 0 は手前（プレイヤー）、z = 1 は奥（相手）。
// 3D は使わず、深度に応じた縮尺で 2D のコートに投影する。
const court = {
  centerX: width / 2,
  nearY: height - 62,
  farY: 395,
  nearScale: 1.16,
  farScale: 0.60,
  halfWidth: 185
};

const maxLife = 5;
const hagoitaDisplayDuration = 350;
let playerLife = maxLife;
let opponentLife = maxLife;
let gameState = "playing"; // playing, win, lose
let ball;
let playerX;
let opponentX;
let message = "";
let messageTimer = 0;
let audioCtx;
let enemyImage;
let hagoitaImage;
let playerHit = null;

function preload() {
  enemyImage = loadImage("assets/enemy1.png");
  hagoitaImage = loadImage("assets/hagoita.png");
}

function setup() {
  createCanvas(width, height);
  // 日本語を標準搭載しているフォントを優先し、未読込の Web フォントに依存しない。
  textFont(japaneseFont);
  playerX = width / 2;
  opponentX = width / 2;
  resetBall("opponent");
  // キャンバス外で最初にクリックした場合にも、以後の打球音を有効にする。
  document.addEventListener("pointerdown", enableSound, { once: true });
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
  drawPlayerHit();
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
  const hitPoint = project(ball.x, ball.z);
  playerHit = {
    x: hitPoint.x,
    y: hitPoint.floorY - ball.h * hitPoint.scale,
    expiresAt: millis() + hagoitaDisplayDuration
  };
  playHagoitaHitSE();

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
  playHagoitaHitSE();
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
  const fenceTop = 150;
  const fenceBottom = 426;
  noStroke();
  for (let y = 0; y < fenceTop; y += 4) {
    const amount = map(y, 0, fenceTop, 0, 1);
    fill(lerpColor(color(102, 183, 228), color(221, 243, 249), amount));
    rect(0, y, width, 4);
  }

  // 参考画面に合わせ、奥は木立、中央は木の塀、手前は芝の庭にする。
  fill(21, 101, 72);
  rect(0, 90, width, 105);
  fill(37, 127, 78);
  for (let x = -35; x < width + 40; x += 58) {
    ellipse(x, 132 + (x % 4) * 3, 112, 91);
  }
  fill(52, 148, 79);
  for (let x = -20; x < width + 30; x += 70) {
    ellipse(x, 162 + (x % 5) * 2, 126, 64);
  }

  fill(132, 95, 52);
  rect(716, 48, 39, fenceBottom - 48);
  fill(159, 116, 64);
  rect(750, 62, 17, fenceBottom - 62);
  fill(197, 151, 95);
  rect(0, fenceTop, width, fenceBottom - fenceTop);
  stroke(135, 94, 53, 180);
  strokeWeight(3);
  for (let x = 0; x <= width; x += 44) line(x, fenceTop, x, fenceBottom);
  stroke(228, 183, 123, 120);
  strokeWeight(2);
  for (let y = fenceTop + 7; y < fenceBottom; y += 53) line(0, y, width, y);

  noStroke();
  fill(110, 181, 83);
  rect(0, fenceBottom, width, height - fenceBottom);
  // 水平の草のレイヤーで、画面手前へ続く芝にする。
  for (let i = 0; i < 7; i++) {
    const y = fenceBottom + i * i * 5;
    stroke(76, 154, 67, 105);
    strokeWeight(3 + i);
    line(0, y, width, y);
  }
  noStroke();
}

function drawCourt() {
  // プレーヤー側には線を置かず、奥側だけに控えめな距離の目印を置く。
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

function drawPlayerHit() {
  if (!playerHit || millis() >= playerHit.expiresAt) {
    playerHit = null;
    return;
  }

  // プレイヤー自身は画面の手前側にいる想定。返球の一瞬だけ羽子板を見せる。
  push();
  imageMode(CENTER);
  translate(playerHit.x + 18, playerHit.y + 13);
  rotate(-PI / 5);
  const remaining = playerHit.expiresAt - millis();
  const fade = map(remaining, 0, hagoitaDisplayDuration, 0, 255);
  tint(255, fade);
  image(hagoitaImage, 0, 0, 78, 104);
  noTint();
  pop();

}

function drawOpponent() {
  const y = court.farY + 9;
  push();
  imageMode(CENTER);
  // 奥側に立つ相手なので、地面に足元を合わせて小さめに配置する。
  image(enemyImage, opponentX, y - 80, 160, 160);
  pop();
}

function drawHud() {
  drawLifeIndicator("YOU", playerLife, 34, 28, color(255, 111, 112));
  drawLifeIndicator("OPPONENT", opponentLife, width - 294, 28, color(104, 176, 255));
  fill(255, 245);
  textAlign(CENTER, TOP);
  textSize(15);
  text("マウスで位置を合わせて羽根を打ち返そう", width / 2, 24);
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

// 羽子板の木に羽根が当たる、短く乾いた「パコン」という音。
function playHagoitaHitSE() {
  if (!audioCtx || audioCtx.state !== "running") return;

  const start = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const toneGain = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(720, start);
  osc.frequency.exponentialRampToValueAtTime(175, start + 0.09);
  toneGain.gain.setValueAtTime(0.18, start);
  toneGain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);
  osc.connect(toneGain).connect(audioCtx.destination);

  // ごく短いノイズを混ぜ、木札に当たる質感を加える。
  const length = Math.floor(audioCtx.sampleRate * 0.025);
  const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) samples[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  const noiseGain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.8;
  noise.buffer = buffer;
  noiseGain.gain.setValueAtTime(0.055, start);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, start + 0.035);
  noise.connect(filter).connect(noiseGain).connect(audioCtx.destination);

  osc.start(start);
  osc.stop(start + 0.13);
  noise.start(start);
  noise.stop(start + 0.035);
}

function enableSound() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
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
  enableSound();
  if (gameState === "playing") return false;
  playerLife = maxLife;
  opponentLife = maxLife;
  gameState = "playing";
  messageTimer = 0;
  playerHit = null;
  resetBall("opponent");
  return false;
}
