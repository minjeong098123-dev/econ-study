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

/* 스터디원 명단. 표에서 한 번 읽어 두고 여기에 담습니다.
 * 페이지마다 boot() 이 채워 주므로 아래 members() 는 그냥 부르면 됩니다. */
let MEMBER_NAMES = [];

/** 늘 가나다순으로 */
const members = () => [...MEMBER_NAMES].sort((a, b) => a.localeCompare(b, 'ko'));

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

/** 반복 종류와 화면에 보일 이름 */
const REPEATS = [
  { key: '',          label: '반복 없음' },
  { key: 'weekly',    label: '매주' },
  { key: 'biweekly',  label: '2주마다' },
  { key: 'monthly',   label: '매월' },
];
const repeatLabel = (key) => (REPEATS.find((r) => r.key === key) || REPEATS[0]).label;

/** '이 날만 빼기'로 건너뛴 날짜들 */
const skipsOf = (t) => (Array.isArray(t.skips) ? t.skips : []);

/**
 * 일정 하나를 실제 날짜 목록으로 펼칩니다.
 * 반복이 없으면 그 날 하루뿐입니다. 빼 둔 날짜는 빠집니다.
 *
 * @param t     schedule 한 줄 (date, repeat, repeat_until, skips)
 * @param from  'YYYY-MM-DD' 부터
 * @param to    'YYYY-MM-DD' 까지
 * @returns ['YYYY-MM-DD', ...]
 */
function occurrencesOf(t, from, to) {
  const skip = new Set(skipsOf(t));
  const keep = (s) => s >= from && s <= to && !skip.has(s);

  if (!t.repeat) return keep(t.date) ? [t.date] : [];

  const out = [];
  const start = toDate(t.date);
  const last = t.repeat_until && t.repeat_until < to ? t.repeat_until : to;
  const step = { weekly: 7, biweekly: 14 }[t.repeat];

  if (step) {
    const d = new Date(start);
    // 첫 날부터 한 칸씩 나아갑니다. 500번이면 몇 년치라 넉넉합니다.
    for (let i = 0; i < 500 && ymd(d) <= last; i++) {
      if (keep(ymd(d))) out.push(ymd(d));
      d.setDate(d.getDate() + step);
    }
    return out;
  }

  // 매월: 날짜를 그대로 유지합니다. 그 달에 없는 날(31일 등)은 건너뜁니다.
  const day = start.getDate();
  for (let i = 0; i < 500; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, day);
    if (d.getDate() !== day) continue;
    const s = ymd(d);
    if (s > last) break;
    if (keep(s)) out.push(s);
  }
  return out;
}

/** 원래는 이 날 있어야 하는데 '이 날만 빼기'로 쉬는 일정인가 */
function isSkipped(t, date) {
  return skipsOf(t).includes(date)
    && occurrencesOf({ ...t, skips: [] }, date, date).length > 0;
}

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
  { key: 'minutes',  href: 'minutes.html',  label: '회의록' },
];

/** 작성 페이지에는 #topbar 가 없습니다. 그럴 땐 아무 일도 하지 않습니다. */
function renderTopbar() {
  const host = $('#topbar');
  if (!host) return;
  const here = document.body.dataset.page;
  host.innerHTML =
    `<a class="brand" href="index.html">${esc(CFG.NAME || '스터디')}</a>` +
    `<nav>${MENU.map((m) =>
      `<a href="${m.href}"${m.key === here ? ' class="on"' : ''}>${m.label}</a>`).join('')}</nav>` +
    `<div class="menu gear-wrap">
       <button type="button" class="gear${here === 'members' ? ' on' : ''}"
               id="gear-btn" aria-label="설정" aria-expanded="false">
         <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="1.9"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <circle cx="12" cy="12" r="3.2"/>
           <path d="M19.5 12a7.6 7.6 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.6 3H9.4l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5.2l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2z"/>
         </svg>
       </button>
       <div class="menu-pop" id="gear-pop" hidden>
         <a href="members.html">명단 관리</a>
       </div>
     </div>`;

  kebabMenu($('#gear-btn'), $('#gear-pop'));
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
    // 반복 일정을 펼치려면 지금 보고 있는 달이 어디까지인지 알려 줘야 합니다
    const from = `${y}-${pad(m + 1)}-01`;
    const to = `${y}-${pad(m + 1)}-${pad(days)}`;
    const marks = (opts.marks && opts.marks(from, to)) || {};
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

/* ── 페이지 넘기기 ─────────────────────── */

/** 한 쪽에 보여 줄 글 개수 */
const PER_PAGE = 10;

/**
 * 쪽 번호 단추들. 누르면 onGo(쪽번호) 를 부릅니다.
 * 한 쪽뿐이면 아무것도 그리지 않습니다.
 */
function renderPager(el, page, pages, onGo) {
  if (pages <= 1) {
    el.innerHTML = '';
    return;
  }
  const btn = (to, label, cls = '') =>
    `<button type="button" class="pg${cls}" data-go="${to}">${label}</button>`;

  el.innerHTML =
    btn(page - 1, '‹ 이전', page === 1 ? ' off' : '') +
    Array.from({ length: pages }, (_, i) =>
      btn(i + 1, i + 1, i + 1 === page ? ' on' : '')).join('') +
    btn(page + 1, '다음 ›', page === pages ? ' off' : '');

  $$('.pg', el).forEach((b) => {
    b.onclick = () => {
      const to = Number(b.dataset.go);
      if (to < 1 || to > pages || to === page) return;
      onGo(to);
      window.scrollTo({ top: 0 });
    };
  });
}

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
 * 페이지 공통 시작 절차. 메뉴를 그리고, 명단을 읽어 둔 뒤 페이지별 초기화를 부릅니다.
 * Supabase 주소와 키가 비어 있으면 안내만 띄우고 멈춥니다.
 */
function boot(start) {
  renderTopbar();
  if (!CONFIGURED) {
    banner('config.js 에 Supabase 주소와 anon key 를 넣으면 내용이 표시됩니다. (README 참고)');
    return;
  }
  (async () => {
    // 명단을 못 읽어도 화면은 떠야 합니다.
    // 이름 고르는 칸만 비고 나머지는 그대로 쓸 수 있게 둡니다.
    try {
      MEMBER_NAMES = (await Store.list('member')).map((m) => m.name);
    } catch (e) {
      console.error('명단을 읽지 못했습니다.', e);
    }
    await start();
  })().catch((e) => {
    console.error(e);
    const msg = (e && e.message) || String(e);
    banner(/Failed to fetch|NetworkError/i.test(msg)
      ? 'Supabase 에 연결하지 못했습니다. config.js 의 주소와 키가 맞는지, 인터넷이 연결돼 있는지 확인해 주세요.'
      : msg);
  });
}
