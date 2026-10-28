// 液态金属：7 个球用平滑并集融在一起，光线步进求交，反射代码搭的影棚光。uCollapse 从 0 到 1 时全部塌缩成一个点。
import * as THREE from "three";

const FS = /* glsl */ `precision highp float; out vec4 o;
uniform vec2 uRes; uniform float uT, uCollapse, uCamA, uZoom, uGlow, uBg;
float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
float map(vec3 p){
  float d = 1e5, col = 1.0 - uCollapse;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec3 c = vec3(sin(uT * 0.62 + fi * 1.7) * 1.25, cos(uT * 0.81 + fi * 2.3) * 0.62, sin(uT * 0.47 + fi * 0.9) * 0.7) * col;
    float r = (0.42 + 0.16 * sin(fi * 3.1 + uT * 0.9)) * mix(1.0, 0.002, pow(uCollapse, 0.7));
    d = smin(d, length(p - c) - r, mix(0.62, 0.02, uCollapse));
  }
  return d;
}
vec3 nrm(vec3 p){ const vec2 e = vec2(0.0015, 0.0); return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx))); }
vec3 env(vec3 r){
  // 影棚：左侧暖色竖灯条、右侧青色轮廓灯条、顶部白色柔光箱，外加几道细线——反射里能看见清楚的高光带
  float az = atan(r.x, -r.z);
  float key = smoothstep(0.16, 0.0, abs(az + 1.35)) * smoothstep(0.75, 0.2, abs(r.y - 0.1));
  float rim = smoothstep(0.09, 0.0, abs(az - 1.5)) * smoothstep(0.8, 0.25, abs(r.y));
  float top = smoothstep(0.82, 0.97, r.y) * smoothstep(0.6, 0.1, abs(r.x));
  float lines = smoothstep(0.012, 0.0, abs(r.y - 0.32)) * 0.9 + smoothstep(0.008, 0.0, abs(r.y + 0.18)) * 0.35;
  vec3 c = vec3(0.006, 0.006, 0.008) + vec3(0.03, 0.028, 0.03) * smoothstep(-0.3, 0.4, r.y);
  c += vec3(1.0, 0.55, 0.25) * key * 6.0 + vec3(0.25, 0.95, 0.9) * rim * 4.0 + vec3(1.0, 0.98, 0.95) * top * 7.0 + vec3(1.0, 0.92, 0.85) * lines;
  return c;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float ca = uCamA;
  vec3 ro = vec3(sin(ca) * 4.3, 0.35, -cos(ca) * 4.3) * uZoom;
  vec3 fw = normalize(-ro), rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw)), up = cross(fw, rt);
  vec3 rd = normalize(fw * 1.9 + rt * uv.x + up * uv.y);
  float t = 0.0, hitd = -1.0;
  for (int i = 0; i < 110; i++) { float h = map(ro + rd * t); if (h < 0.0008) { hitd = t; break; } t += h * 0.9; if (t > 14.0) break; }
  vec3 col = env(rd) * 0.035 * uBg * (1.0 - smoothstep(0.2, 1.1, length(uv)));
  if (hitd > 0.0) {
    vec3 p = ro + rd * hitd, n = nrm(p), r = reflect(rd, n);
    float f = 0.06 + 0.94 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
    vec3 refl = env(r);
    col = refl * mix(vec3(0.95, 0.9, 0.86), vec3(1.0), f) * 0.9 + refl * f * 0.6;
    col += vec3(1.0, 0.45, 0.15) * pow(max(dot(n, normalize(vec3(-0.6, 0.2, -0.5))), 0.0), 18.0) * 0.6;
  }
  // 塌缩的光点
  float g = uGlow / (1.0 + dot(uv, uv) * 900.0);
  col += vec3(1.0, 0.82, 0.62) * g;
  o = vec4(col, 1.0);
}`;

export class Liquid {
  constructor() {
    this.u = { uRes: { value: new THREE.Vector2(1920, 1080) }, uT: { value: 0 }, uCollapse: { value: 0 }, uCamA: { value: 0 }, uZoom: { value: 1 }, uGlow: { value: 0 }, uBg: { value: 1 } };
    this.mat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: this.u, fragmentShader: FS,
      vertexShader: `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`, depthTest: false, depthWrite: false });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.mesh);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  render(renderer, target, t, s) {
    this.u.uRes.value.set(target ? target.width : 1920, target ? target.height : 1080);
    this.u.uT.value = t;
    this.u.uCollapse.value = s.collapse ?? 0;
    this.u.uCamA.value = s.camA ?? t * 0.25;
    this.u.uZoom.value = s.zoom ?? 1;
    this.u.uGlow.value = s.glow ?? 0;
    this.u.uBg.value = s.bg ?? 1;
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.cam);
  }
}
