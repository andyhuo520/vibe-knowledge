// 时间雕塑：一组嵌套的星盘环 + 沿环飞行的光珠 + 多面体核心。
// 所有运动只取决于「场景时间」ts：把 ts 往回拨，整座雕塑就倒着转——这就是「视频 = f(t)」。
import * as THREE from "three";
import { rng } from "../util.js";

const RING_VS = /* glsl */ `out vec3 vN; out vec3 vV; out vec2 vUv;
void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
const RING_FS = /* glsl */ `precision highp float; in vec3 vN; in vec3 vV; in vec2 vUv; out vec4 o;
uniform vec3 uRim; uniform float uPhase, uDir, uGain, uTail;
void main(){
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
  float h = uDir >= 0.0 ? fract(vUv.x - uPhase) : fract(uPhase - vUv.x);
  float comet = exp(-h * mix(60.0, 7.0, uTail)) + exp(-(1.0 - h) * 140.0);
  vec3 c = vec3(0.025, 0.024, 0.03) + uRim * (f * 0.9 + 0.08) + uRim * comet * 5.0;
  o = vec4(c * uGain, 1.0);
}`;
const CORE_FS = /* glsl */ `precision highp float; in vec3 vN; in vec3 vV; in vec2 vUv; out vec4 o; uniform float uPulse;
void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.6);
  vec3 c = vec3(0.05, 0.03, 0.03) + vec3(1.0, 0.42, 0.14) * (f * 2.4 + 0.12) * (1.0 + uPulse * 2.5); o = vec4(c, 1.0); }`;
const PLATE_FS = /* glsl */ `precision highp float; in vec2 vUv; out vec4 o; uniform float uA, uRot;
float line(float x){ float w = fwidth(x); float d = abs(fract(x + 0.5) - 0.5); return 1.0 - smoothstep(0.0, w * 1.2, d); }
void main(){ vec2 p = (vUv - 0.5) * 2.0; float r = length(p); float a = atan(p.y, p.x) + uRot;
  float rings = line(r * 9.0);
  float spokes = line(a / 6.2831853 * 48.0) * step(0.3, r);
  float fade = smoothstep(1.0, 0.55, r) * smoothstep(0.08, 0.2, r);
  o = vec4(vec3(0.16, 0.8, 0.76) * (rings * 0.5 + spokes * 0.18) * fade * uA, 1.0); }`;
const TRAIL_VS = /* glsl */ `in float aK; out float vK; uniform float uSize;
void main(){ vK = aK; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uSize * (1.0 - aK * 0.85) * (1712.0 / -mv.z); }`;
const TRAIL_FS = /* glsl */ `precision highp float; in float vK; out vec4 o; uniform vec3 uCol;
void main(){ float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)); o = vec4(uCol * a * pow(1.0 - vK, 1.6) * 2.2, 1.0); }`;

export class Clock {
  constructor() {
    this.scene = new THREE.Scene();
    this.root = new THREE.Group();
    this.root.position.set(360, 10, 0);
    this.scene.add(this.root);
    const R = rng(21);
    const ORANGE = new THREE.Color(1.0, 0.42, 0.13), TEAL = new THREE.Color(0.18, 0.86, 0.8), IVORY = new THREE.Color(1.0, 0.9, 0.78);
    this.rings = [];
    const radii = [150, 205, 262, 318, 372, 426];
    radii.forEach((r, i) => {
      const holder = new THREE.Group();
      holder.rotation.set((R() - 0.5) * 1.6, (R() - 0.5) * 1.6, R() * Math.PI);
      const spin = new THREE.Group();
      holder.add(spin);
      const u = { uRim: { value: [ORANGE, TEAL, IVORY][i % 3] }, uPhase: { value: 0 }, uDir: { value: 1 }, uGain: { value: 1 }, uTail: { value: 0.5 } };
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, i % 2 ? 2.4 : 3.6, 12, 320), new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: RING_VS, fragmentShader: RING_FS, uniforms: u }));
      spin.add(m);
      this.root.add(holder);
      this.rings.push({ holder, spin, u, w: (0.35 + R() * 0.5) * (i % 2 ? -1 : 1), ax: R() < 0.5 ? "x" : "y", phase: R() * 6.28, cw: (0.12 + R() * 0.2) * (R() < 0.5 ? -1 : 1) });
    });
    // 刻度盘：120 根刻度
    const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.86, 0.8) }), 120);
    const mtx = new THREE.Matrix4();
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2, major = i % 10 === 0, len = major ? 26 : 12;
      mtx.compose(new THREE.Vector3(Math.cos(a) * (490 - len / 2), Math.sin(a) * (490 - len / 2), 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, a)), new THREE.Vector3(len, major ? 3.2 : 1.6, 1.6));
      ticks.setMatrixAt(i, mtx);
    }
    this.dial = new THREE.Group();
    this.dial.add(ticks);
    this.dial.rotation.x = -1.05;
    this.root.add(this.dial);
    // 底盘网格
    this.plateU = { uA: { value: 1 }, uRot: { value: 0 } };
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1100, 1100), new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: RING_VS, fragmentShader: PLATE_FS, uniforms: this.plateU, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    plate.rotation.x = -1.05;
    this.root.add(plate);
    // 核心
    this.coreU = { uPulse: { value: 0 } };
    this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(64, 0), new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: RING_VS, fragmentShader: CORE_FS, uniforms: this.coreU, flatShading: true }));
    this.root.add(this.core);
    this.coreWire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(92, 1)), new THREE.LineBasicMaterial({ color: new THREE.Color(0.25, 1.2, 1.1), transparent: true, opacity: 0.55 }));
    this.root.add(this.coreWire);
    // 光珠和拖尾：每颗珠子 48 个点，点的位置都是「过去某个时刻」的位置
    this.beads = [];
    const TR = 48;
    for (let j = 0; j < 9; j++) {
      const r = 180 + R() * 270, tilt = new THREE.Euler((R() - 0.5) * 2.2, (R() - 0.5) * 2.2, 0);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TR * 3), 3));
      const k = new Float32Array(TR); for (let i = 0; i < TR; i++) k[i] = i / (TR - 1);
      g.setAttribute("aK", new THREE.BufferAttribute(k, 1));
      const col = j % 3 === 0 ? TEAL : j % 3 === 1 ? ORANGE : IVORY;
      const pts = new THREE.Points(g, new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: TRAIL_VS, fragmentShader: TRAIL_FS, uniforms: { uSize: { value: 15 }, uCol: { value: col } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      pts.frustumCulled = false;
      this.root.add(pts);
      this.beads.push({ r, q: new THREE.Quaternion().setFromEuler(tilt), w: (0.7 + R() * 0.9) * (R() < 0.5 ? -1 : 1), ph: R() * 6.28, pts, TR });
    }
    this.cam = new THREE.PerspectiveCamera(35, 16 / 9, 1, 20000);
    this.v = new THREE.Vector3();
  }

  // ts：场景时间（秒）；speed：场景时间相对真实时间的速度（倒放为负）；beat：底鼓包络（按场景时间算）
  render(renderer, target, ts, s) {
    const dir = Math.sign(s.speed) || 0, tail = Math.min(1, Math.abs(s.speed) / 2);
    for (const rg of this.rings) {
      rg.spin.rotation[rg.ax] = rg.phase + rg.w * ts;
      rg.u.uPhase.value = rg.cw * ts;
      rg.u.uDir.value = dir * Math.sign(rg.cw);
      rg.u.uTail.value = tail;
      rg.u.uGain.value = s.gain ?? 1;
    }
    this.dial.rotation.z = ts * 0.15;
    this.plateU.uRot.value = ts * 0.05;
    this.plateU.uA.value = s.plate ?? 1;
    this.core.rotation.set(ts * 0.4, ts * 0.55, 0);
    this.coreWire.rotation.set(-ts * 0.25, ts * 0.3, ts * 0.1);
    this.coreU.uPulse.value = s.beat ?? 0;
    const sc = 1 + 0.1 * (s.beat ?? 0);
    this.core.scale.setScalar(sc);
    const span = 0.55 * Math.min(Math.abs(s.speed), 2.5);       // 拖尾长度跟着「时间的流速」变：定格时没有拖尾
    for (const b of this.beads) {
      const arr = b.pts.geometry.attributes.position.array;
      for (let i = 0; i < b.TR; i++) {
        const tt = ts - dir * span * (i / (b.TR - 1));
        const a = b.ph + b.w * tt;
        this.v.set(Math.cos(a) * b.r, Math.sin(a) * b.r, 0).applyQuaternion(b.q);
        arr[i * 3] = this.v.x; arr[i * 3 + 1] = this.v.y; arr[i * 3 + 2] = this.v.z;
      }
      b.pts.geometry.attributes.position.needsUpdate = true;
    }
    this.root.rotation.y = -0.25 + 0.12 * Math.sin(ts * 0.21);
    this.root.rotation.x = 0.1 * Math.sin(ts * 0.17);
    this.cam.position.set(s.camX ?? 0, s.camY ?? 60, s.camZ ?? 1712);
    this.cam.lookAt(s.lookX ?? 0, 0, 0);
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x060609, 1);
    renderer.clear();
    renderer.render(this.scene, this.cam);
  }
}
