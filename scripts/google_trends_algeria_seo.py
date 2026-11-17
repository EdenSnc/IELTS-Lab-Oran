#!/usr/bin/env python3
"""Extensive Google Trends + Google Autocomplete + GSC demand analysis for IELTS Algeria (EN/FR/AR)."""

import csv
import datetime as dt
import io
import json
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "docs" / "seo" / "trends-data-20261117"
DATA_DIR.mkdir(parents=True, exist_ok=True)
REPORT_PATH = ROOT / "docs" / "seo" / "GOOGLE_TRENDS_AND_DEMAND_REPORT_20261117.md"

ANCHOR = "ielts algérie"

# Structured keyword batches (max 5 terms per Trends request, with shared anchor on local batches)
TREND_BATCHES = [
    # Macro seasonality (5 years)
    {"id": "macro_5y_dz", "geo": "DZ", "time": "today 5-y", "terms": ["IELTS", "ielts algérie", "TOEFL", "TCF Canada", "Duolingo English Test"]},
    # Oran vs other cities & local intent (12m DZ)
    {"id": "cities_12m_dz", "geo": "DZ", "time": "today 12-m", "terms": [ANCHOR, "ielts oran", "ielts alger", "ielts constantine", "ielts setif"]},
    # Oran Province specific (DZ-31)
    {"id": "oran_province_12m", "geo": "DZ-31", "time": "today 12-m", "terms": ["IELTS", "ielts oran", "british council oran", "préparation ielts", "test ielts"]},
    # Registration & Fees FR
    {"id": "reg_fees_fr_12m", "geo": "DZ", "time": "today 12-m", "terms": [ANCHOR, "prix ielts algerie", "inscription ielts algerie", "tarif ielts algerie", "ielts algerie prix"]},
    # Booking & Dates FR/EN
    {"id": "booking_dates_12m", "geo": "DZ", "time": "today 12-m", "terms": [ANCHOR, "ielts booking algeria", "ielts registration algeria", "rendez vous ielts", "ielts dates algeria"]},
    # British Council & Centres
    {"id": "bc_centres_12m", "geo": "DZ", "time": "today 12-m", "terms": [ANCHOR, "british council algeria", "british council algerie", "british council ielts", "centre ielts algerie"]},
    # Price & Payment EN
    {"id": "price_en_12m", "geo": "DZ", "time": "today 12-m", "terms": [ANCHOR, "ielts price algeria", "ielts test algeria price", "ielts fee algeria", "ielts payment algeria"]},
    # Preparation & Courses FR
    {"id": "prep_fr_12m", "geo": "DZ", "time": "today 12-m", "terms": [ANCHOR, "préparation ielts", "formation ielts", "cours ielts", "préparation ielts alger"]},
    # Preparation & Courses EN
    {"id": "prep_en_12m", "geo": "DZ", "time": "today 12-m", "terms": [ANCHOR, "ielts preparation algeria", "ielts course algeria", "ielts training algeria", "ielts practice test"]},
    # Arabic Registration & Price
    {"id": "reg_price_ar_12m", "geo": "DZ", "time": "today 12-m", "terms": [ANCHOR, "اختبار ايلتس", "سعر اختبار الايلتس", "التسجيل في ايلتس", "الايلتس في الجزائر"]},
    # Arabic Prep & Oran
    {"id": "prep_ar_12m", "geo": "DZ", "time": "today 12-m", "terms": [ANCHOR, "دورة ايلتس", "تحضير ايلتس", "امتحان ايلتس", "ايلتس وهران"]},
    # Computer vs Paper & OSR
    {"id": "format_retake_12m", "geo": "DZ", "time": "today 12-m", "terms": [ANCHOR, "computer based ielts", "ielts sur ordinateur", "ielts one skill retake", "academic vs general ielts"]},
    # Mock tests & free prep
    {"id": "mock_free_12m", "geo": "DZ", "time": "today 12-m", "terms": [ANCHOR, "ielts mock test", "test blanc ielts", "ielts ready premium", "ielts sample test"]},
    # Canada Immigration
    {"id": "canada_12m", "geo": "DZ", "time": "today 12-m", "terms": [ANCHOR, "ielts canada", "ielts general training", "tcf canada", "entrée express ielts"]},
    # Study Visas (Italy / UK / France)
    {"id": "visas_12m", "geo": "DZ", "time": "today 12-m", "terms": [ANCHOR, "ielts ukvi", "ielts etude italie", "duolingo test italie", "british council englishscore"]},
    # Skills & Band Scores
    {"id": "skills_12m", "geo": "DZ", "time": "today 12-m", "terms": [ANCHOR, "ielts writing task 2", "ielts speaking", "ielts listening", "ielts reading"]},
    # Score conversion & IELTS vs alternatives
    {"id": "alternatives_12m", "geo": "DZ", "time": "today 12-m", "terms": [ANCHOR, "ielts vs toefl", "ielts clb", "ielts band score", "pte core algeria"]},
    # Recent 90-day surge / breakout check
    {"id": "surge_90d_dz", "geo": "DZ", "time": "today 3-m", "terms": ["IELTS", "ielts algérie", "ielts oran", "prix ielts", "ielts one skill retake"]},
    # Recent 90-day visa & computer test check
    {"id": "surge_visas_90d", "geo": "DZ", "time": "today 3-m", "terms": ["IELTS", "ielts italie", "ielts canada", "british council algeria", "ielts sur ordinateur"]},
    # Oran Province 5y macro
    {"id": "oran_5y", "geo": "DZ-31", "time": "today 5-y", "terms": ["IELTS", "ielts oran", "TOEFL", "TCF"]},
]

