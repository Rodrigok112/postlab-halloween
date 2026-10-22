// Motor con estética PS1:
// - Render interno con 240 px en el lado corto, escalado sin suavizado.
// - Vértices que tiemblan pegados a la rejilla de píxeles y texturas afines (sin corrección de perspectiva).
// - Luz calculada por vértice (Gouraud) con un puñado de luces compartidas, y niebla.
// - Paso final: color de 15 bits con tramado Bayer 4×4, viñeta y un leve desfase rojo/azul en los bordes.

import * as THREE from '../../vendor/three/three.module.min.js';

export { THREE };

export const LADO_CORTO = 240;
export const MAX_LUCES = 4;

// Resolución compartida por todos los materiales PS1 (la usa el shader para pegar los vértices).
const resolucion = new THREE.Vector2(LADO_CORTO, 400);

// Luces compartidas por todos los materiales con luz: ambiente + MAX_LUCES puntos con alcance.
const U = {
  uRes: { value: resolucion },
  uAmb: { value: new THREE.Color(0x101010) },
  uLPos: { value: Array.from({ length: MAX_LUCES }, () => new THREE.Vector3()) },
  uLCol: { value: Array.from({ length: MAX_LUCES }, () => new THREE.Color(0, 0, 0)) },
  uLAlc: { value: Array.from({ length: MAX_LUCES }, () => 1) },
};

export const luces = {
  ambiente(hex, intensidad = 1) { U.uAmb.value.set(hex).multiplyScalar(intensidad); },
  // pos: [x, y, z] o Vector3. alcance en metros (la luz cae a cero ahí).
  punto(i, pos, hex, intensidad, alcance) {
    if (Array.isArray(pos)) U.uLPos.value[i].set(...pos); else U.uLPos.value[i].copy(pos);
    U.uLCol.value[i].set(hex).multiplyScalar(intensidad);
    U.uLAlc.value[i] = alcance;
  },
  mover(i, pos) {
    if (Array.isArray(pos)) U.uLPos.value[i].set(...pos); else U.uLPos.value[i].copy(pos);
  },
  apagar(i) { U.uLCol.value[i].setRGB(0, 0, 0); },
  apagarTodas() { for (let i = 0; i < MAX_LUCES; i++) this.apagar(i); },
};

const VERTICE_CABECERA = `
uniform vec2 uRes;
uniform float uRejilla;
varying float vAfW;
#ifdef PS1_LUZ
uniform vec3 uAmb;
uniform vec3 uLPos[${MAX_LUCES}];
uniform vec3 uLCol[${MAX_LUCES}];
uniform float uLAlc[${MAX_LUCES}];
varying vec3 vLuz;
#endif
`;

const VERTICE_FINAL = `
#include <project_vertex>
vec2 rejilla = uRes * 0.5 * uRejilla;
gl_Position.xy = floor(gl_Position.xy / gl_Position.w * rejilla + 0.5) / rejilla * gl_Position.w;
vAfW = gl_Position.w;
#ifdef USE_MAP
vMapUv *= vAfW;
#endif
#ifdef PS1_LUZ
vec3 pW = (modelMatrix * vec4(transformed, 1.0)).xyz;
vec3 nW = normalize(mat3(modelMatrix) * normal);
vec3 luz = uAmb;
for (int i = 0; i < ${MAX_LUCES}; i++) {
  vec3 L = uLPos[i] - pW;
  float d = max(length(L), 1e-3);
  float a = clamp(1.0 - d / uLAlc[i], 0.0, 1.0);
  luz += uLCol[i] * a * a * max(dot(nW, L / d), 0.0);
}
vLuz = luz;
#endif
`;

const FRAGMENTO_CABECERA = `
varying float vAfW;
#ifdef PS1_LUZ
varying vec3 vLuz;
#endif
`;

// Textura afín: se deshace la corrección de perspectiva dividiendo por la w interpolada.
const FRAGMENTO_MAPA = `
#ifdef USE_MAP
vec4 sampledDiffuseColor = texture2D( map, vMapUv / vAfW );
diffuseColor *= sampledDiffuseColor;
#endif
#ifdef PS1_LUZ
diffuseColor.rgb *= vLuz;
#endif
`;

// rejilla < 1 = vértices que saltan más (glitch); 1 = temblor PS1 normal.
function materialBase(opciones, conLuz) {
  const { rejilla = 1, ...resto } = opciones;
  const m = new THREE.MeshBasicMaterial({ fog: true, ...resto });
  if (conLuz) m.defines = { PS1_LUZ: '' };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRejilla = { value: rejilla };
    for (const k of Object.keys(U)) shader.uniforms[k] = U[k];
    shader.vertexShader = VERTICE_CABECERA + shader.vertexShader.replace('#include <project_vertex>', VERTICE_FINAL);
    shader.fragmentShader = FRAGMENTO_CABECERA + shader.fragmentShader.replace('#include <map_fragment>', FRAGMENTO_MAPA);
  };
  m.customProgramCacheKey = () => `ps1-${conLuz ? 'luz' : 'brillo'}`;
  return m;
}

