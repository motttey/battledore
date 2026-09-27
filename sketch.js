const width = 1000;
const height = 600;
const japaneseFont = '"Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif';
const fenceBottom = 426;
const opponentSize = 315;
const opponentHitDuration = 300;
const characterCards = [
  { x: 270, y: 318 },
  { x: 500, y: 318 },
  { x: 730, y: 318 }
];
const characterCardWidth = 190;
const characterCardHeight = 236;

// 選択キャラクターごとのゲーム設定。
// 軌道を変えたいときは各 profile の flight を調整するだけでよい。
// z は 0 がプレイヤー側、1 が相手側。h / vh は羽根の高さと初速。
const characterProfiles = [
  {
    id: 1,
    name: "まっすぐタイプ",
    summary: "素直で安定した返球",
    arcLabel: "標準軌道",
    accent: [255, 111, 112],
    imagePaths: { idle: "assets/enemy1.png", hit: "assets/enemy2.png", hagoita: "assets/hagoita.png" },
    player: { moveMin: 290, moveMax: 710, hitDistance: 78, hitMaxHeight: 205 },
    flight: {
      opponentServe: { startXRange: 55, startZ: 0.95, startHeight: 270, vz: -0.007, vh: 4.99, xVelocityRange: 0.7, windRange: 0.004 },
      playerReturn: { startZ: 0.05, startHeight: 20, vz: 0.007, vh: 8.34, xVelocityMultiplier: 0.0315, maxXVelocity: 2.94, windRange: 0.004 },
      opponentReturn: { startZ: 0.95, startHeight: 270, vz: -0.007, vh: 4.99, xVelocityRange: 0.7, maxX: 90, windRange: 0.004 }
    }
  },
  {
    id: 2,
    name: "ふんわりタイプ",
    summary: "高くゆるやかな放物線",
    arcLabel: "高い放物線",
    accent: [255, 190, 77],
    imagePaths: { idle: "assets/enemy1.png", hit: "assets/enemy2.png", hagoita: "assets/hagoita.png" },
    player: { moveMin: 278, moveMax: 722, hitDistance: 88, hitMaxHeight: 230 },
    flight: {
      opponentServe: { startXRange: 42, startZ: 0.95, startHeight: 250, vz: -0.0062, vh: 5.65, xVelocityRange: 0.45, windRange: 0.002 },
      playerReturn: { startZ: 0.05, startHeight: 18, vz: 0.0062, vh: 9.25, xVelocityMultiplier: 0.024, maxXVelocity: 2.2, windRange: 0.002 },
      opponentReturn: { startZ: 0.95, startHeight: 250, vz: -0.0062, vh: 5.65, xVelocityRange: 0.45, maxX: 76, windRange: 0.002 }
    }
  },
  {
    id: 3,
    name: "くせ球タイプ",
    summary: "横風に乗る変化球",
    arcLabel: "横に流れる軌道",
    accent: [111, 201, 255],
    imagePaths: { idle: "assets/enemy1.png", hit: "assets/enemy2.png", hagoita: "assets/hagoita.png" },
    player: { moveMin: 300, moveMax: 700, hitDistance: 70, hitMaxHeight: 190 },
    flight: {
      opponentServe: { startXRange: 75, startZ: 0.95, startHeight: 255, vz: -0.0077, vh: 4.6, xVelocityRange: 1.05, windRange: 0.009 },
      playerReturn: { startZ: 0.05, startHeight: 20, vz: 0.0077, vh: 7.75, xVelocityMultiplier: 0.043, maxXVelocity: 3.65, windRange: 0.009 },
      opponentReturn: { startZ: 0.95, startHeight: 255, vz: -0.0077, vh: 4.6, xVelocityRange: 1.05, maxX: 115, windRange: 0.009 }
    }
  }
];

// z = 0 は手前（プレイヤー）、z = 1 は奥（相手）。
// 3D は使わず、深度に応じた縮尺で 2D のコートに投影する。
const court = {
  centerX: width / 2,
  nearY: height - 62,
  farY: 395,
  nearScale: 1.16,
  farScale: 0.60
};

