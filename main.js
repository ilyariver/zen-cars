// Schematic, not to scale: China south-west, Primorye east, the rest of Russia along the top edge.
const POINTS = [
  { x: 110, y: 400, km: 0, name: "Пекин", cn: "北京", dx: 18, dy: 6, anchor: "start" },
  { x: 380, y: 190, km: 1240, name: "Харбин", cn: "哈尔滨", dx: 0, dy: 34, anchor: "middle" },
  { x: 535, y: 175, km: 1780, name: "Суйфэньхэ", cn: "绥芬河", dx: -10, dy: -36, anchor: "end" },
  { x: 610, y: 175, km: 1800, name: "Пограничный", cn: "", dx: -20, dy: -24, anchor: "start" },
  { x: 660, y: 260, km: 1900, name: "Уссурийск", cn: "СВХ · лаборатория", dx: 0, dy: 34, anchor: "middle" },
  { x: 760, y: 90, km: null },
  // 1 900 км to Ussuriysk + about 9 300 км by road on to Moscow, the farthest city in the estimate.
  { x: 100, y: 70, km: 11200, name: "Ваш город", cn: "Новосибирск · Екатеринбург · Москва", dx: -8, dy: 32, anchor: "start" },
];

const STAGES = [
  {
    from: 0, to: 0, days: [1, 5], place: "北京 · Пекин",
    title: "Подбор и выкуп у дилера",
    text: "Находим машину у официального дилера, сверяем комплектацию, дату производства и VIN по документам дилера. Выкупаем по договору поручения на ваше имя.",
    risk: "10-й символ VIN — это модельный год. Машина 2024 года, проданная как 2025-я, всплывёт на таможне. Сверяем VIN и шильдик до оплаты.",
    docs: ["Договор поручения", "Инвойс дилера, ¥"],
  },
  {
    from: 0, to: 0, days: [5, 12], place: "北京 · Пекин",
    title: "Экспортное оформление",
    text: "Экспортёр оформляет вывоз: декларацию КНР и сертификат происхождения. Пробег фиксируем в акте при погрузке — машина уезжает новой.",
    risk: "Продавец без права на экспорт автомобилей — и машина не уйдёт с площадки. Работаем только с экспортёрами, у которых это право подтверждено документально.",
    docs: ["Экспортная декларация КНР", "Сертификат происхождения"],
  },
  {
    from: 0, to: 2, days: [12, 18], place: "北京 → 哈尔滨 → 绥芬河",
    title: "Автовоз до границы",
    text: "Около 1 800 км на автовозе через Харбин до Суйфэньхэ. Фотоотчёт при погрузке и на каждой перегрузке.",
    risk: "Зимой в Харбине −30 °C: летний антифриз и разряженная АКБ превращают перегон в эвакуацию. Готовим машину до погрузки.",
    docs: ["CMR-накладная", "Фотоакт погрузки"],
  },
  {
    from: 2, to: 3, days: [18, 20], place: "绥芬河 Суйфэньхэ → Пограничный",
    title: "Погранпереход",
    text: "Пересекаем границу по транзитной декларации. До склада временного хранения машина едет под таможенным контролем.",
    risk: "В сезон очередь на переходе — до нескольких суток. Мы закладываем её в срок, а не в оправдания.",
    docs: ["Транзитная декларация"],
  },
  {
    from: 3, to: 4, days: [20, 27], place: "Уссурийск · СВХ",
    title: "Растаможка",
    text: "Таможенный брокер подаёт документы, вы платите пошлину, сбор и утильсбор напрямую таможне. Выпуск фиксируется в ТПО.",
    risk: "Мощность в документах 163 л.с. вместо 160 — и льготного утильсбора уже нет. Сверяем мощность по одобрению типа до выкупа.",
    docs: ["ТПО", "Отметка о выпуске"],
  },
  {
    from: 4, to: 4, days: [27, 33], place: "Уссурийск · лаборатория",
    title: "СБКТС и ЭПТС",
    text: "Испытательная лаборатория осматривает машину и выдаёт СБКТС, на его основе оформляется ЭПТС. Если модели нужна ЭРА-ГЛОНАСС — ставим и активируем.",
    risk: "Китайская мультимедиа без русского языка лаборатории не мешает, а вам — каждый день. Русификацию делаем здесь же, до отправки.",
    docs: ["СБКТС", "ЭПТС"],
  },
  {
    from: 4, to: 6, days: [33, 45], place: "Уссурийск → ваш город",
    title: "Последняя миля",
    text: "Автовоз или ЖД-контейнер до вашего города. Принимаете машину по акту и с ЭПТС ставите её на учёт в ГИБДД.",
    risk: "Своим ходом 9 000 км — это пробег и износ ещё до первого ТО. По умолчанию везём на автовозе или в контейнере.",
    docs: ["Акт приёма-передачи"],
  },
];

