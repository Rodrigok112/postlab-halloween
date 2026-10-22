// Texturas generadas por código en canvas diminutos, con filtrado «vecino más cercano» (PS1).

import { THREE } from './ps1.js';

function lienzo(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function textura(canvas, repetir = [1, 1]) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repetir);
  return t;
}

function ruido(g, w, h, rng, n, color, alfa) {
  g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    g.globalAlpha = alfa * rng();
    g.fillRect(Math.floor(rng() * w), Math.floor(rng() * h), 1, 1);
  }
  g.globalAlpha = 1;
}

// Papel pintado de la oficina: amarillento, franjas, florecitas y manchas de humedad.
export function papelOficina(rng, repetir) {
  const [c, g] = lienzo(64, 64);
  g.fillStyle = '#8f7f4c';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#7b6c3e';
  for (const x of [6, 30, 54]) g.fillRect(x, 0, 2, 64);
  g.fillStyle = '#a4935e';
  for (let y = 4; y < 64; y += 12) for (const x of [18, 42]) { g.fillRect(x, y, 3, 3); g.fillRect(x + 1, y - 1, 1, 5); }
  g.fillStyle = 'rgba(60,45,20,.35)';
  g.fillRect(40, 44, 18, 20);
  ruido(g, 64, 64, rng, 500, '#3d3420', 0.4);
  return textura(c, repetir);
}

// Papel de los backrooms: amarillo monótono con un dibujo repetido muy suave.
export function papelBackrooms(rng, repetir) {
  const [c, g] = lienzo(64, 64);
  g.fillStyle = '#b8a55a';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#a8954d';
  for (let y = 0; y < 64; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < 64; x += 8) g.fillRect(x, y, 2, 2);
  g.fillStyle = 'rgba(90,70,20,.25)';
  g.fillRect(0, 56, 64, 8);
  ruido(g, 64, 64, rng, 400, '#5b4c1e', 0.35);
  return textura(c, repetir);
}

export function moqueta(rng, base, repetir) {
  const [c, g] = lienzo(32, 32);
  g.fillStyle = base;
  g.fillRect(0, 0, 32, 32);
  ruido(g, 32, 32, rng, 600, '#000', 0.35);
  ruido(g, 32, 32, rng, 200, '#fff', 0.12);
  return textura(c, repetir);
}

export function techo(repetir) {
  const [c, g] = lienzo(32, 32);
  g.fillStyle = '#b8b29a';
  g.fillRect(0, 0, 32, 32);
  g.fillStyle = '#8f8a74';
  g.fillRect(0, 0, 32, 1);
  g.fillRect(0, 0, 1, 32);
  return textura(c, repetir);
}

export function madera(rng) {
  const [c, g] = lienzo(32, 64);
  g.fillStyle = '#3a2c1c';
  g.fillRect(0, 0, 32, 64);
  g.fillStyle = '#2c2015';
  for (let x = 2; x < 32; x += 5) g.fillRect(x + Math.floor(rng() * 2), 0, 1, 64);
  g.fillStyle = '#c9c2a8';
  g.fillRect(25, 32, 4, 2); // manilla
  return textura(c);
}

// Pantalla del CRT: texto rojo sobre negro, o apagada.
export function pantalla(texto) {
  const [c, g] = lienzo(96, 72);
  g.fillStyle = texto ? '#050303' : '#000';
  g.fillRect(0, 0, 96, 72);
  if (texto) {
    g.font = 'bold 13px monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#d0101a';
    const lineas = texto.split('\n');
    lineas.forEach((l, i) => g.fillText(l, 48, 36 + (i - (lineas.length - 1) / 2) * 15));
    g.fillStyle = 'rgba(255,255,255,.05)';
    for (let y = 0; y < 72; y += 2) g.fillRect(0, y, 96, 1);
  }
  return textura(c);
}

