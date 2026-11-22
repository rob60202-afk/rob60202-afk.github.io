(() => {
  'use strict';

  const KEY = 'rob-h2-portal-v1';
  const $ = (sel) => document.querySelector(sel);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const today = () => iso(new Date());
  const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const dayDiff = (a, b) => Math.round((new Date(a) - new Date(b)) / 864e5);
  const money = (n) => (Number(n) || 0).toLocaleString('zh-TW');
  const pct = (a, b) => (Number(b) > 0 ? Math.round((Number(a) / Number(b)) * 100) : 0);
  const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');

  const PHASES = ['設計審圖', '採購備料', '施工配管', '測試檢驗', '試車驗收', '結案請款'];
  const TASK_STATUS = ['待辦', '進行中', '卡關', '完成'];
  const PRIORITY = ['一般', '重要', '緊急'];
  const LEVEL = ['低', '中', '高'];
  const ISSUE_STATUS = ['未結', '處理中', '已結'];
  const DOC_TYPES = ['圖面', '規範標準', '送審文件', '報價計價', '會議記錄', '其他'];
  const SECTIONS = [['overview', '概況'], ['schedule', '時程'], ['tasks', '任務'], ['issues', '問題'], ['docs', '文件'], ['contacts', '窗口']];

  /* ---------- 資料 ---------- */
  function sampleData() {
    const team = ['王工程師', '李工程師', '陳工程師', '林工程師', '張工程師', '黃工程師', '吳工程師']
      .map((name, i) => ({ id: 't' + i, name, role: i < 2 ? '資深工程師' : i < 5 ? '工程師' : '新進工程師' }));
    const projects = [
      { id: 'pur', name: '氫氣純化系統', code: '純化', client: '業主（範例）', owner: 't0', phase: '施工配管', start: addDays(-75), due: addDays(45), contract: 6800000, billed: 2720000, summary: '純化器安裝、進出口配管與純度驗證。目前設備已到貨，配管施工中。' },
      { id: 'fill', name: '氫氣灌充系統', code: '灌充', client: '業主（範例）', owner: 't1', phase: '採購備料', start: addDays(-40), due: addDays(80), contract: 5200000, billed: 1040000, summary: '灌充盤面、管路與安全連鎖建置。目前設備採購中，安全審查文件送審中。' },
    ];
    const ms = (pid, rows) => rows.map((r, i) => ({ id: pid + 'm' + i, projectId: pid, name: r[0], start: addDays(r[1]), due: addDays(r[2]), progress: r[3] }));
    const milestones = [
      ...ms('pur', [['純化器規格確認與送審', -75, -55, 100], ['P&ID 與配管圖審查', -60, -35, 100], ['純化器與閥件到貨', -40, -10, 100], ['配管施工與焊接', -12, 18, 45], ['保壓、測漏與純度測試', 16, 32, 0], ['試車與業主驗收', 30, 45, 0]]),
      ...ms('fill', [['灌充區安全審查文件送審', -40, 5, 80], ['灌充盤面與設備規格確認', -30, -8, 100], ['設備與材料採購到貨', -10, 30, 25], ['管路施工', 28, 55, 0], ['氣密與安全連鎖測試', 52, 68, 0], ['試車驗收', 66, 80, 0]]),
    ];
    const tasks = [
      ['pur', '焊道檢查紀錄整理與送審', 't2', 4, '進行中', '重要'], ['pur', '支架與管架補料追蹤', 't3', -2, '卡關', '緊急'], ['pur', '測試計畫書送業主審查', 't0', 9, '待辦', '重要'],
      ['pur', '純度分析儀器借用排程', 't4', 14, '待辦', '一般'], ['pur', '到貨驗收紀錄歸檔', 't5', -8, '完成', '一般'],
      ['fill', '安全審查意見回覆', 't1', 3, '進行中', '緊急'], ['fill', '氣體偵測器點位圖更新', 't3', -1, '進行中', '重要'], ['fill', '包商報價比價與議價', 't1', 7, '待辦', '重要'],
      ['fill', '施工排程與動火申請準備', 't6', 20, '待辦', '一般'], ['fill', '設備規格承認圖歸檔', 't5', -6, '完成', '一般'],
    ].map((r, i) => ({ id: 'k' + i, projectId: r[0], title: r[1], assignee: r[2], due: addDays(r[3]), status: r[4], priority: r[5] }));
    const issues = [
      ['pur', '支架材料交期延後，影響配管進度', '高', 't3', '處理中', '已請供應商分批出貨，本週確認到貨日。', 3],
      ['pur', '測試用氣源與排放路徑待業主確認', '中', 't0', '未結', '列入下次週會議題。', 10],
      ['fill', '氣體偵測器點位業主尚未核定', '中', 't1', '未結', '已送點位圖，等待安全審查回覆。', 5],
      ['fill', '設備交期可能晚於原排程', '中', 't1', '處理中', '請設備商提供正式交期承諾書。', 12],
    ].map((r, i) => ({ id: 'i' + i, projectId: r[0], title: r[1], level: r[2], owner: r[3], status: r[4], action: r[5], due: addDays(r[6]) }));
    const docs = [
      ['pur', 'P&ID', '圖面', 'Rev.B'], ['pur', '配管平面圖', '圖面', 'Rev.A'], ['pur', '測試計畫書', '送審文件', '初稿'], ['pur', '週會會議記錄', '會議記錄', ''],
      ['fill', 'P&ID', '圖面', 'Rev.A'], ['fill', '安全審查送審文件', '送審文件', 'Rev.1'], ['fill', '包商報價比較表', '報價計價', ''],
    ].map((r, i) => ({ id: 'd' + i, projectId: r[0], title: r[1], type: r[2], rev: r[3], url: '' }));
    const contacts = [
      ['pur', '業主專案窗口', '業主', '專案工程師'], ['pur', '配管包商', '包商', '現場負責人'], ['pur', '純化器設備商', '供應商', '業務窗口'],
      ['fill', '業主專案窗口', '業主', '專案工程師'], ['fill', '業主安全審查窗口', '業主', '工安'], ['fill', '灌充設備商', '供應商', '業務窗口'],
    ].map((r, i) => ({ id: 'c' + i, projectId: r[0], name: r[1], org: r[2], role: r[3], phone: '', email: '' }));
    return { sample: true, team, projects, milestones, tasks, issues, docs, contacts };
  }
  const COLLECTIONS = ['team', 'projects', 'milestones', 'tasks', 'issues', 'docs', 'contacts'];
  const emptyData = () => Object.fromEntries([['sample', false], ...COLLECTIONS.map((k) => [k, []])]);

  let storageOk = true;
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(emptyData(), JSON.parse(raw));
    } catch (e) { storageOk = false; }
    return sampleData();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); storageOk = true; } catch (e) { storageOk = false; }
  }
  let db = load();

  /* ---------- 共用計算 ---------- */
  const member = (id) => db.team.find((x) => x.id === id);
  const project = (id) => db.projects.find((x) => x.id === id);
  const mName = (id) => member(id)?.name || '未指派';
  const pCode = (id) => { const p = project(id); return p ? p.code || p.name : '共通'; };
  const of = (type, pid) => db[type].filter((x) => x.projectId === pid);
  const openTask = (k) => k.status !== '完成';
  const openIssue = (i) => i.status !== '已結';
  const isLate = (due) => Boolean(due) && due < today();
  const msLate = (m) => Number(m.progress) < 100 && isLate(m.due);

  function stats(p) {
    const ms = of('milestones', p.id);
    const tasks = of('tasks', p.id);
    const open = tasks.filter(openTask);
    const issues = of('issues', p.id).filter(openIssue);
    const progress = ms.length ? Math.round(ms.reduce((s, m) => s + (Number(m.progress) || 0), 0) / ms.length) : 0;
    const lateTasks = open.filter((k) => isLate(k.due));
    const stuck = open.filter((k) => k.status === '卡關');
    const lateMs = ms.filter(msLate);
    const next = ms.filter((m) => Number(m.progress) < 100).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'))[0];
    const reasons = [];
    let cls = 'ok';
    const flag = (level, text) => { reasons.push(text); if (level === 'bad' || cls === 'ok') cls = level; };
    if (lateMs.length) flag('bad', `里程碑逾期 ${lateMs.length} 項`);
    if (issues.some((i) => i.level === '高')) flag('bad', '有高風險問題未結');
    if (p.due && isLate(p.due) && progress < 100) flag('bad', '專案已超過期限');
    if (lateTasks.length) flag('warn', `任務逾期 ${lateTasks.length} 件`);
    if (stuck.length) flag('warn', `任務卡關 ${stuck.length} 件`);
    if (issues.some((i) => i.level === '中')) flag('warn', '有中風險問題未結');
    const text = { ok: '正常', warn: '需注意', bad: '落後／高風險' }[cls];
    return { ms, tasks, open, issues, progress, lateTasks, stuck, lateMs, next, light: { cls, text, reasons }, left: p.due ? dayDiff(p.due, today()) : null };
  }

  /* ---------- 小元件 ---------- */
  function pill(text, cls) {
    const map = { 高: 'bad', 卡關: 'bad', 緊急: 'bad', 未結: 'bad', 中: 'warn', 重要: 'warn', 處理中: 'warn', 完成: 'ok', 已結: 'ok', 低: 'ok', 進行中: '' };
    return `<span class="c-pill ${cls ?? map[text] ?? 'mute'}">${esc(text)}</span>`;
  }
  const light = (l) => `<span class="c-light ${l.cls}"><i aria-hidden="true"></i>${l.text}</span>`;
  function ring(value, size = 96) {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    const c = 2 * Math.PI * 42;
    return `<svg class="c-ring" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="整體進度 ${v}%">
      <circle cx="50" cy="50" r="42" class="track"/><circle cx="50" cy="50" r="42" class="fill" stroke-dasharray="${(c * v) / 100} ${c}" transform="rotate(-90 50 50)"/>
      <text x="50" y="50" text-anchor="middle" dominant-baseline="central">${v}%</text></svg>`;
  }
  function bar(value, cls = '') {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    return `<div class="c-bar ${cls}"><i><b style="width:${v}%"></b></i><span>${v}%</span></div>`;
  }
  function stepper(phase) {
    const cur = PHASES.indexOf(phase);
    return `<ol class="c-steps" aria-label="專案階段">${PHASES.map((ph, i) => `<li class="${i < cur ? 'done' : i === cur ? 'current' : ''}"><span>${i + 1}</span>${ph}</li>`).join('')}</ol>`;
  }
  function statusBar(tasks) {
    const cls = { 待辦: 'todo', 進行中: 'doing', 卡關: 'stuck', 完成: 'done' };
    const counts = TASK_STATUS.map((s) => [s, tasks.filter((k) => k.status === s).length]);
    if (!tasks.length) return '<p class="c-sub">尚無任務。</p>';
    return `<div class="c-stack" role="img" aria-label="任務狀態分布：${counts.map(([s, n]) => `${s} ${n}`).join('、')}">${counts.filter(([, n]) => n).map(([s, n]) => `<b class="${cls[s]}" style="flex:${n}">${n}</b>`).join('')}</div>
      <ul class="c-legend">${counts.map(([s, n]) => `<li><i class="${cls[s]}"></i>${s} ${n}</li>`).join('')}</ul>`;
  }
  const dateCell = (d, late) => (d ? `<span class="${late ? 'c-late' : ''}">${esc(d)}${late ? '（逾期）' : ''}</span>` : '—');
  const table = (head, rows, empty) => `<div class="c-tablewrap"><table class="c-table"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td class="c-empty" colspan="${head.length}">${empty}</td></tr>`}</tbody></table></div>`;
  const head = (title, add, level = 'h2') => `<div class="c-head"><${level}>${title}</${level}>${add ? `<button class="c-btn solid" data-add="${add[0]}">＋ ${add[1]}</button>` : ''}</div>`;
  const tile = (label, value, sub, cls = '') => `<div class="c-tile ${cls}"><small>${label}</small><strong>${value}</strong><span>${sub}</span></div>`;

  function taskRow(k, withProject) {
    const late = openTask(k) && isLate(k.due);
    return `<tr data-edit="tasks" data-id="${k.id}"><td class="wrap">${esc(k.title)}</td>${withProject ? `<td>${esc(pCode(k.projectId))}</td>` : ''}<td>${esc(mName(k.assignee))}</td><td>${dateCell(k.due, late)}</td><td>${pill(k.priority)}</td><td>${pill(k.status)}</td><td class="act">${openTask(k) ? `<button class="c-btn small" data-done="${k.id}">✓ 完成</button>` : ''}</td></tr>`;
  }
  function issueRow(i, withProject) {
    return `<tr data-edit="issues" data-id="${i.id}"><td class="wrap">${esc(i.title)}</td>${withProject ? `<td>${esc(pCode(i.projectId))}</td>` : ''}<td>${pill(i.level)}</td><td>${pill(i.status)}</td><td>${esc(mName(i.owner))}</td><td>${dateCell(i.due, openIssue(i) && isLate(i.due))}</td><td class="wrap">${esc(i.action)}</td></tr>`;
  }

  /* ---------- 頁面：入口 ---------- */
  function homeView() {
    const cards = db.projects.map((p) => {
      const s = stats(p);
      return `<article class="c-project">
        <header><div><p class="c-kicker">${esc(p.client || '')}</p><h2>${esc(p.name)}</h2></div>${light(s.light)}</header>
        <div class="c-project-main">${ring(s.progress)}
          <dl><div><dt>目前階段</dt><dd>${esc(p.phase || '未設定')}</dd></div>
          <div><dt>期限</dt><dd>${p.due ? `${esc(p.due)}（${s.left >= 0 ? `剩 ${s.left} 天` : `逾期 ${-s.left} 天`}）` : '未設定'}</dd></div>
          <div><dt>專案負責人</dt><dd>${esc(mName(p.owner))}</dd></div>
          <div><dt>下一個里程碑</dt><dd>${s.next ? `${esc(s.next.name)}（${esc(s.next.due)}）` : '無'}</dd></div></dl></div>
        ${stepper(p.phase)}
        <div class="c-mini"><div><strong>${s.open.length}</strong>未完成任務</div><div class="${s.lateTasks.length ? 'bad' : ''}"><strong>${s.lateTasks.length}</strong>逾期任務</div><div class="${s.issues.length ? 'warn' : ''}"><strong>${s.issues.length}</strong>未結問題</div><div><strong>${pct(p.billed, p.contract)}%</strong>請款率</div></div>
        ${s.light.reasons.length ? `<p class="c-reasons">${s.light.reasons.map(esc).join('・')}</p>` : ''}
        <a class="c-btn solid c-enter" href="#/p/${p.id}/overview">進入專案 →</a>
      </article>`;
    });
    const focus = db.tasks.filter((k) => openTask(k) && (isLate(k.due) || k.status === '卡關' || (k.due && k.due <= addDays(7)))).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
    const hot = db.issues.filter((i) => openIssue(i) && i.level !== '低');
    return `<div class="c-head"><div><h1>專案入口</h1><p class="c-sub">${today()}　共 ${db.projects.length} 個專案</p></div></div>
      <div class="c-projects">${cards.join('') || '<p class="c-empty">尚無專案，請到右上「更多」新增專案。</p>'}</div>
      <div class="c-section">${head('本週要盯的任務')}${table(['任務', '專案', '負責人', '期限', '優先度', '狀態', ''], focus.map((k) => taskRow(k, true)), '本週沒有到期、逾期或卡關的任務。')}</div>
      <div class="c-section">${head('待處理的問題與風險')}${table(['問題', '專案', '等級', '狀態', '負責人', '期限', '對策'], hot.map((i) => issueRow(i, true)), '目前沒有中高風險的未結問題。')}</div>`;
  }

  /* ---------- 頁面：專案 ---------- */
  const sections = {
    overview(p, s) {
      return `<div class="c-tiles">
          ${tile('整體進度', s.progress + '%', `里程碑 ${s.ms.filter((m) => Number(m.progress) >= 100).length}/${s.ms.length} 完成`, 'dark')}
          ${tile('剩餘天數', s.left == null ? '—' : s.left, s.left != null && s.left < 0 ? '已超過期限' : `期限 ${esc(p.due || '未設定')}`, s.left != null && s.left < 0 ? 'bad' : '')}
          ${tile('未完成任務', s.open.length, `逾期 ${s.lateTasks.length}・卡關 ${s.stuck.length}`, s.lateTasks.length ? 'bad' : '')}
          ${tile('未結問題', s.issues.length, `高風險 ${s.issues.filter((i) => i.level === '高').length} 項`, s.issues.some((i) => i.level === '高') ? 'bad' : '')}
          ${tile('合約金額', money(p.contract), '元')}
          ${tile('請款率', pct(p.billed, p.contract) + '%', `未請款 ${money(p.contract - p.billed)}`)}
        </div>
        <div class="c-section c-panel"><h3>專案階段</h3>${stepper(p.phase)}</div>
        <div class="c-two">
          <div class="c-panel"><h3>任務狀態</h3>${statusBar(s.tasks)}</div>
          <div class="c-panel"><h3>專案說明</h3><p>${esc(p.summary) || '尚未填寫。'}</p><p class="c-sub">業主：${esc(p.client || '—')}　負責人：${esc(mName(p.owner))}　工期：${esc(p.start || '—')} ～ ${esc(p.due || '—')}</p></div>
        </div>
        <div class="c-section">${head('接下來的里程碑')}${table(['里程碑', '期限', '進度'], s.ms.filter((m) => Number(m.progress) < 100).sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).slice(0, 3).map((m) => `<tr data-edit="milestones" data-id="${m.id}"><td class="wrap">${esc(m.name)}</td><td>${dateCell(m.due, msLate(m))}</td><td>${bar(m.progress)}</td></tr>`), '里程碑都已完成。')}</div>`;
    },

    schedule(p, s) {
      const ms = [...s.ms].sort((a, b) => (a.start || a.due || '').localeCompare(b.start || b.due || ''));
      const dates = [p.start, p.due, ...ms.flatMap((m) => [m.start, m.due])].filter(Boolean).sort();
      if (!ms.length || dates.length < 2) return `${head('時程', ['milestones', '新增里程碑'])}<p class="c-empty">尚無里程碑。</p>`;
      const min = dates[0];
      const span = Math.max(1, dayDiff(dates[dates.length - 1], min));
      const pos = (d) => Math.max(0, Math.min(100, (dayDiff(d, min) / span) * 100));
      const now = today() >= min && today() <= dates[dates.length - 1] ? `<i class="c-today" style="left:${pos(today())}%"></i>` : '';
      const rows = ms.map((m) => {
        const a = pos(m.start || m.due);
        const w = Math.max(2, pos(m.due || m.start) - a);
        const done = Number(m.progress) >= 100;
        return `<div class="c-gantt-row" data-edit="milestones" data-id="${m.id}" tabindex="0">
          <div class="c-gantt-label"><strong>${esc(m.name)}</strong><span class="${msLate(m) ? 'c-late' : ''}">${esc(m.start || '')} ～ ${esc(m.due || '')}${msLate(m) ? '（逾期）' : ''}　${Number(m.progress) || 0}%</span></div>
          <div class="c-gantt-track">${now}<div class="c-gantt-bar ${done ? 'done' : msLate(m) ? 'late' : ''}" style="left:${a}%;width:${w}%"><b style="width:${Math.min(100, Number(m.progress) || 0)}%"></b></div></div></div>`;
      });
      return `${head('時程', ['milestones', '新增里程碑'])}
        <p class="c-sub" style="margin-bottom:12px">橫條是預定起訖，深色是已完成比例，直線是今天。點任一列可更新進度。</p>
        <div class="c-gantt"><div class="c-gantt-axis"><span>${esc(min)}</span><span>${esc(dates[dates.length - 1])}</span></div>${rows.join('')}</div>`;
    },

    tasks(p, s) {
      const cols = TASK_STATUS.map((st, idx) => {
        const list = s.tasks.filter((k) => k.status === st).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
        const cards = list.map((k) => {
          const late = openTask(k) && isLate(k.due);
          const nextSt = TASK_STATUS[idx + 1];
          return `<div class="c-kcard" draggable="true" data-drag="${k.id}" data-edit="tasks" data-id="${k.id}" tabindex="0">
            <strong>${esc(k.title)}</strong>
            <p>${esc(mName(k.assignee))}　<span class="${late ? 'c-late' : ''}">${esc(k.due || '未定期限')}${late ? '（逾期）' : ''}</span></p>
            <div class="c-krow">${pill(k.priority)}${st !== '完成' ? `<button class="c-btn small" data-move="${k.id}" data-to="${st === '卡關' ? '進行中' : nextSt === '卡關' ? '完成' : nextSt}">→ ${st === '卡關' ? '進行中' : nextSt === '卡關' ? '完成' : nextSt}</button>` : ''}</div></div>`;
        });
        return `<section class="c-kcol" data-col="${st}"><h3>${st}<span>${list.length}</span></h3>${cards.join('') || '<p class="c-kempty">—</p>'}</section>`;
      });
      return `${head('任務看板', ['tasks', '新增任務'])}
        <p class="c-sub" style="margin-bottom:12px">電腦可拖拉卡片換欄；手機左右滑動看各欄，按卡片上的箭頭推進狀態。</p>
        <div class="c-kanban">${cols.join('')}</div>`;
    },

    issues(p) {
      const list = of('issues', p.id).sort((a, b) => openIssue(b) - openIssue(a) || LEVEL.indexOf(b.level) - LEVEL.indexOf(a.level));
      return `${head('問題與風險', ['issues', '新增問題'])}${table(['問題', '等級', '狀態', '負責人', '期限', '對策'], list.map((i) => issueRow(i, false)), '尚無問題紀錄。')}`;
    },

    docs(p) {
      const list = of('docs', p.id);
      const groups = DOC_TYPES.map((t) => [t, list.filter((d) => d.type === t)]).filter(([, l]) => l.length);
      return `${head('文件與圖面', ['docs', '新增文件'])}
        <p class="c-sub" style="margin-bottom:12px">這裡只放文件名稱、版次與雲端連結，檔案本身仍放在公司的雲端硬碟。</p>
        ${groups.map(([t, l]) => `<div class="c-panel c-doc-group"><h3>${t}</h3><ul class="c-docs">${l.map((d) => {
          const u = safeUrl(d.url);
          return `<li><button class="c-doc-main" data-edit="docs" data-id="${d.id}"><strong>${esc(d.title)}</strong>${d.rev ? `<span>${esc(d.rev)}</span>` : ''}</button>${u ? `<a class="c-btn small" href="${esc(u)}" target="_blank" rel="noopener noreferrer">開啟 ↗</a>` : '<span class="c-pill mute">未放連結</span>'}</li>`;
        }).join('')}</ul></div>`).join('') || '<p class="c-empty">尚無文件。</p>'}`;
    },

    contacts(p) {
      const list = of('contacts', p.id);
      return `${head('聯絡窗口', ['contacts', '新增窗口'])}
        <div class="c-cards">${list.map((c) => `<div class="c-card" data-edit="contacts" data-id="${c.id}" tabindex="0"><h3>${esc(c.name)}</h3><p>${esc(c.org || '')}${c.role ? '・' + esc(c.role) : ''}</p>
          ${c.phone ? `<a class="c-btn small" href="tel:${esc(c.phone.replace(/[^\d+#*]/g, ''))}">撥打 ${esc(c.phone)}</a>` : ''} ${c.email ? `<a class="c-btn small" href="mailto:${esc(c.email)}">寄信</a>` : ''}
          ${!c.phone && !c.email ? '<span class="c-pill mute">尚未填聯絡方式</span>' : ''}</div>`).join('') || '<p class="c-empty">尚無窗口。</p>'}</div>`;
    },
  };

  function projectView(p, sec) {
    const s = stats(p);
    return `<div class="c-head"><div><p class="c-kicker">${esc(p.client || '')}</p><h1>${esc(p.name)}</h1></div><div class="c-head-side">${light(s.light)}<button class="c-btn" data-edit="projects" data-id="${p.id}">編輯專案</button></div></div>
      <nav class="c-chips" aria-label="專案分頁">${SECTIONS.map(([k, l]) => `<a href="#/p/${p.id}/${k}" ${k === sec ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
      ${sections[sec](p, s)}`;
  }

  /* ---------- 頁面：團隊、週報 ---------- */
  function teamView() {
    const cards = db.team.map((m) => {
      const mine = db.tasks.filter((k) => k.assignee === m.id && openTask(k));
      const late = mine.filter((k) => isLate(k.due)).length;
      return `<div class="c-card" data-edit="team" data-id="${m.id}" tabindex="0"><h3>${esc(m.name)}</h3><p>${esc(m.role || '')}</p>
        <span class="c-pill">未完成 ${mine.length}</span> <span class="c-pill ${late ? 'bad' : 'mute'}">逾期 ${late}</span>
        ${db.projects.map((p) => `<span class="c-pill mute">${esc(p.code || p.name)} ${mine.filter((k) => k.projectId === p.id).length}</span>`).join(' ')}
        <ul>${mine.slice(0, 4).map((k) => `<li>${esc(pCode(k.projectId))}｜${esc(k.title)}</li>`).join('') || '<li>目前沒有指派任務</li>'}</ul></div>`;
    });
    return `${head('團隊', ['team', '新增成員'], 'h1')}<p class="c-sub" style="margin-bottom:12px">每人在兩個專案上的工作負載。未完成任務為 0 的人，可以再分派工作。</p><div class="c-cards">${cards.join('') || '<p class="c-empty">尚無成員。</p>'}</div>`;
  }

  function buildReport() {
    const sec = (title, items, none) => `${title}\n${items.length ? items.join('\n') : `- ${none}`}`;
    const parts = [`氫氣專案週報　${today()}`];
    db.projects.forEach((p) => {
      const s = stats(p);
      parts.push([
        `【${p.name}】燈號：${s.light.text}${s.light.reasons.length ? `（${s.light.reasons.join('、')}）` : ''}`,
        `- 整體進度 ${s.progress}%｜階段：${p.phase || '未設定'}｜期限 ${p.due || '未定'}｜負責人 ${mName(p.owner)}`,
        `- 計價：合約 ${money(p.contract)}，已請款 ${money(p.billed)}（${pct(p.billed, p.contract)}%）`,
        sec('▍里程碑', s.ms.filter((m) => Number(m.progress) < 100).slice(0, 3).map((m) => `- ${m.name}：${m.progress || 0}%，期限 ${m.due || '未定'}${msLate(m) ? '（逾期）' : ''}`), '里程碑均已完成'),
        sec('▍問題與風險', s.issues.map((i) => `- [${i.level}] ${i.title}｜對策：${i.action || '待補'}｜${mName(i.owner)}`), '無未結問題'),
        sec('▍下週預計推進', s.open.filter((k) => k.due && k.due <= addDays(7)).map((k) => `- ${k.title}（${mName(k.assignee)}，期限 ${k.due}${isLate(k.due) ? '，已逾期' : ''}）`), '無 7 天內到期任務'),
      ].join('\n'));
    });
    parts.push(sec('【團隊人力配置】', db.team.map((m) => `- ${m.name}：${db.projects.map((p) => `${p.code || p.name} ${db.tasks.filter((k) => k.assignee === m.id && k.projectId === p.id && openTask(k)).length} 件`).join('、')}`), '尚未建立成員'));
    parts.push('【需主管協助事項】\n- （請填寫）');
    return parts.join('\n\n');
  }
  const reportView = () => `${head('週報', null, 'h1')}<p class="c-sub" style="margin-bottom:12px">依兩個專案的現況自動整理成給主管的格式，可直接修改後複製。</p>
    <div class="c-filters"><button class="c-btn solid" data-action="copy">複製文字</button><button class="c-btn" data-action="print">列印 / 存 PDF</button></div>
    <textarea class="c-report" id="report" aria-label="週報內容">${esc(buildReport())}</textarea>`;

  /* ---------- 路由 ---------- */
  let route = { page: 'home' };
  function parseRoute() {
    const [, a, b, c] = location.hash.split('/');
    if (a === 'p' && project(b)) return { page: 'project', id: b, sec: sections[c] ? c : 'overview' };
    if (a === 'team' || a === 'report') return { page: a };
    return { page: 'home' };
  }

  /* ---------- 表單 ---------- */
  const teamOpts = () => [['', '未指派'], ...db.team.map((m) => [m.id, m.name])];
  const projOpts = () => db.projects.map((p) => [p.id, p.name]);
  const sel = (list, def) => ({ options: list.map((s) => [s, s]), def });
  const schemas = {
    projects: { label: '專案', fields: () => [
      ['name', '專案名稱', 'text', { full: true, required: true }], ['code', '簡稱（導覽列顯示）', 'text'], ['client', '業主', 'text'],
      ['owner', '專案負責人', 'select', { options: teamOpts() }], ['phase', '目前階段', 'select', sel(PHASES, PHASES[0])],
      ['start', '開工日', 'date'], ['due', '完工期限', 'date'], ['contract', '合約金額', 'number', { min: 0, def: 0 }], ['billed', '已請款金額', 'number', { min: 0, def: 0 }],
      ['summary', '專案說明', 'textarea', { full: true }]] },
    milestones: { label: '里程碑', fields: () => [
      ['name', '里程碑名稱', 'text', { full: true, required: true }], ['projectId', '所屬專案', 'select', { options: projOpts() }], ['progress', '完成 %', 'number', { min: 0, max: 100, def: 0 }],
      ['start', '預定開始', 'date'], ['due', '預定完成', 'date']] },
    tasks: { label: '任務', fields: () => [
      ['title', '任務內容', 'text', { full: true, required: true }], ['projectId', '所屬專案', 'select', { options: [...projOpts(), ['', '共通事項']] }],
      ['assignee', '負責人', 'select', { options: teamOpts() }], ['due', '期限', 'date'], ['priority', '優先度', 'select', sel(PRIORITY, '一般')], ['status', '狀態', 'select', sel(TASK_STATUS, '待辦')]] },
    issues: { label: '問題', fields: () => [
      ['title', '問題或風險', 'text', { full: true, required: true }], ['projectId', '所屬專案', 'select', { options: projOpts() }], ['level', '等級', 'select', sel(LEVEL, '中')],
      ['status', '狀態', 'select', sel(ISSUE_STATUS, '未結')], ['owner', '負責人', 'select', { options: teamOpts() }], ['due', '預計解決日', 'date'], ['action', '對策與進展', 'textarea', { full: true }]] },
    docs: { label: '文件', fields: () => [
      ['title', '文件名稱', 'text', { full: true, required: true }], ['projectId', '所屬專案', 'select', { options: projOpts() }], ['type', '類別', 'select', sel(DOC_TYPES, '圖面')],
      ['rev', '版次', 'text'], ['url', '雲端連結（https://）', 'url', { full: true }]] },
    contacts: { label: '窗口', fields: () => [
      ['name', '姓名或稱呼', 'text', { required: true }], ['projectId', '所屬專案', 'select', { options: projOpts() }], ['org', '單位（業主／包商／供應商）', 'text'], ['role', '職稱或角色', 'text'],
      ['phone', '電話', 'tel'], ['email', 'Email', 'email']] },
    team: { label: '成員', fields: () => [['name', '姓名', 'text', { required: true }], ['role', '職稱', 'text']] },
  };

  let editing = null;
  function openForm(type, id) {
    const schema = schemas[type];
    const item = id ? db[type].find((x) => x.id === id) : null;
    editing = { type, id };
    $('#form-title').textContent = (item ? '編輯' : '新增') + schema.label;
    $('#form-delete').hidden = !item;
    $('#form-fields').innerHTML = schema.fields().map(([key, label, kind, o = {}]) => {
      let val = item ? item[key] ?? '' : o.def ?? '';
      if (!item && key === 'projectId' && route.page === 'project') val = route.id;
      const attr = `name="${key}" ${o.required ? 'required' : ''}`;
      let input;
      if (kind === 'select') input = `<select ${attr}>${o.options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
      else if (kind === 'textarea') input = `<textarea ${attr}>${esc(val)}</textarea>`;
      else input = `<input type="${kind}" ${attr} value="${esc(val)}" ${o.min != null ? `min="${o.min}"` : ''} ${o.max != null ? `max="${o.max}"` : ''}>`;
      return `<label class="${o.full ? 'full' : ''}">${label}${input}</label>`;
    }).join('');
    $('#dialog').showModal();
  }

  function commit() { db.sample = false; save(); render(); }

  $('#form').addEventListener('submit', (e) => {
    e.preventDefault();
    const { type, id } = editing;
    const data = {};
    schemas[type].fields().forEach(([key, , kind]) => {
      const v = $('#form').elements[key].value.trim();
      data[key] = kind === 'number' ? Number(v) || 0 : v;
    });
    if (id) Object.assign(db[type].find((x) => x.id === id), data);
    else db[type].push({ id: uid(), ...data });
    $('#dialog').close();
    commit();
  });
  $('#form-cancel').addEventListener('click', () => $('#dialog').close());
  $('#form-delete').addEventListener('click', () => {
    const { type, id } = editing;
    const warn = type === 'projects' ? '刪除專案會一併刪除它的里程碑、任務、問題、文件與窗口，確定？' : '確定刪除這筆資料？';
    if (!confirm(warn)) return;
    db[type] = db[type].filter((x) => x.id !== id);
    if (type === 'team') { db.tasks.forEach((k) => { if (k.assignee === id) k.assignee = ''; }); db.issues.forEach((i) => { if (i.owner === id) i.owner = ''; }); db.projects.forEach((p) => { if (p.owner === id) p.owner = ''; }); }
    if (type === 'projects') { ['milestones', 'tasks', 'issues', 'docs', 'contacts'].forEach((c) => { db[c] = db[c].filter((x) => x.projectId !== id); }); location.hash = '#/'; }
    $('#dialog').close();
    commit();
  });

  /* ---------- 事件 ---------- */
  const setStatus = (id, status) => { const k = db.tasks.find((x) => x.id === id); if (k && k.status !== status) { k.status = status; commit(); } };
  const actions = {
    export() {
      const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `氫氣專案備份-${today()}.json` });
      a.click();
      URL.revokeObjectURL(a.href);
    },
    import() { $('#import-file').click(); },
    menu() { $('#menu').showModal(); },
    'close-menu'() { $('#menu').close(); },
    'add-project'() { $('#menu').close(); openForm('projects'); },
    sample() { if (confirm('載入範例資料會取代目前全部資料，確定？')) { db = sampleData(); save(); $('#menu').close(); location.hash = '#/'; render(); } },
    clear() { if (confirm('確定清空全部資料？此動作無法復原，建議先匯出備份。')) { db = emptyData(); save(); $('#menu').close(); location.hash = '#/'; render(); } },
    copy(btn) {
      const text = $('#report').value;
      const done = () => { btn.textContent = '已複製'; setTimeout(() => { btn.textContent = '複製文字'; }, 1500); };
      const legacy = () => { $('#report').select(); document.execCommand('copy'); done(); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, legacy); else legacy();
    },
    print() { window.print(); },
  };

  $('#import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    file.text().then((text) => {
      const data = JSON.parse(text);
      if (!COLLECTIONS.every((k) => Array.isArray(data[k]))) throw new Error('format');
      if (!confirm('匯入會取代目前全部資料，確定？')) return;
      db = Object.assign(emptyData(), data, { sample: false });
      save();
      location.hash = '#/';
      render();
    }).catch(() => alert('這個檔案不是有效的備份檔。')).finally(() => { e.target.value = ''; });
  });

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-done],[data-move],[data-add],[data-edit],[data-action]');
    if (!t || e.target.closest('a[href]')) return;
    if (t.dataset.done) setStatus(t.dataset.done, '完成');
    else if (t.dataset.move) setStatus(t.dataset.move, t.dataset.to);
    else if (t.dataset.add) openForm(t.dataset.add);
    else if (t.dataset.edit) openForm(t.dataset.edit, t.dataset.id);
    else actions[t.dataset.action]?.(t);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('[data-edit][tabindex]')) openForm(e.target.dataset.edit, e.target.dataset.id);
  });
  document.addEventListener('dragstart', (e) => {
    const card = e.target.closest?.('[data-drag]');
    if (card) { e.dataTransfer.setData('text/plain', card.dataset.drag); e.dataTransfer.effectAllowed = 'move'; }
  });
  document.addEventListener('dragover', (e) => { const col = e.target.closest?.('[data-col]'); if (col) { e.preventDefault(); col.classList.add('over'); } });
  document.addEventListener('dragleave', (e) => e.target.closest?.('[data-col]')?.classList.remove('over'));
  document.addEventListener('drop', (e) => {
    const col = e.target.closest?.('[data-col]');
    if (!col) return;
    e.preventDefault();
    col.classList.remove('over');
    setStatus(e.dataTransfer.getData('text/plain'), col.dataset.col);
  });
  window.addEventListener('hashchange', () => { const prev = route; route = parseRoute(); render(); if (prev.page !== route.page || prev.id !== route.id) window.scrollTo(0, 0); });

  function render() {
    route = parseRoute();
    const items = [['#/', '入口', route.page === 'home'], ...db.projects.map((p) => [`#/p/${p.id}/overview`, p.code || p.name, route.page === 'project' && route.id === p.id]), ['#/team', '團隊', route.page === 'team'], ['#/report', '週報', route.page === 'report']];
    $('#nav').innerHTML = items.map(([href, label, on]) => `<a href="${href}" ${on ? 'aria-current="page"' : ''}>${esc(label)}</a>`).join('');
    const banner = $('#banner');
    const msg = !storageOk ? '這個瀏覽器目前無法保存資料（可能是無痕模式），關閉頁面後資料會消失。'
      : db.sample ? '目前顯示的是範例資料，內容僅供示意。直接修改任何一筆就會開始保存你自己的資料；也可以到「更多」清空後從頭建立。' : '';
    banner.hidden = !msg;
    banner.textContent = msg;
    $('#view').innerHTML = route.page === 'project' ? projectView(project(route.id), route.sec) : route.page === 'team' ? teamView() : route.page === 'report' ? reportView() : homeView();
    document.querySelectorAll('.c-table').forEach((tb) => {
      const labels = [...tb.querySelectorAll('th')].map((th) => th.textContent);
      tb.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].forEach((td, i) => { if (labels[i]) td.dataset.label = labels[i]; }));
    });
  }
  render();
})();