const fmt = (n) => Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const SVG_NS = "http://www.w3.org/2000/svg";

const lengths = [0];
for (let i = 1; i < POINTS.length; i++) {
  const a = POINTS[i - 1], b = POINTS[i];
  lengths.push(lengths[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
}
const total = lengths[lengths.length - 1];
POINTS.forEach((p, i) => {
  if (p.km !== null) return;
  const prev = i - 1, next = i + 1;
  const f = (lengths[i] - lengths[prev]) / (lengths[next] - lengths[prev]);
  p.km = POINTS[prev].km + f * (POINTS[next].km - POINTS[prev].km);
});

const polyPoints = POINTS.map((p) => `${p.x},${p.y}`).join(" ");
const base = document.getElementById("route-base");
const ink = document.getElementById("route-ink");
base.setAttribute("points", polyPoints);
ink.setAttribute("points", polyPoints);
ink.style.strokeDasharray = `${total}`;

const stationsG = document.getElementById("stations");
const stationEls = [];
POINTS.forEach((p, i) => {
  if (!p.name) return;
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("class", "station");
  const c = document.createElementNS(SVG_NS, "circle");
  c.setAttribute("cx", p.x); c.setAttribute("cy", p.y); c.setAttribute("r", 8);
  const t = document.createElementNS(SVG_NS, "text");
  t.setAttribute("x", p.x + p.dx); t.setAttribute("y", p.y + p.dy);
  t.setAttribute("text-anchor", p.anchor);
  t.textContent = p.name;
  g.append(c, t);
  if (p.cn) {
    const s = document.createElementNS(SVG_NS, "text");
    s.setAttribute("class", "cn");
    s.setAttribute("x", p.x + p.dx); s.setAttribute("y", p.y + p.dy + 19);
    s.setAttribute("text-anchor", p.anchor);
    s.textContent = p.cn;
    g.append(s);
  }
  stationsG.append(g);
  stationEls.push({ el: g, at: lengths[i] });
});

const folderList = document.getElementById("folder-list");
const docEls = STAGES.map((s) => s.docs.map((d) => {
  const li = document.createElement("li");
  li.textContent = d;
  folderList.append(li);
  return li;
}));

const route = document.getElementById("route");
const car = document.getElementById("car");
const odo = document.getElementById("odo");
const dayEl = document.getElementById("day");
const stageNum = document.getElementById("stage-num");
const docCount = document.getElementById("doc-count");
const card = {
  place: document.getElementById("stage-place"),
  title: document.getElementById("stage-title"),
  text: document.getElementById("stage-text"),
  risk: document.getElementById("stage-risk"),
};

function pointAt(dist) {
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < dist) i++;
  const a = POINTS[i - 1], b = POINTS[i];
  const seg = lengths[i] - lengths[i - 1];
  const f = seg ? clamp((dist - lengths[i - 1]) / seg, 0, 1) : 0;
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    km: a.km + (b.km - a.km) * f,
    angle: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI,
  };
}