const maxLife = 5;
const hagoitaDisplayDuration = 350;
let playerLife = maxLife;
let opponentLife = maxLife;
let gameState = "start"; // start, playing, win, lose
let ball;
let playerX;
let opponentX;
let message = "";
let messageTimer = 0;
let audioCtx;
let playerHit = null;
let opponentHit = null;
let selectedCharacter = 0;

function selectedProfile() {
  return characterProfiles[selectedCharacter];
}

async function setup() {
  createCanvas(width, height);
  await loadCharacterImages();
  // 日本語を標準搭載しているフォントを優先し、未読込の Web フォントに依存しない。
  textFont(japaneseFont);
  playerX = width / 2;
  opponentX = width / 2;
  resetBall();
  // キャンバス外で最初にクリックした場合にも、以後の打球音を有効にする。
  document.addEventListener("pointerdown", enableSound, { once: true });
}

async function loadCharacterImages() {
  // 同じパスを複数の profile で使う場合も、一度だけロードする。
  const imageCache = new Map();
  const load = (path) => {
    if (!imageCache.has(path)) imageCache.set(path, loadImage(path));
    return imageCache.get(path);
  };

  await Promise.all(characterProfiles.map(async (profile) => {
    const paths = profile.imagePaths;
    const [idle, hit, hagoita] = await Promise.all([
      load(paths.idle),
      load(paths.hit),
      load(paths.hagoita)
    ]);
    profile.images = { idle, hit, hagoita };
  }));
}

