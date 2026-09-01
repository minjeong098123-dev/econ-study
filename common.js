/* 모든 페이지가 같이 쓰는 것 — 상단 메뉴, 달력, 파일 고르기, 잔손질 함수들 */

const CFG = window.STUDY || {};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const pad = (n) => String(n).padStart(2, '0');

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** 주소창의 ?id=... 같은 값 */
const param = (k) => new URLSearchParams(location.search).get(k);

/** 늘 가나다순으로 */
const members = () => [...(CFG.MEMBERS || [])].sort((a, b) => a.localeCompare(b, 'ko'));

const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 'YYYY-MM-DD' 는 UTC 자정으로 읽혀 하루씩 밀리므로 직접 만듭니다. */
function toDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
}

function fmtDate(s) {
  if (!s) return '';
  const d = toDate(s);
  return `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}.`;
}

/** javascript: 같은 주소가 들어오지 않도록 */
function safeUrl(u) {
  return /^https?:\/\//i.test(u || '') ? u : null;
}

function go(href) {
  location.href = href;
}

/* ── 주차 ───────────────────────────────── */

/** 일정 정렬. 시간이 빈 '종일'은 휴대폰 일정표처럼 맨 위에 옵니다. */
const byTime = (a, b) => (a.time || '').localeCompare(b.time || '');

/** 그 날짜가 속한 주의 일요일 */
function weekStart(dateStr) {
  const d = toDate(dateStr);
  d.setDate(d.getDate() - d.getDay());
  return ymd(d);
}

/** 'n월 n주차'. 그 주 수요일이 낀 달을 기준으로, 며칠인지를 7로 나눠 셉니다. */
function weekLabel(startStr) {
  const d = toDate(startStr);
  d.setDate(d.getDate() + 3);
  return `${d.getMonth() + 1}월 ${Math.ceil(d.getDate() / 7)}주차`;
}

/* ── 상단 메뉴 ──────────────────────────── */

const MENU = [
  { key: 'notice',   href: 'notice.html',   label: '공지사항' },
  { key: 'info',     href: 'info.html',     label: '정보 공유' },
  { key: 'schedule', href: 'schedule.html', label: '일정표' },
  { key: 'news',     href: 'news.html',     label: '뉴스스크랩' },
];

/** 작성 페이지에는 #topbar 가 없습니다. 그럴 땐 아무 일도 하지 않습니다. */
function renderTopbar() {
  const host = $('#topbar');
  if (!host) return;
  const here = document.body.dataset.page;
  host.innerHTML =
    `<a class="brand" href="index.html">${esc(CFG.NAME || '스터디')}</a>` +
    `<nav>${MENU.map((m) =>
      `<a href="${m.href}"${m.key === here ? ' class="on"' : ''}>${m.label}</a>`).join('')}</nav>`;
}

/* ── 달력 ───────────────────────────────── */

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 달력을 그립니다. 달 넘기기 버튼이 딸려 옵니다.
 *
 * @param el            달력을 넣을 자리
 * @param opts.marks    () => ({ 'YYYY-MM-DD': [{ text, href }] }) 날짜 칸에 붙일 것들
 * @param opts.onPick   날짜 빈 곳을 눌렀을 때 부를 함수 (date)
 * @param opts.selected 테두리를 둘러 보여줄 날짜
 * @returns { draw, select } — 내용이 바뀌면 draw() 를 다시 부르세요.
 */