let shownStage = -1;
function renderRoute() {
  const rect = route.getBoundingClientRect();
  const span = route.offsetHeight - innerHeight;
  const p = clamp(-rect.top / span, 0, 1);
  const raw = p * STAGES.length;
  const idx = Math.min(STAGES.length - 1, Math.floor(raw));
  const t = p === 1 ? 1 : raw - idx;
  const s = STAGES[idx];

  const move = smooth(clamp((t - 0.1) / 0.8, 0, 1));
  const dist = lengths[s.from] + (lengths[s.to] - lengths[s.from]) * move;
  const pt = pointAt(Math.max(dist, 0.01));

  const flip = Math.abs(pt.angle) > 90;
  car.setAttribute("transform", flip
    ? `translate(${pt.x} ${pt.y}) rotate(${pt.angle - 180}) scale(-1 1)`
    : `translate(${pt.x} ${pt.y}) rotate(${pt.angle})`);
  ink.style.strokeDashoffset = `${total - dist}`;
  stationEls.forEach((st) => st.el.classList.toggle("reached", dist >= st.at - 0.5));

  odo.textContent = fmt(dist <= 0.01 ? 0 : pt.km);
  dayEl.textContent = Math.round(s.days[0] + (s.days[1] - s.days[0]) * t);
  stageNum.textContent = idx + 1;

  let filedCount = 0;
  docEls.forEach((list, i) => {
    const filed = i < idx || (i === idx && t >= 0.55);
    list.forEach((li) => li.classList.toggle("filed", filed));
    if (filed) filedCount += list.length;
  });
  docCount.textContent = filedCount;

  if (idx !== shownStage) {
    shownStage = idx;
    card.place.textContent = s.place;
    card.title.textContent = s.title;
    card.text.textContent = s.text;
    card.risk.textContent = s.risk;
  }
}

let queued = false;
function queue() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; renderRoute(); });
}
addEventListener("scroll", queue, { passive: true });
addEventListener("resize", queue);
renderRoute();

const CNY = 11.2;
const CASES = [
  { model: "Кроссовер 1.5T, 147 л.с.", hp: 147, cny: 109900, duty: 600000, util: 3400 },
  { model: "Седан 1.5, 113 л.с.", hp: 113, cny: 79900, duty: 500000, util: 3400 },
  { model: "Кроссовер 2.0T, 197 л.с.", hp: 197, cny: 159900, duty: 1045000, util: null },
];
const FIXED = { export: 38000, truck: 72000, clearance: 95000, fee: 60000 };
const LAST_MILE = [
  { label: "Самовывоз из Уссурийска", cost: 0 },
  { label: "ЖД-контейнер до Новосибирска", cost: 95000 },
  { label: "Автовоз до Екатеринбурга", cost: 120000 },
  { label: "Автовоз до Москвы", cost: 150000 },
];

const caseBtns = [...document.querySelectorAll(".case")];
const citySel = document.getElementById("city");
const linesEl = document.getElementById("receipt-lines");
const totalEl = document.getElementById("receipt-total");
const modelEl = document.getElementById("receipt-model");
const noteEl = document.getElementById("receipt-note");
let current = 0;

function renderEstimate() {
  const c = CASES[current];
  const mile = LAST_MILE[Number(citySel.value)];
  const carRub = c.cny * CNY;
  const lines = [
    [`Автомобиль у дилера: ¥${fmt(c.cny)}`, carRub],
    ["Экспортное оформление в КНР", FIXED.export],
    ["Автовоз Пекин — Суйфэньхэ и погранпереход", FIXED.truck],
    ["Таможенная пошлина и сбор (ЕТТ)", c.duty],
    [c.util === null ? "Утильсбор: выше 160 л.с. — по общей шкале" : "Утильсбор льготный, до 160 л.с.", c.util],
    ["СВХ, брокер, лаборатория, СБКТС и ЭПТС", FIXED.clearance],
    [mile.label, mile.cost],
    ["Наша работа под ключ", FIXED.fee],
  ];
  linesEl.innerHTML = "";
  let sum = 0;
  for (const [label, value] of lines) {
    const li = document.createElement("li");
    const l = document.createElement("span");
    const v = document.createElement("span");
    l.textContent = label;
    v.className = "mono";
    if (value === null) {
      li.className = "flag";
      v.textContent = "считаем на дату ввоза";
    } else {
      v.textContent = value === 0 ? "0 ₽" : `${fmt(value)} ₽`;
      sum += value;
    }
    li.append(l, v);
    linesEl.append(li);
  }
  modelEl.textContent = c.model;
  totalEl.textContent = c.util === null ? `${fmt(sum)} ₽ + утильсбор` : `≈ ${fmt(sum)} ₽`;
  noteEl.textContent = c.util === null
    ? "При 197 л.с. льгота по утильсбору не действует: по общей шкале он добавит к итогу сотни тысяч рублей. Это и есть граница 160 л.с."
    : "Льготный утильсбор действует, если машина ввезена для себя и не продаётся 12 месяцев с даты выпуска.";
}

