#!/usr/bin/env python3
"""Export VoltPilot markdown docs to HTML/DOCX with clickable TOC and links."""

from __future__ import annotations

import html
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"


def slugify(text: str) -> str:
    t = text.strip().lower()
    t = re.sub(r"[`*_]", "", t)
    t = re.sub(r"[^\w\s-]", "", t)
    t = re.sub(r"\s+", "-", t)
    t = re.sub(r"-+", "-", t)
    return t.strip("-")


def inline_format(text: str, slug_map: dict[str, str]) -> str:
    s = html.escape(text)

    def repl_md_link(m: re.Match[str]) -> str:
        label, href = m.group(1), m.group(2)
        if href.startswith("#"):
            anchor = href[1:]
            target = slug_map.get(anchor, anchor)
            return f'<a href="#{target}">{html.escape(label)}</a>'
        if href.startswith("./") or href.startswith("../"):
            return f"<code>{html.escape(label)}</code>"
        return f'<a href="{html.escape(href)}">{html.escape(label)}</a>'

    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", repl_md_link, s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\*(.+?)\*", r"<em>\1</em>", s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)

    def repl_url(m: re.Match[str]) -> str:
        url = m.group(0)
        return f'<a href="{html.escape(url)}">{html.escape(url)}</a>'

    s = re.sub(r"https?://[^\s<>&\"']+", repl_url, s)
    return s


def collect_headings(lines: list[str]) -> list[tuple[int, str, str]]:
    """Return (level, text, slug) for each heading."""
    headings: list[tuple[int, str, str]] = []
    used: dict[str, int] = {}

    for line in lines:
        m = re.match(r"^(#{1,4})\s+(.+)$", line)
        if not m:
            continue
        level = len(m.group(1))
        text = m.group(2).strip()
        base = slugify(text)
        count = used.get(base, 0)
        used[base] = count + 1
        slug = base if count == 0 else f"{base}-{count + 1}"
        headings.append((level, text, slug))

    return headings


def assign_heading_slugs(lines: list[str]) -> dict[int, str]:
    """Map line index -> unique slug for heading lines."""
    result: dict[int, str] = {}
    used: dict[str, int] = {}
    for i, line in enumerate(lines):
        m = re.match(r"^(#{1,4})\s+(.+)$", line)
        if not m:
            continue
        text = m.group(2).strip()
        base = slugify(text)
        count = used.get(base, 0)
        used[base] = count + 1
        slug = base if count == 0 else f"{base}-{count + 1}"
        result[i] = slug
    return result


def build_slug_map(lines: list[str], heading_slugs: dict[int, str]) -> dict[str, str]:
    """Map markdown anchor targets (#foo) to generated slug ids."""
    mapping: dict[str, str] = {}
    for i, slug in heading_slugs.items():
        text = re.match(r"^#{1,4}\s+(.+)$", lines[i]).group(1).strip()
        keys = {slugify(text), slug}
        parts = text.split(".", 1)
        if len(parts) == 2 and parts[0].strip().isdigit():
            keys.add(slugify(parts[1]))
            keys.add(slugify(f"{parts[0].strip()}. {parts[1].strip()}"))
        for key in keys:
            if key and key not in mapping:
                mapping[key] = slug
    return mapping


def is_toc_section(lines: list[str], idx: int) -> bool:
    if idx + 1 >= len(lines):
        return False
    if not re.match(r"^#{1,3}\s+table of contents\s*$", lines[idx], re.I):
        return False
    return any(re.match(r"^\d+\.\s+\[", lines[j]) for j in range(idx + 1, min(idx + 30, len(lines))))


