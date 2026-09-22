'use strict';
/**
 * 🌻 Flores Amarillas — v4.0 Definitivo
 * Coordenadas absolutas de pantalla. Sin translate anidados.
 * Sin undefined functions. Geometría validada manualmente.
 */

const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
let W, H, dpr;
let t = 0, lastTime = 0, intro = 0;
let particles = [];

// ── Constantes ────────────────────────────────────────────────────────────────
const PI2    = Math.PI * 2;
const GOLDEN = 2.399963;
const rnd    = (a, b) => a + Math.random() * (b - a);
const lerp   = (a, b, u) => a + (b - a) * u;

// ── Paleta ────────────────────────────────────────────────────────────────────
const C = {
  bg:         '#fcf6e8',
  petalBase:  '#f7c814',
  petalMid:   '#ffdc30',
  petalShade: '#d19404',
  outline:    '#241505',
  coreEdge:   '#2b1202',
  coreMid:    '#4a2004',
  coreCenter: '#5e2a07',
  stem:       '#164a23',
  stemLite:   '#28823f',
  leafDk:     '#165728',
  leafLt:     '#299648',
  paperBack:  '#d9a09a',
  paperFront: '#f5c8c4',
  paperFold:  '#fde0de',
  paperShade: '#c9948e',
  bowWhite:   '#ffffff',
  bowShade:   '#e8dbd8',
  bowShine:   'rgba(255,255,255,0.9)',
  heart:      '#ed3755',
};

// ── Físicas de Resorte ────────────────────────────────────────────────────────
class Spring {
  constructor(val, k = 120, b = 12) {
    this.val = val; this.target = val; this.vel = 0; this.k = k; this.b = b;
  }
  update(dt) {
    this.vel += ((this.target - this.val) * this.k - this.vel * this.b) * dt;
    this.val += this.vel * dt;
  }
}

// ── Estado Global del Layout ──────────────────────────────────────────────────
let L   = {}; // Layout calculado
let FLW = []; // Flores con su estado de físicas

function calcLayout() {
  // Unidad de escala: basada en la pantalla
  const S = Math.min(W * 0.14, H * 0.10, 120);

  const cx      = W * 0.50;  // Centro horizontal
  const openY   = H * 0.62;  // Borde superior del papel (apertura)
  const openHW  = S * 2.20;  // Semiancho del papel en la apertura
  const bowY    = H * 0.80;  // Centro del moño
  const tipY    = H * 0.93;  // Punta inferior del mango
  const tipHW   = S * 0.18;  // Semiancho en la punta del mango

  // dy < 0 → la flor está encima de la apertura (visible)
  // dy > 0 → el tallo entra en el papel (cabeza sigue visible si es suficientemente grande)
  const defs = [
    // [ dx desde cx,   dy desde openY,  factor,  zOrder, faseFisica ]
    [  0.00*S,  -1.30*S,  1.00,  4,  0.0 ], // Arriba centro
    [ -1.10*S,  -0.80*S,  0.88,  3,  1.2 ], // Arriba izq
    [  1.10*S,  -0.80*S,  0.88,  3,  0.8 ], // Arriba der
    [ -2.00*S,  -0.10*S,  0.76,  5,  2.1 ], // Lateral izq
    [  2.00*S,  -0.10*S,  0.76,  5,  1.6 ], // Lateral der
    [ -0.48*S,   0.10*S,  0.65,  1,  3.2 ], // Centro bajo izq (fondo)
    [  0.48*S,   0.10*S,  0.65,  1,  2.7 ], // Centro bajo der (fondo)
  ];

  L = { S, cx, openY, openHW, bowY, tipY, tipHW };

  // Solo (re)crear flores si cambia el número
  if (FLW.length !== defs.length) {
    FLW = defs.map((d, i) => ({
      dx: d[0], dy: d[1], sf: d[2], z: d[3], phase: d[4],
      delay: i * 0.14,
      scale: new Spring(0, 90, 10),
      pop:   new Spring(0, 350, 16),
      absX: 0, absY: 0,
    }));
    FLW.sort((a, b) => a.z - b.z);
  }
}

// ── Resize ────────────────────────────────────────────────────────────────────
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width  = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  FLW = []; // Forzar recreación
  calcLayout();
}
window.addEventListener('resize', resize);

