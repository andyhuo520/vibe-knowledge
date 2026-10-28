// 旁白时间轴：读配音生成的 timings.json（逐字时间、[[cue]] 时间），提供「某句话说到某个字是第几秒」和字幕。
// 片头冷开场（样片片段）占 off 秒，旁白整体往后挪 off。
export class Narr {
  constructor(tl, off = 0) {
    this.tl = tl;
    this.off = off;
    this.beats = tl.beats;
    this.ids = Object.keys(tl.beats);
    this.total = tl.total + off;
    this.subs = this.buildSubs();
  }

  // "B03" 开始 / "B03.count" 读到 [[count]] / "B03@三千" 读到「三千」/ "B03.end" 结束；可加 "+0.4" "-0.2"
  t(spec) {
    const m = /^(B\d+)(?:\.([a-z0-9_]+)|@([^+\-]+))?([+-]\d+(?:\.\d+)?)?$/.exec(spec);
    if (!m) throw new Error(`时间写法不对：${spec}`);
    const b = this.beats[m[1]];
    if (!b) throw new Error(`没有这一拍：${spec}`);
    let v;
    if (m[2] === "end") v = b.end;
    else if (m[2]) {
      if (b.cues[m[2]] === undefined) throw new Error(`${m[1]} 里没有 [[${m[2]}]]`);
      v = b.cues[m[2]];
    } else if (m[3]) {
      const i = b.text.indexOf(m[3]);
      if (i < 0) throw new Error(`${m[1]} 里没有「${m[3]}」`);
      v = b.chars[i];
    } else v = b.start;
    return v + this.off + (m[4] ? parseFloat(m[4]) : 0);
  }

  // 字幕：按标点断句，太长的再从中间的逗号或空格切开；每条从第一个字出现到下一条开始（同一拍内）
  buildSubs() {
    const out = [];
    const P = "，。；：！？、,.;:!?";
    for (const id of this.ids) {
      const b = this.beats[id];
      const txt = b.text;
      let segs = [], s0 = 0;
      for (let i = 0; i <= txt.length; i++) {
        const num = txt[i] === "." && /\d/.test(txt[i - 1] || "") && /\d/.test(txt[i + 1] || "");   // 5.5 这种小数点不断句
        if (i === txt.length || (P.includes(txt[i]) && !num)) {
          if (i > s0) segs.push([s0, i]);
          s0 = i + 1;
        }
      }
      // 合并太短的、切开太长的
      const merged = [];
      for (const sg of segs) {
        const last = merged[merged.length - 1];
        if (last && sg[1] - last[0] <= 16 && sg[0] - last[1] <= 1 && (last[1] - last[0]) < 7) last[1] = sg[1];
        else merged.push([...sg]);
      }
      merged.forEach(([a, z], k) => {
        const start = b.chars[a] + this.off;
        const next = k + 1 < merged.length ? b.chars[merged[k + 1][0]] + this.off : b.end + this.off + 0.15;
        out.push({ text: txt.slice(a, z).trim().replace(/[，。；：、]/g, "　"), start: start - 0.05, end: next - 0.04 });   // 字幕里不留标点，用全角空格隔开
      });
    }
    return out;
  }

  sub(t) {
    for (const s of this.subs) if (t >= s.start && t < s.end) return s;
    return null;
  }
}
