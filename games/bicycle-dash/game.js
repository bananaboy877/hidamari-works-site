const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const lapsEl = document.querySelector("#laps");
const prefectureEl = document.querySelector("#prefecture");
const distanceEl = document.querySelector("#distance");
const gearEl = document.querySelector("#gear");
const promptEl = document.querySelector("#prompt");
const riderToggleEl = document.querySelector("#riderToggle");
const toastEl = document.querySelector("#toast");

const PREFECTURE_DISTANCE = 500;
const prefectures = [
  { name: "北海道", file: "01-hokkaido.png", sky: "#7cc9ec" },
  { name: "青森", file: "02-aomori.png", sky: "#86c8e8" },
  { name: "岩手", file: "21-iwate.png", sky: "#86c8e6" },
  { name: "宮城", file: "11-miyagi.png", sky: "#85cbea" },
  { name: "秋田", file: "12-akita.png", sky: "#9cc8df" },
  { name: "山形", file: "22-yamagata.png", sky: "#91cbe8" },
  { name: "福島", file: "13-fukushima.png", sky: "#8bccea" },
  { name: "茨城", file: "23-ibaraki.png", sky: "#7dcfee" },
  { name: "栃木", file: "24-tochigi.png", sky: "#9bc9cf" },
  { name: "群馬", file: "25-gunma.png", sky: "#87c8e8" },
  { name: "埼玉", file: "26-saitama.png", sky: "#86c9e9" },
  { name: "千葉", file: "14-chiba.png", sky: "#7ccfed" },
  { name: "東京", file: "03-tokyo.png", sky: "#8ad0ee" },
  { name: "神奈川", file: "04-kanagawa.png", sky: "#74c7ed" },
  { name: "新潟", file: "27-niigata.png", sky: "#89cbea" },
  { name: "富山", file: "28-toyama.png", sky: "#80c7eb" },
  { name: "石川", file: "16-ishikawa.png", sky: "#7fc4e8" },
  { name: "福井", file: "29-fukui.png", sky: "#77c5e7" },
  { name: "山梨", file: "05-yamanashi.png", sky: "#8ccded" },
  { name: "長野", file: "06-nagano.png", sky: "#83c7e6" },
  { name: "岐阜", file: "30-gifu.png", sky: "#91c9df" },
  { name: "静岡", file: "15-shizuoka.png", sky: "#88cfee" },
  { name: "愛知", file: "31-aichi.png", sky: "#85c9e9" },
  { name: "三重", file: "32-mie.png", sky: "#7ec8ea" },
  { name: "滋賀", file: "33-shiga.png", sky: "#88cce9" },
  { name: "京都", file: "07-kyoto.png", sky: "#b9d8c0" },
  { name: "大阪", file: "18-osaka.png", sky: "#86c7e7" },
  { name: "兵庫", file: "34-hyogo.png", sky: "#83c7e8" },
  { name: "奈良", file: "17-nara.png", sky: "#d6d6c4" },
  { name: "和歌山", file: "35-wakayama.png", sky: "#78c8e8" },
  { name: "鳥取", file: "36-tottori.png", sky: "#82cbea" },
  { name: "島根", file: "37-shimane.png", sky: "#8fc1d8" },
  { name: "岡山", file: "38-okayama.png", sky: "#95cce5" },
  { name: "広島", file: "08-hiroshima.png", sky: "#83caeb" },
  { name: "山口", file: "39-yamaguchi.png", sky: "#78d0ed" },
  { name: "徳島", file: "40-tokushima.png", sky: "#82cae7" },
  { name: "香川", file: "41-kagawa.png", sky: "#85cbe8" },
  { name: "愛媛", file: "09-ehime.png", sky: "#8fd1ef" },
  { name: "高知", file: "42-kochi.png", sky: "#78c8ec" },
  { name: "福岡", file: "19-fukuoka.png", sky: "#82cdeb" },
  { name: "佐賀", file: "43-saga.png", sky: "#91cbdc" },
  { name: "長崎", file: "44-nagasaki.png", sky: "#82c6e8" },
  { name: "熊本", file: "45-kumamoto.png", sky: "#86c9e4" },
  { name: "大分", file: "46-oita.png", sky: "#88c8e6" },
  { name: "宮崎", file: "47-miyazaki.png", sky: "#73cceb" },
  { name: "鹿児島", file: "20-kagoshima.png", sky: "#78c7e9" },
  { name: "沖縄", file: "10-okinawa.png", sky: "#65d4ea" },
].map((prefecture) => {
  const image = new Image();
  image.src = `assets/prefectures/${prefecture.file}`;
  return { ...prefecture, image };
});

const riderImages = {
  male: new Image(),
  female: new Image(),
};
riderImages.male.src = "assets/cyclist.png";
riderImages.female.src = "assets/cyclist-female.png";

