// 源码隧道：把本片自己的源码排成纹理，贴在圆筒内壁上，镜头沿轴线加速穿过去
import * as THREE from "three";

const VS = /* glsl */ `out vec2 vUv; out float vZ; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vZ = -mv.z; gl_Position = projectionMatrix * mv; }`;
const FS = /* glsl */ `precision highp float; in vec2 vUv; in float vZ; out vec4 o;
uniform sampler2D tCode; uniform float uScroll, uGain, uNear, uFar, uTime;
void main(){
  vec2 uv = vec2(vUv.x * 3.0, vUv.y * 10.0 + uScroll);
  vec3 c = texture(tCode, uv).rgb;
  float fog = 1.0 - smoothstep(uNear, uFar, vZ);
  float near = smoothstep(0.0, 260.0, vZ);
  float ring = 0.55 + 0.45 * sin(vUv.y * 340.0 - uTime * 4.0);
  o = vec4(c * uGain * fog * near * (0.75 + 0.25 * ring), 1.0);
}`;

const KW = /\b(const|let|function|return|uniform|float|vec2|vec3|vec4|if|else|for|new|import|export|from|class|this|in|out|void|int)\b/g;

export class Tunnel {
  constructor(source) {
    // 源码排版：Geist Mono，关键字橙色、数字青色、注释灰色
    const W = 4096, H = 4096, c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    g.font = "500 30px GeistMono";
    g.textBaseline = "top";
    const lines = source.split("\n").map((l) => l.replace(/\t/g, "  ")).filter((l) => l.trim().length > 2);
    const lh = 40, cols = 2, colW = W / cols;
    let li = 0;
    for (let col = 0; col < cols; col++) {
      for (let y = 8; y < H - lh; y += lh) {
        const line = lines[li++ % lines.length].slice(0, 118);
        let x = col * colW + 24;
        const parts = line.split(/(\b(?:const|let|function|return|uniform|float|vec2|vec3|vec4|if|else|for|new|import|export|from|class|this|void|int)\b|\d+\.?\d*|\/\/.*$)/);
        for (const p of parts) {
          if (!p) continue;
          if (KW.test(p)) g.fillStyle = "#ff7a3d";
          else if (/^\d/.test(p)) g.fillStyle = "#3fe0d0";
          else if (p.startsWith("//")) g.fillStyle = "#5a5f6a";
          else g.fillStyle = "#d9d3c7";
          KW.lastIndex = 0;
          g.fillText(p, x, y);
          x += g.measureText(p).width;
        }
      }
    }
    this.tex = new THREE.CanvasTexture(c);
    this.tex.wrapS = this.tex.wrapT = THREE.RepeatWrapping;
    this.tex.anisotropy = 8;
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.u = { tCode: { value: this.tex }, uScroll: { value: 0 }, uGain: { value: 1 }, uNear: { value: 600 }, uFar: { value: 5200 }, uTime: { value: 0 } };
    const geo = new THREE.CylinderGeometry(260, 260, 9000, 96, 1, true);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0, -4300);
    this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: FS, uniforms: this.u, side: THREE.BackSide }));
    this.scene = new THREE.Scene();
    this.scene.add(this.mesh);
    // 隧道尽头的光
    const glowMat = new THREE.SpriteMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    const gc = document.createElement("canvas"); gc.width = gc.height = 256;
    const gg = gc.getContext("2d"), grad = gg.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(0.18, "rgba(255,210,170,0.55)"); grad.addColorStop(1, "rgba(255,120,60,0)");
    gg.fillStyle = grad; gg.fillRect(0, 0, 256, 256);
    glowMat.map = new THREE.CanvasTexture(gc);
    this.glow = new THREE.Sprite(glowMat);
    this.glow.position.set(0, 0, -5200);
    this.scene.add(this.glow);
    this.cam = new THREE.PerspectiveCamera(70, 16 / 9, 1, 12000);
  }

  // dist：镜头已经前进的距离（单位：纹理里的「行」），gain：亮度，roll：镜头滚转，glow：尽头光的大小
  render(renderer, target, t, s) {
    this.u.uScroll.value = s.dist;
    this.u.uGain.value = s.gain;
    this.u.uTime.value = t;
    this.cam.position.set(0, 0, 0);
    this.cam.rotation.set(0, 0, s.roll || 0);
    this.cam.fov = s.fov || 70;
    this.cam.updateProjectionMatrix();
    this.glow.scale.setScalar(s.glow || 600);
    this.glow.material.opacity = s.glowA ?? 1;
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(this.scene, this.cam);
  }
}