def markdown_to_html(
    md_text: str,
    title: str,
    *,
    extra_toc: list[tuple[str, str]] | None = None,
) -> str:
    lines = md_text.splitlines()
    heading_slugs = assign_heading_slugs(lines)
    slug_map = build_slug_map(lines, heading_slugs)
    if extra_toc:
        for _label, anchor in extra_toc:
            slug_map[anchor] = anchor
    headings = collect_headings(lines)

    out: list[str] = []
    out.append("<!DOCTYPE html>")
    out.append("<html><head><meta charset='utf-8'>")
    out.append(f"<title>{html.escape(title)}</title>")
    out.append(
        "<style>"
        "body{font-family:Arial,Helvetica,sans-serif;max-width:920px;margin:36px auto;"
        "line-height:1.55;color:#111;font-size:14px}"
        "h1{font-size:26px;border-bottom:2px solid #222;padding-bottom:8px;margin-top:36px}"
        "h1.doc-title{border:none;font-size:32px;margin-top:0}"
        "h2{font-size:20px;margin-top:28px;border-bottom:1px solid #ccc;padding-bottom:4px}"
        "h3{font-size:17px;margin-top:22px}"
        "h4{font-size:15px;margin-top:16px}"
        "nav.toc{background:#f8f9fa;border:1px solid #ddd;border-radius:8px;padding:16px 20px;margin:24px 0}"
        "nav.toc h2{margin-top:0;border:none;font-size:18px}"
        "nav.toc ol{margin:8px 0 0;padding-left:22px}"
        "nav.toc li{margin:4px 0}"
        "nav.toc a{color:#1a73e8;text-decoration:none}"
        "nav.toc a:hover{text-decoration:underline}"
        "table{border-collapse:collapse;width:100%;margin:14px 0;font-size:12px}"
        "th,td{border:1px solid #ccc;padding:7px;text-align:left;vertical-align:top}"
        "th{background:#f0f0f0}"
        "code{background:#f4f4f4;padding:1px 5px;border-radius:3px;font-family:Consolas,monospace;font-size:12px}"
        "pre{background:#f4f4f4;padding:12px;border-radius:6px;font-size:11px;white-space:pre-wrap;word-break:break-word}"
        "blockquote{border-left:4px solid #ccc;margin:14px 0;padding:8px 16px;background:#fafafa;color:#333}"
        "hr{border:none;border-top:1px solid #ddd;margin:24px 0}"
        "ul,ol{margin:8px 0;padding-left:24px}"
        "p{margin:8px 0}"
        "a{color:#1a73e8}"
        "</style></head><body>"
    )

    out.append(f"<h1 class='doc-title' id='top'>{html.escape(title)}</h1>")

    # Master navigation TOC
    out.append("<nav class='toc' id='table-of-contents'>")
    out.append("<h2>Table of Contents</h2><ol>")
    if extra_toc:
        for label, anchor in extra_toc:
            out.append(f"<li><a href='#{html.escape(anchor)}'>{html.escape(label)}</a></li>")
    else:
        for level, text, slug in headings:
            if level <= 2 and slug != "top":
                indent = "" if level == 1 else "&nbsp;&nbsp;"
                out.append(
                    f"<li>{indent}<a href='#{html.escape(slug)}'>{html.escape(text)}</a></li>"
                )
    out.append("</ol></nav>")

    in_code = False
    code_buf: list[str] = []
    in_table = False
    table_rows: list[str] = []
    skip_until_hr = False

    def flush_table() -> None:
        nonlocal in_table, table_rows
        if not table_rows:
            in_table = False
            return
        out.append("<table>")
        for i, row in enumerate(table_rows):
            cells = [c.strip() for c in row.strip("|").split("|")]
            tag = "th" if i == 0 else "td"
            out.append(
                "<tr>"
                + "".join(f"<{tag}>{inline_format(c, slug_map)}</{tag}>" for c in cells)
                + "</tr>"
            )
        out.append("</table>")
        table_rows = []
        in_table = False

    for i, raw in enumerate(lines):
        line = raw.rstrip("\n")

        if skip_until_hr:
            if line.strip() == "---":
                skip_until_hr = False
            continue

        if is_toc_section(lines, i):
            skip_until_hr = True
            continue

        if line.startswith("```"):
            if in_code:
                out.append(f"<pre><code>{html.escape(chr(10).join(code_buf))}</code></pre>")
                code_buf = []
                in_code = False
            else:
                flush_table()
                in_code = True
            continue

        if in_code:
            code_buf.append(line)
            continue

        if line.strip().startswith("|") and "|" in line[1:]:
            if re.match(r"^\|[\s\-:|]+\|$", line.strip()):
                continue
            in_table = True
            table_rows.append(line)
            continue
        elif in_table:
            flush_table()

        if line.strip() == "---":
            out.append("<hr>")
            continue

        hm = re.match(r"^(#{1,4})\s+(.+)$", line)
        if hm:
            level = len(hm.group(1))
            text = hm.group(2).strip()
            slug = heading_slugs.get(i, slugify(text))
            tag = f"h{level}"
            out.append(f"<{tag} id='{html.escape(slug)}'>{inline_format(text, slug_map)}</{tag}>")
            continue

        if line.startswith("<h1 id="):
            out.append(line)
            continue

        if line.startswith("> "):
            out.append(f"<blockquote><p>{inline_format(line[2:], slug_map)}</p></blockquote>")
            continue

        if re.match(r"^[-*] ", line):
            out.append(f"<ul><li>{inline_format(line[2:], slug_map)}</li></ul>")
            continue

        if re.match(r"^\d+\. ", line):
            m = re.match(r"^(\d+)\. (.*)", line)
            assert m
            out.append(
                f"<ol start='{m.group(1)}'><li>{inline_format(m.group(2), slug_map)}</li></ol>"
            )
            continue

        if line.strip() == "":
            continue

        out.append(f"<p>{inline_format(line, slug_map)}</p>")

    flush_table()
    out.append("<p style='margin-top:40px;color:#666;font-size:12px'>")
    out.append("<a href='#top'>↑ Back to top</a> · ")
    out.append("<a href='#table-of-contents'>↑ Table of contents</a>")
    out.append("</p>")
    out.append("</body></html>")
    return "\n".join(out)