// ── Dibuja UN pétalo ──────────────────────────────────────────────────────────
// Centro del girasol en (0,0). El pétalo apunta hacia Y negativo (arriba).
// d = distancia del centro a la base del pétalo
// l = longitud del pétalo
// w = anchura máxima del pétalo
function petal(d, l, w) {
  // Sombra sutil del pétalo (desplazada)
  ctx.beginPath();
  ctx.moveTo(w * 0.15, -d);
  ctx.bezierCurveTo( w * 0.75, -(d+l*0.30),  w * 0.68, -(d+l*0.80),  w * 0.15, -(d+l));
  ctx.bezierCurveTo(-w * 0.55, -(d+l*0.80), -w * 0.60, -(d+l*0.30), -w * 0.10, -d);
  ctx.fillStyle = 'rgba(0,0,0,0.10)'; ctx.fill();

  // Cuerpo base
  ctx.beginPath();
  ctx.moveTo(0, -d);
  ctx.bezierCurveTo( w*0.60, -(d+l*0.25),  w*0.54, -(d+l*0.78),  0, -(d+l));
  ctx.bezierCurveTo(-w*0.54, -(d+l*0.78), -w*0.60, -(d+l*0.25),  0, -d);
  ctx.fillStyle = C.petalBase; ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 1.6; ctx.stroke();

  // Brillo central
  ctx.beginPath();
  ctx.moveTo(0, -(d+l*0.05));
  ctx.bezierCurveTo( w*0.26, -(d+l*0.30),  w*0.20, -(d+l*0.72),  0, -(d+l*0.94));
  ctx.bezierCurveTo(-w*0.20, -(d+l*0.72), -w*0.26, -(d+l*0.30),  0, -(d+l*0.05));
  ctx.fillStyle = C.petalMid; ctx.fill();

  // Nervio central
  ctx.beginPath(); ctx.moveTo(0, -(d+0.05)); ctx.lineTo(0, -(d+l*0.80));
  ctx.strokeStyle = C.petalShade; ctx.lineWidth = 0.9; ctx.globalAlpha = 0.35;
  ctx.stroke(); ctx.globalAlpha = 1;
}

// ── Dibuja UN girasol (centrado en 0,0) ───────────────────────────────────────
function sunflower(S) {
  const pD = S*0.42, pL = S*0.65, pW = S*0.30;
  const iD = S*0.35, iL = S*0.44, iW = S*0.24;
  const cR = S * 0.38;

  // Pétalos exteriores
  for (let i = 0; i < 18; i++) {
    ctx.save(); ctx.rotate(i * PI2 / 18); petal(pD, pL, pW); ctx.restore();
  }
  // Pétalos interiores (desfasados)
  for (let i = 0; i < 14; i++) {
    ctx.save(); ctx.rotate(i * PI2 / 14 + Math.PI / 14); petal(iD, iL, iW); ctx.restore();
  }

  // Sombra del núcleo
  ctx.beginPath(); ctx.arc(cR*0.08, cR*0.10, cR*1.12, 0, PI2);
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fill();

  // Núcleo (gradiente radial)
  const g = ctx.createRadialGradient(-cR*0.22, -cR*0.18, 0, 0, 0, cR);
  g.addColorStop(0, C.coreMid); g.addColorStop(1, C.coreEdge);
  ctx.beginPath(); ctx.arc(0, 0, cR, 0, PI2);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 2.2; ctx.stroke();

  // Semillas de Fibonacci
  const n = Math.round(cR * 3.8);
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt(i / n) * cR * 0.90;
    const a = i * GOLDEN;
    ctx.beginPath();
    ctx.arc(Math.cos(a)*r, Math.sin(a)*r, Math.max(1, cR*0.052), 0, PI2);
    ctx.fillStyle = i % 3 === 0 ? C.coreCenter : C.coreMid; ctx.fill();
  }

  // Brillo del núcleo
  ctx.beginPath(); ctx.arc(-cR*0.26, -cR*0.22, cR*0.15, 0, PI2);
  ctx.fillStyle = 'rgba(120,60,25,0.38)'; ctx.fill();
}

// ── Dibuja una hoja (con coordenadas absolutas) ───────────────────────────────
// ax,ay = base de la hoja en pantalla; w,h = dimensiones; angle = rotación
function leaf(ax, ay, w, h, angle) {
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(angle);
  // La hoja apunta hacia Y negativo (arriba) en su espacio local

  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.bezierCurveTo( w*0.50, -h*0.20,  w*1.00, -h*0.60,  w*0.82, -h*1.00);
  ctx.bezierCurveTo( w*0.18, -h*1.22, -w*0.18, -h*1.12,  0,      -h*1.28);
  ctx.bezierCurveTo(-w*0.10, -h*0.80, -w*0.10, -h*0.30,  0,       0);
  ctx.fillStyle = C.leafDk; ctx.fill();

  ctx.beginPath(); ctx.moveTo(w*0.10, -h*0.10);
  ctx.bezierCurveTo(w*0.42, -h*0.40, w*0.62, -h*0.68, w*0.58, -h*0.92);
  ctx.bezierCurveTo(w*0.28, -h*0.80, w*0.18, -h*0.52, w*0.05, -h*0.20);
  ctx.fillStyle = C.leafLt; ctx.fill();

  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.bezierCurveTo( w*0.50, -h*0.20,  w*1.00, -h*0.60,  w*0.82, -h*1.00);
  ctx.bezierCurveTo( w*0.18, -h*1.22, -w*0.18, -h*1.12,  0,      -h*1.28);
  ctx.bezierCurveTo(-w*0.10, -h*0.80, -w*0.10, -h*0.30,  0,       0);
  ctx.strokeStyle = C.outline; ctx.lineWidth = 1.6; ctx.stroke();

  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.bezierCurveTo(w*0.28, -h*0.40, w*0.38, -h*0.68, w*0.40, -h*1.02);
  ctx.strokeStyle = C.leafDk; ctx.lineWidth = 0.9; ctx.globalAlpha = 0.55;
  ctx.stroke(); ctx.globalAlpha = 1;

  ctx.restore();
}

