import "./style.css";
import {
  animate,
  createDrawable,
  createTimeline,
  onScroll,
  spring,
  stagger,
} from "animejs";

// The card is a Vigenère-style cipher. Three rings set the key B, E, N; when a ring
// reaches its letter, the text it guards reads in plain. The real text never leaves
// the DOM: each letter is only hidden visually while the CSS overlay shows the cipher.

const KEY = "BEN";
const CELL = 360 / 26;
const WINDOW = Math.PI; // the reading window sits at 9 o'clock, facing the text
const BANDS: [number, number][] = [
  [0.86, 1],
  [0.72, 0.86],
  [0.58, 0.72],
];
const STEPS = [1, 7, 3, 11, 5, 9, 15, 17, 19, 21, 23, 25];
// Whole turns plus a few cells, alternating direction like a combination lock.
const START = [(26 + 11) * CELL, -(26 + 17) * CELL, (26 + 9) * CELL];
const GUARDS = [".name", ".role", ".channels"];

type Char = { el: HTMLElement; c: string };
type Group = { el: HTMLElement; chars: Char[] };
type Ring = { angle: number; shift: number; tease: number; groups: Group[] };

const root = document.documentElement;
const motion = root.classList.contains("motion");
const stage = document.querySelector<HTMLElement>(".stage")!;
const track = document.querySelector<HTMLElement>(".track")!;

const rings: Ring[] = START.map((start) => ({
  angle: motion ? start : 0,
  shift: -1,
  tease: 0,
  groups: [],
}));

if (motion) {
  GUARDS.forEach((selector, i) => {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) rings[i].groups.push({ el, chars: splitChars(el) });
  });
}

const canvas = document.createElement("canvas");
canvas.className = "wheel";
canvas.setAttribute("aria-hidden", "true");
stage.prepend(canvas);
const ctx = canvas.getContext("2d")!;

let colors = readColors();
let geo = readGeometry();
let frame = 0;

update();
setupLamp();

new ResizeObserver(() => {
  geo = readGeometry();
  requestDraw();
}).observe(stage);
document.fonts.ready.then(requestDraw);
Promise.all([
  document.fonts.load('300 16px "Compagnon"'),
  document.fonts.load('400 16px "Gambarino"'),
]).then(requestDraw);

if (motion) {
  createCue();
  // Reveal only once the real faces are in, so nothing reflows after it appears.
  fontsReady().then(() => {
    root.dataset.motionReady = "true";
    intro();
    scrollKey();
    nudge();
    iconHovers();
  });
}

function fontsReady() {
  const faces = ['400 1em "Gambarino"', '400 1em "Compagnon"', '300 1em "Compagnon"'];
  const loaded = Promise.all(faces.map((face) => document.fonts.load(face)));
  return Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, 1200))]);
}

// A visible, pressable cue: scrolling decodes, and pressing it scrolls for you.
function createCue() {
  const cue = document.createElement("button");
  cue.type = "button";
  cue.className = "cue";
  cue.innerHTML =
    '<svg class="cue-lock" viewBox="0 0 24 24" aria-hidden="true"><path class="cue-shackle" d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/><rect x="5.5" y="11" width="13" height="9.5" rx="2"/></svg>' +
    '<span class="cue-text">Scroll to unlock the links</span>' +
    '<span class="cue-arrow" aria-hidden="true">↓</span>';
  cue.addEventListener("click", () => {
    if (cue.classList.contains("is-open")) return;
    const end = track.offsetTop + track.offsetHeight - innerHeight;
    animate(document.scrollingElement!, {
      scrollTop: end,
      duration: 2600,
      ease: "inOut(2)",
    });
  });
  document.querySelector(".channels")!.before(cue);
  return cue;
}

function setCue(open: boolean) {
  const cue = document.querySelector<HTMLButtonElement>(".cue");
  if (!cue) return;
  cue.classList.toggle("is-open", open);
  cue.setAttribute("aria-disabled", String(open));
  cue.querySelector(".cue-text")!.textContent = open ? "Links unlocked" : "Scroll to unlock the links";
}

