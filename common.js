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

/** 스크랩들을 주차별로 묶어 최신순으로. [{ week, label, count }] */
function weeksOf(rows) {
  return [...new Set(rows.map((r) => weekStart(r.date)))]
    .sort()
    .reverse()
    .map((w) => ({
      week: w,
      label: weekLabel(w),
      count: rows.filter((r) => weekStart(r.date) === w).length,
    }));
}

/** 주차 목록 한 덩어리. 시작화면과 뉴스스크랩이 같이 씁니다. */
function weekListHtml(weeks) {
  return weeks.length
    ? weeks.map((w) => `
        <li><a href="news-week.html?week=${w.week}">
          <span class="t">${w.label}</span>
          <span class="d">${w.count}개</span>
        </a></li>`).join('')
    : '<li class="empty">아직 올라온 스크랩이 없습니다.</li>';
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

/** 날짜 한 칸에 보여 줄 최대 개수. 넘치면 '+N' 으로 접습니다. */
const MAX_CHIPS = 2;

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
      // 한 칸에 많이 몰려도 달력이 길어지지 않도록 두 개까지만 보이고,
      // 나머지 개수는 날짜 옆에 '+N' 으로 붙입니다 (줄을 더 쓰지 않으려고)
      const items = marks[key] || [];
      const rest = items.length - MAX_CHIPS;
      const chips = items.slice(0, MAX_CHIPS).map((c) =>
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
        <div class="day-head"><span class="num">${d}</span>${
          rest > 0 ? `<span class="more-n">+${rest}</span>` : ''}</div>
        <div class="chips">${chips}</div></div>`;
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

/* ── 서식 있는 내용 칸 ──────────────────── */

/* 글 안에 남겨 둘 태그와 속성. 나머지는 모두 지웁니다.
 * 로그인이 없는 사이트라 남이 넣은 서식을 그대로 실행하면 안 됩니다. */
const OK_TAGS = new Set(
  ['P', 'DIV', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'SPAN', 'UL', 'OL', 'LI', 'A', 'IMG']);
const OK_ATTR = { A: ['href'], IMG: ['src', 'alt'] };

/** 위험한 것만 걷어내고 글자는 남깁니다. */
function safeHtml(html) {
  const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');

  function clean(el) {
    [...el.children].forEach(clean); // 안쪽부터 정리해야 껍데기를 벗겨도 안전합니다

    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') {
      el.remove();
      return;
    }
    if (!OK_TAGS.has(el.tagName)) {
      el.replaceWith(...el.childNodes); // 태그만 벗기고 글자는 남깁니다
      return;
    }
    const allow = OK_ATTR[el.tagName] || [];
    [...el.attributes].forEach((a) => {
      const isUrl = a.name === 'href' || a.name === 'src';
      if (!allow.includes(a.name) || (isUrl && !safeUrl(a.value))) el.removeAttribute(a.name);
    });
  }

  [...doc.body.children].forEach(clean);
  return doc.body.innerHTML;
}

/**
 * 내용 칸. 글자와 이미지를 같이 담습니다.
 * 붙여넣은 이미지는 곧바로 저장소에 올리고 커서 자리에 끼워 넣습니다.
 */
function richEditor(el) {
  el.contentEditable = 'true';

  el.addEventListener('paste', (e) => {
    const items = [...((e.clipboardData && e.clipboardData.items) || [])];
    const imgs = items.filter((i) => i.type.startsWith('image/'));
    e.preventDefault();

    if (!imgs.length) {
      // 다른 사이트에서 복사한 서식이 딸려오지 않게 글자만 넣습니다
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
      return;
    }

    el.classList.add('busy');
    (async () => {
      try {
        for (const it of imgs) {
          const file = it.getAsFile();
          if (!file) continue;
          const { file_id } = await Files.put(file);
          document.execCommand('insertHTML', false,
            `<img src="${esc(Files.url(file_id))}" alt="">`);
        }
      } finally {
        el.classList.remove('busy');
      }
    })();
  });

  return {
    /** 비어 있으면 빈 글자를 줍니다. 브라우저가 남기는 <br> 만 있는 경우를 거릅니다. */
    html() {
      const empty = !el.textContent.trim() && !el.querySelector('img');
      return empty ? '' : el.innerHTML.trim();
    },
    set(html) { el.innerHTML = safeHtml(html); },
  };
}

/** 글 내용을 그립니다. 서식이 없던 옛 글도 그대로 보입니다. */
function renderBody(el, text) {
  if (/<[a-z][\s\S]*>/i.test(text || '')) {
    el.innerHTML = safeHtml(text);
    el.classList.add('rich');
  } else {
    el.textContent = text || '';
    el.classList.remove('rich');
  }
}

/**
 * 제목 옆 점 세 개 메뉴. 바깥을 누르거나 Esc 를 누르면 닫힙니다.
 * 안에 든 수정·삭제 버튼의 동작은 부르는 쪽에서 붙입니다.
 */
function kebabMenu(btn, pop) {
  const close = () => {
    pop.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  };
  btn.onclick = (e) => {
    e.stopPropagation();
    const opening = pop.hidden;
    pop.hidden = !opening;
    btn.setAttribute('aria-expanded', String(opening));
  };
  pop.onclick = (e) => e.stopPropagation();
  document.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

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