// ── Dibuja el papel crespón REALISTA ─────────────────────────────────────────
function paper(cx, openY, openHW, tipY, tipHW, S) {
  // Forma base del cono (helper reutilizable)
  function conePath(xTM, xBM) {
    ctx.beginPath();
    ctx.moveTo(cx - tipHW * xBM, tipY);
    ctx.bezierCurveTo(
      cx - tipHW * xBM * 4.0, lerp(tipY, openY, 0.50),
      cx - openHW * xTM * 0.90, lerp(tipY, openY, 0.90),
      cx - openHW * xTM, openY
    );
    ctx.lineTo(cx + openHW * xTM, openY);
    ctx.bezierCurveTo(
      cx + openHW * xTM * 0.90, lerp(tipY, openY, 0.90),
      cx + tipHW * xBM * 4.0, lerp(tipY, openY, 0.50),
      cx + tipHW * xBM, tipY
    );
    ctx.closePath();
  }

  // 1. CAPAS TRASERAS (envolturas adicionales visibles)
  [
    { xT: 1.22, xB: 2.2, color: '#b07c77' },
    { xT: 1.13, xB: 1.7, color: '#c28e89' },
    { xT: 1.06, xB: 1.4, color: '#d4a09b' },
  ].forEach(l => {
    conePath(l.xT, l.xB);
    ctx.fillStyle = l.color; ctx.fill();
    ctx.strokeStyle = 'rgba(80,30,25,0.30)'; ctx.lineWidth = 1.5; ctx.stroke();
  });

  // 2. CARA FRONTAL CON GRADIENTE CILÍNDRICO
  conePath(1.0, 1.0);
  const cyl = ctx.createLinearGradient(cx - openHW, 0, cx + openHW, 0);
  cyl.addColorStop(0.00, '#be8882');
  cyl.addColorStop(0.10, '#d9a8a4');
  cyl.addColorStop(0.28, '#f0cbc8');
  cyl.addColorStop(0.46, '#fde8e6');
  cyl.addColorStop(0.50, '#fff3f1');
  cyl.addColorStop(0.54, '#fde8e6');
  cyl.addColorStop(0.72, '#f0cbc8');
  cyl.addColorStop(0.90, '#d9a8a4');
  cyl.addColorStop(1.00, '#be8882');
  ctx.fillStyle = cyl; ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 2.2; ctx.stroke();

  // 3. LÍNEAS DE PLIEGUE RADIANTES DESDE LA PUNTA (con clip)
  ctx.save();
  conePath(1.0, 1.0);
  ctx.clip();
  const nF = 14;
  for (let i = 0; i <= nF; i++) {
    const u   = i / nF;
    const xt  = lerp(cx - openHW * 0.96, cx + openHW * 0.96, u);
    const lit = i % 2 === 0;
    ctx.beginPath();
    ctx.moveTo(cx, tipY);
    ctx.lineTo(xt, openY);
    ctx.strokeStyle = lit ? '#fde8e6' : '#d9a8a4';
    ctx.lineWidth   = lit ? S * 0.048 : S * 0.036;
    ctx.globalAlpha = 0.48;
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.restore();

  // 4. SOMBRA LATERAL (curvatura 3D)
  ['left', 'right'].forEach(side => {
    const x0 = side === 'left' ? cx - openHW : cx + openHW;
    const x1 = side === 'left' ? cx - openHW * 0.55 : cx + openHW * 0.55;
    const sg  = ctx.createLinearGradient(x0, 0, x1, 0);
    sg.addColorStop(0, 'rgba(70,25,20,0.30)');
    sg.addColorStop(1, 'rgba(70,25,20,0.00)');
    conePath(1.0, 1.0);
    ctx.fillStyle = sg; ctx.fill();
  });

  // 5. SOMBRA EN LA PUNTA (papel apretado)
  const tg = ctx.createRadialGradient(cx, tipY, 0, cx, tipY, S * 1.5);
  tg.addColorStop(0,    'rgba(100,35,30,0.42)');
  tg.addColorStop(0.45, 'rgba(100,35,30,0.10)');
  tg.addColorStop(1,    'rgba(100,35,30,0.00)');
  ctx.beginPath(); ctx.arc(cx, tipY, S * 1.5, 0, PI2);
  ctx.fillStyle = tg; ctx.fill();

  // 6. BRILLO ESPECULAR CENTRAL
  const sp = ctx.createLinearGradient(cx - openHW * 0.20, 0, cx + openHW * 0.20, 0);
  sp.addColorStop(0,    'rgba(255,255,255,0.00)');
  sp.addColorStop(0.35, 'rgba(255,255,255,0.22)');
  sp.addColorStop(0.50, 'rgba(255,255,255,0.40)');
  sp.addColorStop(0.65, 'rgba(255,255,255,0.22)');
  sp.addColorStop(1,    'rgba(255,255,255,0.00)');
  conePath(0.22, 0.45);
  ctx.fillStyle = sp; ctx.fill();

  // 7. BORDE FESTONEADO — MÚLTIPLES CAPAS DE ONDAS
  [
    { yO: 0,          h: 0.17, n: 10, fill: '#fde8e6' },
    { yO: S * 0.11,   h: 0.13, n: 12, fill: '#f5ceca' },
    { yO: S * 0.20,   h: 0.10, n: 14, fill: '#ecc0bc' },
  ].forEach((row, ri) => {
    const rY = openY + row.yO;
    const pH = S * row.h;
    const n  = row.n;
    const hw = openHW * (1 - ri * 0.04);

    ctx.beginPath();
    ctx.moveTo(cx - hw, rY);
    for (let i = 0; i < n; i++) {
      const xP = lerp(cx - hw, cx + hw, (i + 0.5) / n);
      const xN = lerp(cx - hw, cx + hw, (i + 1)   / n);
      ctx.quadraticCurveTo(xP, rY - pH, xN, rY);
    }
    ctx.lineTo(cx + hw, rY + S * 0.07);
    ctx.lineTo(cx - hw, rY + S * 0.07);
    ctx.closePath();
    ctx.fillStyle = row.fill;
    ctx.globalAlpha = 1 - ri * 0.12; ctx.fill(); ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.moveTo(cx - hw, rY);
    for (let i = 0; i < n; i++) {
      const xP = lerp(cx - hw, cx + hw, (i + 0.5) / n);
      const xN = lerp(cx - hw, cx + hw, (i + 1)   / n);
      ctx.quadraticCurveTo(xP, rY - pH, xN, rY);
    }
    ctx.strokeStyle = C.paperShade; ctx.lineWidth = S * 0.042;
    ctx.globalAlpha = 0.55 - ri * 0.12; ctx.stroke(); ctx.globalAlpha = 1;
  });
}

// ── Dibuja Iniciales ──────────────────────────────────────────────────────────
function drawInitials(cx, bowY, S) {
  ctx.save();
  ctx.translate(cx, bowY - S * 0.72); // Justo arriba del moño
  
  // Configuración de texto
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Sombra para dar efecto de relieve (foil stamping)
  ctx.shadowColor = 'rgba(80, 20, 15, 0.35)';
  ctx.shadowOffsetY = S * 0.015;
  ctx.shadowBlur = S * 0.03;
  
  // Gradiente dorado para las letras
  const gold = ctx.createLinearGradient(-S*0.4, -S*0.2, S*0.4, S*0.2);
  gold.addColorStop(0.0, '#e6c27a'); // Oro oscuro
  gold.addColorStop(0.5, '#fff7d6'); // Brillo central
  gold.addColorStop(1.0, '#d4af37'); // Oro clásico
  
  ctx.fillStyle = gold;
  ctx.font = `italic 900 ${S*0.40}px "Playfair Display", "Didot", "Georgia", serif`;
  ctx.fillText("I & F", 0, 0);
  
  // Quitar sombra para los detalles pequeños
  ctx.shadowColor = 'transparent';
  
  // Líneas decorativas elegantes
  ctx.strokeStyle = gold;
  ctx.lineWidth = Math.max(1, S * 0.012);
  ctx.beginPath();
  ctx.moveTo(-S*0.45, S*0.28);
  ctx.lineTo(-S*0.10, S*0.28);
  ctx.moveTo( S*0.10, S*0.28);
  ctx.lineTo( S*0.45, S*0.28);
  ctx.stroke();
  
  // Corazoncito rojo en el medio de las líneas
  ctx.fillStyle = C.heart;
  ctx.font = `${S*0.16}px Arial`;
  ctx.fillText("♥", 0, S*0.29);

  ctx.restore();
}

// ── Dibuja el moño ────────────────────────────────────────────────────────────
function bow(cx, bowY, S, wind) {
  const bs = S * 0.62;
  ctx.save(); ctx.translate(cx, bowY);

  // Cintas colgantes
  [-1, 1].forEach(dir => {
    const bx = dir * bs * 0.20;
    const ex = bx + wind * bs * 1.0;
    const ey = bs * 2.0;
    ctx.beginPath();
    ctx.moveTo(bx, 0);
    ctx.quadraticCurveTo(dir * bs * 0.38 + wind * bs * 0.5, bs * 1.0, ex, ey);
    ctx.strokeStyle = C.bowWhite; ctx.lineWidth = bs * 0.38; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, 0);
    ctx.quadraticCurveTo(dir * bs * 0.38 + wind * bs * 0.5, bs * 1.0, ex, ey);
    ctx.strokeStyle = C.bowShade; ctx.lineWidth = bs * 0.12; ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
  });

  // Sombra del moño
  ctx.beginPath(); ctx.ellipse(0, 0, bs * 1.18, bs * 0.40, 0, 0, PI2);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.filter = 'blur(6px)'; ctx.fill(); ctx.filter = 'none';

  // Alas
  [-1, 1].forEach(dir => {
    // Ala base
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(dir*bs*0.82, bs*0.14, dir*bs*1.22, -bs*0.54, dir*bs*0.52, -bs*0.66);
    ctx.bezierCurveTo(dir*bs*0.22, -bs*0.78, dir*bs*0.06, -bs*0.30, 0, 0);
    ctx.fillStyle = C.bowWhite; ctx.fill();
    ctx.strokeStyle = C.outline; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.3; ctx.stroke(); ctx.globalAlpha = 1;

    // Plegado interior
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(dir*bs*0.52, 0, dir*bs*0.72, -bs*0.28, dir*bs*0.52, -bs*0.48);
    ctx.fillStyle = C.bowShade; ctx.globalAlpha = 0.28; ctx.fill(); ctx.globalAlpha = 1;

    // Brillo del ala
    ctx.beginPath();
    ctx.moveTo(dir*bs*0.08, -bs*0.04);
    ctx.bezierCurveTo(dir*bs*0.44, -bs*0.02, dir*bs*0.70, -bs*0.30, dir*bs*0.46, -bs*0.52);
    ctx.strokeStyle = C.bowShine; ctx.lineWidth = bs * 0.12; ctx.globalAlpha = 0.50; ctx.stroke(); ctx.globalAlpha = 1;
  });

  // Nudo
  const gk = ctx.createRadialGradient(-bs*0.08, -bs*0.08, 0, 0, 0, bs*0.24);
  gk.addColorStop(0, '#ffffff'); gk.addColorStop(1, C.bowShade);
  ctx.beginPath(); ctx.ellipse(0, -bs*0.02, bs*0.22, bs*0.28, 0, 0, PI2);
  ctx.fillStyle = gk; ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 1; ctx.globalAlpha = 0.3; ctx.stroke(); ctx.globalAlpha = 1;

  // Brillo del nudo
  ctx.beginPath(); ctx.arc(-bs*0.06, -bs*0.10, bs*0.08, 0, PI2);
  ctx.fillStyle = C.bowShine; ctx.fill();

  ctx.restore();
}