caseBtns.forEach((btn) => btn.addEventListener("click", () => {
  current = Number(btn.dataset.case);
  caseBtns.forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
  hp.value = CASES[current].hp;
  renderHp();
  renderEstimate();
}));
citySel.addEventListener("change", renderEstimate);

const hp = document.getElementById("hp");
const hpValue = document.getElementById("hp-value");
const hpVerdict = document.getElementById("hp-verdict");
function renderHp() {
  const v = Number(hp.value);
  hpValue.textContent = v;
  const over = v > 160;
  hpVerdict.classList.toggle("over", over);
  hpVerdict.textContent = over
    ? `+${v - 160} л.с. сверх льготы: утильсбор по общей шкале — сотни тысяч рублей`
    : "Льготный утильсбор: 3 400 ₽ за новую, 5 200 ₽ за машину старше 3 лет";
}
hp.addEventListener("input", renderHp);
renderHp();
renderEstimate();

const form = document.getElementById("order-form");
const done = document.getElementById("order-done");
const REQUIRED = ["model", "budget", "city", "name", "phone"];

function phoneOk(v) {
  const d = v.replace(/\D/g, "");
  return d.length === 11 && (d[0] === "7" || d[0] === "8");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  let firstBad = null;
  for (const name of REQUIRED) {
    const input = form.elements[name];
    const ok = name === "phone" ? phoneOk(input.value) : input.value.trim() !== "";
    const field = input.closest(".field");
    field.classList.toggle("invalid", !ok);
    input.setAttribute("aria-invalid", String(!ok));
    input.setAttribute("aria-describedby", `e-${name}`);
    if (!ok && !firstBad) firstBad = input;
  }
  if (firstBad) { firstBad.focus(); return; }

  const now = new Date();
  const number = `ПЛ-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  document.getElementById("done-number").textContent = `№ ${number}`;
  const summary = document.getElementById("done-summary");
  summary.innerHTML = "";
  const rows = [
    ["Модель", form.elements.model.value.trim()],
    ["Бюджет", form.elements.budget.value],
    ["Назначение", form.elements.city.value.trim()],
    ["Последняя миля", form.elements.mile.value],
    ["Получатель", form.elements.name.value.trim()],
    ["Телефон", form.elements.phone.value.trim()],
  ];
  for (const [k, v] of rows) {
    const div = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = k; dd.textContent = v;
    div.append(dt, dd);
    summary.append(div);
  }
  form.hidden = true;
  done.hidden = false;
  done.focus();
});

form.addEventListener("input", (e) => {
  const field = e.target.closest(".field");
  if (field && field.classList.contains("invalid")) {
    field.classList.remove("invalid");
    e.target.setAttribute("aria-invalid", "false");
  }
});

const toggle = document.querySelector(".menu-toggle");
const nav = document.getElementById("nav");
toggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(open));
});
nav.addEventListener("click", (e) => {
  if (e.target.closest("a")) {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }
});

/* ---------- hero turntable ---------- */
const spinWrap = document.getElementById("hero-spin");
const spinCard = spinWrap.querySelector(".waybill");
const canvas = document.getElementById("turntable");
const ctx2d = canvas.getContext("2d");
const spinDeg = document.getElementById("spin-deg");
const frameBtns = [...document.querySelectorAll(".spin-frame")];
const heroStamp = document.querySelector(".stamp-hero");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");

// Start at a front three-quarter view; one full scroll turn returns to it.
const START_DEG = -60;
const ELEV = 18 * Math.PI / 180;
const PERSP = 24;
const DISC_R = 3.1;
const VIEW = [0, Math.cos(ELEV), -Math.sin(ELEV)];
const LIGHT = norm([-0.45, -0.55, 0.7]);
const COLORS = {
  body: [194, 53, 43], glass: [38, 52, 88], tyre: [34, 38, 52],
  ink: "#1a2744", paper: "#f2ede2", paper2: "#e9e2d3", lamp: "#f6d27a", tail: "#7d1d17",
};

function norm(v) { const l = Math.hypot(...v); return v.map((c) => c / l); }
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function centroid(pts) {
  const c = [0, 0, 0];
  pts.forEach((p) => { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; });
  return c.map((v) => v / pts.length);
}
function newell(pts) {
  const n = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]);
    n[1] += (a[2] - b[2]) * (a[0] + b[0]);
    n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return norm(n);
}

function solid(faces) {
  const c = centroid(faces.flatMap((f) => f.pts));
  faces.forEach((f) => {
    f.n = newell(f.pts);
    f.c = centroid(f.pts);
    if (dot(f.n, sub(f.c, c)) < 0) f.n = f.n.map((v) => -v);
  });
  return faces;
}

// Profile in the side plane: x forward, z up; w is the half-width at that vertex.
function extrude(profile, tag) {
  const L = profile.map((p) => [p.x, p.w, p.z]);
  const R = profile.map((p) => [p.x, -p.w, p.z]);
  const faces = [
    { id: `${tag}:side+`, pts: L },
    { id: `${tag}:side-`, pts: [...R].reverse() },
  ];
  for (let i = 0; i < profile.length; i++) {
    const j = (i + 1) % profile.length;
    faces.push({ id: `${tag}:e${i}`, pts: [L[i], L[j], R[j], R[i]] });
  }
  return solid(faces);
}

const BODY_W = 0.93;
const body = extrude([
  { x: -2.3, z: 0.35, w: BODY_W }, { x: 2.3, z: 0.35, w: BODY_W }, { x: 2.32, z: 0.62, w: BODY_W },
  { x: 2.05, z: 0.86, w: BODY_W }, { x: 0.9, z: 0.98, w: BODY_W }, { x: -1.9, z: 1.0, w: BODY_W },
  { x: -2.3, z: 0.85, w: BODY_W },
], "body");
const cabinW = (z) => 0.86 - 0.12 * (z - 1.0) / 0.6;
const cabin = extrude([
  { x: -1.9, z: 1.0, w: cabinW(1.0) }, { x: 0.85, z: 0.98, w: cabinW(0.98) },
  { x: 0.1, z: 1.6, w: cabinW(1.6) }, { x: -1.75, z: 1.6, w: cabinW(1.6) },
], "cabin");

const WHEEL_R = 0.36;
function wheel(xc, side) {
  const seg = 18, y0 = side * 0.7, y1 = side * 0.97, zc = WHEEL_R;
  const ring = (y) => Array.from({ length: seg }, (_, k) => {
    const a = (k / seg) * Math.PI * 2;
    return [xc + WHEEL_R * Math.cos(a), y, zc + WHEEL_R * Math.sin(a)];
  });
  const inner = ring(y0), outer = ring(y1);
  const faces = [{ id: "outer", pts: outer }, { id: "inner", pts: [...inner].reverse() }];
  for (let k = 0; k < seg; k++) {
    const m = (k + 1) % seg;
    faces.push({ id: "tread", pts: [inner[k], inner[m], outer[m], outer[k]] });
  }
  return { side, center: [xc, (y0 + y1) / 2, zc], hubY: y1, faces: solid(faces) };
}
const wheels = [wheel(1.45, 1), wheel(-1.45, 1), wheel(1.45, -1), wheel(-1.45, -1)];

const along = (a, b, t) => a + (b - a) * t;
function quadOn(face, t0, t1, ya, yb) {
  // Face edge quads run L[i] -> L[j]; build a decal between two params along that edge.
  const [a, b] = face.pts;
  const pt = (t, y) => [along(a[0], b[0], t), y, along(a[2], b[2], t)];
  return [pt(t0, ya), pt(t1, ya), pt(t1, yb), pt(t0, yb)];
}
const faceById = (faces, id) => faces.find((f) => f.id === id);
function arch(xc, s) {
  const pts = [];
  for (let k = 0; k <= 12; k++) {
    const a = (k / 12) * Math.PI;
    pts.push([xc + 0.45 * Math.cos(a), s * (BODY_W + 0.002), WHEEL_R + 0.45 * Math.sin(a)]);
  }
  return pts;
}
for (const s of [1, -1]) {
  const side = faceById(body, `body:side${s > 0 ? "+" : "-"}`);
  const y = s * (BODY_W + 0.002);
  side.decals = [
    { fill: COLORS.ink, pts: arch(1.45, s) },
    { fill: COLORS.ink, pts: arch(-1.45, s) },
    { stroke: "rgba(26,39,68,.55)", pts: [[2.05, y, 0.74], [-2.2, y, 0.76]] },
    { stroke: "rgba(26,39,68,.55)", pts: [[0.78, y, 0.42], [0.82, y, 0.97]] },
    { stroke: "rgba(26,39,68,.55)", pts: [[-0.62, y, 0.42], [-0.6, y, 0.99]] },
  ];
  const cs = faceById(cabin, `cabin:side${s > 0 ? "+" : "-"}`);
  const cy = (z) => s * (cabinW(z) + 0.003);
  cs.decals = [
    { fill: "glass", pts: [[0.6, cy(1.06), 1.06], [0.1, cy(1.52), 1.52], [-1.6, cy(1.52), 1.52], [-1.76, cy(1.06), 1.06]] },
    { stroke: "rgb(194,53,43)", width: 5, pts: [[-0.55, cy(1.04), 1.04], [-0.52, cy(1.54), 1.54]] },
  ];
}
const nose = faceById(body, "body:e2");
nose.decals = [
  { fill: COLORS.lamp, pts: quadOn(nose, 0.12, 0.5, 0.86, 0.5) },
  { fill: COLORS.lamp, pts: quadOn(nose, 0.12, 0.5, -0.5, -0.86) },
];
const bumper = faceById(body, "body:e1");
bumper.decals = [{ fill: COLORS.ink, pts: quadOn(bumper, 0.25, 0.85, 0.48, -0.48) }];
const rear = faceById(body, "body:e6");
rear.decals = [
  { fill: COLORS.tail, pts: quadOn(rear, 0.06, 0.3, 0.9, 0.5) },
  { fill: COLORS.tail, pts: quadOn(rear, 0.06, 0.3, -0.5, -0.9) },
  { fill: COLORS.tail, pts: quadOn(rear, 0.14, 0.22, 0.5, -0.5) },
  { fill: COLORS.paper, pts: quadOn(rear, 0.45, 0.68, 0.28, -0.28) },
];
faceById(cabin, "cabin:e1").glass = true;
faceById(cabin, "cabin:e3").glass = true;
for (const w of wheels) {
  const o = faceById(w.faces, "outer");
  const disc = (r, n) => Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2;
    return [w.center[0] + r * Math.cos(a), w.hubY + w.side * 0.002, WHEEL_R + r * Math.sin(a)];
  });
  o.decals = [{ fill: "#b9b3a6", pts: disc(0.23, 14) }, { fill: COLORS.ink, pts: disc(0.07, 8) }];
}
// End faces are redrawn over the near wheels so the bumpers occlude them at three-quarter views.
const END_FACES = new Set(["body:e1", "body:e2", "body:e5", "body:e6"]);

let W = 0, H = 0, scale = 1, cx = 0, cy = 0;
function sizeCanvas() {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = r.width; H = r.height;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  // The near rim of the disc is magnified by perspective, so fit it explicitly.
  const kNear = PERSP / (PERSP - DISC_R * Math.cos(ELEV));
  scale = Math.min(W / (2 * DISC_R * kNear + 0.3), H / 3.7);
  cx = W / 2;
  cy = H - DISC_R * Math.sin(ELEV) * scale * kNear - 9 - 6;
  fitHeroCopy();
}

const heroCopy = document.querySelector(".hero-copy");
function fitHeroCopy() {
  heroCopy.style.removeProperty("--copy-top");
  if (getComputedStyle(heroCopy).position !== "sticky") return;
  const preferred = parseFloat(getComputedStyle(heroCopy).top) || 0;
  // A copy block taller than the screen pins with its bottom (the CTA) visible instead of its top.
  const fit = innerHeight - heroCopy.offsetHeight - 16;
  if (fit < preferred) heroCopy.style.setProperty("--copy-top", `${fit}px`);
}

function project(p, cos, sin) {
  const xr = p[0] * cos - p[1] * sin;
  const yr = p[0] * sin + p[1] * cos;
  const depth = yr * Math.cos(ELEV) - p[2] * Math.sin(ELEV);
  const k = PERSP / (PERSP + depth);
  return { x: cx + xr * scale * k, y: cy - (yr * Math.sin(ELEV) + p[2] * Math.cos(ELEV)) * scale * k, depth };
}
const rot = (v, cos, sin) => [v[0] * cos - v[1] * sin, v[0] * sin + v[1] * cos, v[2]];

function shade(rgb, n) {
  const lam = Math.max(0, dot(n, LIGHT));
  const k = 0.42 + 0.68 * lam;
  return `rgb(${rgb.map((c) => Math.round(Math.min(255, c * k))).join(",")})`;
}

function path(pts2) {
  ctx2d.beginPath();
  pts2.forEach((q, i) => (i ? ctx2d.lineTo(q.x, q.y) : ctx2d.moveTo(q.x, q.y)));
}

function drawFace(f, rgb, cos, sin) {
  const n = rot(f.n, cos, sin);
  const pts2 = f.pts.map((p) => project(p, cos, sin));
  path(pts2);
  ctx2d.closePath();
  ctx2d.fillStyle = shade(f.glass ? COLORS.glass : rgb, n);
  ctx2d.fill();
  ctx2d.lineWidth = 1.2;
  ctx2d.strokeStyle = "rgba(26,39,68,.9)";
  ctx2d.stroke();
  for (const d of f.decals || []) {
    path(d.pts.map((p) => project(p, cos, sin)));
    if (d.fill) {
      ctx2d.closePath();
      ctx2d.fillStyle = d.fill === "glass" ? shade(COLORS.glass, n) : d.fill;
      ctx2d.fill();
    } else {
      ctx2d.lineWidth = d.width || 1.4;
      ctx2d.strokeStyle = d.stroke;
      ctx2d.stroke();
    }
  }
}

const visible = (f, cos, sin) => dot(rot(f.n, cos, sin), VIEW) < 0;
const depthOf = (f, cos, sin) => project(f.c, cos, sin).depth;

function drawWheel(w, cos, sin) {
  w.faces
    .filter((f) => visible(f, cos, sin))
    .sort((a, b) => depthOf(b, cos, sin) - depthOf(a, cos, sin))
    .forEach((f) => drawFace(f, COLORS.tyre, cos, sin));
}

function drawGround(cos, sin) {
  const ring = (r, n = 72) => Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2;
    return project([r * Math.cos(a), r * Math.sin(a), 0], 1, 0);
  });
  path(ring(DISC_R).map((q) => ({ x: q.x, y: q.y + 9 })));
  ctx2d.closePath();
  ctx2d.fillStyle = COLORS.ink;
  ctx2d.fill();
  path(ring(DISC_R));
  ctx2d.closePath();
  ctx2d.fillStyle = COLORS.paper2;
  ctx2d.fill();
  ctx2d.lineWidth = 1.5;
  ctx2d.strokeStyle = COLORS.ink;
  ctx2d.stroke();
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2;
    const big = k % 9 === 0;
    const p1 = project(rot([2.75 * Math.cos(a), 2.75 * Math.sin(a), 0], cos, sin), 1, 0);
    const p2 = project(rot([(big ? 2.45 : 2.6) * Math.cos(a), (big ? 2.45 : 2.6) * Math.sin(a), 0], cos, sin), 1, 0);
    ctx2d.beginPath();
    ctx2d.moveTo(p1.x, p1.y);
    ctx2d.lineTo(p2.x, p2.y);
    ctx2d.lineWidth = big ? 2 : 1;
    ctx2d.strokeStyle = big ? "rgb(194,53,43)" : "rgba(26,39,68,.45)";
    ctx2d.stroke();
  }
  const marker = project([0, -DISC_R, 0], 1, 0);
  ctx2d.beginPath();
  ctx2d.moveTo(marker.x, marker.y - 7);
  ctx2d.lineTo(marker.x - 7, marker.y + 6);
  ctx2d.lineTo(marker.x + 7, marker.y + 6);
  ctx2d.closePath();
  ctx2d.fillStyle = "rgb(194,53,43)";
  ctx2d.fill();
  const shadow = [[2.45, 1.0], [-2.45, 1.0], [-2.45, -1.0], [2.45, -1.0]].map(([x, y]) => project(rot([x, y, 0], cos, sin), 1, 0));
  ctx2d.save();
  ctx2d.filter = "blur(7px)";
  path(shadow);
  ctx2d.closePath();
  ctx2d.fillStyle = "rgba(26,39,68,.32)";
  ctx2d.fill();
  ctx2d.restore();
}

function drawCar(deg) {
  const a = (deg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  ctx2d.clearRect(0, 0, W, H);
  drawGround(cos, sin);
  const sideVisible = { 1: visible(faceById(body, "body:side+"), cos, sin), [-1]: visible(faceById(body, "body:side-"), cos, sin) };
  const isNear = (w) => sideVisible[w.side] || (!sideVisible[1] && !sideVisible[-1] && project(w.center, cos, sin).depth < 0);
  const near = wheels.filter(isNear), far = wheels.filter((w) => !isNear(w));
  const byDepth = (a2, b2) => project(b2.center, cos, sin).depth - project(a2.center, cos, sin).depth;
  far.sort(byDepth).forEach((w) => drawWheel(w, cos, sin));
  const bodyFaces = body.filter((f) => visible(f, cos, sin));
  bodyFaces.forEach((f) => drawFace(f, COLORS.body, cos, sin));
  near.sort(byDepth).forEach((w) => {
    drawWheel(w, cos, sin);
    const wd = project(w.center, cos, sin).depth;
    bodyFaces
      .filter((f) => END_FACES.has(f.id) && depthOf(f, cos, sin) < wd && Math.sign(f.c[0]) === Math.sign(w.center[0]))
      .forEach((f) => drawFace(f, COLORS.body, cos, sin));
  });
  cabin
    .filter((f) => visible(f, cos, sin))
    .sort((a2, b2) => depthOf(b2, cos, sin) - depthOf(a2, cos, sin))
    .forEach((f) => drawFace(f, COLORS.body, cos, sin));
}

const FRAME_TOL = 45;
function renderSpin(turn) {
  const deg = START_DEG + turn * 360;
  drawCar(deg);
  spinDeg.textContent = Math.round(turn * 360);
  const view = ((deg % 360) + 360) % 360;
  frameBtns.forEach((b) => {
    const d = Math.abs(((view - Number(b.dataset.angle) + 540) % 360) - 180);
    b.setAttribute("aria-pressed", String(d < FRAME_TOL));
  });
}

function stickyTop() { return parseFloat(getComputedStyle(spinCard).top) || 0; }
function spinProgress() {
  const r = spinWrap.getBoundingClientRect();
  const travel = spinWrap.offsetHeight - spinCard.offsetHeight;
  if (travel <= 0) return 0;
  return clamp((stickyTop() - r.top) / travel, 0, 1);
}

let turnShown = 0, turnTarget = 0, spinning = false, manualTurn = 0;
function spinLoop() {
  const diff = turnTarget - turnShown;
  turnShown = Math.abs(diff) < 0.0005 ? turnTarget : turnShown + diff * 0.16;
  renderSpin(turnShown);
  heroStamp.classList.toggle("stamped", turnTarget > 0.97);
  if (turnShown !== turnTarget) requestAnimationFrame(spinLoop);
  else spinning = false;
}
function onSpinScroll() {
  if (reduce.matches) return;
  turnTarget = spinProgress();
  if (!spinning) { spinning = true; requestAnimationFrame(spinLoop); }
}

frameBtns.forEach((b) => b.addEventListener("click", () => {
  const view = Number(b.dataset.angle);
  const turn = ((((view - START_DEG) % 360) + 360) % 360) / 360;
  if (reduce.matches) {
    manualTurn = turn;
    renderSpin(manualTurn);
    return;
  }
  const travel = spinWrap.offsetHeight - spinCard.offsetHeight;
  const wrapTop = spinWrap.getBoundingClientRect().top + scrollY;
  scrollTo({ top: wrapTop - stickyTop() + turn * travel, behavior: "smooth" });
}));

function initSpin() {
  sizeCanvas();
  if (reduce.matches) {
    renderSpin(manualTurn);
  } else {
    turnShown = turnTarget = spinProgress();
    renderSpin(turnShown);
    heroStamp.classList.toggle("stamped", turnTarget > 0.97);
  }
}
addEventListener("scroll", onSpinScroll, { passive: true });
addEventListener("resize", initSpin);
new ResizeObserver(fitHeroCopy).observe(heroCopy);
reduce.addEventListener("change", initSpin);
initSpin();