def write_docx(html_path: Path, docx_path: Path) -> None:
    subprocess.run(
        ["textutil", "-convert", "docx", "-output", str(docx_path), str(html_path)],
        check=True,
    )


def export_file(md_path: Path, base_name: str, title: str, extra_toc: list | None = None) -> None:
    md = md_path.read_text(encoding="utf-8")
    html_path = DOCS / f"{base_name}.html"
    docx_path = DOCS / f"{base_name}.docx"
    html_path.write_text(markdown_to_html(md, title, extra_toc=extra_toc), encoding="utf-8")
    write_docx(html_path, docx_path)
    print(f"✓ {docx_path.name} ({docx_path.stat().st_size // 1024} KB)")


def rebuild_complete_pack() -> Path:
    parts = [
        ("Part 0 — Canonical Specification Governance", "part-0-canonical-spec", DOCS / "CANONICAL_SPEC.md"),
        ("Part 0b — Phase Sync Checklist", "part-0b-phase-sync", DOCS / "PHASE_SYNC_CHECKLIST.md"),
        ("Part 1 — Product Audit", "part-1-product-audit", DOCS / "VOLTPILOT_PRODUCT_AUDIT.md"),
        ("Part 2 — VoltPilot Handbook", "part-2-handbook", DOCS / "VOLTPILOT_HANDBOOK.md"),
        ("Part 3 — Production Launch Checklist", "part-3-launch-checklist", DOCS / "PRODUCTION_LAUNCH_CHECKLIST.md"),
        ("Part 4 — Phase A Validation Report", "part-4-phase-a", DOCS / "validation/phase-a/REPORT.md"),
        ("Part 5 — Sprint 2A Go/No-Go", "part-5-sprint-2a-gonogo", DOCS / "validation/sprint-2a/GO-NO-GO.md"),
        ("Part 6 — Sprint 2A Runbook", "part-6-sprint-2a-runbook", DOCS / "validation/sprint-2a/RUNBOOK.md"),
        ("Part 7 — Sprint 2A Report", "part-7-sprint-2a-report", DOCS / "validation/sprint-2a/REPORT.md"),
        ("Part 8 — Copilot Phase 1 README", "part-8-copilot-readme", ROOT / "lib/copilot/README.md"),
        ("Part 9 — Phase A QA Results", "part-9-phase-a-qa", DOCS / "validation/phase-a/qa-results.json"),
        ("Part 10 — Phase A Migration Verification", "part-10-phase-a-migrations", DOCS / "validation/phase-a/migration-verification.json"),
    ]

    master_toc = [(label, anchor) for label, anchor, _ in parts]

    lines = [
        "# VoltPilot — Complete Documentation Pack",
        "",
        "> All VoltPilot documentation in one file. Table of contents and links are clickable in Word / Google Docs.",
        "",
        "**Production site:** https://voltpilot-vert.vercel.app",
        "",
        "---",
        "",
    ]

    for label, anchor, source in parts:
        lines.append(f'<h1 id="{anchor}">{label}</h1>')
        lines.append("")
        if not source.exists():
            lines.append(f"*(Missing: {source})*")
            lines.append("")
            lines.append("---")
            lines.append("")
            continue
        text = source.read_text(encoding="utf-8")
        if source.suffix == ".json":
            lines.append("```json")
            lines.append(text.strip())
            lines.append("```")
        else:
            for line in text.splitlines():
                if line.startswith("# ") and not line.startswith("# VoltPilot"):
                    lines.append("#" + line)
                else:
                    lines.append(line)
        lines.append("")
        lines.append("---")
        lines.append("")

    out_md = DOCS / "VOLTPILOT_COMPLETE_DOCUMENTATION_PACK.md"
    out_md.write_text("\n".join(lines), encoding="utf-8")
    return out_md


