// 节拍柱阵：960 根柱子，高度 = 底鼓冲击波 + 中心脉冲 + 十六分镲点的抖动，全部按拍子时间算出来
import * as THREE from "three";

const VS = /* glsl */ `out vec3 vCol; out float vY; out float vTop; out float vDepth; out vec3 vN; out vec3 vV;
void main(){
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vec4 mv = viewMatrix * wp;
  vCol = instanceColor; vY = position.y; vTop = step(0.5, normal.y); vDepth = -mv.z;
  vN = normalize(mat3(viewMatrix) * mat3(modelMatrix) * mat3(instanceMatrix) * normal); vV = -mv.xyz;
  gl_Position = projectionMatrix * mv; }`;
const FS = /* glsl */ `precision highp float; in vec3 vCol; in float vY; in float vTop; in float vDepth; in vec3 vN; in vec3 vV; out vec4 o;
uniform float uFogN, uFogF, uGain;
void main(){
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
  vec3 side = vCol * (0.025 + pow(vY, 8.0) * 0.7) + vCol * f * 0.18;
  vec3 c = mix(side, vCol * 1.35, vTop);
  float fog = 1.0 - smoothstep(uFogN, uFogF, vDepth);
  o = vec4(c * fog * uGain, 1.0); }`;

export class Bars {
  constructor() {
    this.NX = 48; this.NZ = 20; this.SP = 50;
    const n = this.NX * this.NZ;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    this.u = { uFogN: { value: 900 }, uFogF: { value: 3400 }, uGain: { value: 1 } };
    const mat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: FS, uniforms: this.u });
    this.mesh = new THREE.InstancedMesh(geo, mat, n);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.mesh.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.mesh);
    // 地平线的光
    const g = new THREE.Mesh(new THREE.PlaneGeometry(9000, 1600), new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3,
      vertexShader: `out vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `precision highp float; in vec2 vUv; out vec4 o; uniform float uA; void main(){ float y = vUv.y; float g = exp(-pow((y - 0.42) / 0.07, 2.0)) * smoothstep(0.0, 0.5, 1.0 - abs(vUv.x - 0.5) * 2.0);
        o = vec4(vec3(1.0, 0.42, 0.16) * g * 0.18 * uA + vec3(0.02, 0.018, 0.025) * smoothstep(0.4, 0.9, y) * 0.0, 1.0); }`,
      uniforms: { uA: { value: 1 } }, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true }));
    g.position.set(0, -120, -3200);
    this.horizon = g;
    this.scene.add(g);
    this.cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 12000);
    this.m = new THREE.Matrix4(); this.c = new THREE.Color();
    this.low = new THREE.Color(0.03, 0.2, 0.22); this.mid = new THREE.Color(0.9, 0.7, 0.52); this.high = new THREE.Color(1.0, 0.33, 0.08);
  }

  // kicks：已经发生的底鼓时刻（秒）；hats：十六分时刻；t：当前时间
  render(renderer, target, t, s) {
    const { NX, NZ, SP } = this;
    const recent = s.kicks.filter((k) => k <= t && t - k < 2.5);
    const hat = s.hats.filter((k) => k <= t).pop() ?? -9;
    let i = 0;
    for (let ix = 0; ix < NX; ix++) for (let iz = 0; iz < NZ; iz++, i++) {
      const x = (ix - (NX - 1) / 2) * SP, z = (iz - (NZ - 1) / 2) * SP;
      const d = Math.hypot(x * 0.8, z * 1.6);
      let h = 16 + 26 * (0.5 + 0.5 * Math.sin(ix * 0.37 + t * 1.4 + iz * 0.23)) * (0.5 + 0.5 * Math.cos(iz * 0.5 - t * 0.9));
      const near = 1 - 0.65 * Math.min(1, Math.max(0, (z - 80) / 400));   // 离镜头最近的几排压低，免得一根柱子糊满屏
      for (const k of recent) {
        const dt = t - k, big = (s.big.includes(k) ? 1.6 : 1) * near;
        const rr = dt * 1150;
        h += 240 * big * Math.exp(-dt * 2.3) * Math.exp(-Math.pow((d - rr) / 95, 2));
        h += 200 * big * Math.exp(-dt * 7) * Math.exp(-Math.pow(d / 210, 2));
      }
      const hs = Math.sin(ix * 12.9898 + iz * 78.233) * 43758.5453;
      h += 22 * Math.exp(-(t - hat) * 18) * (hs - Math.floor(hs));
      h *= s.grow ?? 1;
      this.m.makeScale(SP * 0.72, Math.max(2, h), SP * 0.72);
      this.m.setPosition(x, 0, z);
      this.mesh.setMatrixAt(i, this.m);
      const k = Math.min(1, h / 300);
      if (k < 0.45) this.c.copy(this.low).lerp(this.mid, Math.pow(k / 0.45, 1.6)); else this.c.copy(this.mid).lerp(this.high, (k - 0.45) / 0.55);
      this.c.multiplyScalar(0.25 + 0.95 * Math.pow(k, 1.2));
      this.mesh.setColorAt(i, this.c);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
    const a = s.camA ?? 0;
    this.cam.position.set(Math.sin(a) * 1500, s.camY ?? 420, Math.cos(a) * 1500 + (s.camZ ?? 0));
    this.cam.lookAt(0, s.lookY ?? 60, -200);
    this.u.uGain.value = s.gain ?? 1;
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x060609, 1);
    renderer.clear();
    renderer.render(this.scene, this.cam);
  }
}