// Material con luz por vértice (paredes, muebles, monstruos).
export function materialPS1(opciones = {}) {
  return materialBase(opciones, true);
}

// Material sin luz (pantallas, fluorescentes, ojos): brilla por sí mismo.
export function materialBrillo(opciones = {}) {
  return materialBase(opciones, false);
}

// Paso final: 15 bits con tramado Bayer 4×4, viñeta y desfase de color en los bordes.
const POST_FRAG = `
uniform sampler2D tColor;
varying vec2 vUv;
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
void main() {
  vec2 c = vUv - 0.5;
  vec2 desv = c * dot(c, c) * 0.025;
  vec3 col = vec3(
    texture2D(tColor, vUv + desv).r,
    texture2D(tColor, vUv).g,
    texture2D(tColor, vUv - desv).b
  );
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));
  col *= mix(0.35, 1.0, smoothstep(0.78, 0.3, length(c)));
  col = floor(col * 31.0 + bayer4(gl_FragCoord.xy)) / 31.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function crearMotor(contenedor) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  const lienzo = renderer.domElement;
  lienzo.className = 'juego-lienzo';
  contenedor.append(lienzo);

  // Render intermedio en coma flotante si se puede (las sombras no se apelotonan antes del tramado).
  const flotante = renderer.extensions.has('EXT_color_buffer_half_float') || renderer.extensions.has('EXT_color_buffer_float');
  const rt = new THREE.WebGLRenderTarget(LADO_CORTO, LADO_CORTO, {
    type: flotante ? THREE.HalfFloatType : THREE.UnsignedByteType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true,
  });
  const post = new THREE.ShaderMaterial({
    uniforms: { tColor: { value: rt.texture } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: POST_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post);
  quad.frustumCulled = false;
  const escenaPost = new THREE.Scene();
  escenaPost.add(quad);
  const camaraPost = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x000000);
  escena.fog = new THREE.Fog(0x000000, 2.5, 15);
  const camara = new THREE.PerspectiveCamera(68, 1, 0.05, 60);

  const ajustar = () => {
    const vw = Math.max(1, window.innerWidth);
    const vh = Math.max(1, window.innerHeight);
    const k = LADO_CORTO / Math.min(vw, vh);
    const w = Math.max(1, Math.round(vw * k));
    const h = Math.max(1, Math.round(vh * k));
    renderer.setSize(w, h, false);
    rt.setSize(w, h);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    resolucion.set(w, h);
  };
  ajustar();
  window.addEventListener('resize', ajustar);
  luces.apagarTodas();

  return {
    renderer,
    escena,
    camara,
    lienzo,
    render() {
      renderer.setRenderTarget(rt);
      renderer.render(escena, camara);
      renderer.setRenderTarget(null);
      renderer.render(escenaPost, camaraPost);
    },
    destruir() {
      window.removeEventListener('resize', ajustar);
      escena.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
      });
      quad.geometry.dispose();
      post.dispose();
      rt.dispose();
      renderer.dispose();
      lienzo.remove();
    },
  };
}

// Sombras horneadas: oscurece cada vértice de los materiales con luz de un grupo según fn(p, n, local, malla),
// que recibe la posición y la normal en el mundo (y la posición local) y devuelve un factor de 0 a 1.
// Se guarda como color de vértice: todas las mallas con luz del grupo lo reciben, para que ninguna se quede
// sin ese atributo (sin él se verían negras).
export function hornear(grupo, fn) {
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const local = new THREE.Vector3();
  const normalMundo = new THREE.Matrix3();
  grupo.updateMatrixWorld(true);
  grupo.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (!mats.some((m) => m.defines && 'PS1_LUZ' in m.defines)) return;
    const pos = o.geometry.attributes.position;
    const nor = o.geometry.attributes.normal;
    const col = new Float32Array(pos.count * 3);
    normalMundo.getNormalMatrix(o.matrixWorld);
    for (let i = 0; i < pos.count; i++) {
      local.fromBufferAttribute(pos, i);
      p.copy(local).applyMatrix4(o.matrixWorld);
      if (nor) n.fromBufferAttribute(nor, i).applyMatrix3(normalMundo).normalize(); else n.set(0, 1, 0);
      const f = Math.max(0, Math.min(1, fn(p, n, local, o)));
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = f;
    }
    o.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
    for (const m of mats) if (m.defines && 'PS1_LUZ' in m.defines) { m.vertexColors = true; m.needsUpdate = true; }
  });
}