// Corcho con dibujos toscos de caras ensangrentadas y papeles.
export function corcho(rng) {
  const [c, g] = lienzo(64, 80);
  g.fillStyle = '#9c6b3c';
  g.fillRect(0, 0, 64, 80);
  ruido(g, 64, 80, rng, 300, '#5b3d20', 0.5);
  const cara = (x, y) => {
    g.fillStyle = '#efe9d6';
    g.fillRect(x, y, 22, 26);
    g.strokeStyle = '#2a2418';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(x + 11, y + 12, 7, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#2a2418';
    g.fillRect(x + 8, y + 10, 2, 2);
    g.fillRect(x + 13, y + 10, 2, 2);
    g.fillStyle = '#9e0b12';
    g.fillRect(x + 8, y + 12, 1, 8 + Math.floor(rng() * 6));
    g.fillRect(x + 14, y + 12, 1, 6 + Math.floor(rng() * 8));
  };
  cara(4, 4);
  cara(36, 6);
  cara(6, 44);
  g.fillStyle = '#ece5cf';
  g.fillRect(36, 40, 24, 14);
  g.fillStyle = '#1b1712';
  for (let y = 60; y < 76; y += 3) g.fillRect(34, y, 26, 1);
  return textura(c);
}

export function papelEscrito(texto, colorTinta = '#2a2418') {
  const [c, g] = lienzo(64, 40);
  g.fillStyle = '#ece5cf';
  g.fillRect(0, 0, 64, 40);
  g.font = 'bold 9px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = colorTinta;
  const lineas = texto.split('\n');
  lineas.forEach((l, i) => g.fillText(l, 32, 20 + (i - (lineas.length - 1) / 2) * 11));
  return textura(c);
}

export function persiana() {
  const [c, g] = lienzo(16, 32);
  g.fillStyle = '#5d7480';
  g.fillRect(0, 0, 16, 32);
  g.fillStyle = '#cfd6d2';
  for (let y = 0; y < 32; y += 4) g.fillRect(0, y, 16, 2);
  return textura(c);
}

// Grafiti rojo con chorreones sobre fondo transparente. Necesita la tipografía Rubik Wet Paint cargada.
export function grafiti(palabra, rng) {
  const [c, g] = lienzo(256, 112);
  g.clearRect(0, 0, 256, 112);
  g.font = '44px "Rubik Wet Paint", monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#8e0a10';
  const ancho = g.measureText(palabra).width;
  const escala = Math.min(1, 236 / ancho);
  g.save();
  g.translate(128, 46);
  g.scale(escala, 1);
  g.rotate((rng() - 0.5) * 0.12);
  g.fillText(palabra, 0, 0);
  g.restore();
  // Chorreones extra que caen de las letras.
  for (let i = 0; i < 9; i++) {
    const x = 128 + (rng() - 0.5) * ancho * escala;
    const y0 = 52 + rng() * 10;
    g.fillRect(Math.floor(x), Math.floor(y0), 2, Math.floor(10 + rng() * 40));
  }
  const t = textura(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// ---------- Habitación sucia (referencia del 22/10) ----------

// Mancha irregular: varios círculos pegados, para moho, humedad y sangre.
function mancha(g, x, y, r, rng, color) {
  g.fillStyle = color;
  for (let i = 0; i < 7; i++) {
    g.beginPath();
    g.arc(x + (rng() - 0.5) * r * 1.4, y + (rng() - 0.5) * r * 1.4, r * (0.35 + rng() * 0.5), 0, Math.PI * 2);
    g.fill();
  }
}

// Pared en dos tonos: arriba oscura con moho, una moldura marrón y abajo zócalo claro manchado.
// La textura cubre toda la altura (2,6 m): el zócalo es el 40 % de abajo.
export function paredSucia(rng, repetir) {
  const [c, g] = lienzo(64, 64);
  g.fillStyle = '#2c3530';
  g.fillRect(0, 0, 64, 38);
  for (let i = 0; i < 6; i++) mancha(g, rng() * 64, rng() * 34, 5 + rng() * 7, rng, 'rgba(20,28,22,.55)');
  for (let i = 0; i < 4; i++) mancha(g, rng() * 64, rng() * 30, 3 + rng() * 4, rng, 'rgba(70,84,72,.45)');
  ruido(g, 64, 38, rng, 300, '#0c100d', 0.5);
  g.fillStyle = '#4a3220';
  g.fillRect(0, 38, 64, 3);
  g.fillStyle = '#bdb8a6';
  g.fillRect(0, 41, 64, 23);
  g.fillStyle = '#a19c8a';
  for (const x of [0, 16, 32, 48]) g.fillRect(x, 41, 1, 23);
  for (let i = 0; i < 5; i++) mancha(g, rng() * 64, 44 + rng() * 18, 3 + rng() * 4, rng, 'rgba(60,52,40,.4)');
  // Chorreones de suciedad que bajan de la moldura.
  g.fillStyle = 'rgba(40,34,26,.6)';
  for (let i = 0; i < 6; i++) g.fillRect(Math.floor(rng() * 64), 41, 1, 4 + Math.floor(rng() * 12));
  ruido(g, 64, 64, rng, 200, '#2a251c', 0.35);
  return textura(c, repetir);
}

export function baldosas(rng, repetir) {
  const [c, g] = lienzo(64, 64);
  g.fillStyle = '#7d786a';
  g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const tono = 100 + Math.floor(rng() * 22);
    g.fillStyle = `rgb(${tono},${tono - 4},${tono - 14})`;
    g.fillRect(x * 16 + 1, y * 16 + 1, 15, 15);
  }
  g.fillStyle = '#2e2b25';
  for (let k = 0; k < 64; k += 16) { g.fillRect(k, 0, 1, 64); g.fillRect(0, k, 64, 1); }
  for (let i = 0; i < 5; i++) mancha(g, rng() * 64, rng() * 64, 3 + rng() * 6, rng, 'rgba(30,26,20,.45)');
  ruido(g, 64, 64, rng, 400, '#1d1a15', 0.45);
  return textura(c, repetir);
}

export function techoSucio(rng, repetir) {
  const [c, g] = lienzo(64, 64);
  g.fillStyle = '#6d6a5e';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#4c493f';
  for (let k = 0; k < 64; k += 32) { g.fillRect(k, 0, 1, 64); g.fillRect(0, k, 64, 1); }
  for (let i = 0; i < 4; i++) mancha(g, rng() * 64, rng() * 64, 4 + rng() * 8, rng, 'rgba(60,48,26,.4)');
  ruido(g, 64, 64, rng, 300, '#2a2820', 0.4);
  return textura(c, repetir);
}

// Salpicadura de sangre sobre fondo transparente (para pegar en paredes y suelo).
export function sangre(rng, conChorreones = false) {
  const [c, g] = lienzo(64, 64);
  g.clearRect(0, 0, 64, 64);
  mancha(g, 32, 28, 11, rng, '#4e0408');
  mancha(g, 32, 28, 6, rng, '#6b070c');
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2;
    const d = 12 + rng() * 18;
    g.fillStyle = '#560509';
    g.fillRect(Math.floor(32 + Math.cos(a) * d), Math.floor(28 + Math.sin(a) * d), 1 + Math.floor(rng() * 3), 1 + Math.floor(rng() * 2));
  }
  if (conChorreones) {
    g.fillStyle = '#4e0408';
    for (let i = 0; i < 6; i++) g.fillRect(Math.floor(24 + rng() * 16), 30, 2, Math.floor(10 + rng() * 24));
  }
  const t = textura(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Mano ensangrentada arrastrada (para la pared junto a la puerta del ente).
export function manoSangre(rng) {
  const [c, g] = lienzo(32, 64);
  g.clearRect(0, 0, 32, 64);
  g.fillStyle = '#560509';
  g.fillRect(9, 8, 14, 12);
  for (let i = 0; i < 4; i++) g.fillRect(9 + i * 4, 0, 2, 9);
  g.fillRect(5, 12, 4, 3);
  for (let x = 10; x < 22; x += 2) g.fillRect(x, 20, 1, Math.floor(18 + rng() * 26));
  const t = textura(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Carta tirada en el suelo, escrita a mano.
export function carta(texto, rng, tinta = '#7a0a10') {
  const [c, g] = lienzo(48, 64);
  g.fillStyle = '#d9d2bb';
  g.fillRect(0, 0, 48, 64);
  g.fillStyle = '#bdb59c';
  for (let y = 8; y < 64; y += 6) g.fillRect(3, y, 42, 1);
  mancha(g, rng() * 48, rng() * 64, 4, rng, 'rgba(90,70,40,.3)');
  g.font = 'bold 11px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = tinta;
  const lineas = texto.split('\n');
  g.save();
  g.translate(24, 30);
  g.rotate((rng() - 0.5) * 0.3);
  lineas.forEach((l, i) => g.fillText(l, 0, (i - (lineas.length - 1) / 2) * 12));
  g.restore();
  return textura(c);
}

// Hoja de la puerta del ente: madera oscura con un boquete irregular (transparente) arriba.
export function puertaRota(rng) {
  const [c, g] = lienzo(32, 64);
  g.fillStyle = '#3a2c1c';
  g.fillRect(0, 0, 32, 64);
  g.fillStyle = '#2c2015';
  for (let x = 2; x < 32; x += 5) g.fillRect(x + Math.floor(rng() * 2), 0, 1, 64);
  g.fillStyle = '#c9c2a8';
  g.fillRect(25, 32, 4, 2);
  // Astillas: madera clara arrancada en picos irregulares alrededor del agujero, y el agujero (alfa 0).
  const cx = 16, cy = 18;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rng() * 0.3;
    const r0 = 6, r1 = 8 + rng() * 6;
    const ab = 0.18 + rng() * 0.15;
    g.fillStyle = rng() < 0.5 ? '#8a6a44' : '#6e5233';
    g.beginPath();
    g.moveTo(cx + Math.cos(a - ab) * r0, cy + Math.sin(a - ab) * r0 * 1.25);
    g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 1.25);
    g.lineTo(cx + Math.cos(a + ab) * r0, cy + Math.sin(a + ab) * r0 * 1.25);
    g.fill();
  }
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = 6 + rng() * 3.5;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r * 1.25;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.fill();
  g.globalCompositeOperation = 'source-over';
  return textura(c);
}

// ---------- Monstruos ----------

// Piel gris oscura con venas.
export function piel(rng, base = '#2b2725') {
  const [c, g] = lienzo(64, 64);
  g.fillStyle = base;
  g.fillRect(0, 0, 64, 64);
  ruido(g, 64, 64, rng, 500, '#0d0b0a', 0.5);
  g.fillStyle = '#4a1f26';
  for (let v = 0; v < 7; v++) {
    let x = rng() * 64, y = rng() * 64;
    for (let k = 0; k < 30; k++) {
      g.fillRect(Math.floor(x) & 63, Math.floor(y) & 63, 1, 1);
      x += (rng() - 0.5) * 2.2;
      y += 0.6 + rng() * 0.8;
    }
  }
  return textura(c);
}

// Costillas marcadas: bandas claras sobre la piel.
export function costillas(rng) {
  const [c, g] = lienzo(64, 64);
  g.fillStyle = '#211d1c';
  g.fillRect(0, 0, 64, 64);
  for (let y = 4; y < 60; y += 7) {
    g.fillStyle = '#4a4440';
    g.fillRect(0, y, 64, 3);
    g.fillStyle = '#0e0c0b';
    g.fillRect(0, y + 3, 64, 2);
  }
  g.fillStyle = '#0e0c0b';
  g.fillRect(30, 0, 4, 64);
  ruido(g, 64, 64, rng, 300, '#000', 0.4);
  return textura(c);
}