# Autocomplete seeds across EN, FR, AR (gl=dz)
AUTOCOMPLETE_SEEDS = [
    ("fr", "ielts"),
    ("fr", "ielts algerie"),
    ("fr", "ielts algerie "),
    ("fr", "ielts oran"),
    ("fr", "prix ielts"),
    ("fr", "inscription ielts"),
    ("fr", "ou payer ielts"),
    ("fr", "rendez vous ielts"),
    ("fr", "preparation ielts"),
    ("fr", "formation ielts"),
    ("fr", "cours ielts"),
    ("fr", "test blanc ielts"),
    ("fr", "ielts sur ordinateur"),
    ("fr", "ielts one skill retake"),
    ("fr", "ielts canada"),
    ("fr", "ielts italie"),
    ("fr", "ielts ukvi"),
    ("fr", "british council ielts algerie"),
    ("fr", "ielts setif"),
    ("fr", "ielts constantine"),
    ("fr", "ielts alger"),
    ("en", "ielts algeria"),
    ("en", "ielts algeria "),
    ("en", "ielts oran"),
    ("en", "ielts price algeria"),
    ("en", "ielts registration algeria"),
    ("en", "ielts booking algeria"),
    ("en", "british council algeria ielts"),
    ("en", "computer delivered ielts algeria"),
    ("en", "ielts preparation oran"),
    ("en", "ielts mock test"),
    ("en", "ielts one skill retake"),
    ("en", "ielts italy visa algeria"),
    ("en", "ielts canada express entry"),
    ("en", "ielts ukvi algeria"),
    ("en", "ielts ready premium"),
    ("en", "ielts writing task 2"),
    ("en", "ielts speaking"),
    ("en", "ielts academic vs general"),
    ("ar", "ايلتس"),
    ("ar", "ايلتس الجزائر"),
    ("ar", "ايلتس وهران"),
    ("ar", "اختبار الايلتس"),
    ("ar", "سعر اختبار الايلتس"),
    ("ar", "التسجيل في الايلتس"),
    ("ar", "دورة ايلتس"),
    ("ar", "تحضير ايلتس"),
    ("ar", "امتحان ايلتس"),
    ("ar", "الايلتس على الكمبيوتر"),
    ("ar", "ايلتس كندا"),
    ("ar", "ايلتس ايطاليا"),
    ("ar", "المجلس الثقافي البريطاني ايلتس"),
]


def make_opener():
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor())
    opener.addheaders = [
        ("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"),
        ("Accept-Language", "en-US,en;q=0.9,fr;q=0.8,ar;q=0.7"),
    ]
    opener.open("https://trends.google.com/trends/?geo=DZ", timeout=10).read(256)
    return opener


