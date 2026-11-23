#!/usr/bin/env python3
"""產生 tools/ 底下所有工具頁:檢核表(網頁+Excel)、Excel 範本、文字產生器,以及工具總覽頁。

用法:python3 tools/build_tools.py

內容都寫在這個檔案裡;改內容後重跑一次即可。報價檢核表的項目直接取自長片腳本 L003 的附錄 B。
所有工具都是通用提醒,不提供法規數值、測試數值或行情。
"""
import html
import json
import re
from pathlib import Path

from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parent.parent
TOOLS = ROOT / "tools"
TPL = TOOLS / "_templates"

INK, PAPER, BAND = "0A1421", "F4F2ED", "E7E3D8"
THIN = Side(style="thin", color="B8B2A6")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP = Alignment(wrap_text=True, vertical="top")
DISCLAIMER = "本表是通用的提醒清單,不是完整的項目,也不代表任何法規、規範或行情。實際要求以法規、業主規範、原廠說明與合約為準。"
LOCAL_NOTE = "填寫內容只存在你這台裝置的瀏覽器裡,不會上傳。"


# ---------------------------------------------------------------- 共用

def esc(s):
    return html.escape(s, quote=True)


def rule_box(title, items, ordered=True):
    tag = "ol" if ordered else "ul"
    lis = "".join(f"<li>{esc(i)}</li>" for i in items)
    return f'<div class="rule"><strong>{esc(title)}</strong><{tag}>{lis}</{tag}></div>'


def style_header(ws, row, ncol):
    for col in range(1, ncol + 1):
        c = ws.cell(row=row, column=col)
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor=INK)
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        c.border = BORDER


def title_rows(ws, title, note, ncol):
    last = get_column_letter(ncol)
    ws.merge_cells(f"A1:{last}1")
    ws["A1"] = title
    ws["A1"].font = Font(size=18, bold=True)
    ws.merge_cells(f"A2:{last}2")
    ws["A2"] = note
    ws["A2"].alignment = WRAP
    ws.row_dimensions[2].height = 48


def landscape(ws, head_row):
    ws.print_title_rows = f"{head_row}:{head_row}"
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True


def checklist_xlsx(path, title, how_to, groups, choices, meta_fields):
    wb = Workbook()
    ws = wb.active
    ws.title = title[:31]
    title_rows(ws, title, how_to, 4)
    ws.append([])
    for i in range(0, len(meta_fields), 2):
        pair = meta_fields[i:i + 2]
        ws.append([pair[0], "", pair[1] if len(pair) > 1 else "", ""])
    ws.append([])
    ws.append(["項目", "結果", "提示", "我的備註"])
    head = ws.max_row
    style_header(ws, head, 4)
    dv = DataValidation(type="list", formula1='"' + ",".join(choices) + '"', allow_blank=True)
    ws.add_data_validation(dv)
    for g in groups:
        ws.append([g["title"]])
        r = ws.max_row
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=4)
        ws.cell(row=r, column=1).font = Font(bold=True)
        ws.cell(row=r, column=1).fill = PatternFill("solid", fgColor=BAND)
        for it in g["items"]:
            ws.append([it["text"], "", it.get("hint", ""), ""])
            r = ws.max_row
            dv.add(ws.cell(row=r, column=2))
            for col in range(1, 5):
                c = ws.cell(row=r, column=col)
                c.alignment = Alignment(wrap_text=True, vertical="top", horizontal="center" if col == 2 else "left")
                c.border = BORDER
    ws.append([])
    ws.append([DISCLAIMER])
    ws.merge_cells(start_row=ws.max_row, start_column=1, end_row=ws.max_row, end_column=4)
    ws.cell(row=ws.max_row, column=1).alignment = WRAP
    ws.row_dimensions[ws.max_row].height = 32
    for col, width in zip("ABCD", (52, 12, 44, 32)):
        ws.column_dimensions[col].width = width
    ws.freeze_panes = ws.cell(row=head + 1, column=1)
    landscape(ws, head)
    wb.save(path)


