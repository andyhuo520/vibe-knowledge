// 26 万个粒子：所有队形（爆炸云、标题、中文、水平线、星尘）都是顶点着色器里关于时间的解析式，
// 所以任意时刻都能直接算出来——可以倒放、可以跳帧，逐帧渲染完全确定。
import * as THREE from "three";
import { NOISE } from "../glsl.js";
import { rng } from "../util.js";

const SIDE = 512, N = SIDE * SIDE;
export const F = { POINT: 0, CLOUD: 1, TITLE: 2, CN: 3, LINE: 4, DUST: 5 };

// 把文字画到画布上，在笔画内部随机取 N 个点；少量点散在笔画周围做光晕
function sampleText(draw, cw, ch, n, seed, o) {
  const c = document.createElement("canvas");
  c.width = cw; c.height = ch;
  const g = c.getContext("2d");
  draw(g, cw, ch);
  const img = g.getImageData(0, 0, cw, ch).data;
  const xs = [], ys = [];
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (img[(y * cw + x) * 4 + 3] > 110) { xs.push(x); ys.push(y); }
  const R = rng(seed), out = new Float32Array(n * 4), cnt = xs.length;
  for (let i = 0; i < n; i++) {
    const k = Math.floor(R() * cnt);
    let x = xs[k] + R(), y = ys[k] + R(), z = (R() - 0.5) * o.depth;
    const halo = R() < o.halo;
    if (halo) {
      const a = R() * Math.PI * 2, r = 5 + Math.pow(R(), 2.2) * o.haloR;
      x += Math.cos(a) * r; y += Math.sin(a) * r; z += (R() - 0.5) * o.haloZ;
    }
    out[i * 4] = (x - cw / 2) * o.scale + (o.ox || 0);
    out[i * 4 + 1] = -(y - ch / 2) * o.scale + (o.oy || 0);
    out[i * 4 + 2] = z;
    out[i * 4 + 3] = o.mix(x / cw, y / ch, R, halo);
  }
  return out;
}

