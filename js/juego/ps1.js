// Motor con estética PS1: render a baja resolución escalado sin suavizado, vértices que tiemblan
// pegados a la rejilla de píxeles y niebla negra.

import * as THREE from '../../vendor/three/three.module.min.js';

export { THREE };

export const ANCHO_INTERNO = 240;

// Resolución compartida por todos los materiales PS1 (la usa el shader para pegar los vértices).
const resolucion = new THREE.Vector2(ANCHO_INTERNO, 400);

export function crearMotor(contenedor) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  const lienzo = renderer.domElement;
  lienzo.className = 'juego-lienzo';
  contenedor.append(lienzo);

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x000000);
  escena.fog = new THREE.Fog(0x000000, 2.5, 15);
  const camara = new THREE.PerspectiveCamera(68, 1, 0.05, 60);

  const ajustar = () => {
    const w = ANCHO_INTERNO;
    const h = Math.max(1, Math.round((w * window.innerHeight) / Math.max(1, window.innerWidth)));
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    resolucion.set(w, h);
  };
  ajustar();
  window.addEventListener('resize', ajustar);

  return {
    renderer,
    escena,
    camara,
    lienzo,
    render() { renderer.render(escena, camara); },
    destruir() {
      window.removeEventListener('resize', ajustar);
      escena.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
      });
      renderer.dispose();
      lienzo.remove();
    },
  };
}

// Material Lambert con los vértices pegados a la rejilla de píxeles (el temblor típico de PS1).
export function materialPS1(opciones = {}) {
  const m = new THREE.MeshLambertMaterial({ flatShading: true, ...opciones });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRes = { value: resolucion };
    shader.vertexShader = `uniform vec2 uRes;\n${shader.vertexShader}`.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      vec2 rejilla = uRes * 0.5;
      gl_Position.xy = floor(gl_Position.xy / gl_Position.w * rejilla + 0.5) / rejilla * gl_Position.w;`,
    );
  };
  return m;
}

// Material sin luz (pantallas, fluorescentes, ojos): brilla por sí mismo.
export function materialBrillo(opciones = {}) {
  return new THREE.MeshBasicMaterial({ fog: true, ...opciones });
}