let currentRider = new URLSearchParams(window.location.search).get("rider") === "female" ? "female" : "male";

const state = {
  width: 0,
  height: 0,
  dpr: 1,
  speed: 0,
  targetKick: 0,
  scroll: 0,
  distance: 0,
  lapLength: PREFECTURE_DISTANCE * prefectures.length,
  laps: 0,
  prefectureIndex: 0,
  gear: 0,
  lastTime: performance.now(),
  started: false,
  wind: [],
  grass: [],
};

const gears = [
  { name: "軽", kick: 8.5, drag: .986, max: 820, sway: 1.25 },
  { name: "重", kick: 13.8, drag: .979, max: 980, sway: .72 },
];

function resize() {
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  canvas.width = Math.floor(state.width * state.dpr);
  canvas.height = Math.floor(state.height * state.dpr);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  seedGrass();
}

function seedGrass() {
  const count = Math.max(24, Math.floor(state.width / 28));
  state.grass = Array.from({ length: count }, (_, index) => ({
    x: index / count,
    h: 8 + Math.random() * 26,
    lean: Math.random() * 10 - 5,
    tone: Math.random(),
  }));
}

function changeGear() {
  state.gear = (state.gear + 1) % gears.length;
  gearEl.textContent = gears[state.gear].name;
  state.speed += state.gear === 1 ? 80 : 28;
  state.started = true;
  promptEl.classList.add("hidden");
}

function showLap() {
  toastEl.classList.remove("show");
  void toastEl.offsetWidth;
  toastEl.classList.add("show");
}

function updateRiderButton() {
  riderToggleEl.textContent = `キャラ変更: ${currentRider === "female" ? "女の子" : "男の子"}`;
}

function toggleRider() {
  currentRider = currentRider === "female" ? "male" : "female";
  updateRiderButton();
}

function onWheel(event) {
  event.preventDefault();
  const currentGear = gears[state.gear];
  const impulse = Math.min(90, Math.abs(event.deltaY || event.wheelDelta || 0));
  state.speed += impulse * currentGear.kick;
  state.speed = Math.min(state.speed, currentGear.max);
  state.started = true;
  promptEl.classList.add("hidden");
}

function onKeyDown(event) {
  if (event.key.toLowerCase() !== "f" || event.repeat) return;
  event.preventDefault();
  changeGear();
}

function update(dt) {
  const currentGear = gears[state.gear];
  state.speed *= Math.pow(currentGear.drag, dt * 60);
  if (state.speed < 2) state.speed = 0;

  const meters = state.speed * dt * .045;
  state.distance += meters;
  state.scroll += state.speed * dt;

  const nextLap = Math.floor(state.distance / state.lapLength);
  if (nextLap > state.laps) {
    state.laps = nextLap;
    lapsEl.textContent = state.laps.toString();
    toastEl.textContent = "LAP!";
    showLap();
  }

  const nextPrefecture = Math.floor(state.distance / PREFECTURE_DISTANCE) % prefectures.length;
  if (nextPrefecture !== state.prefectureIndex) {
    state.prefectureIndex = nextPrefecture;
    prefectureEl.textContent = prefectures[state.prefectureIndex].name;
    toastEl.textContent = prefectures[state.prefectureIndex].name;
    showLap();
  }

  distanceEl.textContent = Math.floor(state.distance % state.lapLength).toString();

  if (state.speed > 260 && Math.random() < dt * 9) {
    state.wind.push({
      x: state.width + 80,
      y: state.height * (.28 + Math.random() * .46),
      len: 38 + Math.random() * 90,
      alpha: .18 + Math.random() * .2,
    });
  }

  state.wind = state.wind
    .map((gust) => ({ ...gust, x: gust.x - (state.speed * dt * 1.5 + 220 * dt) }))
    .filter((gust) => gust.x > -gust.len - 40);
}

function drawMirroredImage(image, x, y, w, h, index) {
  if (index % 2 === 0) {
    ctx.drawImage(image, x, y, w, h);
    return;
  }
  ctx.save();
  ctx.translate(x + w, y);
  ctx.scale(-1, 1);
  ctx.drawImage(image, 0, 0, w, h);
  ctx.restore();
}

