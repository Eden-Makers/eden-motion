#!/usr/bin/env python3
"""Where did the tokens go? Reads Claude Code session transcripts (~/.claude/projects/**/*.jsonl, subagents
included) and breaks the usage of the last N hours down by project, session and subagent, token type, model,
tool and hour.

    python3 tools/token_usage.py                     # last 48 h, every project
    python3 tools/token_usage.py --hours 12 --project my-film

Usage is weighted by relative cost so the shares mean something: fresh input 1, cache write 1.25,
cache read 0.1, output 5 (Anthropic's price ratios). The total is in "fresh input token" units.
Streamed messages repeat their usage per content block, so each message id is counted once.
"""
import argparse, collections, datetime as dt, glob, json, os, time

W = {"in": 1.0, "cw": 1.25, "cr": 0.1, "out": 5.0}

ap = argparse.ArgumentParser()
ap.add_argument("--hours", type=float, default=48)
ap.add_argument("--root", default=os.path.expanduser("~/.claude/projects"))
ap.add_argument("--project", default="", help="substring of the project folder name")
ap.add_argument("--top", type=int, default=20)
a = ap.parse_args()
cut = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=a.hours)


def ts(j):
    t = j.get("timestamp")
    return dt.datetime.fromisoformat(t.replace("Z", "+00:00")) if t else None


rows, labels = [], {}
tools, chars, images = collections.Counter(), collections.Counter(), collections.Counter()
for f in glob.glob(a.root + "/**/*.jsonl", recursive=True):
    if os.path.getmtime(f) < time.time() - (a.hours + 1) * 3600:
        continue
    rel = os.path.relpath(f, a.root).split(os.sep)
    proj = rel[0]
    if a.project and a.project not in proj:
        continue
    sub = "subagents" in rel
    sess = (rel[1] if sub else rel[-1].removesuffix(".jsonl"))[:8]
    agent = os.path.basename(f).removesuffix(".jsonl") if sub else "main"
    msgs, pending, first = {}, {}, None
    for line in open(f, errors="ignore"):
        try:
            j = json.loads(line)
        except ValueError:
            continue
        t = ts(j)
        if j.get("type") == "user":
            c = j.get("message", {}).get("content")
            if sub and first is None:
                first = c if isinstance(c, str) else " ".join(x.get("text", "") for x in c or [] if isinstance(x, dict))
            if t and t >= cut and isinstance(c, list):
                for b in c:
                    if isinstance(b, dict) and b.get("type") == "tool_result":
                        name = pending.get(b.get("tool_use_id"), "?")
                        cc = b.get("content")
                        for x in (cc if isinstance(cc, list) else [{"text": cc or ""}]):
                            if isinstance(x, dict) and x.get("type") == "image":
                                images[name] += 1
                            elif isinstance(x, dict):
                                chars[name] += len(x.get("text") or "")
        elif j.get("type") == "assistant" and t and t >= cut:
            m = j.get("message", {})
            u = m.get("usage")
            if not u:
                continue
            msgs[m.get("id") or j.get("uuid")] = (t, m.get("model", "?"), u.get("input_tokens", 0),
                                                 u.get("cache_creation_input_tokens", 0),
                                                 u.get("cache_read_input_tokens", 0), u.get("output_tokens", 0))
            for b in m.get("content") or []:
                if isinstance(b, dict) and b.get("type") == "tool_use":
                    tools[b.get("name")] += 1
                    pending[b.get("id")] = b.get("name")
    if sub and first:
        first = " ".join(first.split())
        labels[(sess, agent)] = "fork (inherits the whole parent context)" if first.startswith("<fork") else first[:70]
    rows += [(proj, sess, agent, *v) for v in msgs.values()]

if not rows:
    raise SystemExit("no usage in that window")


def cost(r):
    return r[5] * W["in"] + r[6] * W["cw"] + r[7] * W["cr"] + r[8] * W["out"]


tot = sum(cost(r) for r in rows)
pct = lambda v: f"{v / tot * 100:5.1f}%"
print(f"{len(rows)} messages, {tot / 1e6:.1f}M weighted (fresh-input units), last {a.hours:g} h")
print("raw tokens: input %.1fM, cache write %.1fM, cache read %.1fM, output %.2fM"
      % tuple(sum(r[i] for r in rows) / 1e6 for i in (5, 6, 7, 8)))


def table(title, key, n=None):
    acc, cnt = collections.defaultdict(float), collections.Counter()
    for r in rows:
        acc[key(r)] += cost(r)
        cnt[key(r)] += 1
    print(f"\n{title}")
    for k, v in sorted(acc.items(), key=lambda x: -x[1])[:n]:
        lab = labels.get(k[1:3], "") if isinstance(k, tuple) else ""
        name = " ".join(str(x) for x in k) if isinstance(k, tuple) else k
        print(f"  {pct(v)}  {name:52s} msgs={cnt[k]:<5d} {lab}")


table("BY PROJECT", lambda r: r[0])
table("BY SESSION / SUBAGENT", lambda r: (r[0][-20:], r[1], r[2][:24]), a.top)
print("\nBY TOKEN TYPE")
for i, (n, w) in zip((5, 6, 7, 8), [("fresh input", "in"), ("cache write", "cw"), ("cache read", "cr"), ("output", "out")]):
    print(f"  {pct(sum(r[i] for r in rows) * W[w])}  {n}")
table("BY MODEL", lambda r: r[4])
print("\nTOOLS: calls, result size, images returned")
for n, c in tools.most_common(a.top):
    print(f"  {n:34s} {c:6d}  {chars[n] / 1e3:8.0f}k chars  images={images[n]}")
table("BY HOUR (local)", lambda r: r[3].astimezone().strftime("%m-%d %H:00"))
