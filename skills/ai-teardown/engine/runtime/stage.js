/**
 * Stage: the one object every host drives. Hosts only ever call stage.seek(t).
 *
 * Layers
 *   world   camera-transformed; scenes live here in world coordinates (origin = frame centre at zoom 1)
 *   screen  not transformed; cursor, captions, badges
 *
 * Scene contract (see design/02-scene-contract.md)
 *   prim.create(container, params, ctx) → { duration?, beats?, render(localT, env), hotspots?(localT) }
 *   render must be a pure function of time: no transitions, timers, Date.now or unseeded randomness.
 */
import { trackCfg, appear, CAM, hz } from "./spring.js";
import { applyTheme, FRAMES, THEMES } from "./theme.js";
import { h } from "./dom.js";

const UI_FADE = { w: hz(2.2), z: 1 };

const BASE_CSS = `
.at-stage{position:relative;overflow:hidden;background:var(--bg);color:var(--ink);font-family:var(--sans);
  -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;font-feature-settings:"tnum" 1}
.at-stage *{transition:none!important;animation:none!important;box-sizing:border-box}
.at-bg{position:absolute;inset:0;pointer-events:none}
.at-stage[data-theme=blueprint] .at-bg{
  background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);
  background-size:64px 64px;background-position:-1px -1px}
.at-stage[data-theme=blueprint] .at-bg::after{content:"";position:absolute;inset:0;
  background:radial-gradient(ellipse at 50% 45%,transparent 45%,rgba(3,6,16,.55) 100%)}
.at-stage[data-bg=dots] .at-bg{background-image:radial-gradient(var(--grid) 1.8px,transparent 2.1px);background-size:44px 44px;background-position:22px 22px}
.at-stage[data-bg=dots] .at-bg::before{content:"";position:absolute;inset:0;
  background:radial-gradient(circle at 8% 12%,var(--m1-t) 0,transparent 26%),radial-gradient(circle at 94% 88%,var(--m5-t) 0,transparent 30%),radial-gradient(circle at 88% 8%,var(--m3-t) 0,transparent 18%)}
.at-world{position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0}
.at-scene{position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0}
.at-screen{position:absolute;inset:0;pointer-events:none}
`;

export class Stage {
  constructor(root, { aspect = "16:9", theme = "blueprint", duration = 10 } = {}) {
    const F = FRAMES[aspect];
    Object.assign(this, { W: F.W, H: F.H, frame: F, aspect, themeName: theme, theme: THEMES[theme], duration });
    this.doc = root.ownerDocument;
    this.css("at-base", BASE_CSS);
    this.el = h("div", { class: "at-stage", style: { width: `${F.W}px`, height: `${F.H}px` } });
    applyTheme(this.el, theme);
    this.bg = h("div", { class: "at-bg" });
    // 世界层随镜头推拉，出画是有意的；告诉 Hyperframes inspect 别把它当溢出（画面内的裁切由我们自己的探针查）
    this.world = h("div", { class: "at-world", "data-layout-allow-overflow": "" });
    this.screen = h("div", { class: "at-screen" });
    this.el.append(this.bg, this.world, this.screen);
    root.append(this.el);
    this.scenes = [];
    this.overlays = [];
    this.camKeys = null;
    this.cam = { x: 0, y: 0, z: 1 };
    this.t = 0;
  }

  /** Inject a stylesheet once per document. */
  css(id, text) {
    if (this.doc.getElementById(id)) return;
    const st = this.doc.createElement("style");
    st.id = id;
    st.textContent = text;
    this.doc.head.append(st);
  }

  /**
   * Camera keys: [{t, x, y, z, cfg?}], first key is the starting shot.
   * Zoom is sprung in log space so pushing in from 1× to 6× feels even.
   */
  camera(keys) {
    const k = (f) => keys.map((c) => [c.t, f(c), c.cfg ?? CAM]);
    this.camKeys = { x: k((c) => c.x), y: k((c) => c.y), lz: k((c) => Math.log(c.z)) };
    return this;
  }

  /**
   * Add a scene. x/y/scale place its local origin in world space (or screen space for layer "screen").
   * start/end are global seconds; pre/post keep it rendered a little outside the window for exits.
   */
  add(prim, { id, params = {}, start = 0, end = Infinity, x = 0, y = 0, scale = 1, layer = "world", pre = 0, post = 0.6, fade = null, attrs = {} } = {}) {
    const container = h("div", { class: "at-scene", "data-scene": id ?? prim.name, ...attrs });
    container.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    (layer === "screen" ? this.screen : this.world).append(container);
    const scene = { id: id ?? `${prim.name}-${this.scenes.length}`, prim, start, end, pre, post, fade, container, at: { x, y, scale }, layer };
    const ctx = { stage: this, id: scene.id, at: scene.at, theme: this.theme, aspect: this.aspect, css: (i, t) => this.css(i, t) };
    scene.inst = prim.create(container, params, ctx);
    this.scenes.push(scene);
    return scene.inst;
  }

  /** Screen-space renderer with render(t, env): captions, badges, cursor. */
  overlay(obj) {
    this.overlays.push(obj);
    if (obj.el) this.screen.append(obj.el);
    return obj;
  }

  /** World → screen, using the camera of the current seek. */
  toScreen(wx, wy) {
    const { x, y, z } = this.cam;
    return { x: this.W / 2 + (wx - x) * z, y: this.H / 2 + (wy - y) * z, z };
  }

  seek(t) {
    this.t = t;
    if (this.camKeys) {
      this.cam = {
        x: trackCfg(t, this.camKeys.x),
        y: trackCfg(t, this.camKeys.y),
        z: Math.exp(trackCfg(t, this.camKeys.lz)),
      };
    }
    const { x, y, z } = this.cam;
    this.world.style.transform = `translate(${this.W / 2}px, ${this.H / 2}px) scale(${z}) translate(${-x}px, ${-y}px)`;
    const env = { t, stage: this, cam: this.cam, aspect: this.aspect, toScreen: (a, b) => this.toScreen(a, b) };
    for (const sc of this.scenes) {
      const on = t >= sc.start - sc.pre && t <= sc.end + sc.post;
      const disp = on ? "" : "none";
      if (sc.container.style.display !== disp) sc.container.style.display = disp;
      if (!on) continue;
      if (sc.fade) {
        const [a, b] = sc.fade;
        const o = appear(t, a, UI_FADE) * (1 - appear(t, b ?? Infinity, UI_FADE));
        sc.container.style.opacity = o.toFixed(3);
      }
      sc.inst.render(t - sc.start, env);
    }
    for (const o of this.overlays) o.render(t, env);
    return this;
  }

  /** Step points for the interactive lesson: [{t, id, label}] in global seconds. */
  beats() {
    const out = [];
    for (const sc of this.scenes) for (const b of sc.inst.beats ?? []) out.push({ ...b, t: sc.start + b.t, scene: sc.id });
    return out.sort((a, b) => a.t - b.t);
  }

  /** Clickable elements at time t for 「点图看出处」: [{el, facts, label, scene}]. */
  hotspots(t = this.t) {
    const out = [];
    for (const sc of this.scenes) {
      if (t < sc.start || t > sc.end || !sc.inst.hotspots) continue;
      for (const hs of sc.inst.hotspots(t - sc.start)) out.push({ ...hs, scene: sc.id });
    }
    return out;
  }
}