function dataTex(arr) {
  const t = new THREE.DataTexture(arr, SIDE, SIDE, THREE.RGBAFormat, THREE.FloatType);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

const VS = /* glsl */ `
precision highp float;
uniform sampler2D uTitle, uCN;
uniform int uFrom, uTo;
uniform float uP, uStagger, uFly, uTime, uBurst, uSize, uBright, uLineY, uLineTight, uSweep, uDelayMode, uDustA, uTextGain;
uniform vec3 uC0, uC1, uC2;
in vec4 aRand; in vec2 aCell;
out vec3 vCol;
${NOISE}
vec3 sph(vec2 r){ float z = r.x * 2.0 - 1.0; float a = r.y * 6.2831853; float s = sqrt(1.0 - z * z); return vec3(s * cos(a), s * sin(a), z); }
vec4 form(int id){
  if (id == 0) return vec4((aRand.xyz - 0.5) * 3.0, 0.15);
  if (id == 1) {
    // 爆炸：初速 1200–9000、强阻尼，0.1 秒就飞出几百单位，之后悬停成一个球壳；扰动幅度随半径增大，中心不打旋
    // 七成粒子速度几乎一样 → 一圈向外扩散的冲击波球壳；三成是速度各异的火星
    vec3 dir = sph(aRand.xy); float k = 4.2; float tt = max(uBurst, 0.0);
    float sp = aRand.z < 0.7 ? mix(2500.0, 2900.0, aRand.z / 0.7) : mix(700.0, 9000.0, pow((aRand.z - 0.7) / 0.3, 1.5));
    vec3 p = dir * sp * (1.0 - exp(-k * tt)) / k;
    p += curl(p * 0.0021 + vec3(0.0, 0.0, tt * 0.25)) * min(length(p) * 0.05, 45.0) * smoothstep(0.0, 0.8, tt);
    return vec4(p, mix(0.55, 1.0, aRand.w));
  }
  if (id == 2) return texelFetch(uTitle, ivec2(aCell), 0);
  if (id == 3) return texelFetch(uCN, ivec2(aCell), 0);
  if (id == 4) {
    float x = (aRand.x - 0.5) * 1640.0; float spread = mix(90.0, 1.2, uLineTight);
    return vec4(x, uLineY + (aRand.y - 0.5) * spread, (aRand.z - 0.5) * mix(260.0, 2.0, uLineTight), 0.15 + 0.5 * aRand.w);
  }
  vec3 p = vec3((aRand.x - 0.5) * 4600.0, (aRand.y - 0.5) * 2800.0, -3000.0 + aRand.z * 3600.0);
  p += curl(p * 0.0005 + vec3(0.0, 0.0, uTime * 0.03)) * 90.0;
  return vec4(p, 2.0 + aRand.w);
}
vec3 palette(float m){ return m < 1.5 ? mix(uC0, uC1, clamp(m, 0.0, 1.0)) : mix(uC2, uC0, clamp(m - 2.0, 0.0, 1.0)); }
float bright(int id){ return id == 5 ? uDustA : (id == 2 || id == 3) ? uTextGain : id == 1 ? 1.25 : 1.0; }
void main(){
  vec4 A = form(uFrom), B = form(uTo);
  float delay = uDelayMode < 0.5 ? aRand.w
              : uDelayMode < 1.5 ? clamp(B.x / 1700.0 + 0.5, 0.0, 1.0) * 0.82 + aRand.w * 0.18
              : clamp(length(B.xy) / 1000.0, 0.0, 1.0) * 0.8 + aRand.w * 0.2;
  float p = clamp((uP - delay * uStagger) / (1.0 - uStagger), 0.0, 1.0);
  float e = p < 0.5 ? 4.0 * p * p * p : 1.0 - pow(-2.0 * p + 2.0, 3.0) / 2.0;
  vec3 pos = mix(A.xyz, B.xyz, e);
  float fly = sin(3.14159265 * e);
  pos += curl(pos * 0.0026 + vec3(uTime * 0.07)) * fly * uFly * 0.3;
  pos += snoise3(pos * 0.011 + vec3(0.0, 0.0, uTime * 0.4)) * 1.4;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  float rs = fract(sin(dot(aRand, vec4(12.9898, 78.233, 37.719, 4.581))) * 43758.5453);   // 和位置无关的随机数，决定大小
  gl_PointSize = clamp(uSize * (0.6 + 0.8 * rs) * (1712.0 / max(-mv.z, 40.0)), 0.6, 48.0);
  float m = mix(A.w, B.w, e);
  float tw = 0.9 + 0.1 * sin(uTime * 5.3 + rs * 97.0);
  float sw = exp(-pow((pos.x - uSweep) / 110.0, 2.0)) * 2.2;
  float br = mix(bright(uFrom), bright(uTo), e);
  vCol = palette(m) * uBright * br * tw * (1.0 + fly * 1.4 + sw);
}`;

const FS = /* glsl */ `precision highp float; in vec3 vCol; out vec4 o;
void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(d)); a *= a; o = vec4(vCol * a, a); }`;

export class Particles {
  constructor() {
    const g = new THREE.BufferGeometry();
    const R = rng(7), rand = new Float32Array(N * 4), cell = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      rand[i * 4] = R(); rand[i * 4 + 1] = R(); rand[i * 4 + 2] = R(); rand[i * 4 + 3] = R();
      cell[i * 2] = i % SIDE; cell[i * 2 + 1] = Math.floor(i / SIDE);
    }
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 4));
    g.setAttribute("aCell", new THREE.BufferAttribute(cell, 2));
    this.u = {
      uTitle: { value: null }, uCN: { value: null }, uFrom: { value: 0 }, uTo: { value: 0 }, uP: { value: 0 }, uStagger: { value: 0.4 },
      uFly: { value: 80 }, uTime: { value: 0 }, uBurst: { value: 0 }, uSize: { value: 1.7 }, uBright: { value: 0.4 }, uLineY: { value: -400 },
      uLineTight: { value: 1 }, uSweep: { value: -9999 }, uDelayMode: { value: 0 }, uDustA: { value: 0.5 }, uTextGain: { value: 1.5 },
      uC0: { value: new THREE.Color(1.0, 0.93, 0.84) }, uC1: { value: new THREE.Color(1.0, 0.36, 0.09) }, uC2: { value: new THREE.Color(0.16, 0.84, 0.8) },
    };
    this.mat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: FS, uniforms: this.u,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.points);
    this.cam = new THREE.PerspectiveCamera(35, 16 / 9, 1, 20000);
    this.cam.position.set(0, 0, 1712);
  }

  build() {
    // 标题：小字 CLAUDE + 大字 Opus 5.5（颜色从象牙白渐变到橙）
    this.u.uTitle.value = dataTex(sampleText((g, w, h) => {
      g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "alphabetic";
      g.font = "600 92px Geist"; g.letterSpacing = "34px"; g.fillText("CLAUDE", w / 2 + 17, 200);
      g.letterSpacing = "-6px"; g.font = "800 330px Geist"; g.fillText("Opus 5.5", w / 2, 520);
    }, 1800, 620, N, 11, { scale: 1, depth: 36, halo: 0.08, haloR: 40, haloZ: 240, oy: 30,
      mix: (x, y, R, halo) => (y < 0.37 ? 0.06 : Math.min(1, Math.max(0, (x - 0.18) / 0.72)) * 0.95 + (halo ? 0.2 : 0)) }));
    // 中文：每一帧，都是代码
    this.u.uCN.value = dataTex(sampleText((g, w, h) => {
      g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "900 196px NotoSC"; g.fillText("每一帧，都是代码", w / 2, h / 2 + 6);
    }, 1800, 320, N, 13, { scale: 1, depth: 30, halo: 0.08, haloR: 36, haloZ: 200, oy: 40,
      mix: (x, y, R, halo) => (x > 0.745 ? 0.88 + R() * 0.12 : 0.03 + R() * 0.08) }));
  }

  // 自定义文字队形：slot 是 "title" 或 "cn"（对应 F.TITLE / F.CN）。lines: [{text, font: "900 196px NotoSC", y, spacing}]，
  // 画布 w×h 居中摆字；hot(xr, yr) 返回 0..1（0 象牙白、1 橙色），默认整行象牙白、最后 25% 橙色
  setText(slot, { lines, w = 1800, h = 420, hot = (x) => (x > 0.75 ? 0.9 : 0.06), seed = 31, oy = 30 }) {
    const tex = dataTex(sampleText((g, cw, ch) => {
      g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
      for (const l of lines) { g.font = l.font; g.letterSpacing = l.spacing || "0px"; g.fillText(l.text, cw / 2, l.y ?? ch / 2); }
    }, w, h, N, seed, { scale: 1, depth: 32, halo: 0.08, haloR: 38, haloZ: 220, oy, mix: (x, y, R) => hot(x, y) + R() * 0.08 }));
    (slot === "cn" ? this.u.uCN : this.u.uTitle).value = tex;
  }

  // s: {from, to, p, stagger, fly, burst, size, bright, lineY, lineTight, sweep, delay, dust, camZ, camX, camY, lookX, lookY, rotY}
  render(renderer, target, t, s) {
    const u = this.u;
    u.uFrom.value = s.from; u.uTo.value = s.to; u.uP.value = s.p ?? 0; u.uStagger.value = s.stagger ?? 0.4; u.uFly.value = s.fly ?? 80;
    u.uTime.value = t; u.uBurst.value = s.burst ?? 0; u.uSize.value = s.size ?? 1.7; u.uBright.value = s.bright ?? 0.4;
    u.uLineY.value = s.lineY ?? -400; u.uLineTight.value = s.lineTight ?? 1; u.uSweep.value = s.sweep ?? -9999;
    u.uDelayMode.value = s.delay ?? 0; u.uDustA.value = s.dust ?? 0.3; u.uTextGain.value = s.textGain ?? 1.5;
    this.cam.position.set(s.camX ?? 0, s.camY ?? 0, s.camZ ?? 1712);
    this.cam.lookAt(s.lookX ?? 0, s.lookY ?? 0, 0);
    this.points.rotation.y = s.rotY ?? 0;
    renderer.setRenderTarget(target);
    renderer.setClearColor(s.clear ?? 0x060609, 1);
    renderer.clear();
    renderer.render(this.scene, this.cam);
  }
}
