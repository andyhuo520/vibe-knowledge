#!/usr/bin/env python3
"""ai-teardown 数据契约校验：schema + 跨文件一致性 + 事实门 + 教学结构。

用法：
    python3 scripts/check.py examples/codex          # 检查一个课题目录里已有的文件
    python3 scripts/check.py examples/codex --only facts

目录约定（缺哪个就跳过哪个）：
    brief.json
    research/sources.json   research/facts.json   research/snapshots/
    lesson/concepts.json    lesson/lesson.json

退出码：有 ERROR 为 1，否则 0。WARN 不阻断。
"""
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

try:
    from jsonschema import Draft202012Validator, FormatChecker
except ImportError:  # pragma: no cover
    sys.exit("缺少 jsonschema：python3 -m pip install --break-system-packages jsonschema")

ROOT = Path(__file__).resolve().parent.parent
SCHEMAS = ROOT / "schemas"
CUE_RE = re.compile(r"\[\[([a-z][a-z0-9_-]*)\]\]")
NUM_RE = re.compile(r"\d+(?:[.,]\d+)*")
CUE_REQUIRED_PRIMS = {"Terminal", "ChatUI", "CodeDiff", "Morph"}
FACT_MOVES = {"show", "name", "place", "compare", "recap"}
INFER_WORDS = ("推断", "可能", "据推测", "大概率", "看起来")
UNDISCLOSED_WORDS = ("未公开", "未披露", "没有公开", "没公开", "不公开", "官方没说")


class Report:
    def __init__(self):
        self.errors, self.warns = [], []

    def err(self, where, msg):
        self.errors.append(f"ERROR {where}: {msg}")

    def warn(self, where, msg):
        self.warns.append(f"WARN  {where}: {msg}")

    def dump(self):
        for line in self.errors + self.warns:
            print(line)
        print(f"\n{len(self.errors)} 个 ERROR，{len(self.warns)} 个 WARN")
        return 1 if self.errors else 0


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def schema_check(rep, name, data):
    schema = load(SCHEMAS / f"{name}.schema.json")
    v = Draft202012Validator(schema, format_checker=FormatChecker())
    for e in sorted(v.iter_errors(data), key=lambda e: list(e.path)):
        loc = "/".join(str(p) for p in e.path) or "(根)"
        rep.err(f"{name}.json {loc}", e.message)


def norm(s):
    s = unicodedata.normalize("NFKC", s).lower()
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", s).strip()


def quote_found(quote, text):
    q, t = norm(quote), norm(text)
    if q in t:
        return True
    if len(q) > 160:  # 长摘录：头尾各 70 字都在就算
        return q[:70] in t and q[-70:] in t
    return False


def ids(items, key="id"):
    return [it[key] for it in items]


def dupes(values):
    seen, out = set(), set()
    for v in values:
        (out if v in seen else seen).add(v)
    return sorted(out)


LATIN_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9.+#_-]*")