def main() -> int:
    rebuild_complete_pack()
    pack_md = DOCS / "VOLTPILOT_COMPLETE_DOCUMENTATION_PACK.md"
    pack_toc = [
        ("Part 0 — Canonical Specification Governance", "part-0-canonical-spec"),
        ("Part 0b — Phase Sync Checklist", "part-0b-phase-sync"),
        ("Part 1 — Product Audit", "part-1-product-audit"),
        ("Part 2 — VoltPilot Handbook", "part-2-handbook"),
        ("Part 3 — Production Launch Checklist", "part-3-launch-checklist"),
        ("Part 4 — Phase A Validation Report", "part-4-phase-a"),
        ("Part 5 — Sprint 2A Go/No-Go", "part-5-sprint-2a-gonogo"),
        ("Part 6 — Sprint 2A Runbook", "part-6-sprint-2a-runbook"),
        ("Part 7 — Sprint 2A Report", "part-7-sprint-2a-report"),
        ("Part 8 — Copilot Phase 1 README", "part-8-copilot-readme"),
        ("Part 9 — Phase A QA Results", "part-9-phase-a-qa"),
        ("Part 10 — Phase A Migration Verification", "part-10-phase-a-migrations"),
    ]

    export_file(DOCS / "VOLTPILOT_HANDBOOK.md", "VOLTPILOT_HANDBOOK", "VoltPilot Handbook")
    export_file(
        pack_md,
        "VOLTPILOT_COMPLETE_DOCUMENTATION_PACK",
        "VoltPilot — Complete Documentation Pack",
        extra_toc=pack_toc,
    )
    export_file(
        DOCS / "VOLTPILOT_PRODUCT_AUDIT.md",
        "VOLTPILOT_PRODUCT_AUDIT",
        "VoltPilot Product Audit",
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