def fetch_json_clean(opener, url: str, retries: int = 3):
    for attempt in range(retries):
        try:
            raw = opener.open(url, timeout=12).read().decode("utf-8", errors="replace")
            if raw.startswith(")]}'"):
                raw = raw.split("\n", 1)[1] if "\n" in raw else raw[4:]
            return json.loads(raw)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 4 * (attempt + 1)
                print(f"  [429 rate-limit] sleeping {wait}s...")
                time.sleep(wait)
                continue
            raise
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(2)
    raise RuntimeError("Max retries exceeded")


def run_trends():
    opener = make_opener()
    all_batches = {}
    summary_rows = []
    related_rows = []

    for idx, batch in enumerate(TREND_BATCHES, 1):
        print(f"[{idx}/{len(TREND_BATCHES)}] Trends batch {batch['id']} ({batch['geo']}, {batch['time']})...")
        req_obj = {
            "comparisonItem": [{"keyword": kw, "geo": batch["geo"], "time": batch["time"]} for kw in batch["terms"]],
            "category": 0,
            "property": "",
        }
        explore_url = "https://trends.google.com/trends/api/explore?hl=en-US&tz=-60&req=" + urllib.parse.quote(json.dumps(req_obj))
        try:
            exp = fetch_json_clean(opener, explore_url)
        except Exception as e:
            print(f"  Explore failed for {batch['id']}: {e}")
            continue

        widgets = exp.get("widgets", [])
        batch_result = {"terms": batch["terms"], "geo": batch["geo"], "time": batch["time"], "timeseries": [], "related": {}}

        # TIMESERIES
        ts_widget = next((w for w in widgets if w.get("id") == "TIMESERIES"), None)
        if ts_widget:
            ts_url = (
                "https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=-60"
                f"&req={urllib.parse.quote(json.dumps(ts_widget['request']))}"
                f"&token={urllib.parse.quote(ts_widget['token'])}"
            )
            try:
                ts_data = fetch_json_clean(opener, ts_url)
                timeline = ts_data.get("default", {}).get("timelineData", [])
                batch_result["timeseries"] = timeline
                sums = [0] * len(batch["terms"])
                peaks = [0] * len(batch["terms"])
                peak_dates = [""] * len(batch["terms"])
                nonzero = [0] * len(batch["terms"])
                for pt in timeline:
                    vals = pt.get("value", [])
                    for i, v in enumerate(vals):
                        if i < len(sums):
                            sums[i] += v
                            if v > 0:
                                nonzero[i] += 1
                            if v > peaks[i]:
                                peaks[i] = v
                                peak_dates[i] = pt.get("formattedAxisTime", "")
                n = max(1, len(timeline))
                for i, term in enumerate(batch["terms"]):
                    summary_rows.append({
                        "batch_id": batch["id"],
                        "geo": batch["geo"],
                        "time": batch["time"],
                        "term": term,
                        "mean_score": round(sums[i] / n, 2),
                        "peak_score": peaks[i],
                        "peak_period": peak_dates[i],
                        "nonzero_points": nonzero[i],
                        "total_points": len(timeline),
                    })
            except Exception as e:
                print(f"  Timeseries failed for {batch['id']}: {e}")

        # RELATED_QUERIES_0..N
        for w in widgets:
            wid = w.get("id", "")
            if wid.startswith("RELATED_QUERIES"):
                suffix = wid.split("_")[-1]
                term_idx = int(suffix) if suffix.isdigit() else 0
                term_name = batch["terms"][term_idx] if term_idx < len(batch["terms"]) else f"term_{term_idx}"
                rq_url = (
                    "https://trends.google.com/trends/api/widgetdata/relatedsearches?hl=en-US&tz=-60"
                    f"&req={urllib.parse.quote(json.dumps(w['request']))}"
                    f"&token={urllib.parse.quote(w['token'])}"
                )
                try:
                    rq_data = fetch_json_clean(opener, rq_url)
                    ranked_lists = rq_data.get("default", {}).get("rankedList", [])
                    for rtype, rlist in zip(["TOP", "RISING"], ranked_lists):
                        for item in rlist.get("rankedKeyword", []):
                            related_rows.append({
                                "batch_id": batch["id"],
                                "geo": batch["geo"],
                                "time": batch["time"],
                                "seed_term": term_name,
                                "kind": rtype,
                                "query": item.get("query", ""),
                                "value": item.get("formattedValue", item.get("value", "")),
                            })
                except Exception as e:
                    print(f"  Related failed for {batch['id']} ({term_name}): {e}")
                time.sleep(0.35)

        all_batches[batch["id"]] = batch_result
        time.sleep(1.1)

    return all_batches, summary_rows, related_rows


