#!/usr/bin/env python3
"""從長片腳本 L003 的附錄 B 產生「報價送出前檢核表」:網頁用的資料檔與 Excel 模板。

用法:python3 tools/build_checklist.py
"""
import json
import re
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "animation/series/long/L003-報價單上漏掉的那一行.md"
OUT = ROOT / "tools/quote-checklist"


def parse():
    text = SRC.read_text(encoding="utf-8")
    block = text.split("## 附錄 B", 1)[1].split("\n---", 1)[0]
    groups = []
    for line in block.splitlines():
        if not line.startswith("|") or "---" in line:
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if cells[0] == "項目":
            continue
        head = re.fullmatch(r"\*\*(.+?)\*\*", cells[0])
        if head:
            groups.append({"title": head.group(1), "items": []})
        elif groups:
            groups[-1]["items"].append({"text": cells[0], "hint": cells[2] if len(cells) > 2 else ""})
    return groups


def write_xlsx(groups):
    wb = Workbook()
    ws = wb.active
    ws.title = "報價送出前檢核表"
    thin = Side(style="thin", color="B8B2A6")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    ws.merge_cells("A1:D1")
    ws["A1"] = "報價送出前檢核表"
    ws["A1"].font = Font(size=18, bold=True)
    ws.merge_cells("A2:D2")
    ws["A2"] = ("每一列在「有沒有算」選「有/無/不適用」。選「無」的不可以空著:一定會發生的,補一行金額;"
                "甲方可以提供的,寫進報價假設;條件變了才會發生的,寫進不含項目或另做選項報價。")
    ws["A2"].alignment = Alignment(wrap_text=True, vertical="top")
    ws.row_dimensions[2].height = 48
    ws.append([])
    ws.append(["案名", "", "報價日期", ""])
    ws.append(["圖面版次", "", "現勘日期", ""])
    ws.append([])
    header = ["項目", "有沒有算", "提示", "我的備註"]
    ws.append(header)
    head_row = ws.max_row
    for col in range(1, 5):
        c = ws.cell(row=head_row, column=col)
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="0A1421")
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = border
    choice = DataValidation(type="list", formula1='"有,無,不適用"', allow_blank=True)
    ws.add_data_validation(choice)
    for g in groups:
        ws.append([g["title"]])
        r = ws.max_row
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=4)
        ws.cell(row=r, column=1).font = Font(bold=True)
        ws.cell(row=r, column=1).fill = PatternFill("solid", fgColor="E7E3D8")
        for it in g["items"]:
            ws.append([it["text"], "", it["hint"], ""])
            r = ws.max_row
            choice.add(ws.cell(row=r, column=2))
            for col in range(1, 5):
                c = ws.cell(row=r, column=col)
                c.alignment = Alignment(wrap_text=True, vertical="top", horizontal="center" if col == 2 else "left")
                c.border = border
    ws.append([])
    ws.append(["本表為通用提醒清單,不是完整的成本項目,也不代表任何行情。實際範圍與計價方式以合約約定為準。"])
    ws.merge_cells(start_row=ws.max_row, start_column=1, end_row=ws.max_row, end_column=4)
    for col, width in zip("ABCD", (52, 12, 44, 32)):
        ws.column_dimensions[col].width = width
    ws.freeze_panes = ws.cell(row=head_row + 1, column=1)
    ws.print_title_rows = f"{head_row}:{head_row}"
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    wb.save(OUT / "quote-checklist.xlsx")


def main():
    groups = parse()
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "checklist.js").write_text(
        "window.CHECKLIST = " + json.dumps(groups, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    write_xlsx(groups)
    print(len(groups), "groups,", sum(len(g["items"]) for g in groups), "items")


if __name__ == "__main__":
    main()