// Until the first scroll, rings 2 and 3 tug at their settings now and then.
function nudge() {
  const tug = createTimeline({
    loop: true,
    loopDelay: 2800,
    delay: 2600,
    onUpdate: requestDraw,
  })
    .add(
      rings[1],
      {
        tease: [{ to: -CELL * 0.8 }, { to: 0 }],
        duration: 900,
        ease: "inOut(2)",
      },
      0,
    )
    .add(
      rings[2],
      {
        tease: [{ to: CELL * 0.8 }, { to: 0 }],
        duration: 900,
        ease: "inOut(2)",
      },
      140,
    );
  addEventListener(
    "scroll",
    () => {
      tug.pause();
      rings[1].tease = rings[2].tease = 0;
      requestDraw();
    },
    { once: true, passive: true },
  );
}

// Ring 1 turns to B on load while the portrait inks itself in.
function intro() {
  const lines = createDrawable(".pt-lines path, .pt-lines circle", 0, 0);
  const fills = document.querySelector(".pt-fills");
  const lineGroup = document.querySelector(".pt-lines");

  createTimeline({ onUpdate: update })
    .set([lineGroup!], { opacity: 1 })
    .add(
      lines,
      {
        draw: ["0 0", "0 1"],
        duration: 1500,
        delay: stagger(30),
        ease: "inOut(2)",
      },
      0,
    )
    .add([fills!], { opacity: [0, 1], duration: 900, ease: "out(2)" }, 1200)
    .add(
      rings[0],
      { angle: 0, ease: spring({ bounce: 0.22, duration: 1900 }) },
      250,
    );
}

// Scrolling through the track turns rings 2 and 3.
function scrollKey() {
  const hold = { v: 0 };
  createTimeline({
    defaults: { ease: "inOut(2)" },
    autoplay: onScroll({
      target: track,
      enter: { target: "top", container: "top" },
      leave: { target: "bottom", container: "bottom" },
      sync: 0.6,
    }),
    onUpdate: update,
  })
    .add(rings[1], { angle: 0, duration: 1000 }, 0)
    .add(rings[2], { angle: 0, duration: 1000 }, 1150)
    .add(hold, { v: 1, duration: 250, ease: "linear" });
}

// Each icon answers hover or focus with its own small gesture.
function gestures(): Record<string, (svg: SVGSVGElement) => void> {
  return {
    github: (svg) => {
      animate(createDrawable(svg.querySelectorAll(".ic-branch")), {
        draw: ["0 0", "0 1"],
        duration: 520,
        ease: "inOut(2)",
      });
      animate(svg.querySelectorAll(".ic-pop"), {
        scale: [{ to: 1.5 }, { to: 1 }],
        duration: 520,
        delay: 260,
        ease: "out(3)",
      });
    },
    "repo-renocrypt": (svg) => {
      animate(svg.querySelectorAll(".ic-shackle"), {
        y: [{ to: -2 }, { to: 0 }],
        duration: 560,
        ease: "inOut(2)",
      });
    },
    "repo-automaton": (svg) => {
      animate(svg.querySelectorAll(".ic-bulb"), {
        y: [{ to: -1.8 }, { to: 0 }],
        duration: 460,
        ease: "out(3)",
      });
      blink(svg);
    },
    "web-renocrypt": (svg) => {
      animate(svg.querySelectorAll(".ic-keyhole"), {
        rotate: [
          { to: 90, duration: 300 },
          { to: 0, duration: 420, delay: 140 },
        ],
        ease: "inOut(3)",
      });
    },
    "web-automaton": (svg) => blink(svg),
    "art-mocubix": (svg) => {
      // The cube has threefold symmetry, so a 120° turn lands back on itself.
      animate(svg.querySelectorAll(".ic-cube"), {
        rotate: [0, 120],
        duration: 700,
        ease: "inOut(3)",
      });
    },
    "art-daykiln": (svg) => {
      // Squash and stretch, as if the vase were turning on a wheel.
      animate(svg.querySelectorAll(".ic-vase"), {
        scaleX: [{ to: 0.72 }, { to: 1.08 }, { to: 1 }],
        duration: 760,
        ease: "inOut(2)",
      });
    },
    linkedin: (svg) => {
      const tug = (selector: string, dir: number) =>
        animate(svg.querySelectorAll(selector), {
          x: [{ to: -1.8 * dir }, { to: 0 }],
          y: [{ to: 1.8 * dir }, { to: 0 }],
          duration: 520,
          ease: "inOut(2)",
        });
      tug(".ic-l1", 1);
      tug(".ic-l2", -1);
    },
    x: (svg) => {
      animate(createDrawable(svg.querySelectorAll("path")), {
        draw: ["0 0", "0 1"],
        duration: 420,
        delay: stagger(160),
        ease: "inOut(2)",
      });
    },
    email: (svg) => {
      animate(svg.querySelectorAll(".ic-flap"), {
        scaleY: [{ to: -1 }, { to: 1 }],
        duration: 640,
        ease: "inOut(2)",
      });
    },
    discord: (svg) => {
      animate(svg.querySelectorAll(".ic-bubble"), {
        y: [{ to: -2.8 }, { to: 0 }],
        duration: 480,
        ease: "out(3)",
      });
      blink(svg);
    },
    telegram: (svg) => {
      const out = { duration: 260, ease: "in(2)" };
      const back = { duration: 440, ease: "out(3)" };
      animate(svg.querySelectorAll(".ic-plane"), {
        x: [
          { to: 15, ...out },
          { to: -15, duration: 1 },
          { to: 0, ...back },
        ],
        y: [
          { to: -15, ...out },
          { to: 15, duration: 1 },
          { to: 0, ...back },
        ],
        opacity: [
          { to: 0, ...out },
          { to: 0, duration: 1 },
          { to: 1, ...back },
        ],
      });
    },
  };
}