def write_checklist_tool(t):
    out = TOOLS / t["slug"]
    out.mkdir(parents=True, exist_ok=True)
    page = (TPL / "checklist.html").read_text(encoding="utf-8")
    plan = t.get("plan", {"": "還沒決定怎麼處理", "fix": "今天開工前補上", "stop": "暫停這項作業,先處理", "report": "已回報負責人處理"})
    values = {
        "TITLE": esc(t["title"]),
        "DESC": esc(t["desc"]),
        "LEAD": esc(t["lead"]),
        "RULE": rule_box(t["rule_title"], t["rules"]),
        "XLSX": f'{t["slug"]}.xlsx',
        "XLSX_NAME": esc(t["title"]) + ".xlsx",
        "FOOTER": esc(DISCLAIMER + LOCAL_NOTE),
        "KEY": t["slug"] + "-v1",
        "PLAN": json.dumps(plan, ensure_ascii=False),
        "PLAN_Q": t.get("plan_q", "這一項怎麼處理:"),
        "PLAN_SHORT": t.get("plan_short", "怎麼處理"),
        "DONE_MSG": t.get("done_msg", "每一項都有著落了。"),
    }
    for k, v in values.items():
        page = page.replace("{{" + k + "}}", v)
    assert "{{" not in page, t["slug"]
    (out / "index.html").write_text(page, encoding="utf-8")
    (out / "checklist.js").write_text("window.CHECKLIST = " + json.dumps(t["groups"], ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    checklist_xlsx(out / f'{t["slug"]}.xlsx', t["title"], t["xlsx_how"], t["groups"], ["有", "無", "不適用"], t["meta"])
    return sum(len(g["items"]) for g in t["groups"])


def write_message_tool(t):
    out = TOOLS / t["slug"]
    out.mkdir(parents=True, exist_ok=True)
    page = (TPL / "message.html").read_text(encoding="utf-8")
    by_id = {f["id"]: f for g in t["groups"] for f in g["fields"]}
    config = {"key": t["slug"] + "-v1", "groups": t["groups"], "output": t["output"], "byId": by_id}
    tips = "<div class=\"tips\"><h2>小提醒</h2><ul>" + "".join(f"<li>{esc(x)}</li>" for x in t["tips"]) + "</ul></div>"
    values = {
        "TITLE": esc(t["title"]), "DESC": esc(t["desc"]), "LEAD": esc(t["lead"]),
        "RULE": rule_box(t["rule_title"], t["rules"]), "TIPS": tips,
        "FOOTER": esc(t["footer"] + LOCAL_NOTE),
        "CONFIG": json.dumps(config, ensure_ascii=False).replace("</", "<\\/"),
    }
    for k, v in values.items():
        page = page.replace("{{" + k + "}}", v)
    assert "{{" not in page, t["slug"]
    (out / "index.html").write_text(page, encoding="utf-8")


def g(title, *items):
    """一組檢核項目。項目可以是字串,或 (項目, 提示) 的 tuple。"""
    return {"title": title, "items": [
        {"text": x[0], "hint": x[1]} if isinstance(x, tuple) else {"text": x, "hint": ""} for x in items]}


# ---------------------------------------------------------------- 檢核表內容

def quote_groups():
    text = (ROOT / "animation/series/long/L003-報價單上漏掉的那一行.md").read_text(encoding="utf-8")
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


CHECKLISTS = [
    {
        "slug": "quote-checklist",
        "title": "報價送出前檢核表",
        "desc": "工程報價送出前的漏項檢核表:材料、工資、機具、間接費用、稅與文字,逐項確認有沒有算。",
        "lead": "報價漏掉一行,不是少一行字,是少一筆錢。送出之前,花五分鐘把每一項問過一次。",
        "rule_title": "選「無」的項目不可以空著,先分三種:",
        "rules": ["一定會發生的:補一行金額。", "甲方可以提供的:寫進報價假設。", "條件變了才會發生的:寫進不含項目,或另做選項報價。"],
        "plan": {"": "還沒決定怎麼處理", "add": "補一行金額", "assume": "寫進報價假設(甲方提供)", "exclude": "列入不含項目或選項報價"},
        "done_msg": "每一項都有著落了,可以請另一個人再看一次。",
        "xlsx_how": "每一列在「結果」選「有/無/不適用」。選「無」的不可以空著:一定會發生的,補一行金額;甲方可以提供的,寫進報價假設;條件變了才會發生的,寫進不含項目或另做選項報價。",
        "meta": ["案名", "報價日期", "圖面版次", "現勘日期"],
        "groups": quote_groups(),
        "episode": "第 1 集〈報價單上漏掉的那一行〉",
        "category": "計價與報價",
    },
    {
        "slug": "completion-check",
        "title": "完工自主檢查表",
        "desc": "配管完工、送測與交接前的自主檢查清單:圖面、材料與接合、支撐、測試、清潔、標示、現場與文件。",
        "lead": "測試不是做給業主看的,是做給你自己睡得著的。交出去之前,自己先把每一項看過一次。",
        "rule_title": "這張表的用法:",
        "rules": ["送測或交接之前,由施工負責人自己先檢查一次。", "選「無」的,寫下怎麼處理、什麼時候完成,不要藏。", "測試的壓力、介質、時間與合格標準,一律依業主規範,本表不提供數值。"],
        "plan": {"": "還沒決定怎麼處理", "fix": "交接前補完", "list": "列入缺失清單,寫明完成日", "ask": "需要業主或監造確認"},
        "done_msg": "每一項都有著落了,可以安排測試或交接。",
        "xlsx_how": "送測或交接前逐項確認,在「結果」選「有/無/不適用」。選「無」的,在備註寫下處理方式與預定完成日。",
        "meta": ["工程名稱", "檢查日期", "系統/區段", "檢查人"],
        "groups": [
            g("一、圖面與範圍", ("施工範圍已與最新版圖面核對", "記下圖號與版次"), ("施工中的變更已標在圖上(紅線圖)", "竣工圖要用"), "管線起訖點與接點位置和圖面一致"),
            g("二、材料與接合", ("管材、管件、閥件規格與核准資料一致", "材質、等級、尺寸"), ("接合方式符合業主規範", "焊接或機械接頭"), ("機械接頭依原廠安裝說明鎖固並做記號", "依你手上那個牌子的說明"), ("焊道外觀檢查完成,紀錄齊全", "依業主規範")),
            g("三、支撐與外觀", ("支撐、吊架的間距與固定方式符合規範", "轉彎、閥件前後另補"), "管線沒有被硬拉對位,也沒有被當成支撐使用", "外觀無凹痕、刮傷、變形", ("坡度與排水點符合設計", "設計有要求時")),
            g("四、測試", "加壓之前已全數自主檢查,不是漏了再找", ("測試範圍已隔離,臨時盲板或盲蓋有登記", "測完要逐一拆回"), ("測試壓力、介質、持壓時間依業主規範", "本表不提供數值"), ("測試紀錄寫明開始與結束的時間、壓力與溫度", "溫度變化會影響讀數"), "測試結果經監造或業主簽認", "測試用的臨時設施已拆除並復原"),
            g("五、清潔與吹淨", ("管內清潔或吹淨依規範完成並記錄", "依業主規範"), "未接的開口端已封蓋"),
            g("六、標示", ("管線名稱、介質、流向標示完成", "依業主標示規範"), "閥件標籤與編號完成"),
            g("七、現場", "施工區域清潔,廢料已清運", "借用的設施、工具、鑰匙已歸還", ("動過的閥件已復歸原狀,掛牌已收回", "誰關的誰開")),
            g("八、文件", "自主檢查表、測試紀錄、材料證明已整理", "竣工圖已更新", ("未完成事項已列清單並寫明預定完成日", "不要藏")),
        ],
        "episode": "第 2 集〈他只是想省一個晚上〉",
        "category": "品質與施工",
    },
    {
        "slug": "daily-safety",
        "title": "每日開工安全確認表",
        "desc": "每天開工前的安全確認清單:開工前會議、防護具、高處作業、動火、電氣、吊掛、侷限空間、管線作業與收工。",
        "lead": "扣上只要五秒,不扣賭的是一輩子。開工前花五分鐘,把今天會遇到的危險先講過一次。",
        "rule_title": "這張表的用法:",
        "rules": ["每天開工前由現場負責人帶著大家確認,不適用的項目選「不適用」。", "任何一項選「無」,先處理好再開工;處理不了,那項作業今天先停。", "各項的具體要求依法規、業主廠規與作業許可,本表不提供數值。"],
        "plan": {"": "還沒決定怎麼處理", "fix": "開工前補上", "stop": "這項作業今天先停", "report": "已回報負責人處理"},
        "plan_short": "怎麼處理",
        "done_msg": "每一項都確認過了,可以開工。收工前記得再看最後一段。",
        "xlsx_how": "每天開工前逐項確認,在「結果」選「有/無/不適用」。選「無」的先處理好再開工;處理不了,那項作業今天先停。",
        "meta": ["日期", "工程名稱", "現場負責人", "今天的作業內容"],
        "groups": [
            g("一、開工前會議", "工具箱會議已開,今天的工作內容與危害都說明過", "每個人都知道今天誰負責、出事找誰、緊急集合點在哪裡", "新進或支援人員已完成入廠與危害告知", "人員精神狀況可以作業(睡眠不足、身體不適要提出)"),
            g("二、個人防護具", ("安全帽、安全鞋、護目鏡、手套依作業需要配戴", "依作業危害"), ("高處作業人員的全身式安全帶已外觀檢查", "織帶、扣環、掛鉤")),
            g("三、高處作業", ("施工架或工作平台的護欄、踏板、爬梯完整", "依法規與廠規"), ("有確實可以掛的錨點,上去之前先扣上", "掛點在上方"), "開口有護欄或覆蓋並標示", "下方作業區已設置警示與管制", ("高空工作車操作人員具資格,車輛已點檢", "依法規與廠規")),
            g("四、動火作業", ("動火許可已核准", "依廠規"), "火源周邊的可燃物已移除或防護", "監火人員到位,滅火器材就近"),
            g("五、電氣", "臨時用電有漏電保護,線路無破損、不泡水", ("需要停電作業的設備已上鎖掛牌並驗電", "依上鎖掛牌程序")),
            g("六、吊掛", "吊具、吊索已點檢", "吊掛範圍下方淨空,有指揮人員"),
            g("七、侷限空間", ("今天有沒有進入侷限空間的作業", "有的話另用侷限空間作業前確認表")),
            g("八、管線、化學品與氣體", ("要動的管線已隔離、洩壓並確認", "不靠鬆接頭洩壓"), "作業區可能接觸的化學品或氣體已告知,有對應的防護"),
            g("九、環境", "天候(雨、強風、高溫)是否影響今天的作業已評估", "動線通暢,材料堆放穩固,不擋逃生路線"),
            g("十、收工", "現場已清理,開口已復原,電源已關閉", ("動過的閥與設備已復原或掛牌交接", "誰關的誰開")),
        ],
        "episode": "第 5 集〈只差一個扣環〉",
        "category": "工安",
    },
    {
        "slug": "valve-restore",
        "title": "閥位復歸確認表",
        "desc": "操作閥件前、操作中與復歸後的確認清單,附閥件操作紀錄 Excel。誰關的誰開,關了要掛牌,做完要復原。",
        "lead": "誰關的誰開。關了要掛牌,做完要復原。這張表讓每一顆動過的閥都有紀錄,不靠記憶。",
        "rule_title": "這張表的用法:",
        "rules": ["操作閥件之前先填「操作前」;每關一顆,就在 Excel 的操作紀錄記一筆。", "復歸時照紀錄逐顆核對,不靠記憶。", "隔離、上鎖掛牌與復歸順序依廠規與作業許可辦理。"],
        "plan": {"": "還沒決定怎麼處理", "fix": "現在補上", "report": "已回報使用單位", "handover": "已交接給下一班"},
        "done_msg": "每一項都確認過了。記得把掛牌數量和紀錄再對一次。",
        "xlsx_how": "第一頁是確認清單,第二頁是閥件操作紀錄。每關一顆閥就記一筆,復歸時照紀錄逐顆核對。",
        "meta": ["日期", "系統/區域", "作業內容", "負責人"],
        "groups": [
            g("一、操作前", ("已取得作業許可或業主同意", "依廠規"), ("已確認要操作哪些閥,以及會影響哪些下游設備", "跟使用單位確認"), ("每一顆閥的原始狀態都已記錄", "拍照最清楚"), "受影響的單位已收到通知,知道時間與影響"),
            g("二、操作中", ("每一顆關閉的閥都掛上牌,寫明姓名、時間、原因", "牌子編號記在紀錄上"), ("需要上鎖的依上鎖掛牌程序辦理", "依廠規"), "隔離後已確認洩壓、沒有殘壓"),
            g("三、復歸", ("照紀錄逐顆復歸到原始狀態,不靠記憶", "一顆一顆打勾"), ("復歸的順序依系統與廠規要求", "先問清楚"), "復歸後確認系統壓力、流量或運轉正常", ("掛牌全部收回,數量和紀錄對得上", "少一張就要找"), "已通知受影響的單位已經復歸", "交接紀錄已簽名"),
        ],
        "extra_sheet": "valve_log",
        "episode": "第 9 集〈那顆沒開回來的閥〉",
        "category": "工安",
    },
    {
        "slug": "confined-space",
        "title": "侷限空間作業前確認表",
        "desc": "進入侷限空間前的確認清單:許可與計畫、隔離、通風與測定、人員與裝備、緊急應變、結束。",
        "lead": "看到有人倒在裡面,第一件事不是衝進去。進去之前,先把每一項確認過。",
        "rule_title": "最重要的一條:",
        "rules": ["發現有人倒在侷限空間裡,不可以在沒有防護的情況下進去搶救。先通報、送風,由受過訓練並配戴適當呼吸防護的人救援。", "任何一項選「無」,就不進去。", "測定的項目、合格範圍、許可與訓練要求依法規與廠規,本表不提供數值。"],
        "plan": {"": "還沒決定怎麼處理", "fix": "進入前補上", "stop": "今天不進去", "report": "已回報負責人處理"},
        "done_msg": "每一項都確認過了。作業中也要持續確認,監視人員不可以離開。",
        "xlsx_how": "進入侷限空間前逐項確認,在「結果」選「有/無/不適用」。任何一項選「無」就不進去。",
        "meta": ["日期", "空間名稱與位置", "作業內容", "許可編號"],
        "groups": [
            g("一、許可與計畫", ("已確認這個空間屬於侷限空間,並取得進入許可", "依法規與廠規"), "作業計畫、進入人員名單、緊急應變計畫已確認", ("進入者與監視人員都受過相關訓練", "依法規與廠規")),
            g("二、隔離", ("連通的管線已隔離", "盲板或關閥上鎖"), ("相關設備已斷電並上鎖掛牌", "依上鎖掛牌程序"), "可能流入的物料或氣體已排除"),
            g("三、通風與測定", "進入前已通風", ("進入前已測定氧氣、可燃性氣體與可能的有害氣體,結果在許可範圍內", "依法規與廠規,本表不提供數值"), ("作業中持續或定時測定", "依作業計畫"), "測定儀器已校正並在有效期限內"),
            g("四、人員與裝備", ("洞口有專責監視人員,全程不離開", "不可以兼做別的事"), "進入者與監視人員有可靠的聯絡方式", ("救援裝備已就位", "依評估,例如救援架、救生索、適當的呼吸防護具"), "個人防護具依作業危害配戴"),
            g("五、緊急應變", ("每個人都知道:發現有人倒下,不可以沒有防護就進去搶救", "先通報、送風,由受過訓練並有防護的人救援"), "緊急聯絡方式與通報流程已貼在洞口"),
            g("六、結束", "人員已全部撤出並清點", "解除隔離前已確認空間內沒有人"),
        ],
        "episode": "第 10 集〈第二個倒下的人〉",
        "category": "工安",
    },
    {
        "slug": "loto-check",
        "title": "上鎖掛牌確認表",
        "desc": "設備維修前的上鎖掛牌確認清單:找出所有能源、停機隔離、每人上鎖、試啟動驗證、作業中與解除。",
        "lead": "上了鎖,還要證明它真的不會動。動手之前,每一項都確認過一次。",
        "rule_title": "這張表的用法:",
        "rules": ["任何一項選「無」,就不動手。", "試啟動之前,所有人都要離開設備。", "上鎖掛牌的程序、鎖具與授權人員依廠規辦理,本表只是提醒。"],
        "plan": {"": "還沒決定怎麼處理", "fix": "動手前補上", "stop": "今天先不動手", "report": "已回報負責人處理"},
        "done_msg": "每一項都確認過了。解除上鎖之前,記得再看最後一段。",
        "xlsx_how": "維修前逐項確認,在「結果」選「有/無/不適用」。任何一項選「無」就不動手。",
        "meta": ["日期", "設備名稱與編號", "作業內容", "上鎖人"],
        "groups": [
            g("一、準備", ("已取得作業許可,並通知使用單位停機時間", "依廠規"), ("已找出這台設備的所有能源", "電、氣、液、蒸汽、壓力、彈簧、重力、高溫"), ("已對照設備編號,確認要隔離的開關與閥件屬於這一台", "標示可能貼錯")),
            g("二、停機與隔離", "設備已用正常程序停機", ("所有能源都已隔離:開關切斷、閥件關閉", "依廠規"), ("殘留的能量已釋放或固定:洩壓、排放、放電、固定會動的部分", "不靠鬆接頭洩壓")),
            g("三、上鎖掛牌", ("每一個隔離點都上鎖、掛牌", "牌上寫姓名、日期、原因"), ("每一位作業人員都掛上自己的鎖", "多人作業用多孔鎖扣"), "鑰匙由上鎖的人自己保管"),
            g("四、驗證", ("試啟動之前,所有人都已離開設備", "確認沒有人靠近"), ("按啟動鈕或用正常操作方式試啟動,確認設備不會動", "會動就是鎖錯了"), ("電氣部分已由合格人員量測,確認沒有電", "依廠規"), ("試完之後,把啟動開關切回停止或關閉", "避免復電時直接啟動")),
            g("五、作業中", ("換班或休息時,鎖不拆,交接清楚", "依廠規"), "作業中發現標示錯誤或新的能源,先停下來回報"),
            g("六、解除", "工具、材料已清出,防護蓋已裝回", "所有人員已離開設備,並清點過", ("由上鎖的人自己拆自己的鎖", "不可以由別人代拆"), "已通知使用單位恢復運轉", ("發現的標示錯誤已回報改正", "當天就改")),
        ],
        "episode": "第 14 集〈按一下啟動鈕〉",
        "category": "工安",
    },
]


# ---------------------------------------------------------------- 文字產生器內容

MESSAGES = [
    {
        "slug": "bad-news-report",
        "title": "進度落後回報範本",
        "desc": "向主管或業主回報壞消息的四段式範本:發生什麼、影響多大、有哪些做法、需要您決定什麼。填完自動產生可以直接傳送的文字。",
        "lead": "壞消息要自己先報,而且要帶著選項去。填好四段,下面就是可以直接傳的訊息。",
        "rule_title": "四段式回報:",
        "rules": ["發生什麼:只講事實,不先講理由。", "影響多大:工期、成本、品質,哪一項受影響、影響多少。", "有哪些做法:至少兩個選項,各自的代價。", "需要您決定什麼:請對方做的決定,以及最晚什麼時候要決定。"],
        "groups": [
            {"title": "基本資料", "fields": [
                {"id": "to", "label": "給誰", "placeholder": "例:王經理", "required": True},
                {"id": "project", "label": "工程或案件名稱", "placeholder": "例:二樓空壓配管工程"},
                {"id": "from", "label": "你的名字", "placeholder": "例:阿樹"},
            ]},
            {"title": "一、發生什麼", "fields": [
                {"id": "fact", "label": "事實", "hint": "時間、地點、什麼東西出了什麼狀況。先不講理由。", "placeholder": "例:不鏽鋼管件供應商通知,原訂週三到貨的管件延到下週一。", "multiline": True, "required": True},
                {"id": "cause", "label": "原因(一句話就好)", "placeholder": "例:原廠出貨延誤。"},
            ]},
            {"title": "二、影響多大", "fields": [
                {"id": "impact_time", "label": "工期影響", "placeholder": "例:配管完成日從 12/10 延到 12/13,晚三天。", "required": True},
                {"id": "impact_cost", "label": "成本影響", "placeholder": "例:如果要趕回來,需要兩個晚上的加班。"},
                {"id": "impact_other", "label": "其他影響", "placeholder": "例:後續的保壓測試要順延。"},
            ]},
            {"title": "三、有哪些做法", "fields": [
                {"id": "opt_a", "label": "做法一與代價", "placeholder": "例:接受晚三天,不增加費用。", "multiline": True, "required": True},
                {"id": "opt_b", "label": "做法二與代價", "placeholder": "例:週末加班趕回兩天,加班費另計,需要您同意。", "multiline": True, "required": True},
                {"id": "opt_c", "label": "做法三與代價(選填)", "multiline": True},
                {"id": "recommend", "label": "我建議", "placeholder": "例:建議做法二,理由是後面的停機窗口不能動。"},
            ]},
            {"title": "四、需要您決定什麼", "fields": [
                {"id": "decision", "label": "請對方決定的事", "placeholder": "例:是否同意週末加班。", "required": True},
                {"id": "deadline", "label": "最晚什麼時候要決定", "placeholder": "例:明天(週四)中午前。", "required": True},
            ]},
        ],
        "output": [
            {"heading": "", "fields": ["to", "project"], "optional": True},
            {"heading": "【發生什麼】", "fields": ["fact", "cause"]},
            {"heading": "【影響】", "fields": ["impact_time", "impact_cost", "impact_other"]},
            {"heading": "【可以怎麼做】", "fields": ["opt_a", "opt_b", "opt_c", "recommend"]},
            {"heading": "【需要您決定】", "fields": ["decision", "deadline"]},
            {"heading": "", "fields": ["from"], "optional": True},
        ],
        "suffix": {"to": "您好:", "project": ",有一件事需要先跟您報告。"},
        "prefix": {"project": "關於", "cause": "原因:", "impact_time": "工期:", "impact_cost": "成本:", "impact_other": "其他:", "opt_a": "做法一:", "opt_b": "做法二:", "opt_c": "做法三:", "recommend": "我的建議:", "deadline": "請在這個時間前回覆:"},
        "tips": ["發現當天就報,不要等到被問。", "先講事實,理由放在後面一句話帶過。", "沒有選項的壞消息,等於把問題丟給對方。", "口頭講完,再用這段文字留一份書面。"],
        "footer": "本範本為通用溝通格式。涉及合約、費用或工期變更的事項,以雙方正式文件與合約約定為準。",
        "episode": "第 6 集〈壞消息怎麼報〉",
        "category": "溝通與管理",
    },
    {
        "slug": "delegation-card",
        "title": "交辦事項五要素",
        "desc": "交辦工作給部屬時的五要素:目的、標準、期限、資源、回報。填完自動產生可以直接傳給對方的交辦內容。",
        "lead": "交辦不清楚,做錯的責任在交辦的人。把你腦袋裡要的東西寫出來,對方才看得到。",
        "rule_title": "交辦五要素:",
        "rules": ["目的:為什麼要做,做完拿去做什麼。", "標準:做到什麼程度算完成,最好附一個範例。", "期限:什麼時候要,中間什麼時候先看一次。", "資源:可以用的資料、人、預算,遇到問題找誰。", "回報:什麼時候、用什麼方式回報進度。"],
        "groups": [
            {"title": "基本資料", "fields": [
                {"id": "to", "label": "交辦給誰", "placeholder": "例:工程師 C", "required": True},
                {"id": "task", "label": "要做的事(一句話)", "placeholder": "例:整理過去一年的包商單價資料。", "required": True},
            ]},
            {"title": "五要素", "fields": [
                {"id": "purpose", "label": "目的", "hint": "為什麼要做,做完拿去做什麼。", "placeholder": "例:下個月開始報價要用,讓大家報價時有依據。", "multiline": True, "required": True},
                {"id": "standard", "label": "標準", "hint": "做到什麼程度算完成。有範例就附上。", "placeholder": "例:Excel 一張表,欄位:項目、單位、單價、廠商、日期、來源;至少涵蓋配管、支撐、測試三類。", "multiline": True, "required": True},
                {"id": "deadline", "label": "期限", "placeholder": "例:下週五下班前交。", "required": True},
                {"id": "checkpoint", "label": "中間檢查點", "placeholder": "例:週三中午先給我看前十筆,確認格式對不對。"},
                {"id": "resource", "label": "資源", "hint": "可以用的資料、人、預算;卡住找誰。", "placeholder": "例:共用資料夾裡的歷年報價單;有疑問先問陳師傅。", "multiline": True},
                {"id": "report", "label": "回報方式", "placeholder": "例:每天下班前在群組回報進度一句話。", "required": True},
            ]},
        ],
        "output": [
            {"heading": "", "fields": ["to"], "optional": True},
            {"heading": "【要做的事】", "fields": ["task"]},
            {"heading": "【目的】", "fields": ["purpose"]},
            {"heading": "【完成標準】", "fields": ["standard"]},
            {"heading": "【期限】", "fields": ["deadline", "checkpoint"]},
            {"heading": "【可以用的資源】", "fields": ["resource"], "optional": True},
            {"heading": "【回報方式】", "fields": ["report"]},
            {"text": "看完有任何不清楚的,現在就問我。"},
        ],
        "prefix": {"checkpoint": "中間檢查:"},
        "suffix": {"to": ":"},
        "tips": ["交辦完請對方用自己的話講一次,你就知道他懂了多少。", "新人的檢查點要密一點,熟手可以鬆一點。", "交辦內容留一份文字,事後兩個人都不用靠記憶。"],
        "footer": "本範本為通用管理格式,可依團隊習慣調整。",
        "episode": "第 7 集〈這個你處理一下〉",
        "category": "溝通與管理",
    },
    {
        "slug": "near-miss-report",
        "title": "虛驚事件回報範本",
        "desc": "差一點出事的回報範本:時間地點、發生什麼、差點造成什麼、當下處理、建議改善。只寫事,不寫誰的錯。",
        "lead": "差一點的事,講出來,才不會變成真的。填好下面幾段,就是可以直接傳給工安或主管的回報。",
        "rule_title": "寫虛驚回報的原則:",
        "rules": ["只寫事實,不寫誰的錯。目的是找原因,不是找人。", "寫清楚差點造成什麼後果,大家才知道有多危險。", "建議改善要寫具體做法,不要只寫「加強注意」。", "當天寫,當天傳。"],
        "groups": [
            {"title": "基本資料", "fields": [
                {"id": "to", "label": "回報給誰", "placeholder": "例:工安課、工地主任", "required": True},
                {"id": "when", "label": "時間", "placeholder": "例:11/23(一)上午 10:20", "required": True},
                {"id": "where", "label": "地點", "placeholder": "例:B 棟三樓東側樓板邊緣的正下方", "required": True},
            ]},
            {"title": "經過", "fields": [
                {"id": "what", "label": "發生什麼", "hint": "照順序寫,只寫看到的事實。", "placeholder": "例:一根鋼管從三樓樓板邊緣掉落,落在二樓走道上。當時有人經過,沒有人受傷。", "multiline": True, "required": True},
                {"id": "could", "label": "差點造成什麼", "placeholder": "例:如果落在人身上,可能造成頭部或肩部重傷。", "multiline": True, "required": True},
                {"id": "action", "label": "當下怎麼處理", "placeholder": "例:下方走道先拉警戒,三樓邊緣的材料先移到內側。", "multiline": True},
            ]},
            {"title": "原因與改善", "fields": [
                {"id": "cause", "label": "可能的原因", "placeholder": "例:樓板邊緣沒有擋板,材料堆放太靠邊。", "multiline": True},
                {"id": "fix", "label": "建議怎麼改", "hint": "寫具體做法,不要只寫「加強注意」。", "placeholder": "例:樓板邊緣加裝擋板;材料堆放區畫線,和邊緣保持距離。", "multiline": True, "required": True},
                {"id": "from", "label": "回報人(可以不填)", "placeholder": "可以匿名"},
            ]},
        ],
        "output": [
            {"heading": "", "fields": ["to"], "optional": True},
            {"text": "回報一件虛驚事件(沒有人受傷),請協助追蹤改善。"},
            {"heading": "【時間地點】", "fields": ["when", "where"]},
            {"heading": "【發生什麼】", "fields": ["what"]},
            {"heading": "【差點造成什麼】", "fields": ["could"]},
            {"heading": "【當下處理】", "fields": ["action"], "optional": True},
            {"heading": "【可能原因】", "fields": ["cause"], "optional": True},
            {"heading": "【建議改善】", "fields": ["fix"]},
            {"heading": "", "fields": ["from"], "optional": True},
        ],
        "suffix": {"to": "您好:"},
        "prefix": {"when": "時間:", "where": "地點:", "from": "回報人:"},
        "tips": ["虛驚不是沒事,是還沒出事。", "回報的目的是改善,不是找人負責。", "同樣的虛驚出現第二次,代表上一次的改善沒有做到。"],
        "footer": "本範本為通用格式。正式的事故與虛驚通報程序,依公司與業主的規定辦理。",
        "episode": "第 12 集〈差一點,要不要講〉",
        "category": "工安",
    },
    {
        "slug": "test-deviation-report",
        "title": "測試異常說明範本",
        "desc": "測試結果不合格時,向業主或監造說明的範本:測了什麼、結果、可能原因、已做的處理、複測計畫。",
        "lead": "數字可以重測,不可以改。照實寫下第一次的結果,再寫你怎麼處理,業主反而比較放心。",
        "rule_title": "寫測試異常說明的原則:",
        "rules": ["第一次的結果照實寫,不改數字,不省略。", "原因還沒確定,就寫「可能原因」和「怎麼確認」。", "寫清楚複測的時間,以及需要業主或監造確認的事。"],
        "groups": [
            {"title": "基本資料", "fields": [
                {"id": "to", "label": "給誰", "placeholder": "例:李工程師(監造)", "required": True},
                {"id": "item", "label": "測試項目與範圍", "placeholder": "例:二樓空壓管路 A 區段保壓測試", "required": True},
                {"id": "basis", "label": "依據的規範", "placeholder": "例:業主施工規範第 X 章", "required": True},
            ]},
            {"title": "結果", "fields": [
                {"id": "result", "label": "結果與標準", "hint": "照實寫數值、標準與測試條件。", "placeholder": "例:實測值 ___,標準為 ___,未達標準。測試時間 ___ 至 ___,溫度 ___。", "multiline": True, "required": True},
                {"id": "cause", "label": "可能原因與確認方式", "placeholder": "例:初步檢查發現一處接頭沒有鎖到位,正在逐一確認其他接頭。", "multiline": True, "required": True},
            ]},
            {"title": "處理與複測", "fields": [
                {"id": "done", "label": "已經做的處理", "placeholder": "例:該接頭已依原廠說明重新處理。", "multiline": True},
                {"id": "retest", "label": "複測計畫", "placeholder": "例:明天上午 9:00 複測,請監造到場見證。", "multiline": True, "required": True},
                {"id": "need", "label": "需要對方確認的事", "placeholder": "例:複測時間是否可以;驗收是否順延半天。"},
                {"id": "from", "label": "你的名字", "placeholder": "例:阿樹"},
            ]},
        ],
        "output": [
            {"heading": "", "fields": ["to"], "optional": True},
            {"heading": "【測試項目】", "fields": ["item", "basis"]},
            {"heading": "【結果】", "fields": ["result"]},
            {"heading": "【可能原因】", "fields": ["cause"]},
            {"heading": "【已做處理】", "fields": ["done"], "optional": True},
            {"heading": "【複測計畫】", "fields": ["retest"]},
            {"heading": "【需要您確認】", "fields": ["need"], "optional": True},
            {"heading": "", "fields": ["from"], "optional": True},
        ],
        "suffix": {"to": "您好:"},
        "prefix": {"basis": "依據:"},
        "tips": ["不合格不可怕,隱瞞才可怕。", "複測紀錄和第一次的紀錄一起保存,不要覆蓋。", "測試條件(時間、溫度、儀器)一起寫,數字才有意義。"],
        "footer": "本範本為通用溝通格式。測試方法、標準與判定,依業主規範與合約辦理。",
        "episode": "第 13 集〈差一點點的數字〉",
        "category": "品質與施工",
    },
]


def expand_message(t):
    """把欄位的前綴與後綴寫進欄位設定,範本產生文字時會加上。"""
    for key in ("prefix", "suffix"):
        table = t.get(key, {})
        for gr in t["groups"]:
            for f in gr["fields"]:
                if f["id"] in table:
                    f[key] = table[f["id"]]
    return t


# ---------------------------------------------------------------- Excel 範本

def valve_log_sheet(wb):
    ws = wb.create_sheet("閥件操作紀錄")
    cols = ["序號", "閥件編號", "位置", "原始狀態", "操作原因", "操作人", "操作時間", "掛牌編號", "是否上鎖", "復歸後狀態", "復歸人", "復歸時間", "確認人", "備註"]
    title_rows(ws, "閥件操作紀錄", "每關一顆閥就記一筆。復歸時照這張表逐顆核對;「原始狀態」與「復歸後狀態」不一致的列會變紅。", len(cols))
    ws.append([])
    ws.append(cols)
    head = ws.max_row
    style_header(ws, head, len(cols))
    state = DataValidation(type="list", formula1='"開,關,節流"', allow_blank=True)
    yn = DataValidation(type="list", formula1='"是,否"', allow_blank=True)
    ws.add_data_validation(state)
    ws.add_data_validation(yn)
    for i in range(1, 31):
        r = head + i
        ws.cell(row=r, column=1, value=i)
        for col in range(1, len(cols) + 1):
            ws.cell(row=r, column=col).border = BORDER
            ws.cell(row=r, column=col).alignment = WRAP
        state.add(ws.cell(row=r, column=4))
        state.add(ws.cell(row=r, column=10))
        yn.add(ws.cell(row=r, column=9))
    red = PatternFill("solid", fgColor="F6C9C0")
    rng = f"J{head + 1}:J{head + 30}"
    ws.conditional_formatting.add(rng, CellIsRule(operator="notEqual", formula=[f"$D{head + 1}"], fill=red))
    widths = [6, 12, 16, 10, 22, 10, 14, 10, 9, 11, 10, 14, 10, 20]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = ws.cell(row=head + 1, column=1)
    landscape(ws, head)


def weekly_report_xlsx(path):
    wb = Workbook()
    # 組員週報
    ws = wb.active
    ws.title = "組員週報"
    cols = ["姓名", "本週完成(可交付成果)", "下週計畫", "卡住的事", "需要課長協助", "案件工時", "內部改善工時", "教育訓練工時", "備註"]
    title_rows(ws, "組員週報", "每週五下班前每人填一列。寫「交出了什麼」,不要寫「忙了什麼」。工時欄填小時數。", len(cols))
    ws.append(["週次", "", "填表日期", ""])
    ws.append([])
    ws.append(cols)
    head = ws.max_row
    style_header(ws, head, len(cols))
    for name in ["工程師 A", "工程師 B", "工程師 C", "工程師 D", "工程師 E", "工程師 F", "工程師 G"]:
        ws.append([name] + [""] * (len(cols) - 1))
        r = ws.max_row
        ws.row_dimensions[r].height = 60
        for col in range(1, len(cols) + 1):
            ws.cell(row=r, column=col).border = BORDER
            ws.cell(row=r, column=col).alignment = WRAP
    ws.append(["合計", "", "", "", "", f"=SUM(F{head + 1}:F{head + 7})", f"=SUM(G{head + 1}:G{head + 7})", f"=SUM(H{head + 1}:H{head + 7})", ""])
    r = ws.max_row
    for col in range(1, len(cols) + 1):
        ws.cell(row=r, column=col).font = Font(bold=True)
        ws.cell(row=r, column=col).border = BORDER
    for i, w in enumerate([12, 34, 30, 26, 24, 10, 12, 12, 18], 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = ws.cell(row=head + 1, column=2)
    landscape(ws, head)

    # 課長彙整
    ws2 = wb.create_sheet("課長彙整")
    title_rows(ws2, "課長週報彙整(給主管)", "把組員週報整理成主管看得懂的五段:完成、風險、下週、需要協助、人力配置。每段三到五點就好。", 3)
    ws2.append(["週次", "", ""])
    sections = [
        ("一、本週完成", "寫成果,不寫過程。例:完成 B 棟二次配圖面審查 12 張,提出疑問 5 項。"),
        ("二、目前風險", "會影響工期、成本、品質或安全的事,以及你準備怎麼處理。"),
        ("三、下週預計推進", "下週要交出的東西,與負責人。"),
        ("四、需要主管協助", "需要主管決定、出面或給資源的事,寫明最晚什麼時候需要。"),
        ("五、人力配置", "案件、內部改善、教育訓練的工時比例(可引用組員週報的合計)。"),
    ]
    for t, hint in sections:
        ws2.append([])
        ws2.append([t, hint, ""])
        r = ws2.max_row
        ws2.cell(row=r, column=1).font = Font(bold=True)
        ws2.cell(row=r, column=1).fill = PatternFill("solid", fgColor=BAND)
        ws2.cell(row=r, column=2).fill = PatternFill("solid", fgColor=BAND)
        ws2.cell(row=r, column=2).alignment = WRAP
        for k in range(1, 4):
            ws2.append([f"{k}.", "", ""])
            ws2.cell(row=ws2.max_row, column=2).border = BORDER
    ws2.append([])
    ws2.append(["人力配置(小時)", "=組員週報!F%d" % (head + 8), "案件"])
    ws2.append(["", "=組員週報!G%d" % (head + 8), "內部改善"])
    ws2.append(["", "=組員週報!H%d" % (head + 8), "教育訓練"])
    for i, w in enumerate([18, 70, 14], 1):
        ws2.column_dimensions[get_column_letter(i)].width = w

    # KPI 追蹤
    ws3 = wb.create_sheet("KPI追蹤")
    cols = ["指標", "負責人", "單位", "本週目標", "本週實際", "本週達成率", "累計目標", "累計實際", "累計達成率", "備註"]
    title_rows(ws3, "過程指標 KPI 追蹤", "沒有案子的時候,用可以自己控制的過程指標證明團隊在做基礎建設。目標值請依團隊實際情況設定。", len(cols))
    ws3.append([])
    ws3.append(cols)
    head3 = ws3.max_row
    style_header(ws3, head3, len(cols))
    kpis = [("圖面審查", "張"), ("現場勘查紀錄", "份"), ("估價資料整理", "件"), ("包商單價資料庫新增", "筆"), ("缺失改善結案", "件"),
            ("標準作業文件(SOP)完成", "份"), ("材料清單標準化", "項"), ("教育訓練", "小時")]
    for name, unit in kpis:
        ws3.append([name, "", unit, "", "", "", "", "", "", ""])
        r = ws3.max_row
        ws3.cell(row=r, column=6, value=f'=IF(D{r}="","",IF(D{r}=0,"",E{r}/D{r}))')
        ws3.cell(row=r, column=9, value=f'=IF(G{r}="","",IF(G{r}=0,"",H{r}/G{r}))')
        ws3.cell(row=r, column=6).number_format = "0%"
        ws3.cell(row=r, column=9).number_format = "0%"
        for col in range(1, len(cols) + 1):
            ws3.cell(row=r, column=col).border = BORDER
    for i, w in enumerate([26, 12, 8, 10, 10, 12, 10, 10, 12, 24], 1):
        ws3.column_dimensions[get_column_letter(i)].width = w
    landscape(ws3, head3)
    wb.save(path)


def variation_log_xlsx(path):
    wb = Workbook()
    ws = wb.active
    ws.title = "變更追蹤表"
    cols = ["編號", "提出日期", "提出人(單位)", "變更內容", "原因", "追加/追減", "數量", "單位", "單價", "金額", "證據(照片/訊息/簽單)", "狀態", "甲方簽認人", "簽認日期", "備註"]
    title_rows(ws, "工程變更追加紀錄表", "現場講好的事,當天記一筆,每週更新,每月和業主對一次。金額 = 數量 × 單價,追減自動以負數計。金額為示意欄位,實際計價以合約約定為準。", len(cols))
    ws.append([])
    ws.append(cols)
    head = ws.max_row
    style_header(ws, head, len(cols))
    kind = DataValidation(type="list", formula1='"追加,追減"', allow_blank=True)
    status = DataValidation(type="list", formula1='"口頭指示,已提報,已報價,甲方已簽認,已併入訂單,爭議中,放棄"', allow_blank=True)
    ws.add_data_validation(kind)
    ws.add_data_validation(status)
    n = 60
    for i in range(1, n + 1):
        r = head + i
        ws.cell(row=r, column=1, value=f"V{i:03d}")
        ws.cell(row=r, column=10, value=f'=IF(OR(G{r}="",I{r}=""),"",IF(F{r}="追減",-1,1)*G{r}*I{r})')
        ws.cell(row=r, column=10).number_format = "#,##0;[Red]-#,##0"
        ws.cell(row=r, column=9).number_format = "#,##0"
        ws.cell(row=r, column=2).number_format = "yyyy/mm/dd"
        ws.cell(row=r, column=14).number_format = "yyyy/mm/dd"
        kind.add(ws.cell(row=r, column=6))
        status.add(ws.cell(row=r, column=12))
        for col in range(1, len(cols) + 1):
            ws.cell(row=r, column=col).border = BORDER
            ws.cell(row=r, column=col).alignment = WRAP
    widths = [8, 11, 14, 30, 22, 9, 8, 7, 10, 12, 24, 12, 12, 11, 18]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = ws.cell(row=head + 1, column=2)
    landscape(ws, head)

    ws2 = wb.create_sheet("彙總")
    title_rows(ws2, "變更彙總", "依狀態統計筆數與金額。每月對帳前先看「口頭指示」與「已提報」兩列:這些都還沒有書面認可。", 3)
    ws2.append([])
    ws2.append(["狀態", "筆數", "金額合計"])
    h2 = ws2.max_row
    style_header(ws2, h2, 3)
    first, last = head + 1, head + n
    for s in ["口頭指示", "已提報", "已報價", "甲方已簽認", "已併入訂單", "爭議中", "放棄"]:
        ws2.append([s, f'=COUNTIF(變更追蹤表!$L${first}:$L${last},A{ws2.max_row + 1})', f'=SUMIF(變更追蹤表!$L${first}:$L${last},A{ws2.max_row + 1},變更追蹤表!$J${first}:$J${last})'])
        r = ws2.max_row
        ws2.cell(row=r, column=3).number_format = "#,##0;[Red]-#,##0"
        for col in range(1, 4):
            ws2.cell(row=r, column=col).border = BORDER
    ws2.append(["合計", f"=SUM(B{h2 + 1}:B{h2 + 7})", f"=SUM(C{h2 + 1}:C{h2 + 7})"])
    r = ws2.max_row
    ws2.cell(row=r, column=3).number_format = "#,##0;[Red]-#,##0"
    for col in range(1, 4):
        ws2.cell(row=r, column=col).font = Font(bold=True)
        ws2.cell(row=r, column=col).border = BORDER
    ws2.append([])
    ws2.append(["還沒有書面認可的金額", f"=C{h2 + 1}+C{h2 + 2}+C{h2 + 3}", "口頭指示+已提報+已報價"])
    ws2.cell(row=ws2.max_row, column=2).number_format = "#,##0;[Red]-#,##0"
    ws2.cell(row=ws2.max_row, column=1).font = Font(bold=True, color="C8452F")
    for i, w in enumerate([24, 14, 26], 1):
        ws2.column_dimensions[get_column_letter(i)].width = w
    wb.save(path)


CASH_ROWS_IN = ["預付款", "估驗款", "驗收款", "保留款退還", "其他收入"]
CASH_ROWS_OUT = ["材料", "工資", "機具與耗材", "協力包商", "間接費用(含現場管理)", "其他支出"]
EXAMPLE = {  # 示意:四個月施工,完工驗收後請款,再等票期;保留款在保固期滿才退,超出試算期間
    "估驗款": {}, "驗收款": {8: 2090000},
    "材料": {1: 600000, 2: 300000}, "工資": {1: 200000, 2: 200000, 3: 200000, 4: 200000},
    "機具與耗材": {1: 50000, 2: 50000, 3: 50000, 4: 50000}, "間接費用(含現場管理)": {1: 25000, 2: 25000, 3: 25000, 4: 25000},
}


def cash_sheet(ws, months, example, contract=None):
    ws.append(["合約金額(未稅)", contract])
    r_contract = ws.max_row
    ws.cell(row=r_contract, column=1).font = Font(bold=True)
    ws.cell(row=r_contract, column=2).number_format = "#,##0"
    ws.cell(row=r_contract, column=2).border = BORDER
    ws.cell(row=r_contract, column=2).fill = PatternFill("solid", fgColor="FFF6D6")
    ws.append([])
    cols = ["項目"] + [f"第{m}月" for m in range(1, months + 1)] + ["合計"]
    ws.append(cols)
    head = ws.max_row
    style_header(ws, head, len(cols))
    last_col = get_column_letter(months + 1)
    tot_col = get_column_letter(months + 2)

    def block(title, rows):
        ws.append([title])
        r0 = ws.max_row
        ws.cell(row=r0, column=1).font = Font(bold=True)
        ws.cell(row=r0, column=1).fill = PatternFill("solid", fgColor=BAND)
        start = ws.max_row + 1
        for name in rows:
            vals = [example.get(name, {}).get(m, None) if example else None for m in range(1, months + 1)]
            ws.append([name] + vals + [None])
            r = ws.max_row
            ws.cell(row=r, column=months + 2, value=f"=SUM(B{r}:{last_col}{r})")
            for col in range(2, months + 3):
                ws.cell(row=r, column=col).number_format = "#,##0"
                ws.cell(row=r, column=col).border = BORDER
            ws.cell(row=r, column=1).border = BORDER
        end = ws.max_row
        return start, end

    s1, e1 = block("收入(進來的錢)", CASH_ROWS_IN)
    ws.append(["收入合計"] + [f"=SUM({get_column_letter(c)}{s1}:{get_column_letter(c)}{e1})" for c in range(2, months + 3)])
    r_in = ws.max_row
    s2, e2 = block("支出(出去的錢)", CASH_ROWS_OUT)
    ws.append(["支出合計"] + [f"=SUM({get_column_letter(c)}{s2}:{get_column_letter(c)}{e2})" for c in range(2, months + 3)])
    r_out = ws.max_row
    ws.append([])
    ws.append(["當月淨現金流"] + [f"={get_column_letter(c)}{r_in}-{get_column_letter(c)}{r_out}" for c in range(2, months + 3)])
    r_net = ws.max_row
    cum = ["累計現金流"]
    for c in range(2, months + 2):
        col = get_column_letter(c)
        cum.append(f"={col}{r_net}" if c == 2 else f"={get_column_letter(c - 1)}{r_net + 1}+{col}{r_net}")
    ws.append(cum + [None])
    r_cum = ws.max_row
    for r in (r_in, r_out, r_net, r_cum):
        for col in range(1, months + 3):
            c = ws.cell(row=r, column=col)
            c.font = Font(bold=True)
            c.border = BORDER
            if col > 1:
                c.number_format = "#,##0;[Red]-#,##0"
    ws.append([])
    cum_rng = f"B{r_cum}:{last_col}{r_cum}"
    k = f"B{r_contract}"
    summary = [
        ("帳面利潤(合約金額-支出合計)", f'=IF({k}="","(先填合約金額)",{k}-{tot_col}{r_out})'),
        ("試算期間內收到的錢", f"={tot_col}{r_in}"),
        ("期間結束時還沒收回的錢(例如保留款)", f'=IF({k}="","(先填合約金額)",{k}-{tot_col}{r_in})'),
        ("最大資金缺口(累計現金流的最低點)", f"=MIN(0,MIN({cum_rng}))"),
        ("最大缺口發生在", f'=IF(MIN({cum_rng})>=0,"沒有缺口","第"&MATCH(MIN({cum_rng}),{cum_rng},0)&"月")'),
        ("累計現金流為負的月數", f'=COUNTIF({cum_rng},"<0")'),
    ]
    first = ws.max_row + 1
    for label, formula in summary:
        ws.append([label, formula])
    for r in range(first, ws.max_row + 1):
        ws.cell(row=r, column=1).font = Font(bold=True)
        ws.cell(row=r, column=2).number_format = "#,##0;[Red]-#,##0"
        ws.cell(row=r, column=2).font = Font(bold=True, color="C8452F")
        ws.cell(row=r, column=2).border = BORDER
    ws.column_dimensions["A"].width = 34
    for c in range(2, months + 3):
        ws.column_dimensions[get_column_letter(c)].width = 12
    ws.freeze_panes = ws.cell(row=head + 1, column=2)
    landscape(ws, head)


def cashflow_xlsx(path, months=12):
    wb = Workbook()
    ws = wb.active
    ws.title = "我的試算"
    title_rows(ws, "專案現金流試算表", "每個月預計進來多少錢、出去多少錢,填在對應的月份。看「累計現金流」最低的那一格,就是公司要先墊的錢。賺不賺錢看利潤,活不活得下去看現金。", months + 2)
    ws.append([])
    cash_sheet(ws, months, None)
    ws2 = wb.create_sheet("範例")
    title_rows(ws2, "範例:帳上賺錢,戶頭沒錢", "示意數字,非行情,金額皆未稅。合約 220 萬,成本 200 萬,帳面賺 20 萬。四個月施工,完工驗收後才請款,再等票期,第 8 個月才收到扣掉 5% 保留款的 209 萬;保留款 11 萬要等保固期滿才退,不在試算期間內。", months + 2)
    ws2.append([])
    cash_sheet(ws2, months, EXAMPLE, contract=2200000)
    wb.save(path)


def example_check():
    """用 Python 重算範例,確認試算表的結論。"""
    months = 12
    net = []
    for m in range(1, months + 1):
        inflow = sum(EXAMPLE.get(n, {}).get(m, 0) for n in CASH_ROWS_IN)
        outflow = sum(EXAMPLE.get(n, {}).get(m, 0) for n in CASH_ROWS_OUT)
        net.append(inflow - outflow)
    cum, run = [], 0
    for v in net:
        run += v
        cum.append(run)
    total_in = sum(sum(EXAMPLE.get(n, {}).values()) for n in CASH_ROWS_IN)
    total_out = sum(sum(EXAMPLE.get(n, {}).values()) for n in CASH_ROWS_OUT)
    return {"profit": 2200000 - total_out, "received": total_in, "outstanding": 2200000 - total_in,
            "min_cum": min(cum), "month": cum.index(min(cum)) + 1, "negative_months": sum(1 for v in cum if v < 0)}


def subcontractor_xlsx(path):
    wb = Workbook()
    ws = wb.active
    ws.title = "比價"
    vendors = ["包商 A", "包商 B", "包商 C"]
    ncol = 3 + 3 * len(vendors) + 1
    title_rows(ws, "包商比價評估表", "先把每一家的報價拆成同樣的項目,數量一律用我方估算的數量,再填各家單價。單價空白的格子會變黃,代表這一家沒有報;備註請照抄對方寫的「另計」「依現場」「不含」。", ncol)
    ws.append(["低於平均多少要追問(可自行調整)", 0.15])
    r_th = ws.max_row
    ws.cell(row=r_th, column=2).number_format = "0%"
    ws.cell(row=r_th, column=2).fill = PatternFill("solid", fgColor="FFF6D6")
    ws.cell(row=r_th, column=1).font = Font(bold=True)
    ws.append([])
    top = ["項目", "單位", "數量(我方估算)"]
    for v in vendors:
        top += [v, "", ""]
    top += ["最低單價"]
    ws.append(top)
    r1 = ws.max_row
    sub = ["", "", ""] + ["單價", "金額", "備註(另計/依現場/不含)"] * len(vendors) + [""]
    ws.append(sub)
    r2 = ws.max_row
    for c in range(1, ncol + 1):
        for r in (r1, r2):
            cell = ws.cell(row=r, column=c)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill("solid", fgColor=INK)
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = BORDER
    for i in range(len(vendors)):
        c0 = 4 + 3 * i
        ws.merge_cells(start_row=r1, start_column=c0, end_row=r1, end_column=c0 + 2)
    for c in (1, 2, 3, ncol):
        ws.merge_cells(start_row=r1, start_column=c, end_row=r2, end_column=c)
    samples = ["配管", "支撐與吊架", "閥件安裝", "測試", "吊車或高空作業車", "清潔與廢料清運", "管理費", "", "", "", "", "", "", "", ""]
    first = r2 + 1
    yellow = PatternFill("solid", fgColor="FFF2B3")
    for name in samples:
        ws.append([name or None])
        r = ws.max_row
        unit_cells = []
        for i in range(len(vendors)):
            pc = get_column_letter(4 + 3 * i)
            ac = get_column_letter(5 + 3 * i)
            ws[f"{ac}{r}"] = f'=IF(OR($C{r}="",{pc}{r}=""),"",$C{r}*{pc}{r})'
            ws[f"{pc}{r}"].number_format = "#,##0"
            ws[f"{ac}{r}"].number_format = "#,##0"
            unit_cells.append(f"{pc}{r}")
            ws.conditional_formatting.add(f"{pc}{r}", FormulaRule(formula=[f'AND($A{r}<>"",{pc}{r}="")'], fill=yellow))
        lc = get_column_letter(ncol)
        ws[f"{lc}{r}"] = f'=IF(COUNT({",".join(unit_cells)})=0,"",MIN({",".join(unit_cells)}))'
        ws[f"{lc}{r}"].number_format = "#,##0"
        for c in range(1, ncol + 1):
            ws.cell(row=r, column=c).border = BORDER
            ws.cell(row=r, column=c).alignment = WRAP
    last = ws.max_row
    ws.append(["總價"])
    r_tot = ws.max_row
    ws.append(["沒有報價的項目數"])
    r_miss = ws.max_row
    ws.append(["寫了另計、依現場、不含的項目數"])
    r_vague = ws.max_row
    ws.append(["和平均總價的差距"])
    r_diff = ws.max_row
    totals = [f"{get_column_letter(5 + 3 * i)}{r_tot}" for i in range(len(vendors))]
    for i in range(len(vendors)):
        pc = get_column_letter(4 + 3 * i)
        ac = get_column_letter(5 + 3 * i)
        nc = get_column_letter(6 + 3 * i)
        ws[f"{ac}{r_tot}"] = f"=SUM({ac}{first}:{ac}{last})"
        ws[f"{ac}{r_tot}"].number_format = "#,##0"
        ws[f"{ac}{r_miss}"] = f'=SUMPRODUCT(($A${first}:$A${last}<>"")*({pc}{first}:{pc}{last}=""))'
        ws[f"{ac}{r_vague}"] = (f'=COUNTIF({nc}{first}:{nc}{last},"*另計*")+COUNTIF({nc}{first}:{nc}{last},"*依現場*")'
                                f'+COUNTIF({nc}{first}:{nc}{last},"*不含*")')
        cnt = "+".join(f"({t}>0)" for t in totals)
        ws[f"{ac}{r_diff}"] = f'=IF(OR({ac}{r_tot}=0,({cnt})<2),"",{ac}{r_tot}/(SUM({",".join(totals)})/({cnt}))-1)'
        ws[f"{ac}{r_diff}"].number_format = "+0%;-0%;0%"
        ws[f"{nc}{r_diff}"] = f'=IF({ac}{r_diff}="","",IF({ac}{r_diff}<-$B${r_th},"偏低,要追問",""))'
    red = PatternFill("solid", fgColor="F6C9C0")
    for i in range(len(vendors)):
        ac = get_column_letter(5 + 3 * i)
        ws.conditional_formatting.add(f"{ac}{r_diff}", FormulaRule(formula=[f'AND({ac}{r_diff}<>"",{ac}{r_diff}<-$B${r_th})'], fill=red))
        ws.conditional_formatting.add(f"{ac}{r_miss}:{ac}{r_vague}", CellIsRule(operator="greaterThan", formula=["0"], fill=yellow))
    for r in (r_tot, r_miss, r_vague, r_diff):
        for c in range(1, ncol + 1):
            ws.cell(row=r, column=c).font = Font(bold=True)
            ws.cell(row=r, column=c).border = BORDER
    widths = [22, 7, 12] + [11, 12, 20] * len(vendors) + [11]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = ws.cell(row=first, column=2)
    landscape(ws, r1)

    ws2 = wb.create_sheet("評估")
    title_rows(ws2, "包商評估(不只比價格)", "每一項給 1 到 5 分(5 分最好),權重可以自己調整,合計建議維持 100。總分滿分 100。", 2 + len(vendors))
    ws2.append([])
    ws2.append(["評估項目", "權重"] + vendors)
    h = ws2.max_row
    style_header(ws2, h, 2 + len(vendors))
    crit = [("價格(比價結果)", 30), ("手上案量與可投入的人力", 15), ("過往類似案子的實績", 15), ("報價完整度(沒有報、另計、依現場的項目)", 15),
            ("工安紀錄", 10), ("付款與保固條件", 10), ("溝通與配合度", 5)]
    dv = DataValidation(type="whole", operator="between", formula1="1", formula2="5", allow_blank=True)
    ws2.add_data_validation(dv)
    for name, wgt in crit:
        ws2.append([name, wgt])
        r = ws2.max_row
        for c in range(1, 3 + len(vendors)):
            ws2.cell(row=r, column=c).border = BORDER
            ws2.cell(row=r, column=c).alignment = WRAP
        for c in range(3, 3 + len(vendors)):
            dv.add(ws2.cell(row=r, column=c))
    e = ws2.max_row
    ws2.append(["權重合計", f"=SUM(B{h + 1}:B{e})"])
    ws2.append(["總分(滿分 100)", ""] + [f'=IF(COUNT({get_column_letter(c)}{h + 1}:{get_column_letter(c)}{e})<{e - h},"(還沒評完)",ROUND(SUMPRODUCT($B${h + 1}:$B${e},{get_column_letter(c)}{h + 1}:{get_column_letter(c)}{e})/5*100/$B${e + 1},0))' for c in range(3, 3 + len(vendors))])
    for r in (e + 1, e + 2):
        for c in range(1, 3 + len(vendors)):
            ws2.cell(row=r, column=c).font = Font(bold=True)
            ws2.cell(row=r, column=c).border = BORDER
    ws2.column_dimensions["A"].width = 40
    ws2.column_dimensions["B"].width = 10
    for c in range(3, 3 + len(vendors)):
        ws2.column_dimensions[get_column_letter(c)].width = 14

    ws3 = wb.create_sheet("要問的問題")
    title_rows(ws3, "發包前要問的問題", "電話或面談時逐一問,答案記在右邊。答不出來,或答案每次不一樣,本身就是答案。", 1 + len(vendors))
    ws3.append([])
    ws3.append(["問題"] + vendors)
    h3 = ws3.max_row
    style_header(ws3, h3, 1 + len(vendors))
    qs = ["手上現在有幾個案子?這個案子預計什麼時候進場、進幾個人?", "人是自己的,還是會再發包出去?", "上一個類似的案子在哪裡做?可以讓我們聯絡對方嗎?",
          "報價裡寫「另計」「依現場」的項目,大概會多少?", "吊車、高空作業車、廢料清運,有沒有含在報價裡?", "付款條件和保固怎麼做?", "現場負責人是誰?每天都會在現場嗎?",
          "過去有沒有發生過工安事故?怎麼處理的?"]
    for q in qs:
        ws3.append([q])
        r = ws3.max_row
        ws3.row_dimensions[r].height = 36
        for c in range(1, 2 + len(vendors)):
            ws3.cell(row=r, column=c).border = BORDER
            ws3.cell(row=r, column=c).alignment = WRAP
    ws3.column_dimensions["A"].width = 52
    for c in range(2, 2 + len(vendors)):
        ws3.column_dimensions[get_column_letter(c)].width = 26
    wb.save(path)


def contact_matrix_xlsx(path):
    wb = Workbook()
    ws = wb.active
    ws.title = "決策權限"
    cols = ["事項", "誰可以下指示", "誰可以核准", "需要通知誰", "書面方式", "業主確認簽名"]
    title_rows(ws, "窗口與決策權限表", "開工第一天請業主自己填、自己簽名。之後誰來下指示,先對這張表:表上沒有權限的人講的話,請他找有權限的人書面確認。", len(cols))
    ws.append([])
    ws.append(cols)
    h = ws.max_row
    style_header(ws, h, len(cols))
    items = ["技術指示(施工方式、安裝位置)", "圖面變更", "追加減的範圍確認", "追加減的金額核准", "進度與工期調整", "停機、停氣、停電申請",
             "動火與其他危險作業許可", "文件與送審資料簽收", "測試見證", "驗收", "估驗與請款"]
    dv = DataValidation(type="list", formula1='"簽單,電子郵件,公文,系統,會議紀錄"', allow_blank=True)
    ws.add_data_validation(dv)
    for it in items:
        ws.append([it])
        r = ws.max_row
        ws.row_dimensions[r].height = 30
        dv.add(ws.cell(row=r, column=5))
        for c in range(1, len(cols) + 1):
            ws.cell(row=r, column=c).border = BORDER
            ws.cell(row=r, column=c).alignment = WRAP
    ws.append([])
    ws.append(["本表經雙方確認"])
    ws.cell(row=ws.max_row, column=1).font = Font(bold=True)
    ws.append(["業主代表簽名", "", "日期", ""])
    ws.append(["承攬方代表簽名", "", "日期", ""])
    for i, w in enumerate([30, 18, 18, 18, 14, 18], 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    landscape(ws, h)

    ws2 = wb.create_sheet("窗口名單")
    cols2 = ["單位", "姓名", "職稱", "電話", "電子郵件或通訊軟體", "負責範圍", "代理人"]
    title_rows(ws2, "窗口名單", "業主、監造與我方的聯絡窗口。人員異動時當天更新。", len(cols2))
    ws2.append([])
    ws2.append(cols2)
    h2 = ws2.max_row
    style_header(ws2, h2, len(cols2))
    for unit in ["使用單位", "廠務", "採購", "工安", "監造", "我方"] + [""] * 6:
        ws2.append([unit or None])
        for c in range(1, len(cols2) + 1):
            ws2.cell(row=ws2.max_row, column=c).border = BORDER
    for i, w in enumerate([14, 12, 12, 16, 24, 24, 12], 1):
        ws2.column_dimensions[get_column_letter(i)].width = w

    ws3 = wb.create_sheet("指示紀錄")
    cols3 = ["日期", "誰下的指示", "單位", "指示內容", "依權限表,他可以決定嗎", "已經書面確認", "影響", "後續處理"]
    title_rows(ws3, "指示紀錄", "每一個現場指示都記一筆。「不可以決定」又「還沒有書面確認」的列會變紅:先停,找有權限的人確認。", len(cols3))
    ws3.append([])
    ws3.append(cols3)
    h3 = ws3.max_row
    style_header(ws3, h3, len(cols3))
    can = DataValidation(type="list", formula1='"可以,不可以,不確定"', allow_blank=True)
    done = DataValidation(type="list", formula1='"是,否"', allow_blank=True)
    eff = DataValidation(type="list", formula1='"無,工期,金額,工期與金額"', allow_blank=True)
    for d in (can, done, eff):
        ws3.add_data_validation(d)
    n = 40
    for i in range(1, n + 1):
        r = h3 + i
        can.add(ws3.cell(row=r, column=5))
        done.add(ws3.cell(row=r, column=6))
        eff.add(ws3.cell(row=r, column=7))
        ws3.cell(row=r, column=1).number_format = "yyyy/mm/dd"
        for c in range(1, len(cols3) + 1):
            ws3.cell(row=r, column=c).border = BORDER
            ws3.cell(row=r, column=c).alignment = WRAP
    red = PatternFill("solid", fgColor="F6C9C0")
    ws3.conditional_formatting.add(f"A{h3 + 1}:H{h3 + n}", FormulaRule(formula=[f'AND($E{h3 + 1}<>"可以",$E{h3 + 1}<>"",$F{h3 + 1}<>"是")'], fill=red))
    for i, w in enumerate([11, 12, 12, 34, 16, 12, 12, 24], 1):
        ws3.column_dimensions[get_column_letter(i)].width = w
    ws3.freeze_panes = ws3.cell(row=h3 + 1, column=1)
    landscape(ws3, h3)
    wb.save(path)


EXCEL_TOOLS = [
    {"slug": "weekly-report", "title": "團隊週報模板", "file": "團隊週報模板.xlsx", "builder": weekly_report_xlsx,
     "desc": "三張表:組員週報(每人一列,寫交付成果)、課長彙整(給主管的五段式)、過程指標 KPI 追蹤(附達成率公式)。",
     "episode": "第 3 集〈新課長的第一個週一〉", "category": "溝通與管理",
     "points": ["組員寫「交出了什麼」,不是「忙了什麼」", "課長彙整固定五段:完成、風險、下週、需要協助、人力配置", "沒有案子時,用圖面審查、現場勘查、單價資料庫、SOP、教育訓練等過程指標交代"]},
    {"slug": "variation-log", "title": "工程變更追加紀錄表", "file": "工程變更追加紀錄表.xlsx", "builder": variation_log_xlsx,
     "desc": "每一筆變更的提出、證據、金額與簽認狀態;彙總頁自動統計還沒有書面認可的金額。",
     "episode": "第 4 集〈少了一個簽名〉", "category": "計價與報價",
     "points": ["現場講好的事當天記一筆", "狀態分七種,從口頭指示到併入訂單", "彙總頁直接算出還沒有書面認可的金額,每月對帳前先看這一格"]},
    {"slug": "cashflow", "title": "專案現金流試算表", "file": "專案現金流試算表.xlsx", "builder": cashflow_xlsx,
     "desc": "按月填入收入與支出,自動算出累計現金流、最大資金缺口與發生月份;附一個「帳上賺錢、戶頭沒錢」的範例。",
     "episode": "第 8 集〈帳上賺錢,戶頭沒錢〉", "category": "計價與報價",
     "points": ["累計現金流最低的那一格,就是公司要先墊的錢", "範例:帳面賺二十萬,最多要先墊兩百萬,第八個月才回正", "報價前先算一次,付款條件才知道要怎麼談"]},
    {"slug": "subcontractor-compare", "title": "包商比價評估表", "file": "包商比價評估表.xlsx", "builder": subcontractor_xlsx,
     "desc": "三家包商的報價拆成同樣的項目對齊比較,自動標出沒有報價、另計、偏低的地方;附加權評估與發包前要問的問題。",
     "episode": "第 11 集〈最便宜的包商〉", "category": "計價與報價",
     "points": ["數量一律用我方估算,各家只填單價,才比得出真正的差別", "沒有報價的格子變黃;總價比平均低太多的會標出來,要追問", "評估不只看價格:案量、人力、實績、報價完整度、工安紀錄都要算"]},
    {"slug": "contact-matrix", "title": "窗口與決策權限表", "file": "窗口與決策權限表.xlsx", "builder": contact_matrix_xlsx,
     "desc": "開工第一天請業主填寫:誰可以下指示、誰可以核准變更、誰簽收文件;附窗口名單與指示紀錄,沒有權限又沒有書面的指示會標紅。",
     "episode": "第 15 集〈業主有三個窗口〉", "category": "溝通與管理",
     "points": ["請業主自己填、自己簽名,之後有爭議回到表上處理", "每一個現場指示都記一筆,寫清楚是誰講的", "沒有權限又沒有書面確認的指示,先停,找有權限的人確認"]},
]


# ---------------------------------------------------------------- 工具總覽頁與 Excel 頁

def excel_page(t):
    out = TOOLS / t["slug"]
    out.mkdir(parents=True, exist_ok=True)
    t["builder"](out / t["file"])
    pts = "".join(f"<li>{esc(p)}</li>" for p in t["points"])
    page = f"""<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="{esc(t['desc'])}">
  <meta name="theme-color" content="#0a1421">
  <title>{esc(t['title'])}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../_templates/page.css">
</head>
<body>
  <main class="shell">
    <a class="back" href="../">← 全部工具</a>
    <p class="kicker">{esc(t['category'])} · Excel 範本</p>
    <h1>{esc(t['title'])}</h1>
    <p class="lead">{esc(t['desc'])}</p>
    <div class="card">
      <h2>重點</h2>
      <ul>{pts}</ul>
      <a class="button" href="{esc(t['file'])}" download="{esc(t['file'])}">下載 Excel 範本</a>
    </div>
    <p class="note">搭配影片:{esc(t['episode'])}</p>
    <footer>{esc(DISCLAIMER)}</footer>
  </main>
</body>
</html>
"""
    (out / "index.html").write_text(page, encoding="utf-8")


PAGE_CSS = """:root { --ink: #0a1421; --muted: #526171; --paper: #f4f2ed; --card: #fff; --acid: #b7f33d; --line: rgba(10, 20, 33, .15); }
* { box-sizing: border-box; }
body { margin: 0; color: var(--ink); background: var(--paper); font-family: "Noto Sans TC", system-ui, sans-serif; line-height: 1.6; }
.shell { width: min(960px, calc(100% - 32px)); margin-inline: auto; padding: 28px 0 60px; }
.back { font-size: .9rem; color: var(--muted); text-decoration: none; }
.kicker { margin: 16px 0 0; font-size: .82rem; letter-spacing: .12em; font-weight: 700; }
h1 { font-size: clamp(1.7rem, 6vw, 2.6rem); line-height: 1.2; margin: 8px 0 10px; text-wrap: balance; }
.lead { color: var(--muted); max-width: 62ch; margin: 0 0 18px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; box-shadow: 8px 8px 0 var(--acid); margin: 10px 0 18px; }
.card h2 { margin: 0 0 6px; font-size: 1.1rem; }
.card ul { margin: 0 0 16px; padding-left: 1.2em; }
.button { display: inline-block; font-weight: 700; padding: 12px 18px; border-radius: 10px; background: var(--ink); color: #fff; text-decoration: none; }
.button:focus-visible, a:focus-visible { outline: 3px solid var(--acid); outline-offset: 2px; }
.note { color: var(--muted); font-size: .92rem; }
footer { color: var(--muted); font-size: .85rem; margin-top: 30px; }
.group { margin: 28px 0 8px; }
.group h2 { font-size: 1.15rem; margin: 0 0 12px; }
.grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
.tool { display: flex; flex-direction: column; gap: 6px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; text-decoration: none; color: var(--ink); transition: transform .15s, box-shadow .15s; }
.tool:hover, .tool:focus-visible { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 var(--acid); }
.tool .type { font-size: .78rem; letter-spacing: .1em; font-weight: 700; color: var(--muted); }
.tool h3 { margin: 0; font-size: 1.12rem; }
.tool p { margin: 0; color: var(--muted); font-size: .92rem; }
.tool .ep { margin-top: auto; padding-top: 6px; font-size: .82rem; color: var(--ink); }
"""


def hub_page(entries):
    cats = []
    for e in entries:
        if e["category"] not in cats:
            cats.append(e["category"])
    blocks = []
    for c in cats:
        cards = "".join(
            f'<a class="tool" href="{e["slug"]}/"><span class="type">{esc(e["type"])}</span><h3>{esc(e["title"])}</h3>'
            f'<p>{esc(e["desc"])}</p><span class="ep">搭配影片:{esc(e["episode"])}</span></a>'
            for e in entries if e["category"] == c)
        blocks.append(f'<section class="group"><h2>{esc(c)}</h2><div class="grid">{cards}</div></section>')
    page = f"""<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="工程現場用得上的免費工具:報價檢核、完工自主檢查、每日開工安全確認、變更紀錄、現金流試算、週報與溝通範本。">
  <meta name="theme-color" content="#0a1421">
  <title>現場工具箱</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="_templates/page.css">
</head>
<body>
  <main class="shell">
    <a class="back" href="../">← 回首頁</a>
    <p class="kicker">免費 · 可列印 · 可下載 Excel</p>
    <h1>現場工具箱</h1>
    <p class="lead">工程現場故事每一集講的教訓,這裡都有一張可以直接拿去用的表。全部免費,填寫內容只存在你自己的裝置。</p>
    {''.join(blocks)}
    <footer>{esc(DISCLAIMER)}</footer>
  </main>
</body>
</html>
"""
    (TOOLS / "index.html").write_text(page, encoding="utf-8")


def main():
    (TPL / "page.css").write_text(PAGE_CSS, encoding="utf-8")
    entries = []
    for t in CHECKLISTS:
        n = write_checklist_tool(t)
        if t.get("extra_sheet") == "valve_log":
            from openpyxl import load_workbook
            p = TOOLS / t["slug"] / f'{t["slug"]}.xlsx'
            wb = load_workbook(p)
            valve_log_sheet(wb)
            wb.save(p)
        entries.append({"slug": t["slug"], "title": t["title"], "desc": t["desc"], "episode": t["episode"], "category": t["category"], "type": f"檢核表 · {n} 項"})
        print(f'{t["slug"]}: {n} items')
    for t in MESSAGES:
        write_message_tool(expand_message(t))
        entries.append({"slug": t["slug"], "title": t["title"], "desc": t["desc"], "episode": t["episode"], "category": t["category"], "type": "文字產生器"})
        print(f'{t["slug"]}: message tool')
    for t in EXCEL_TOOLS:
        excel_page(t)
        entries.append({"slug": t["slug"], "title": t["title"], "desc": t["desc"], "episode": t["episode"], "category": t["category"], "type": "Excel 範本"})
        print(f'{t["slug"]}: excel')
    order = {"計價與報價": 0, "品質與施工": 1, "工安": 2, "溝通與管理": 3}
    ep = lambda e: int(re.search(r"第 (\d+) 集", e["episode"]).group(1))
    entries.sort(key=lambda e: (order.get(e["category"], 9), ep(e)))
    hub_page(entries)
    print("example cashflow:", example_check())


if __name__ == "__main__":
    main()