// ── Escena Principal ──────────────────────────────────────────────────────────
function drawScene(dt) {
  const { S, cx, openY, openHW, bowY, tipY, tipHW } = L;

  // Brisa pasiva (automática, sin ratón)
  const wind = Math.sin(t * 1.55) * 0.038 + Math.sin(t * 0.52) * 0.022;

  // 1. CAPA TRASERA DEL PAPEL
  paper(cx, openY, openHW, tipY, tipHW, S);

  // 2. TALLOS (entre capas del papel)
  const stemOrder = [...FLW].sort((a, b) => b.z - a.z);
  stemOrder.forEach(f => {
    if (f.scale.val < 0.02) return;
    const fx   = cx + f.dx;
    const fyHd = openY + f.dy + f.sf * S * 0.42; // Base de la cabeza de la flor
    const exX  = cx + f.dx * 0.06;               // Punto donde converge (casi al centro)
    const exY  = Math.min(tipY * 0.98, bowY + S * 0.25);

    // Curva de Bezier que converge suavemente dentro del papel
    const cpX = lerp(fx, exX, 0.45);
    const cpY = lerp(fyHd, exY, 0.50);

    ctx.beginPath(); ctx.moveTo(fx, fyHd); ctx.quadraticCurveTo(cpX, cpY, exX, exY);
    ctx.strokeStyle = C.stem;    ctx.lineWidth = S * 0.075 * f.scale.val; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = C.stemLite; ctx.lineWidth = S * 0.025 * f.scale.val; ctx.globalAlpha = 0.8; ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineCap = 'butt';
  });

  // 3. HOJAS DECORATIVAS
  const lw = S * 0.26, lh = S * 0.38;
  leaf(cx - openHW * 0.58, openY - S * 0.05, lw * 1.1, lh * 1.5, -0.68 + wind * 0.5);
  leaf(cx + openHW * 0.52, openY - S * 0.00, lw,       lh * 1.4,  0.55 + wind * 0.5);
  leaf(cx - openHW * 0.28, openY - S * 0.20, lw * 0.8, lh * 1.1, -0.38 + wind * 0.3);

  // 4. PAPEL FRONTAL + INICIALES + MOÑO (encima de los tallos)
  paper(cx, openY, openHW, tipY, tipHW, S);
  drawInitials(cx, bowY, S);
  bow(cx, bowY, S, wind);

  // 5. FLORES (de atrás a adelante, con físicas de brisa y entrada)
  FLW.forEach(f => {
    f.scale.target = intro > f.delay ? 1 : 0;
    f.scale.update(dt);
    f.pop.update(dt);
    f.pop.target = 0;

    const sc = f.scale.val;
    if (sc < 0.01) return;

    const fx = cx + f.dx;
    const fy = openY + f.dy;

    // Brisa: las flores más altas se balancean más
    const sway    = wind * (1 + Math.abs(f.dy / S) * 0.6);
    const popUp   = f.pop.val * S * 0.48;
    const bobble  = Math.sin(t * 1.1 + f.phase) * S * 0.018;
    const rot     = sway * 0.9 + Math.sin(t * 1.3 + f.phase) * 0.030;

    f.absX = fx + sway * S * 0.12;
    f.absY = fy - popUp + bobble;

    ctx.save(); ctx.translate(f.absX, f.absY);

    // Sombra
    ctx.beginPath(); ctx.arc(S * 0.08, S * 0.14, f.sf * sc * S * 0.82, 0, PI2);
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.filter = 'blur(8px)'; ctx.fill(); ctx.filter = 'none';

    ctx.scale(f.sf * sc, f.sf * sc);
    ctx.rotate(rot);
    sunflower(S);
    ctx.restore();
  });
}