function blink(svg: SVGSVGElement) {
  animate(svg.querySelectorAll(".ic-eye"), {
    scaleY: [
      { to: 0.1, duration: 80 },
      { to: 1, duration: 150 },
    ],
    delay: 120,
  });
}

function iconHovers() {
  const all = gestures();
  document
    .querySelectorAll<HTMLAnchorElement>(".channels a")
    .forEach((link) => {
      const svg = link.querySelector<SVGSVGElement>(".icon");
      const gesture = svg && all[svg.dataset.icon ?? ""];
      if (!svg || !gesture) return;
      link.addEventListener("pointerenter", () => gesture(svg));
      link.addEventListener("focus", () => gesture(svg));
    });
}

// When the third ring locks, the icons ink themselves in.
function drawIcons() {
  animate(createDrawable(".channels .icon :is(path, circle, rect)"), {
    draw: ["0 0", "0 1"],
    duration: 700,
    delay: stagger(14),
    ease: "inOut(2)",
  });
}

function update() {
  for (const ring of rings) {
    const k = mod(Math.round(ring.angle / CELL), 26);
    if (k === ring.shift) continue;
    const wasSealed = ring.shift !== 0;
    ring.shift = k;
    if (motion && ring === rings[2]) {
      if (k === 0 && wasSealed) drawIcons();
      setCue(k === 0);
    }
    for (const group of ring.groups) {
      group.el.classList.toggle("sealed", k !== 0);
      group.chars.forEach((ch, i) => {
        ch.el.dataset.c = encipher(ch.c, k * STEPS[i % STEPS.length]);
      });
    }
  }
  requestDraw();
}

function encipher(c: string, k: number): string {
  const code = c.charCodeAt(0);
  if (code >= 65 && code <= 90)
    return String.fromCharCode(65 + mod(code - 65 + k, 26));
  if (code >= 97 && code <= 122)
    return String.fromCharCode(97 + mod(code - 97 + k, 26));
  if (code >= 48 && code <= 57)
    return String.fromCharCode(48 + mod(code - 48 + k, 10));
  return c;
}

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

// Wraps each visible character in a plain inline span. textContent is unchanged.
function splitChars(el: HTMLElement): Char[] {
  const chars: Char[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  for (const node of nodes) {
    const frag = document.createDocumentFragment();
    for (const c of node.data) {
      if (/\s/.test(c)) {
        frag.append(c);
        continue;
      }
      const span = document.createElement("span");
      span.className = "ch";
      span.textContent = c;
      span.style.setProperty("--d", `${Math.min(chars.length * 9, 400)}ms`);
      frag.append(span);
      chars.push({ el: span, c });
    }
    node.replaceWith(frag);
  }
  return chars;
}

function readColors() {
  const cs = getComputedStyle(root);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    ink: v("--ink"),
    cipher: v("--cipher"),
    rule: v("--rule"),
    paper: v("--paper"),
    glow: v("--glow"),
  };
}

