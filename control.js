(() => {
  'use strict';

  const KEY = 'rob-control-v1';
  const $ = (sel) => document.querySelector(sel);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const today = () => new Date().toISOString().slice(0, 10);
  const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const money = (n) => (Number(n) || 0).toLocaleString('zh-TW');
  const pct = (a, b) => (Number(b) > 0 ? Math.round((Number(a) / Number(b)) * 100) : 0);

  const PROJECT_STATUS = ['待啟動', '進行中', '收尾驗收', '暫停', '結案'];
  const TASK_STATUS = ['待辦', '進行中', '卡關', '完成'];
  const RISK = ['低', '中', '高'];
  const PRIORITY = ['一般', '重要', '緊急'];

  /* ---------- 資料 ---------- */
  function sampleData() {
    const t = ['王工程師', '李工程師', '陳工程師', '林工程師', '張工程師', '黃工程師', '吳工程師']
      .map((name, i) => ({ id: 't' + i, name, role: i < 2 ? '資深工程師' : i < 5 ? '工程師' : '新進工程師' }));
    const p = [
      { id: 'p1', name: 'A 廠二次配氣體管路', client: '業主甲', owner: 't0', status: '進行中', progress: 65, start: addDays(-60), due: addDays(30), contract: 4800000, billed: 2400000, risk: '中', note: '特氣段材料交期延後，需追蹤到貨日。' },
      { id: 'p2', name: 'B 廠機台 Hook-up', client: '業主乙', owner: 't1', status: '進行中', progress: 30, start: addDays(-20), due: addDays(-3), contract: 2600000, billed: 0, risk: '高', note: '業主變更機台位置，追加項目尚未議定。' },
      { id: 'p3', name: 'C 廠 Chiller 冷卻液更換', client: '業主丙', owner: 't2', status: '收尾驗收', progress: 95, start: addDays(-45), due: addDays(7), contract: 900000, billed: 630000, risk: '低', note: '待業主排定驗收時間。' },
      { id: 'p4', name: 'D 廠擴建案估價', client: '業主甲', owner: 't0', status: '待啟動', progress: 0, start: addDays(14), due: addDays(90), contract: 0, billed: 0, risk: '低', note: '報價送出，等待回覆。' },
    ];
    const k = [
      ['A 廠壓力測試報告送審', 'p1', 't0', 5, '進行中', '重要'],
      ['A 廠特氣材料到貨追蹤', 'p1', 't3', -2, '卡關', '緊急'],
      ['B 廠追加減項目清單與報價', 'p2', 't1', 2, '進行中', '緊急'],
      ['B 廠包商工期重排', 'p2', 't4', -1, '待辦', '重要'],
      ['C 廠驗收文件整理', 'p3', 't2', 6, '進行中', '一般'],
      ['D 廠圖面審查', 'p4', 't3', 10, '待辦', '一般'],
      ['包商單價資料庫更新', '', 't5', 12, '進行中', '一般'],
      ['二次配施工 SOP 文件化', '', 't6', 20, '待辦', '一般'],
      ['安衛教育訓練教材', '', 't5', -5, '完成', '一般'],
    ].map((r, i) => ({ id: 'k' + i, title: r[0], projectId: r[1], assignee: r[2], due: addDays(r[3]), status: r[4], priority: r[5] }));
    const m = [
      ['圖面審查件數', 12, 7, '件'],
      ['包商單價資料建檔', 80, 52, '項'],
      ['SOP 文件化', 6, 2, '份'],
      ['教育訓練時數', 40, 26, '小時'],
      ['工程缺失改善結案率', 90, 78, '%'],
    ].map((r, i) => ({ id: 'm' + i, name: r[0], target: r[1], actual: r[2], unit: r[3] }));
    return { sample: true, team: t, projects: p, tasks: k, kpis: m };
  }
  const emptyData = () => ({ sample: false, team: [], projects: [], tasks: [], kpis: [] });

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
  let tab = 'overview';
  const filter = { status: '', assignee: '', project: '' };

  /* ---------- 共用 ---------- */
  const member = (id) => db.team.find((x) => x.id === id);
  const project = (id) => db.projects.find((x) => x.id === id);
  const mName = (id) => member(id)?.name || '未指派';
  const pName = (id) => project(id)?.name || '部門內務';
  const openTask = (k) => k.status !== '完成';
  const isLate = (due, done) => !done && due && due < today();
  const projLate = (p) => isLate(p.due, p.status === '結案');

  function pill(text) {
    const map = { 高: 'bad', 卡關: 'bad', 緊急: 'bad', 中: 'warn', 重要: 'warn', 暫停: 'warn', 收尾驗收: 'ok', 完成: 'ok', 結案: 'ok', 低: 'ok', 進行中: '' };
    const cls = map[text] ?? 'mute';
    return `<span class="c-pill ${cls}">${esc(text)}</span>`;
  }
  function bar(value, cls = '') {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    return `<div class="c-bar ${cls}"><i><b style="width:${v}%"></b></i><span>${Number(value) || 0}%</span></div>`;
  }
  const dateCell = (d, late) => (d ? `<span class="${late ? 'c-late' : ''}">${esc(d)}${late ? '（逾期）' : ''}</span>` : '—');
  const table = (head, rows, empty) => `<div class="c-tablewrap"><table class="c-table"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td class="c-empty" colspan="${head.length}">${empty}</td></tr>`}</tbody></table></div>`;
  const head = (title, addType, addLabel, level = 'h1') => `<div class="c-head"><${level}>${title}</${level}>${addType ? `<button class="c-btn solid" data-add="${addType}">＋ ${addLabel}</button>` : ''}</div>`;

  function taskRow(k) {
    const late = isLate(k.due, k.status === '完成');
    return `<tr data-edit="tasks" data-id="${k.id}"><td class="wrap">${esc(k.title)}</td><td>${esc(pName(k.projectId))}</td><td>${esc(mName(k.assignee))}</td><td>${dateCell(k.due, late)}</td><td>${pill(k.priority)}</td><td>${pill(k.status)}</td><td class="act">${k.status === '完成' ? '' : `<button class="c-btn small" data-done="${k.id}">✓ 完成</button>`}</td></tr>`;
  }
  const TASK_HEAD = ['任務', '所屬案件', '負責人', '期限', '優先度', '狀態', ''];

  /* ---------- 各分頁 ---------- */
  const views = {
    overview() {
      const active = db.projects.filter((p) => p.status !== '結案');
      const contract = active.reduce((s, p) => s + (Number(p.contract) || 0), 0);
      const billed = active.reduce((s, p) => s + (Number(p.billed) || 0), 0);
      const attention = active.filter((p) => p.risk === '高' || projLate(p));
      const open = db.tasks.filter(openTask);
      const late = open.filter((k) => isLate(k.due));
      const stuck = open.filter((k) => k.status === '卡關');
      const week = open.filter((k) => k.due && k.due >= today() && k.due <= addDays(7));
      const focus = [...new Set([...late, ...stuck, ...week])].sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));

      return `${head('總覽')}
        <div class="c-tiles">
          <div class="c-tile dark"><small>進行中案件</small><strong>${active.length}</strong><span>共 ${db.projects.length} 案</span></div>
          <div class="c-tile ${attention.length ? 'bad' : ''}"><small>需關注案件</small><strong>${attention.length}</strong><span>高風險或已逾期</span></div>
          <div class="c-tile ${late.length ? 'bad' : ''}"><small>逾期任務</small><strong>${late.length}</strong><span>卡關 ${stuck.length} 件</span></div>
          <div class="c-tile"><small>未完成任務</small><strong>${open.length}</strong><span>7 天內到期 ${week.length} 件</span></div>
          <div class="c-tile"><small>合約總額</small><strong>${money(contract)}</strong><span>進行中案件</span></div>
          <div class="c-tile"><small>未請款金額</small><strong>${money(contract - billed)}</strong><span>已請款 ${pct(billed, contract)}%</span></div>
        </div>
        <div class="c-section">${head('需關注案件', '', '', 'h2')}
          ${table(['案件', '負責人', '進度', '期限', '風險', '說明'], attention.map((p) => `<tr data-edit="projects" data-id="${p.id}"><td>${esc(p.name)}</td><td>${esc(mName(p.owner))}</td><td>${bar(p.progress)}</td><td>${dateCell(p.due, projLate(p))}</td><td>${pill(p.risk)}</td><td class="wrap">${esc(p.note)}</td></tr>`), '目前沒有高風險或逾期的案件。')}
        </div>
        <div class="c-section">${head('本週要盯的任務', '', '', 'h2')}
          ${table(TASK_HEAD, focus.map(taskRow), '本週沒有到期、逾期或卡關的任務。')}
        </div>`;
    },

    projects() {
      const rows = db.projects.map((p) => `<tr data-edit="projects" data-id="${p.id}">
        <td>${esc(p.name)}</td><td>${esc(p.client)}</td><td>${esc(mName(p.owner))}</td><td>${pill(p.status)}</td>
        <td>${bar(p.progress, p.status === '結案' ? 'done' : '')}</td><td>${dateCell(p.due, projLate(p))}</td>
        <td class="num">${money(p.contract)}</td><td class="num">${money(p.billed)}</td><td class="num">${pct(p.billed, p.contract)}%</td><td>${pill(p.risk)}</td></tr>`);
      return `${head('案件', 'projects', '新增案件')}
        <p class="c-sub" style="margin-bottom:12px">點任一列可編輯。金額單位：元。</p>
        ${table(['案件', '業主', '負責人', '狀態', '進度', '期限', '合約金額', '已請款', '請款率', '風險'], rows, '尚無案件，按右上「新增案件」開始。')}`;
    },

    tasks() {
      const opt = (list, cur, all) => `<option value="">${all}</option>` + list.map(([v, l]) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`).join('');
      const list = db.tasks
        .filter((k) => (!filter.status || k.status === filter.status) && (!filter.assignee || k.assignee === filter.assignee) && (!filter.project || (filter.project === '_none' ? !project(k.projectId) : k.projectId === filter.project)))
        .sort((a, b) => (a.status === '完成') - (b.status === '完成') || (a.due || '9').localeCompare(b.due || '9'));
      return `${head('任務', 'tasks', '新增任務')}
        <div class="c-filters">
          <select data-filter="status" aria-label="依狀態篩選">${opt(TASK_STATUS.map((s) => [s, s]), filter.status, '全部狀態')}</select>
          <select data-filter="assignee" aria-label="依負責人篩選">${opt(db.team.map((m) => [m.id, m.name]), filter.assignee, '全部人員')}</select>
          <select data-filter="project" aria-label="依案件篩選">${opt([...db.projects.map((p) => [p.id, p.name]), ['_none', '部門內務']], filter.project, '全部案件')}</select>
        </div>
        ${table(TASK_HEAD, list.map(taskRow), '沒有符合條件的任務。')}`;
    },

    team() {
      const cards = db.team.map((m) => {
        const mine = db.tasks.filter((k) => k.assignee === m.id && openTask(k));
        const late = mine.filter((k) => isLate(k.due)).length;
        const owns = db.projects.filter((p) => p.owner === m.id && p.status !== '結案').length;
        return `<div class="c-card" data-edit="team" data-id="${m.id}" tabindex="0">
          <h3>${esc(m.name)}</h3><p>${esc(m.role || '')}</p>
          <span class="c-pill">未完成 ${mine.length}</span> <span class="c-pill ${late ? 'bad' : 'mute'}">逾期 ${late}</span> <span class="c-pill mute">主責 ${owns} 案</span>
          <ul>${mine.slice(0, 4).map((k) => `<li>${esc(k.title)}</li>`).join('') || '<li>目前沒有指派任務</li>'}</ul></div>`;
      });
      return `${head('團隊', 'team', '新增成員')}
        <p class="c-sub" style="margin-bottom:12px">每人目前的工作負載。未完成任務為 0 的人，就是可以再分派工作的人。</p>
        <div class="c-cards">${cards.join('') || '<p class="c-empty">尚無成員。</p>'}</div>`;
    },

    kpis() {
      const rows = db.kpis.map((m) => {
        const r = pct(m.actual, m.target);
        return `<tr data-edit="kpis" data-id="${m.id}"><td>${esc(m.name)}</td><td class="num">${esc(m.target)} ${esc(m.unit)}</td><td class="num">${esc(m.actual)} ${esc(m.unit)}</td><td>${bar(r, r >= 100 ? 'done' : '')}</td></tr>`;
      });
      return `${head('KPI', 'kpis', '新增指標')}
        <p class="c-sub" style="margin-bottom:12px">案量不足時，建議以可控的過程指標為主：審圖、資料庫、SOP、訓練、缺失改善。</p>
        ${table(['指標', '目標', '目前', '達成率'], rows, '尚無指標。')}`;
    },

    report() {
      return `${head('週報')}
        <p class="c-sub" style="margin-bottom:12px">依目前資料自動整理成給主管的格式，可直接修改後複製。</p>
        <div class="c-filters"><button class="c-btn solid" data-action="copy">複製文字</button><button class="c-btn" data-action="print">列印 / 存 PDF</button></div>
        <textarea class="c-report" id="report" aria-label="週報內容">${esc(buildReport())}</textarea>`;
    },
  };

  function buildReport() {
    const active = db.projects.filter((p) => p.status !== '結案');
    const open = db.tasks.filter(openTask);
    const line = (k) => `- ${k.title}（${mName(k.assignee)}，期限 ${k.due || '未定'}）`;
    const sec = (title, items, none) => `${title}\n${items.length ? items.join('\n') : `- ${none}`}`;
    const risks = [
      ...active.filter((p) => p.risk === '高' || projLate(p)).map((p) => `- ${p.name}：${projLate(p) ? '已逾期。' : ''}${p.note || '高風險，待補說明。'}`),
      ...open.filter((k) => k.status === '卡關').map((k) => `- 任務卡關：${k.title}（${mName(k.assignee)}）`),
    ];
    return [
      `工程課週報　${today()}`,
      sec('一、案件進度', active.map((p) => `- ${p.name}｜${p.status}｜進度 ${p.progress || 0}%｜期限 ${p.due || '未定'}｜負責人 ${mName(p.owner)}`), '目前無進行中案件'),
      sec('二、計價請款', active.filter((p) => Number(p.contract) > 0).map((p) => `- ${p.name}：合約 ${money(p.contract)}，已請款 ${money(p.billed)}（${pct(p.billed, p.contract)}%），未請款 ${money(p.contract - p.billed)}`), '本期無計價項目'),
      sec('三、風險與卡關事項', risks, '目前無重大風險'),
      sec('四、下週預計推進', open.filter((k) => k.due && k.due <= addDays(7)).sort((a, b) => a.due.localeCompare(b.due)).map(line), '無 7 天內到期任務'),
      sec('五、團隊人力配置', db.team.map((m) => `- ${m.name}：未完成任務 ${open.filter((k) => k.assignee === m.id).length} 件`), '尚未建立成員'),
      sec('六、KPI 達成狀況', db.kpis.map((m) => `- ${m.name}：${m.actual}/${m.target} ${m.unit}（${pct(m.actual, m.target)}%）`), '尚未設定指標'),
      '七、需主管協助事項\n- （請填寫）',
    ].join('\n\n');
  }

  /* ---------- 表單 ---------- */
  const teamOpts = () => [['', '未指派'], ...db.team.map((m) => [m.id, m.name])];
  const schemas = {
    projects: { label: '案件', fields: () => [
      ['name', '案件名稱', 'text', { full: true, required: true }], ['client', '業主', 'text'], ['owner', '負責人', 'select', { options: teamOpts() }],
      ['status', '狀態', 'select', { options: PROJECT_STATUS.map((s) => [s, s]), def: '進行中' }], ['risk', '風險', 'select', { options: RISK.map((s) => [s, s]), def: '低' }],
      ['progress', '進度 %', 'number', { min: 0, max: 100, def: 0 }], ['start', '開始日', 'date'], ['due', '期限', 'date'],
      ['contract', '合約金額', 'number', { min: 0, def: 0 }], ['billed', '已請款金額', 'number', { min: 0, def: 0 }], ['note', '風險與說明', 'textarea', { full: true }]] },
    tasks: { label: '任務', fields: () => [
      ['title', '任務內容', 'text', { full: true, required: true }], ['projectId', '所屬案件', 'select', { options: [['', '部門內務'], ...db.projects.map((p) => [p.id, p.name])] }],
      ['assignee', '負責人', 'select', { options: teamOpts() }], ['due', '期限', 'date'],
      ['priority', '優先度', 'select', { options: PRIORITY.map((s) => [s, s]), def: '一般' }], ['status', '狀態', 'select', { options: TASK_STATUS.map((s) => [s, s]), def: '待辦' }]] },
    team: { label: '成員', fields: () => [['name', '姓名', 'text', { required: true }], ['role', '職稱', 'text']] },
    kpis: { label: '指標', fields: () => [['name', '指標名稱', 'text', { full: true, required: true }], ['target', '目標值', 'number', { min: 0, def: 0 }], ['actual', '目前值', 'number', { min: 0, def: 0 }], ['unit', '單位', 'text']] },
  };

  let editing = null;
  function openForm(type, id) {
    const schema = schemas[type];
    const item = id ? db[type].find((x) => x.id === id) : null;
    editing = { type, id };
    $('#form-title').textContent = (item ? '編輯' : '新增') + schema.label;
    $('#form-delete').hidden = !item;
    $('#form-fields').innerHTML = schema.fields().map(([key, label, kind, o = {}]) => {
      const val = item ? item[key] ?? '' : o.def ?? '';
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
    if (!confirm('確定刪除這筆資料？')) return;
    db[type] = db[type].filter((x) => x.id !== id);
    if (type === 'team') { db.tasks.forEach((k) => { if (k.assignee === id) k.assignee = ''; }); db.projects.forEach((p) => { if (p.owner === id) p.owner = ''; }); }
    if (type === 'projects') db.tasks.forEach((k) => { if (k.projectId === id) k.projectId = ''; });
    $('#dialog').close();
    commit();
  });

  /* ---------- 事件 ---------- */
  const actions = {
    export() {
      const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `專案管控備份-${today()}.json` });
      a.click();
      URL.revokeObjectURL(a.href);
    },
    import() { $('#import-file').click(); },
    menu() { $('#menu').showModal(); },
    'close-menu'() { $('#menu').close(); },
    sample() { if (confirm('載入範例資料會取代目前全部資料，確定？')) { db = sampleData(); save(); $('#menu').close(); render(); } },
    clear() { if (confirm('確定清空全部資料？此動作無法復原，建議先匯出備份。')) { db = emptyData(); save(); $('#menu').close(); render(); } },
    copy(btn) {
      const text = $('#report').value;
      const done = () => { btn.textContent = '已複製'; setTimeout(() => { btn.textContent = '複製文字'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => { $('#report').select(); document.execCommand('copy'); done(); });
      else { $('#report').select(); document.execCommand('copy'); done(); }
    },
    print() { window.print(); },
  };

  $('#import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    file.text().then((text) => {
      const data = JSON.parse(text);
      if (!['team', 'projects', 'tasks', 'kpis'].every((k) => Array.isArray(data[k]))) throw new Error('format');
      if (!confirm('匯入會取代目前全部資料，確定？')) return;
      db = Object.assign(emptyData(), data, { sample: false });
      save();
      render();
    }).catch(() => alert('這個檔案不是有效的備份檔。')).finally(() => { e.target.value = ''; });
  });

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-done],[data-tab],[data-add],[data-edit],[data-action]');
    if (!t) return;
    if (t.dataset.done) { db.tasks.find((k) => k.id === t.dataset.done).status = '完成'; commit(); return; }
    if (t.dataset.tab) { tab = t.dataset.tab; render(); window.scrollTo(0, 0); }
    else if (t.dataset.add) openForm(t.dataset.add);
    else if (t.dataset.edit) openForm(t.dataset.edit, t.dataset.id);
    else actions[t.dataset.action]?.(t);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('.c-card[data-edit]')) openForm(e.target.dataset.edit, e.target.dataset.id);
  });
  document.addEventListener('change', (e) => {
    const key = e.target.dataset?.filter;
    if (key) { filter[key] = e.target.value; render(); }
  });

  function render() {
    document.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    const banner = $('#banner');
    const msg = !storageOk ? '這個瀏覽器目前無法保存資料（可能是無痕模式），關閉頁面後資料會消失。'
      : db.sample ? '目前顯示的是範例資料。直接修改或新增任何一筆，就會開始保存你自己的資料；也可以到「更多」清空後從頭建立。' : '';
    banner.hidden = !msg;
    banner.textContent = msg;
    $('#view').innerHTML = views[tab]();
    document.querySelectorAll('.c-table').forEach((tb) => {
      const labels = [...tb.querySelectorAll('th')].map((th) => th.textContent);
      tb.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].forEach((td, i) => { if (labels[i]) td.dataset.label = labels[i]; }));
    });
  }
  render();
})();