// ── Partículas de Corazón ─────────────────────────────────────────────────────
class HeartP {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = rnd(-1.8, 1.8); this.vy = rnd(-4.5, -1.5);
    this.s = rnd(7, 16); this.a = 1;
  }
  update(dt) { this.x += this.vx; this.y += this.vy; this.vy += 2.5 * dt; this.a -= dt * 0.88; }
  draw() {
    if (this.a <= 0) return;
    ctx.save(); ctx.translate(this.x, this.y); ctx.globalAlpha = this.a;
    const s = this.s;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.28);
    ctx.bezierCurveTo(-s, -s * 0.22, -s, -s * 1.1, 0, -s * 0.58);
    ctx.bezierCurveTo( s, -s * 1.1,  s, -s * 0.22, 0,  s * 0.28);
    ctx.fillStyle = C.heart; ctx.fill();
    ctx.strokeStyle = C.outline; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
}

// ── Bucle Principal ───────────────────────────────────────────────────────────
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now; t += dt;
  if (intro < 3) intro += dt;

  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  calcLayout(); // Rápido, sin recrear flores
  drawScene(dt);

  particles = particles.filter(p => p.a > 0);
  particles.forEach(p => { p.update(dt); p.draw(); });

  requestAnimationFrame(loop);
}

// ── Modales UI y Animaciones ───────────────────────────────────────────────────
function showModal(type) {
  if (document.getElementById('fw-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'fw-modal';
  Object.assign(modal.style, {
    position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: '9999',
    opacity: '0', transition: 'opacity 0.4s ease',
    backdropFilter: 'blur(5px)', padding: '20px', boxSizing: 'border-box',
    fontFamily: '"Playfair Display", "Georgia", serif', perspective: '1000px'
  });

  const content = document.createElement('div');
  Object.assign(content.style, {
    position: 'relative', width: '100%', maxWidth: '420px',
    textAlign: 'center', transform: 'translateY(60px) scale(0.8) rotateX(-15deg)',
    opacity: '0', transition: 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease',
  });

  if (type === 'envelope') {
    // Carta estilo sobre interactivo
    content.innerHTML = `
      <div style="position:relative; width: 340px; height: 220px; margin: 150px auto 0 auto; perspective:1200px;">
        <!-- Parte trasera del sobre -->
        <div style="position:absolute; inset:0; background:#9e463a; border-radius:10px; z-index:1; box-shadow: 0 15px 35px rgba(0,0,0,0.4);"></div>
        
        <!-- Carta interior -->
        <div id="fw-letter" style="position:absolute; top:10px; left:10px; width:320px; height:200px; background:#fffcf5; border-radius:10px; z-index:2; transition: all 1.2s cubic-bezier(0.25, 1, 0.5, 1); box-sizing:border-box; padding:25px 20px; text-align:center; opacity:0; overflow:hidden; border:2px solid #d4af37; pointer-events:none;">
          <h2 style="margin:0 0 10px 0; color:#d4af37; font-style:italic; font-size:24px;">Para ti... 🌻</h2>
          <div style="font-size:14px; line-height:1.5; color:#5e2a07; text-align:justify; margin-bottom:15px; padding:0 5px;">
            <p style="margin-top:0;">Quiero entregarte estas flores. Quizá no sea el detalle más grande, pero es una forma sincera de demostrarte mi amor. Aunque una simple fecha nos diga que hoy se regalan flores amarillas, lo que siento por ti va muchísimo más allá.</p>
            <p>Como ya te habrás dado cuenta, se vienen sorpresas aún más bonitas. Quiero que recuerdes este momento toda tu vida. A pesar de todos los conflictos que tuvimos, siempre estuviste ahí.</p>
            <p>Te aprecio muchísimo y siempre quiero estar a tu lado acompañando cada logro que tengamos. Que nada nos separe.</p>
            <p style="text-align:center; font-size:16px; font-weight:bold; color:#d4af37; margin-bottom:0; font-style:italic;">I love you so much.</p>
          </div>
          <button id="fw-close-env" style="background:linear-gradient(135deg, #e6c27a, #d4af37); color:#fff; border:none; padding:10px 20px; border-radius:20px; font-weight:bold; cursor:pointer; font-size:13px; opacity:0; transition:opacity 0.5s; pointer-events:auto; text-transform:uppercase;">Guardar en el corazón</button>
        </div>

        <!-- Parte delantera del sobre -->
        <div style="position:absolute; inset:0; overflow:hidden; z-index:3; border-radius:10px; pointer-events:none;">
          <div style="position:absolute; bottom:0; left:0; width:100%; height:100%; background:#b8584b; clip-path: polygon(0 100%, 50% 45%, 100% 100%);"></div>
          <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:#c76c60; clip-path: polygon(0 0, 0 100%, 50% 45%);"></div>
          <div style="position:absolute; top:0; right:0; width:100%; height:100%; background:#c76c60; clip-path: polygon(100% 0, 100% 100%, 50% 45%);"></div>
        </div>

        <!-- Solapa del sobre -->
        <div id="fw-flap" style="position:absolute; top:0; left:0; width:100%; height:65%; background:#d68176; clip-path: polygon(0 0, 100% 0, 50% 100%); transform-origin: top; transition: transform 0.8s cubic-bezier(0.25, 1, 0.5, 1); z-index:4;"></div>

        <!-- Candado -->
        <div id="fw-lock" style="position:absolute; top:63%; left:50%; transform:translate(-50%, -50%); width:60px; height:60px; background:linear-gradient(135deg, #e6c27a, #d4af37); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:28px; cursor:pointer; z-index:5; box-shadow: 0 5px 15px rgba(0,0,0,0.4); transition: transform 0.3s, opacity 0.5s;">
          🔒
        </div>
      </div>

      <!-- Cuadro de acertijo overlay -->
      <div id="fw-riddle-box" style="position:absolute; top:20%; left:50%; transform:translate(-50%, -50%) scale(0.8); background:#fffcf5; padding:25px; border-radius:15px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); z-index:10; opacity:0; pointer-events:none; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); border:2px solid #d4af37; width:280px;">
        <h2 style="margin:0 0 15px 0; color:#d4af37; font-style:italic; font-size:20px;">Candado del amor 🔒</h2>
        <p style="font-size:15px; margin-bottom:15px; color:#5e2a07; font-weight:bold;">¿A qué edades nos conocimos?</p>
        <input type="text" id="fw-answer" placeholder="Ej: 20 y 21" autocomplete="off" style="width:100%; padding:10px; border:2px solid #d4af37; border-radius:10px; font-size:15px; text-align:center; outline:none; margin-bottom:10px; box-sizing:border-box;">
        <p id="fw-error" style="color:#e74c3c; font-size:13px; margin:0 0 10px 0; opacity:0; transition:opacity 0.3s;">Mmm... Piénsalo bien mi amor ❤️</p>
        <button id="fw-submit" style="background:linear-gradient(135deg, #e6c27a, #d4af37); color:#fff; border:none; padding:10px 0; width:100%; border-radius:20px; font-weight:bold; cursor:pointer; font-size:14px; text-transform:uppercase; letter-spacing:1px;">Abrir candado</button>
      </div>
    `;
  } else {
    // Modal simple para el resto de flores
    Object.assign(content.style, {
      backgroundColor: '#fffcf5', padding: '30px 20px', borderRadius: '15px',
      boxShadow: '0 20px 50px rgba(0,0,0,0.4)', border: '2px solid #d4af37'
    });
    content.innerHTML = `
      <h2 style="margin:0 0 15px 0; color:#d4af37; font-style:italic; font-size:28px;">Sorpresa ✨</h2>
      <p style="font-size:19px; line-height:1.6; margin-bottom:25px; color:#5e2a07; font-style:italic;">Próximamente...</p>
      <button id="fw-close" style="background:linear-gradient(135deg, #e6c27a, #d4af37); color:#fff; border:none; padding:12px 28px; border-radius:25px; font-weight:bold; cursor:pointer; font-size:14px; text-transform:uppercase; letter-spacing:1px;">Cerrar</button>
    `;
  }

  modal.appendChild(content);
  document.body.appendChild(modal);

  modal.offsetHeight;
  requestAnimationFrame(() => {
    modal.style.opacity = '1';
    content.style.opacity = '1';
    content.style.transform = 'translateY(0) scale(1) rotateX(0deg)';
  });

  const closeModal = () => {
    modal.style.opacity = '0';
    content.style.transform = 'translateY(30px) scale(0.9) rotateX(10deg)';
    content.style.opacity = '0';
    setTimeout(() => modal.remove(), 400);
  };

  if (type === 'envelope') {
    const lock = document.getElementById('fw-lock');
    const riddleBox = document.getElementById('fw-riddle-box');
    const input = document.getElementById('fw-answer');
    const submitBtn = document.getElementById('fw-submit');
    const err = document.getElementById('fw-error');
    const flap = document.getElementById('fw-flap');
    const letter = document.getElementById('fw-letter');
    const closeEnvBtn = document.getElementById('fw-close-env');

    lock.addEventListener('click', () => {
      lock.style.transform = 'translate(-50%, -50%) scale(0.9)';
      riddleBox.style.opacity = '1';
      riddleBox.style.pointerEvents = 'auto';
      riddleBox.style.transform = 'translate(-50%, -50%) scale(1)';
      setTimeout(() => input.focus(), 300);
    });

    const unlockEnvelope = () => {
      // 1. Ocultar acertijo
      riddleBox.style.opacity = '0';
      riddleBox.style.pointerEvents = 'none';
      riddleBox.style.transform = 'translate(-50%, -50%) scale(0.8)';
      
      // 2. Candado se abre y desaparece
      lock.innerHTML = '🔓';
      lock.style.transform = 'translate(-50%, -50%) scale(1.2)';
      setTimeout(() => {
        lock.style.opacity = '0';
        lock.style.transform = 'translate(-50%, -50%) scale(0)';
      }, 400);

      // 3. Abrir la solapa del sobre
      setTimeout(() => {
        flap.style.transform = 'rotateX(180deg)';
      }, 700);

      // 4. Sacar la carta y reordenar capas
      setTimeout(() => {
        flap.style.zIndex = '1'; // Detrás de la carta
        letter.style.opacity = '1';
        letter.style.height = '430px'; // Crece verticalmente
        letter.style.top = '-250px';   // Sube
        letter.style.zIndex = '5';     // Viene al frente
        letter.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
        letter.style.pointerEvents = 'auto';
        
        // 5. Botón cerrar
        setTimeout(() => closeEnvBtn.style.opacity = '1', 1000);
      }, 1200);
    };

    const checkAnswer = () => {
      const val = input.value.toLowerCase().replace(/\s+/g, '');
      if (val.includes('16') && val.includes('17')) {
        unlockEnvelope();
      } else {
        err.style.opacity = '1';
        input.style.borderColor = '#e74c3c';
        riddleBox.style.transition = 'transform 0.1s ease';
        riddleBox.style.transform = 'translate(-50%, -50%) translateX(-10px)';
        setTimeout(() => riddleBox.style.transform = 'translate(-50%, -50%) translateX(10px)', 100);
        setTimeout(() => riddleBox.style.transform = 'translate(-50%, -50%) translateX(-10px)', 200);
        setTimeout(() => {
          riddleBox.style.transform = 'translate(-50%, -50%) translateX(0)';
          riddleBox.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        }, 300);
      }
    };

    submitBtn.addEventListener('click', checkAnswer);
    submitBtn.addEventListener('mouseenter', () => submitBtn.style.transform = 'scale(1.05)');
    submitBtn.addEventListener('mouseleave', () => submitBtn.style.transform = 'scale(1)');

    input.addEventListener('input', () => {
      err.style.opacity = '0';
      input.style.borderColor = '#d4af37';
    });
    input.addEventListener('keypress', e => { if (e.key === 'Enter') checkAnswer(); });
  }
}

// ── Interacción (solo click/tap) ──────────────────────────────────────────────
canvas.addEventListener('pointerdown', e => {
  const x = e.clientX, y = e.clientY;
  let hit = -1;
  for (let i = FLW.length - 1; i >= 0; i--) {
    const f = FLW[i];
    if (Math.hypot(x - f.absX, y - f.absY) < f.sf * L.S * 1.15) { hit = i; break; }
  }
  if (hit >= 0) {
    FLW[hit].pop.vel = 5.5; // Hacer saltar la flor
    for (let i = 0; i < 7; i++)
      particles.push(new HeartP(FLW[hit].absX + rnd(-40, 40), FLW[hit].absY + rnd(-30, 30)));
      
    // Mostrar modal con pequeño retraso para disfrutar el salto de la flor
    setTimeout(() => {
      if (hit === 0) { // La flor central superior
        showModal('riddle');
      } else { // Cualquier otra flor
        showModal('soon');
      }
    }, 350);

  } else {
    for (let i = 0; i < 2; i++) particles.push(new HeartP(x, y));
  }
}, { passive: true });

// ── Arrancar ──────────────────────────────────────────────────────────────────
resize();
requestAnimationFrame(loop);