def run_autocomplete():
    rows = []
    seen = set()
    for hl, seed in AUTOCOMPLETE_SEEDS:
        u = f"https://suggestqueries.google.com/complete/search?client=firefox&gl=dz&hl={hl}&q={urllib.parse.quote(seed)}"
        try:
            raw = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=8).read().decode("utf-8")
            parsed = json.loads(raw)
            suggestions = parsed[1] if len(parsed) > 1 else []
            for rank, s in enumerate(suggestions, 1):
                rows.append({"hl": hl, "seed": seed, "rank": rank, "suggestion": s})
                seen.add((hl, s.lower()))
        except Exception as e:
            print(f"Autocomplete failed ({hl}, {seed}): {e}")
        time.sleep(0.15)
    print(f"Autocomplete collected {len(rows)} rows ({len(seen)} unique lang/query pairs).")
    return rows


def load_gsc():
    uploads = pathlib.Path(
        r"C:/Users/Admin/.gemini/antigravity/brain/38ed8a37-692e-4f99-9e23-0b4660ad4206/.user_uploaded"
    )
    for zp in sorted(uploads.glob("*.zip")):
        with zipfile.ZipFile(zp) as zf:
            if "Queries.csv" in zf.namelist():
                q = list(csv.DictReader(io.StringIO(zf.read("Queries.csv").decode("utf-8-sig"))))
                p = list(csv.DictReader(io.StringIO(zf.read("Pages.csv").decode("utf-8-sig"))))
                return q, p
    return [], []


def classify_intent_and_target(query: str):
    q = query.lower()
    if any(k in q for k in ["prix", "price", "tarif", "coût", "cout", "fee", "cost", "payer", "payment", "payement", "سعر", "تكلف", "دفع", "بنك", "كاش", "hsbc"]):
        return "Registration & Fees", "/[locale]/articles/how-to-register-algeria"
    if any(k in q for k in ["inscription", "register", "registration", "book", "booking", "rendez", "rdv", "date", "login", "تسجيل", "حجز", "موعد", "مواعيد"]):
        return "Booking & Dates", "/[locale]/articles/how-to-register-algeria"
    if any(k in q for k in ["oran", "وهران", "bir el djir", "centre", "center", "setif", "constantine", "alger"]):
        if any(k in q for k in ["préparation", "preparation", "cours", "formation", "école", "ecole", "lab", "training", "تحضير", "دورة", "معهد"]):
            return "Local Preparation (Oran/DZ)", "/[locale]"
        return "Local Centre / Test Info", "/[locale]/articles/how-to-register-algeria + /[locale]"
    if any(k in q for k in ["computer", "ordinateur", "papier", "paper", "كمبيوتر", "ورقي", "retake", "إعادة"]):
        return "Computer Format / Retake", "/[locale]/articles/computer-vs-paper-ielts & /ielts-one-skill-retake-algeria"
    if any(k in q for k in ["canada", "express entry", "entrée express", "clb", "tcf", "celpip", "toefl", "pte", "كندا"]):
        return "Canada Immigration", "/[locale]/articles/ielts-vs-toefl-canada"
    if any(k in q for k in ["ital", "duolingo", "englishscore", "إيطاليا", "ايطاليا"]):
        return "Italy Study Visa", "/[locale]/articles/italy-student-visa-english-tests-algeria"
    if any(k in q for k in ["ukvi", "uk", "france", "capago", "tlscontact", "visa", "تأشيرة"]):
        return "UK/France Visas", "/[locale]/articles/tlscontact-capago"
    if any(k in q for k in ["free", "gratuit", "mock", "blanc", "sample", "ready", "pdf", "cambridge", "engnovate", "مجاني", "موارد", "نماذج"]):
        return "Free Resources & Mock Test", "/[locale]/articles/free-ielts-resources-algeria + /sample"
    if any(k in q for k in ["writing", "speaking", "reading", "listening", "task 2", "academic", "general", "score", "band", "كتابة", "محادثة", "أكاديمي"]):
        return "Skills & Band Strategy", "/[locale]/articles/writing-task-2-tactics & /academic-vs-general"
    return "General / Awareness", "/[locale] & /[locale]/articles"


