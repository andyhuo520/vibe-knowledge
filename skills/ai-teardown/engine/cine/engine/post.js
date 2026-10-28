// 后期：HDR 场景 → 泛光（双 Kawase 金字塔）→ 合成（色差、曝光、ACES、暗角、颗粒、闪白、淡黑）→ 画布
import * as THREE from "three";

const VS = /* glsl */ `out vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function pass(fs, uniforms) {
  return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
}

const PREFILTER = /* glsl */ `precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D tIn; uniform float uThr, uKnee;
void main(){ vec3 c = texture(tIn, vUv).rgb; float br = max(c.r, max(c.g, c.b));
  float rq = clamp(br - uThr + uKnee, 0.0, 2.0 * uKnee); rq = rq * rq / (4.0 * uKnee + 1e-4);
  float w = max(rq, br - uThr) / max(br, 1e-4); o = vec4(c * w, 1.0); }`;

const DOWN = /* glsl */ `precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D tIn; uniform vec2 uHp;
void main(){ vec3 s = texture(tIn, vUv).rgb * 4.0; s += texture(tIn, vUv - uHp).rgb; s += texture(tIn, vUv + uHp).rgb;
  s += texture(tIn, vUv + vec2(uHp.x, -uHp.y)).rgb; s += texture(tIn, vUv - vec2(uHp.x, -uHp.y)).rgb; o = vec4(s / 8.0, 1.0); }`;

const UP = /* glsl */ `precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D tIn; uniform sampler2D tAdd; uniform vec2 uHp; uniform float uW;
void main(){ vec2 h = uHp; vec3 s = texture(tIn, vUv + vec2(-h.x * 2.0, 0.0)).rgb + texture(tIn, vUv + vec2(-h.x, h.y)).rgb * 2.0
  + texture(tIn, vUv + vec2(0.0, h.y * 2.0)).rgb + texture(tIn, vUv + vec2(h.x, h.y)).rgb * 2.0 + texture(tIn, vUv + vec2(h.x * 2.0, 0.0)).rgb
  + texture(tIn, vUv + vec2(h.x, -h.y)).rgb * 2.0 + texture(tIn, vUv + vec2(0.0, -h.y * 2.0)).rgb + texture(tIn, vUv + vec2(-h.x, -h.y)).rgb * 2.0;
  o = vec4(s / 12.0 + texture(tAdd, vUv).rgb * uW, 1.0); }`;

const COMPOSITE = /* glsl */ `precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D tScene, tBloom; uniform float uBloom, uCA, uExposure, uFlash, uFade, uGrain, uVig, uTime, uSat; uniform vec2 uRes;
uniform vec3 uLift, uGain;
vec3 aces(vec3 x){ const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14; return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0); }
float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main(){
  vec2 uv = vUv, d = uv - 0.5; float r2 = dot(d, d);
  vec2 off = d * uCA * (0.35 + 1.6 * r2);
  vec3 col = vec3(texture(tScene, uv + off).r, texture(tScene, uv).g, texture(tScene, uv - off).b);
  vec3 bl = vec3(texture(tBloom, uv + off * 1.5).r, texture(tBloom, uv).g, texture(tBloom, uv - off * 1.5).b);
  col += bl * uBloom;
  col *= uExposure;
  // 色相保持的影调：按最亮通道压高光，和逐通道 ACES 各取一半——高光不发灰，暗部仍有胶片感
  float mx = max(col.r, max(col.g, col.b));
  vec3 hp = col * (aces(vec3(mx)).r / max(mx, 1e-4));
  col = mix(aces(col), hp, 0.55);
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722)); col = mix(vec3(l), col, uSat);
  col = col * uGain + uLift * (1.0 - col);
  col = srgb(col);
  float v = smoothstep(0.25, 1.05, length(d * vec2(1.0, 0.82)) * 1.45); col *= 1.0 - uVig * v;
  float n = hash(uv * uRes + fract(uTime * 13.17) * 731.0) - 0.5; col += n * uGrain;
  col = mix(col, vec3(1.0), uFlash); col = mix(col, vec3(0.0), uFade);
  o = vec4(col, 1.0); }`;

export class Post {
  constructor(renderer, W, H) {
    this.r = renderer; this.W = W; this.H = H;
    const hf = { type: THREE.HalfFloatType, depthBuffer: false };
    this.sceneRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
    this.aux = [new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }), new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 })];
    this.levels = 6;
    this.down = []; this.up = [];
    let w = W >> 1, h = H >> 1;
    for (let i = 0; i < this.levels; i++) {
      this.down.push(new THREE.WebGLRenderTarget(w, h, hf));
      this.up.push(new THREE.WebGLRenderTarget(w, h, hf));
      w = Math.max(1, w >> 1); h = Math.max(1, h >> 1);
    }
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.BufferGeometry(), null);
    this.quad.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.quad.frustumCulled = false;
    this.qscene = new THREE.Scene(); this.qscene.add(this.quad);
    this.mPre = pass(PREFILTER, { tIn: { value: null }, uThr: { value: 1.0 }, uKnee: { value: 0.5 } });
    this.mDown = pass(DOWN, { tIn: { value: null }, uHp: { value: new THREE.Vector2() } });
    this.mUp = pass(UP, { tIn: { value: null }, tAdd: { value: null }, uHp: { value: new THREE.Vector2() }, uW: { value: 1 } });
    this.mComp = pass(COMPOSITE, {
      tScene: { value: null }, tBloom: { value: null }, uBloom: { value: 0.9 }, uCA: { value: 0.0 }, uExposure: { value: 1.0 },
      uFlash: { value: 0 }, uFade: { value: 0 }, uGrain: { value: 0.03 }, uVig: { value: 0.45 }, uTime: { value: 0 }, uSat: { value: 1.05 },
      uRes: { value: new THREE.Vector2(W, H) }, uLift: { value: new THREE.Vector3(0.004, 0.003, 0.006) }, uGain: { value: new THREE.Vector3(1.0, 0.985, 0.965) },
    });
    // 混合两张图（转场用）
    this.mMix = pass(/* glsl */ `precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D tA, tB; uniform float uK;
      void main(){ o = vec4(mix(texture(tA, vUv).rgb, texture(tB, vUv).rgb, uK), 1.0); }`, { tA: { value: null }, tB: { value: null }, uK: { value: 0 } });
    this.params = {};
    this.reset();
  }

  reset() {
    Object.assign(this.params, { bloom: 0.9, thr: 1.0, knee: 0.6, ca: 0.0, exposure: 1.0, flash: 0, fade: 0, grain: 0.016, vig: 0.45, sat: 1.05 });
  }

  draw(mat, target) {
    this.quad.material = mat;
    this.r.setRenderTarget(target);
    this.r.render(this.qscene, this.cam);
  }

  mix(rtA, rtB, k, target) {
    this.mMix.uniforms.tA.value = rtA.texture; this.mMix.uniforms.tB.value = rtB.texture; this.mMix.uniforms.uK.value = k;
    this.draw(this.mMix, target);
  }

  // 把 sceneRT 合成到屏幕
  finish(t) {
    const p = this.params;
    this.mPre.uniforms.tIn.value = this.sceneRT.texture;
    this.mPre.uniforms.uThr.value = p.thr; this.mPre.uniforms.uKnee.value = p.knee;
    this.draw(this.mPre, this.down[0]);
    for (let i = 1; i < this.levels; i++) {
      const src = this.down[i - 1];
      this.mDown.uniforms.tIn.value = src.texture;
      this.mDown.uniforms.uHp.value.set(0.5 / src.width, 0.5 / src.height);
      this.draw(this.mDown, this.down[i]);
    }
    let prev = this.down[this.levels - 1];
    for (let i = this.levels - 2; i >= 0; i--) {
      this.mUp.uniforms.tIn.value = prev.texture;
      this.mUp.uniforms.tAdd.value = this.down[i].texture;
      this.mUp.uniforms.uW.value = 1.0;
      this.mUp.uniforms.uHp.value.set(0.5 / prev.width, 0.5 / prev.height);
      this.draw(this.mUp, this.up[i]);
      prev = this.up[i];
    }
    const u = this.mComp.uniforms;
    u.tScene.value = this.sceneRT.texture; u.tBloom.value = prev.texture;
    u.uBloom.value = p.bloom / this.levels * 1.6; u.uCA.value = p.ca; u.uExposure.value = p.exposure; u.uFlash.value = p.flash;
    u.uFade.value = p.fade; u.uGrain.value = p.grain; u.uVig.value = p.vig; u.uTime.value = t; u.uSat.value = p.sat;
    this.draw(this.mComp, null);
  }
}