function draw() {
  drawBackground();

  if (gameState === "start") {
    drawStartScreen();
    return;
  }

  drawCourt();

  if (gameState === "playing") {
    const controls = selectedProfile().player;
    playerX = constrain(mouseX, controls.moveMin, controls.moveMax);
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

function resetBall() {
  const flight = selectedProfile().flight.opponentServe;
  // 高さ(h)と上下速度(vh)に重力を加えることで、放物線の軌道を作る。
  // サーブも選択キャラクターの profile から生成する。
  ball = {
    x: random(-flight.startXRange, flight.startXRange),
    z: flight.startZ,
    h: flight.startHeight,
    vx: random(-flight.xVelocityRange, flight.xVelocityRange),
    vz: flight.vz,
    vh: flight.vh,
    wind: random(-flight.windRange, flight.windRange),
    trail: []
  };
}

function updateBall() {
  // 横方向には打球ごとに異なる弱い風圧だけを加え、急な反転のない自然な揺れにする。
  ball.x += ball.vx;
  ball.vx += ball.wind;
  ball.z += ball.vz;
  ball.h += ball.vh;
  ball.vh -= 0.1; // ゆっくり頂点へ上がり、重力で落ちる
  ball.trail.push({ x: ball.x, z: ball.z, h: ball.h });
  if (ball.trail.length > 30) ball.trail.shift();

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
  opponentX = constrain(opponentX, 430, 570);
}

function canPlayerHit() {
  const p = project(ball.x, ball.z);
  const controls = selectedProfile().player;
  // 手前のラケットの届く高さにあるときだけ打ち返せる。
  return abs(p.x - playerX) < controls.hitDistance && ball.h < controls.hitMaxHeight;
}

function returnBallByPlayer() {
  const flight = selectedProfile().flight.playerReturn;
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

  ball.z = flight.startZ;
  ball.vz = flight.vz;
  ball.vx = constrain(
    (ball.x - screenToWorldX(playerX, 0)) * flight.xVelocityMultiplier,
    -flight.maxXVelocity,
    flight.maxXVelocity
  );
  ball.h = flight.startHeight;
  ball.vh = flight.vh;
  ball.wind = random(-flight.windRange, flight.windRange);
  ball.trail = [];
}

function returnBallByOpponent() {
  const flight = selectedProfile().flight.opponentReturn;
  playHagoitaHitSE();
  opponentHit = { expiresAt: millis() + opponentHitDuration };
  ball.z = flight.startZ;
  ball.vz = flight.vz;
  // 相手の返球にもわずかな風圧を与え、緩く横へ流れるようにする。
  ball.x = constrain(ball.x, -flight.maxX, flight.maxX);
  ball.vx = random(-flight.xVelocityRange, flight.xVelocityRange);
  ball.h = flight.startHeight;
  ball.vh = flight.vh;
  ball.wind = random(-flight.windRange, flight.windRange);
  ball.trail = [];
}

function playerMiss() {
  playerLife--;
  if (playerLife <= 0) gameState = "lose";
  else resetBall();
}

function opponentMiss() {
  opponentLife--;
  if (opponentLife <= 0) gameState = "win";
  else resetBall();
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
  // 羽根突き用の線は描かず、原っぱをそのまま遊び場にする。
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
  image(selectedProfile().images.hagoita, 0, 0, 78, 104);
  noTint();
  pop();

}

function drawOpponent() {
  const images = selectedProfile().images;
  push();
  // 塀の最下端に足を接地させ、そのすぐ下に影を落とす。
  noStroke();
  fill(25, 48, 24, 105);
  ellipse(opponentX, fenceBottom + 5, opponentSize * 0.58, 14);
  imageMode(CENTER);

  const isHitting = opponentHit && millis() < opponentHit.expiresAt;
  image(isHitting ? images.hit : images.idle,
        opponentX, fenceBottom - opponentSize / 2, opponentSize, opponentSize);
  if (!isHitting) opponentHit = null;
  pop();
}

function characterAt(screenX, screenY) {
  return characterCards.findIndex((card) =>
    abs(screenX - card.x) <= characterCardWidth / 2 &&
    abs(screenY - card.y) <= characterCardHeight / 2
  );
}

function drawStartScreen() {
  noStroke();
  fill(7, 20, 37, 170);
  rect(0, 0, width, height);

  fill(255, 233, 126);
  textAlign(CENTER, CENTER);
  textSize(50);
  text("はねつき", width / 2, 78);
  fill(255);
  textSize(18);
  text("キャラクターを選んでクリックすると開始します", width / 2, 126);

  const hoveredCard = characterAt(mouseX, mouseY);
  cursor(hoveredCard >= 0 ? HAND : ARROW);

  for (let i = 0; i < characterCards.length; i++) {
    const card = characterCards[i];
    const profile = characterProfiles[i];
    const isHovered = i === hoveredCard;
    const isSelected = i === selectedCharacter;

    stroke(isHovered || isSelected ? color(...profile.accent) : color(255, 255, 255, 150));
    strokeWeight(isHovered ? 5 : 2);
    fill(isHovered ? color(255, 255, 255, 235) : color(238, 248, 255, 215));
    rect(card.x - characterCardWidth / 2, card.y - characterCardHeight / 2,
         characterCardWidth, characterCardHeight, 18);

    imageMode(CENTER);
    image(isHovered ? profile.images.hit : profile.images.idle, card.x, card.y - 22, 132, 132);
    noStroke();
    fill(26, 65, 96);
    textSize(16);
    text(profile.name, card.x, card.y + 63);
    fill(93, 104, 116);
    textSize(13);
    text(profile.summary, card.x, card.y + 87);
    fill(...profile.accent);
    textSize(12);
    text(`羽根: ${profile.arcLabel}`, card.x, card.y + 108);
  }

  noStroke();
}

function drawHud() {
  drawLifeIndicator("YOU", playerLife, 34, 28, color(255, 111, 112));
  drawLifeIndicator("OPPONENT", opponentLife, width - 294, 28, color(104, 176, 255));
  const profile = selectedProfile();
  textAlign(CENTER, TOP);
  textSize(14);
  fill(...profile.accent);
  text(`YOU: ${profile.name}（${profile.arcLabel}）`, width / 2, 28);
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
  if (gameState === "start") {
    const cardIndex = characterAt(mouseX, mouseY);
    if (cardIndex >= 0) selectedCharacter = cardIndex;
    startGame();
    return false;
  }
  if (gameState === "playing") return false;
  startGame();
  return false;
}

function startGame() {
  playerLife = maxLife;
  opponentLife = maxLife;
  gameState = "playing";
  messageTimer = 0;
  playerHit = null;
  opponentHit = null;
  resetBall();
}