function calendar(el, opts = {}) {
  const view = toDate(opts.start || ymd(new Date()));
  view.setDate(1);
  let selected = opts.selected || null;

  function draw() {
    const y = view.getFullYear();
    const m = view.getMonth();
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const marks = (opts.marks && opts.marks()) || {};
    const today = ymd(new Date());

    let cells = '';
    for (let i = 0; i < first; i++) cells += '<div class="day out"></div>';

    for (let d = 1; d <= days; d++) {
      const key = `${y}-${pad(m + 1)}-${pad(d)}`;
      const dow = (first + d - 1) % 7;
      const chips = (marks[key] || []).map((c) =>
        c.href
          ? `<a class="chip" href="${c.href}">${esc(c.text)}</a>`
          : `<span class="chip">${esc(c.text)}</span>`).join('');
      const cls = ['day'];
      if (dow === 0) cls.push('sun');
      if (dow === 6) cls.push('sat');
      if (key === today) cls.push('today');
      if (key === selected) cls.push('sel');
      if (opts.onPick) cls.push('pick');
      cells += `<div class="${cls.join(' ')}" data-date="${key}">
        <span class="num">${d}</span><div class="chips">${chips}</div></div>`;
    }

    // 마지막 줄이 중간에 끊기면 남은 칸이 배경색으로 비쳐서, 앞쪽처럼 빈 칸으로 채웁니다
    const tail = (7 - ((first + days) % 7)) % 7;
    for (let i = 0; i < tail; i++) cells += '<div class="day out"></div>';

    el.innerHTML = `
      <div class="cal-head">
        <button type="button" class="cal-nav" data-go="-1" aria-label="이전 달">‹</button>
        <strong>${y}년 ${m + 1}월</strong>
        <button type="button" class="cal-nav" data-go="1" aria-label="다음 달">›</button>
      </div>
      <div class="cal-grid">
        ${DOW.map((d, i) =>
          `<div class="dow${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}">${d}</div>`).join('')}
        ${cells}
      </div>`;

    $$('.cal-nav', el).forEach((b) => {
      b.onclick = () => {
        view.setMonth(view.getMonth() + Number(b.dataset.go));
        draw();
      };
    });

    if (opts.onPick) {
      $$('.day.pick', el).forEach((cell) => {
        cell.onclick = (e) => {
          // 칸 안의 이름표를 누른 것이면 그쪽 링크가 처리하게 둡니다
          if (e.target.closest('.chip')) return;
          opts.onPick(cell.dataset.date);
        };
      });
    }
  }

  draw();
  return {
    draw,
    select(date) {
      selected = date;
      draw();
    },
  };
}

/* ── 파일 고르기 ────────────────────────── */

/**
 * '상자를 눌러 파일을 고르고, 옆의 업로드 버튼으로 올리기'.
 *
 * 고르기만 하고 업로드를 안 누른 채 작성하기를 눌러도 괜찮도록,
 * save() 가 그때 알아서 올립니다.
 *
 * @returns { save } — { file_id, file_name } 을 돌려줍니다.
 */
function filePicker({ box, input, button, existing }) {
  let picked = null;
  let saved = existing && existing.file_id
    ? { file_id: existing.file_id, file_name: existing.file_name }
    : null;

  function show(text, cls) {
    box.textContent = text;
    box.className = `file-box${cls ? ' ' + cls : ''}`;
  }

  function reset() {
    if (saved) show(`${saved.file_name} · 업로드됨`, 'done');
    else show('여기를 눌러 파일을 고르세요');
  }

  box.onclick = () => input.click();
  input.onchange = () => {
    picked = input.files[0] || null;
    if (picked) show(picked.name, 'ready');
    else reset();
  };

  button.onclick = async () => {
    if (!picked) {
      alert(saved ? '이미 업로드된 파일이 있습니다.' : '먼저 파일을 고르세요.');
      return;
    }
    button.disabled = true;
    try {
      if (saved) await Files.remove(saved.file_id);
      saved = await Files.put(picked);
      picked = null;
      input.value = '';
      reset();
    } finally {
      button.disabled = false;
    }
  };

  reset();

  return {
    async save() {
      if (picked) {
        if (saved) await Files.remove(saved.file_id);
        saved = await Files.put(picked);
        picked = null;
      }
      return saved || { file_id: null, file_name: null };
    },
  };
}

/* ── 시작 ───────────────────────────────── */

function banner(msg) {
  const b = $('#banner');
  if (!b) return;
  b.textContent = msg;
  b.hidden = !msg;
}

/**
 * 페이지 공통 시작 절차. 메뉴를 그리고 페이지별 초기화를 부릅니다.
 * Supabase 주소와 키가 비어 있으면 안내만 띄우고 멈춥니다.
 */
function boot(start) {
  renderTopbar();
  if (!CONFIGURED) {
    banner('config.js 에 Supabase 주소와 anon key 를 넣으면 내용이 표시됩니다. (README 참고)');
    return;
  }
  Promise.resolve(start()).catch((e) => {
    console.error(e);
    const msg = (e && e.message) || String(e);
    banner(/Failed to fetch|NetworkError/i.test(msg)
      ? 'Supabase 에 연결하지 못했습니다. config.js 의 주소와 키가 맞는지, 인터넷이 연결돼 있는지 확인해 주세요.'
      : msg);
  });
}