def main():
    all_ts, summary_rows, related_rows = run_trends()
    ac_rows = run_autocomplete()
    gsc_queries, gsc_pages = load_gsc()

    (DATA_DIR / "trends_timeseries.json").write_text(json.dumps(all_ts, ensure_ascii=False, indent=2), encoding="utf-8")

    with (DATA_DIR / "trends_summary.csv").open("w", newline="", encoding="utf-8") as f:
        if summary_rows:
            w = csv.DictWriter(f, fieldnames=list(summary_rows[0].keys()))
            w.writeheader()
            w.writerows(summary_rows)

    with (DATA_DIR / "trends_related.csv").open("w", newline="", encoding="utf-8") as f:
        if related_rows:
            w = csv.DictWriter(f, fieldnames=list(related_rows[0].keys()))
            w.writeheader()
            w.writerows(related_rows)

    with (DATA_DIR / "autocomplete_dz.csv").open("w", newline="", encoding="utf-8") as f:
        if ac_rows:
            w = csv.DictWriter(f, fieldnames=list(ac_rows[0].keys()))
            w.writeheader()
            w.writerows(ac_rows)

    # Build unified Demand & Gap Matrix combining GSC + Trends Related + Autocomplete
    unified = {}
    for g in gsc_queries:
        q = g["Top queries"].strip()
        key = q.lower()
        cluster, target = classify_intent_and_target(q)
        unified[key] = {
            "query": q,
            "cluster": cluster,
            "target_page": target,
            "gsc_impressions": int(g["Impressions"] or 0),
            "gsc_clicks": int(g["Clicks"] or 0),
            "gsc_position": g["Position"],
            "trends_signals": 0,
            "autocomplete_hits": 0,
            "sources": ["GSC"],
        }

    for r in related_rows:
        q = r["query"].strip()
        if not q:
            continue
        key = q.lower()
        cluster, target = classify_intent_and_target(q)
        entry = unified.setdefault(key, {
            "query": q,
            "cluster": cluster,
            "target_page": target,
            "gsc_impressions": 0,
            "gsc_clicks": 0,
            "gsc_position": "",
            "trends_signals": 0,
            "autocomplete_hits": 0,
            "sources": [],
        })
        entry["trends_signals"] += 1
        if "Trends" not in entry["sources"]:
            entry["sources"].append("Trends")

    for a in ac_rows:
        q = a["suggestion"].strip()
        if not q:
            continue
        key = q.lower()
        cluster, target = classify_intent_and_target(q)
        entry = unified.setdefault(key, {
            "query": q,
            "cluster": cluster,
            "target_page": target,
            "gsc_impressions": 0,
            "gsc_clicks": 0,
            "gsc_position": "",
            "trends_signals": 0,
            "autocomplete_hits": 0,
            "sources": [],
        })
        entry["autocomplete_hits"] += 1
        if "Autocomplete" not in entry["sources"]:
            entry["sources"].append("Autocomplete")

    matrix_rows = sorted(
        unified.values(),
        key=lambda x: (x["gsc_impressions"] * 2 + x["trends_signals"] * 40 + x["autocomplete_hits"] * 15),
        reverse=True,
    )
    with (DATA_DIR / "demand_gap_matrix.csv").open("w", newline="", encoding="utf-8") as f:
        fields = ["query", "cluster", "target_page", "gsc_impressions", "gsc_clicks", "gsc_position", "trends_signals", "autocomplete_hits", "sources"]
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in matrix_rows:
            row = dict(r)
            row["sources"] = ",".join(r["sources"])
            w.writerow(row)

    # Summarize monthly seasonality from 5-year macro batch
    macro = all_ts.get("macro_5y_dz", {}).get("timeseries", [])
    monthly_totals = {m: [] for m in range(1, 13)}
    for pt in macro:
        ts_sec = int(pt.get("time", 0))
        if ts_sec:
            month = dt.datetime.fromtimestamp(ts_sec, tz=dt.timezone.utc).month
            vals = pt.get("value", [])
            if vals:
                monthly_totals[month].append(vals[0])

    # Cluster totals
    cluster_stats = {}
    for r in matrix_rows:
        c = cluster_stats.setdefault(r["cluster"], {"terms": 0, "gsc_imp": 0, "gsc_clicks": 0, "trends": 0, "ac": 0})
        c["terms"] += 1
        c["gsc_imp"] += r["gsc_impressions"]
        c["gsc_clicks"] += r["gsc_clicks"]
        c["trends"] += r["trends_signals"]
        c["ac"] += r["autocomplete_hits"]

    # Generate concise synthesis report
    md = [
        "# Google Trends, Autocomplete & GSC Demand Report (17 November 2026)",
        "",
        f"- **Trends Batches Queried**: {len(all_ts)}/{len(TREND_BATCHES)}",
        f"- **Trends Summary Rows**: {len(summary_rows)} | **Related Queries (Top + Rising)**: {len(related_rows)}",
        f"- **Google Autocomplete (`gl=dz`, EN/FR/AR)**: {len(ac_rows)} suggestions across {len(AUTOCOMPLETE_SEEDS)} seeds",
        f"- **Unified Unique Query Matrix**: {len(matrix_rows)} distinct queries",
        "",
        "## 1. Five-Year Algeria `IELTS` Seasonality (`geo=DZ`)",
        "",
        "| Month | Mean Relative Interest (0–100) |",
        "|---|---|",
    ]
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for m in range(1, 13):
        vals = monthly_totals[m]
        avg = round(sum(vals) / len(vals), 1) if vals else 0
        md.append(f"| {month_names[m-1]} | {avg} |")

    md += [
        "",
        "## 2. Intent Cluster Priority Matrix (GSC + Trends + Autocomplete)",
        "",
        "| Intent Cluster | Distinct Queries | GSC Impressions | GSC Clicks | Trends Related Hits | Autocomplete Hits |",
        "|---|---|---|---|---|---|",
    ]
    for cname, st in sorted(cluster_stats.items(), key=lambda kv: kv[1]["gsc_imp"] + kv[1]["trends"] * 20, reverse=True):
        md.append(f"| {cname} | {st['terms']} | {st['gsc_imp']} | {st['gsc_clicks']} | {st['trends']} | {st['ac']} |")

    md += [
        "",
        "## 3. Top Trends Terms (Non-Zero 12-Month Relative Scores in DZ)",
        "",
        "| Batch | Geo | Term | Mean Score | Peak | Peak Date |",
        "|---|---|---|---|---|---|",
    ]
    for r in sorted([x for x in summary_rows if x["mean_score"] > 0 or x["peak_score"] > 0], key=lambda x: (x["mean_score"], x["peak_score"]), reverse=True)[:50]:
        md.append(f"| `{r['batch_id']}` | `{r['geo']}` | {r['term']} | {r['mean_score']} | {r['peak_score']} | {r['peak_period']} |")

    md += [
        "",
        "## 4. Top Rising & Breakout Trends Queries (`DZ` & `DZ-31`)",
        "",
        "| Geo | Seed | Query | Score / Label |",
        "|---|---|---|---|",
    ]
    rising = [x for x in related_rows if x["kind"] == "RISING"]
    for r in rising[:60]:
        md.append(f"| `{r['geo']}` | {r['seed_term']} | {r['query']} | {r['value']} |")

    md += [
        "",
        "## 5. Top Google Autocomplete Suggestions (`gl=dz`, FR / EN / AR)",
        "",
        "| Lang | Seed | Top Suggestions |",
        "|---|---|---|",
    ]
    by_seed = {}
    for a in ac_rows:
        by_seed.setdefault((a["hl"], a["seed"]), []).append(a["suggestion"])
    for (hl, seed), suggs in by_seed.items():
        md.append(f"| `{hl}` | `{seed}` | {' · '.join(suggs[:6])} |")

    REPORT_PATH.write_text("\n".join(md), encoding="utf-8")
    print(f"Saved report -> {REPORT_PATH}")


if __name__ == "__main__":
    main()
