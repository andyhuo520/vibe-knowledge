// 展厅：三件展品（铬结、玻璃多面体、橙色光球），用来演示「推近 / 甩镜 / 环绕」。
// 反射用的环境图是代码搭的影棚（橙色主光、青色轮廓光、顶部柔光箱）烘成 PMREM。
import * as THREE from "three";

export class Showroom {
  constructor(renderer) {
    // 影棚环境
    const env = new THREE.Scene();
    const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, glslVersion: THREE.GLSL3,
      vertexShader: `out vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `precision highp float; in vec3 vP; out vec4 o; void main(){ vec3 d = normalize(vP); float h = d.y;
        vec3 c = mix(vec3(0.012, 0.011, 0.014), vec3(0.05, 0.045, 0.05), smoothstep(-0.2, 0.5, h)); o = vec4(c, 1.0); }` }));
    env.add(sky);
    const panel = (w, h, col, pos, look) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
      m.position.copy(pos); m.lookAt(look); env.add(m);
    };
    panel(30, 12, new THREE.Color(9, 3.2, 1.1), new THREE.Vector3(-30, 8, 10), new THREE.Vector3(0, 0, 0));
    panel(8, 30, new THREE.Color(0.8, 4.2, 3.9), new THREE.Vector3(34, 4, -12), new THREE.Vector3(0, 0, 0));
    panel(40, 8, new THREE.Color(6, 6, 6), new THREE.Vector3(0, 36, 0), new THREE.Vector3(0, 0, 0));
    panel(14, 6, new THREE.Color(2, 2, 2.2), new THREE.Vector3(10, 6, 40), new THREE.Vector3(0, 0, 0));
    const pm = new THREE.PMREMGenerator(renderer);
    this.envMap = pm.fromScene(env, 0.02).texture;
    pm.dispose();

    this.scene = new THREE.Scene();
    this.scene.environment = this.envMap;
    const world = new THREE.Group();
    this.scene.add(world);
    const chrome = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x141318, metalness: 0.6, roughness: 0.35 });
    // 展品 A：铬结
    this.a = new THREE.Mesh(new THREE.TorusKnotGeometry(110, 34, 320, 48), chrome);
    // 展品 B：玻璃多面体 + 橙色内核
    this.b = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.IcosahedronGeometry(140, 0), new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.04, transmission: 1, thickness: 120, ior: 1.6, iridescence: 0.6, iridescenceIOR: 1.3, flatShading: true }));
    const core = new THREE.Mesh(new THREE.SphereGeometry(42, 48, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 0.62, 0.18) }));
    this.b.add(glass, core);
    this.glass = glass;
    // 展品 C：光球 + 两道铬环
    this.c = new THREE.Group();
    const orb = new THREE.Mesh(new THREE.SphereGeometry(86, 64, 32), new THREE.MeshStandardMaterial({ color: 0x1a0802, emissive: new THREE.Color(1.25, 0.38, 0.1), roughness: 0.3, metalness: 0.2 }));
    this.r1 = new THREE.Mesh(new THREE.TorusGeometry(150, 5, 16, 200), chrome);
    this.r2 = new THREE.Mesh(new THREE.TorusGeometry(186, 3.5, 16, 220), chrome);
    this.c.add(orb, this.r1, this.r2);
    this.items = [this.a, this.b, this.c];
    this.items.forEach((o, i) => {
      o.position.set((i - 1) * 760, 230, 0);
      world.add(o);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(150, 165, 60, 64), dark);
      ped.position.set((i - 1) * 760, 30, 0);
      world.add(ped);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(150, 1.6, 8, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.8, 0.26) }));
      lip.rotation.x = Math.PI / 2; lip.position.set((i - 1) * 760, 60.5, 0);
      world.add(lip);
    });
    // 镜面地板：把整组物体上下翻一份放到地板下面，地板半透明盖在上面
    this.mirror = world.clone(true);
    this.mirror.scale.y = -1;
    this.scene.add(this.mirror);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ color: 0x060608, metalness: 0.1, roughness: 0.8, envMapIntensity: 0.25, transparent: true, opacity: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    this.world = world;
    this.cam = new THREE.PerspectiveCamera(38, 16 / 9, 5, 20000);
  }

  // s.cam = {pos:[x,y,z], look:[x,y,z]}；t 控制展品自转
  render(renderer, target, t, s) {
    const spin = (root) => {
      const [a, b, c] = [root.children[0], root.children[3], root.children[6]];
      a.rotation.set(t * 0.5, t * 0.8, 0);
      b.rotation.set(t * 0.3, t * 0.45, t * 0.1);
      c.children[1].rotation.set(1.1 + t * 0.9, t * 0.5, 0);
      c.children[2].rotation.set(-0.6 + t * 0.4, -t * 0.7, 0.3);
    };
    spin(this.world); spin(this.mirror);
    this.cam.position.set(...s.pos);
    this.cam.lookAt(...s.look);
    this.cam.fov = s.fov ?? 38;
    this.cam.updateProjectionMatrix();
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x050507, 1);
    renderer.clear();
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.render(this.scene, this.cam);
  }
}
