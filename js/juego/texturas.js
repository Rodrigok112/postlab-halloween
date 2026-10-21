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