function readGeometry() {
  const cs = getComputedStyle(stage);
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  const portrait = w <= h;
  const px = (name: string, fallback: number) => {
    const value = cs.getPropertyValue(name).trim();
    return value.endsWith("px") ? parseFloat(value) : fallback;
  };
  return {
    w,
    h,
    x: px("--wx", w * (portrait ? 0.62 : 0.76)),
    y: px("--wy", h * (portrait ? 0.24 : 0.5)),
    r: px(
      "--wr",
      portrait ? Math.min(w * 0.46, h * 0.21) : Math.min(h * 0.45, w * 0.36),
    ),
  };
}

function requestDraw() {
  if (!frame) {
    frame = requestAnimationFrame(() => {
      frame = 0;
      draw();
    });
  }
}

function draw() {
  const { w, h, x, y, r } = geo;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (
    canvas.width !== Math.round(w * dpr) ||
    canvas.height !== Math.round(h * dpr)
  ) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const cell = (CELL * Math.PI) / 180;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  rings.forEach((ring, i) => {
    const r0 = BANDS[i][0] * r;
    const r1 = BANDS[i][1] * r;
    const mid = (r0 + r1) / 2;
    const theta = ((ring.angle + ring.tease) * Math.PI) / 180;
    const key = KEY.charCodeAt(i) - 65;

    ctx.strokeStyle = colors.rule;
    ctx.lineWidth = 1;
    circle(x, y, r1);
    if (i === BANDS.length - 1) circle(x, y, r0);

    ctx.font = `${i === 0 ? 400 : 300} ${Math.round((r1 - r0) * 0.44)}px "Compagnon", ui-monospace, monospace`;
    for (let j = 0; j < 26; j++) {
      const phi = WINDOW + (j - key) * cell + theta;
      const edge = phi - cell / 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(edge) * r0, y + Math.sin(edge) * r0);
      ctx.lineTo(x + Math.cos(edge) * r1, y + Math.sin(edge) * r1);
      ctx.stroke();

      const inWindow = Math.abs(wrap(phi - WINDOW)) < cell / 2;
      ctx.save();
      ctx.translate(x + Math.cos(phi) * mid, y + Math.sin(phi) * mid);
      ctx.rotate(phi - WINDOW);
      ctx.fillStyle = inWindow ? colors.ink : colors.cipher;
      ctx.fillText(String.fromCharCode(65 + j), 0, 0);
      ctx.restore();
    }
  });

  // The reading window: outlined while searching, inked solid once a ring locks.
  rings.forEach((ring, i) => {
    const r0 = BANDS[i][0] * r;
    const r1 = BANDS[i][1] * r;
    ctx.beginPath();
    ctx.arc(x, y, r1, WINDOW - cell / 2, WINDOW + cell / 2);
    ctx.arc(x, y, r0, WINDOW + cell / 2, WINDOW - cell / 2, true);
    ctx.closePath();
    ctx.shadowColor = colors.glow;
    if (ring.shift === 0) {
      ctx.shadowBlur = 14;
      ctx.fillStyle = colors.ink;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = colors.paper;
      ctx.font = `400 ${Math.round((r1 - r0) * 0.62)}px "Gambarino", Georgia, serif`;
      ctx.fillText(KEY[i], x - (r0 + r1) / 2, y);
    } else {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });

  // Index notch outside the outer ring.
  ctx.fillStyle = colors.ink;
  ctx.beginPath();
  ctx.moveTo(x - r - 4, y);
  ctx.lineTo(x - r - 14, y - 6);
  ctx.lineTo(x - r - 14, y + 6);
  ctx.closePath();
  ctx.fill();
}

function circle(x: number, y: number, radius: number) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function wrap(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function setupLamp() {
  const lamp = document.createElement("button");
  lamp.type = "button";
  lamp.className = "lamp";
  lamp.textContent = "UV";
  lamp.setAttribute("aria-label", "UV light");
  const sync = () =>
    lamp.setAttribute("aria-pressed", String(root.dataset.theme === "night"));
  sync();
  lamp.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "night" ? "day" : "night";
    try {
      localStorage.setItem("theme", root.dataset.theme);
    } catch {}
    sync();
    colors = readColors();
    requestDraw();
  });
  document.body.append(lamp);
}