def spoken_len(text):
    """估算朗读长度（字当量）：汉字 1，英文词或数字串按 1.5（edge-tts 实测）。"""
    text = CUE_RE.sub("", text)
    latin = LATIN_RE.findall(text)
    text = LATIN_RE.sub("", text)
    return sum(1 for ch in text if not unicodedata.category(ch).startswith(("P", "Z", "S"))) + 1.5 * len(latin)


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    base = Path(args[0]).resolve()
    only = args[args.index("--only") + 1] if "--only" in args else None
    rep = Report()

    files = {
        "brief": base / "brief.json",
        "sources": base / "research" / "sources.json",
        "facts": base / "research" / "facts.json",
        "concepts": base / "lesson" / "concepts.json",
        "lesson": base / "lesson" / "lesson.json",
    }
    data = {}
    for name, path in files.items():
        if only and name != only:
            continue
        if path.exists():
            try:
                data[name] = load(path)
            except json.JSONDecodeError as e:
                rep.err(path.name, f"JSON 解析失败：{e}")
                continue
            schema_check(rep, name, data[name])
    if not data:
        sys.exit(f"{base} 下没有可检查的文件")

    # ---------- sources ----------
    src_by_id = {}
    if "sources" in data:
        srcs = data["sources"]["sources"]
        for d in dupes(ids(srcs)):
            rep.err("sources", f"重复 id {d}")
        for s in srcs:
            src_by_id[s["id"]] = s
            snap = base / "research" / s["snapshot"]
            if not snap.exists():
                rep.err(f"sources {s['id']}", f"快照不存在：{s['snapshot']}")
                continue
            if "sha256" in s:
                h = hashlib.sha256(snap.read_bytes()).hexdigest()
                if h != s["sha256"]:
                    rep.warn(f"sources {s['id']}", "快照哈希对不上，来源可能被重新抓取过")
            if s["tier"] == "T1" and s["kind"] in ("social", "media"):
                rep.warn(f"sources {s['id']}", f"kind={s['kind']} 标成 T1，确认是官方账号或官方渠道")

    # ---------- facts ----------
    fact_by_id = {}
    if "facts" in data:
        facts = data["facts"]["facts"]
        for d in dupes(ids(facts)):
            rep.err("facts", f"重复 id {d}")
        snap_text = {}
        for f in facts:
            fact_by_id[f["id"]] = f
            where = f"facts {f['id']}"
            tiers = []
            for ev in f.get("evidence", []):
                s = src_by_id.get(ev["source"])
                if not s:
                    if src_by_id:
                        rep.err(where, f"引用了不存在的来源 {ev['source']}")
                    continue
                tiers.append(s["tier"])
                if s["id"] not in snap_text:
                    p = base / "research" / s["snapshot"]
                    snap_text[s["id"]] = p.read_text(encoding="utf-8", errors="ignore") if p.exists() else ""
                if snap_text[s["id"]] and not quote_found(ev["quote"], snap_text[s["id"]]):
                    rep.err(where, f"摘录在快照 {s['id']} 里找不到：{ev['quote'][:40]}…")
            st = f["status"]
            if src_by_id:
                if st == "verified" and "T1" not in tiers and tiers.count("T2") < 2:
                    rep.err(where, "verified 需要至少一个 T1，或两个 T2")
                if f["category"] == "how" and st in ("verified", "single-source") and "T1" not in tiers:
                    rep.err(where, "讲机制（how）必须有 T1；没有就标 inferred 或 undisclosed")
                if tiers and set(tiers) == {"T3"} and st != "inferred":
                    rep.warn(where, "只有 T3 出处，只能作旁证")
            if st in ("conflict", "inferred", "undisclosed") and not f.get("notes"):
                rep.err(where, f"status={st} 必须写 notes 说明")
            if f["category"] == "number" and not f.get("numbers"):
                rep.err(where, "category=number 必须填 numbers")
            if f.get("supersedes") and f["supersedes"] not in {x["id"] for x in facts}:
                rep.warn(where, f"supersedes 指向不存在的 {f['supersedes']}")

    # ---------- concepts ----------
    concept_by_id, node_ids = {}, set()
    if "concepts" in data:
        c = data["concepts"]
        nodes = c["master_map"]["nodes"]
        node_ids = set(ids(nodes))
        for d in dupes(ids(nodes)):
            rep.err("concepts", f"总图节点重复 id {d}")
        for n in nodes:
            if n.get("parent") and n["parent"] not in node_ids:
                rep.err(f"concepts 节点 {n['id']}", f"parent {n['parent']} 不存在")
        for e in c["master_map"]["edges"]:
            for end in ("from", "to"):
                if e[end] not in node_ids:
                    rep.err("concepts 连线", f"{e['from']}→{e['to']} 的 {end} 不存在")
        concepts = c["concepts"]
        for d in dupes(ids(concepts)):
            rep.err("concepts", f"概念重复 id {d}")
        concept_by_id = {x["id"]: x for x in concepts}
        for x in concepts:
            for p in x["prereqs"]:
                if p not in concept_by_id:
                    rep.err(f"concepts {x['id']}", f"先修 {p} 不存在")
            if x.get("node") and x["node"] not in node_ids:
                rep.err(f"concepts {x['id']}", f"node {x['node']} 不在总图里")
        # 环检测
        state = {}

        def visit(cid, stack):
            state[cid] = 1
            for p in concept_by_id.get(cid, {}).get("prereqs", []):
                if state.get(p) == 1:
                    rep.err("concepts", f"先修关系成环：{' → '.join(stack + [p])}")
                elif p in concept_by_id and not state.get(p):
                    visit(p, stack + [p])
            state[cid] = 2

        for cid in concept_by_id:
            if not state.get(cid):
                visit(cid, [cid])
        for q in c["objectives"]:
            for cid in q["concepts"]:
                if cid not in concept_by_id:
                    rep.err(f"concepts {q['id']}", f"学习目标引用了不存在的概念 {cid}")
        refs = [(f"concepts 节点 {n['id']}", n.get("facts", [])) for n in nodes]
        refs += [(f"concepts {x['id']}", x["facts"]) for x in concepts]
        refs += [(f"concepts {m['id']}", m["facts"]) for m in c.get("misconceptions", [])]
        if fact_by_id:
            for where, fl in refs:
                for fid in fl:
                    if fid not in fact_by_id:
                        rep.err(where, f"引用了不存在的事实 {fid}")

    # ---------- lesson ----------
    if "lesson" in data:
        L = data["lesson"]
        beats, chapters = L["beats"], L["chapters"]
        for d in dupes(ids(beats)):
            rep.err("lesson", f"beat 重复 id {d}")
        for d in dupes(ids(chapters)):
            rep.err("lesson", f"章节重复 id {d}")
        order = ids(beats)
        listed = [b for ch in chapters for b in ch["beats"]]
        if listed != order:
            rep.err("lesson", "chapters[].beats 串起来必须与 beats 的顺序完全一致")
        ch_of = {b: ch["id"] for ch in chapters for b in ch["beats"]}
        introduced = {}
        total_chars = 0
        pace = L["meta"].get("pace_cps", 3.5)
        for i, b in enumerate(beats):
            where = f"lesson {b['id']}"
            if ch_of.get(b["id"]) != b["chapter"]:
                rep.err(where, f"chapter 字段是 {b['chapter']}，但它被列在 {ch_of.get(b['id'])}")
            names = CUE_RE.findall(b["narration"])
            declared = [c["name"] for c in b.get("cues", [])]
            for n in set(names) - set(declared):
                rep.err(where, f"旁白里的 [[{n}]] 没有对应 cue")
            for n in set(declared) - set(names):
                rep.err(where, f"cue {n} 在旁白里没有标记")
            total_chars += spoken_len(b["narration"])
            prim = b["visual"]["primitive"]
            if prim in CUE_REQUIRED_PRIMS and not b["visual"].get("ui_mock"):
                rep.warn(where, f"{prim} 复刻界面，visual.ui_mock 应为 true")
            if b["move"] in FACT_MOVES and not b["facts"]:
                rep.err(where, f"move={b['move']} 必须挂事实")
            # 概念顺序
            cid = b.get("concept")
            if cid:
                if concept_by_id and cid not in concept_by_id:
                    rep.err(where, f"概念 {cid} 不在 concepts.json 里")
                elif cid in introduced:
                    rep.warn(where, f"概念 {cid} 已在 {introduced[cid]} 引入过")
                else:
                    for p in concept_by_id.get(cid, {}).get("prereqs", []):
                        if p not in introduced:
                            rep.err(where, f"引入 {cid} 前，先修概念 {p} 还没讲")
                    introduced[cid] = b["id"]
            # 事实门
            ref_text = ""
            for fid in b["facts"]:
                f = fact_by_id.get(fid)
                if not f:
                    if fact_by_id:
                        rep.err(where, f"引用了不存在的事实 {fid}")
                    continue
                ref_text += f["claim"] + " " + " ".join(n["value"] for n in f.get("numbers", [])) + " "
                hon = b["visual"].get("honesty", "official")
                if f["status"] == "inferred" and hon != "inferred" and not any(w in b["narration"] for w in INFER_WORDS):
                    rep.err(where, f"{fid} 是推断，画面要标 inferred 或旁白要说明是推断")
                if f["status"] == "undisclosed" and hon != "undisclosed" and not any(w in b["narration"] for w in UNDISCLOSED_WORDS):
                    rep.err(where, f"{fid} 是未披露，画面要标 undisclosed 或旁白要说明")
            if fact_by_id:
                spoken = CUE_RE.sub("", b["narration"])
                as_of = L["meta"].get("as_of", "")
                allowed = set(as_of.split("-")) | {p.lstrip("0") for p in as_of.split("-")}
                for num in NUM_RE.findall(spoken):
                    if num not in ref_text and num not in allowed:
                        rep.err(where, f"旁白里的数字 {num} 在引用的事实里找不到")
        if concept_by_id:
            ceiling = data.get("brief", {}).get("depth_ceiling", "L5")
            for cid, x in concept_by_id.items():
                if cid not in introduced and x["level"] <= ceiling:
                    rep.warn("lesson", f"概念 {cid}（{x['term']}）在深度上限 {ceiling} 以内，但没有 beat 引入它")
        est = total_chars / pace
        target = data.get("brief", {}).get("duration_s")
        print(f"讲稿约 {total_chars:.0f} 字当量，按 {pace} 字/秒约 {est:.0f} 秒" + (f"（目标 {target} 秒）" if target else ""))
        if target and abs(est - target) / target > 0.15:
            rep.warn("lesson", f"预计时长 {est:.0f} 秒，偏离目标 {target} 秒超过 15%")

    sys.exit(rep.dump())


if __name__ == "__main__":
    main()