function drawBackground() {
  const w = state.width;
  const h = state.height;
  const current = prefectures[state.prefectureIndex];
  ctx.fillStyle = current.sky;
  ctx.fillRect(0, 0, w, h);

  drawPrefectureLayer(current.image, 1);

  const progress = (state.distance % PREFECTURE_DISTANCE) / PREFECTURE_DISTANCE;
  if (progress > .86) {
    const next = prefectures[(state.prefectureIndex + 1) % prefectures.length];
    drawPrefectureLayer(next.image, (progress - .86) / .14);
  }

  const shade = ctx.createLinearGradient(0, 0, 0, h);
  shade.addColorStop(0, "rgba(255,255,255,.12)");
  shade.addColorStop(.62, "rgba(255,255,255,0)");
  shade.addColorStop(1, "rgba(16,32,42,.22)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
}

function drawPrefectureLayer(image, alpha) {
  if (!image.complete || !image.naturalWidth || alpha <= 0) return;

  const w = state.width;
  const h = state.height;
  const bgRatio = image.naturalWidth / image.naturalHeight;
  const drawH = Math.max(h, w / bgRatio);
  const drawW = drawH * bgRatio;
  const y = Math.min(0, h - drawH);
  const offset = ((state.scroll * .72) % drawW + drawW) % drawW;
  const start = -offset - drawW;
  const firstIndex = Math.floor((state.scroll * .72) / drawW) - 1;

  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 4; i += 1) {
    drawMirroredImage(image, start + drawW * i, y, drawW, drawH, firstIndex + i);
  }
  ctx.restore();
}

function drawGrass() {
  const ground = state.height * .83;
  state.grass.forEach((blade, index) => {
    const lane = (blade.x * state.width - (state.scroll * (1.25 + blade.tone * .5)) % state.width + state.width) % state.width;
    const x = lane;
    const sway = Math.sin(performance.now() * .006 + index) * 5;
    ctx.strokeStyle = blade.tone > .52 ? "rgba(46, 127, 69, .58)" : "rgba(255, 248, 232, .44)";
    ctx.lineWidth = blade.tone > .52 ? 2 : 1.4;
    ctx.beginPath();
    ctx.moveTo(x, ground + 26);
    ctx.quadraticCurveTo(x + blade.lean + sway, ground + 12, x + blade.lean * 1.5 + sway, ground + 26 - blade.h);
    ctx.stroke();
  });
}

function drawWind() {
  state.wind.forEach((gust) => {
    ctx.strokeStyle = `rgba(255, 255, 255, ${gust.alpha})`;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(gust.x, gust.y);
    ctx.quadraticCurveTo(gust.x + gust.len * .38, gust.y - 10, gust.x + gust.len, gust.y);
    ctx.stroke();
  });
}

function drawCyclist(now) {
  const cyclist = riderImages[currentRider];
  if (!cyclist.complete || !cyclist.naturalWidth) return;

  const baseW = Math.min(state.width * .42, state.height * .56, 520);
  const bikeW = Math.max(250, baseW);
  const bikeH = bikeW * (cyclist.naturalHeight / cyclist.naturalWidth);
  const x = state.width * .22;
  const y = state.height * .73 - bikeH;
  const currentGear = gears[state.gear];
  const bob = Math.sin(now * .012 + state.scroll * .018) * currentGear.sway * Math.min(1, state.speed / 320);

  const shadowW = bikeW * .68;
  const shadowX = x + bikeW * .14;
  const shadowY = y + bikeH * .91;
  const shadow = ctx.createRadialGradient(shadowX + shadowW / 2, shadowY, 4, shadowX + shadowW / 2, shadowY, shadowW / 2);
  shadow.addColorStop(0, "rgba(16, 32, 42, .22)");
  shadow.addColorStop(1, "rgba(16, 32, 42, 0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(shadowX + shadowW / 2, shadowY, shadowW / 2, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(x, y + bob);
  ctx.drawImage(cyclist, 0, 0, bikeW, bikeH);

  const wheelY = bikeH * .79;
  const rearX = bikeW * .2;
  const frontX = bikeW * .78;
  const radius = bikeW * .118;
  const spin = state.scroll * .025;
  drawWheelSpin(rearX, wheelY, radius, spin);
  drawWheelSpin(frontX, wheelY, radius, spin);
  ctx.restore();
}

function drawWheelSpin(x, y, radius, spin) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.strokeStyle = "rgba(255, 255, 255, .44)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 8; i += 1) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(-radius * .85, 0);
    ctx.lineTo(radius * .85, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function drawIdleOverlay() {
  if (state.started) return;
  ctx.fillStyle = "rgba(16, 32, 42, .12)";
  ctx.fillRect(0, 0, state.width, state.height);
}

function draw(now) {
  drawBackground();
  drawWind();
  drawGrass();
  drawCyclist(now);
  drawIdleOverlay();
}

function loop(now) {
  const dt = Math.min(.05, (now - state.lastTime) / 1000);
  state.lastTime = now;
  update(dt);
  draw(now);
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);
window.addEventListener("wheel", onWheel, { passive: false });
window.addEventListener("keydown", onKeyDown);
riderToggleEl.addEventListener("click", toggleRider);

updateRiderButton();
resize();
requestAnimationFrame(loop);
