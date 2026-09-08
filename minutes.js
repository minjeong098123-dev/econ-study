/* 회의록 — 목록·작성·보기를 이 파일 하나로 맡습니다.
 * 페이지가 <body data-mode="list|write|view"> 로 알려 줍니다.
 * 게시판과 달리 회의 날짜와 참석자가 있습니다. */

const LIST = 'minutes.html';
const WRITE = 'minutes-write.html';
const VIEW = 'minutes-view.html';

/** 참석자 이름 목록. 옛 자료가 비어 있어도 배열로 돌려줍니다. */
const who = (row) => (Array.isArray(row.attendees) ? row.attendees : []);

/* ── 목록 ───────────────────────────────── */

async function initList() {
  const rows = await Store.list('minutes');
  const box = $('#list');
  const q = $('#q');
  let page = 1;

  function draw() {
    const key = q.value.trim().toLowerCase();
    const hit = key
      ? rows.filter((r) =>
          `${r.title} ${r.body} ${who(r).join(' ')}`.toLowerCase().includes(key))
      : rows;

    const pages = Math.max(1, Math.ceil(hit.length / PER_PAGE));
    if (page > pages) page = pages;

    if (!hit.length) {
      box.innerHTML = `<li class="empty">${
        key ? '찾는 회의록이 없습니다.' : '아직 올라온 회의록이 없습니다.'
      }</li>`;
      $('#pager').innerHTML = '';
      return;
    }

    box.innerHTML = hit
      .slice((page - 1) * PER_PAGE, page * PER_PAGE)
      .map((r) => `
        <li><a href="${VIEW}?id=${r.id}">
          <span class="t">${esc(r.title)}</span>
          ${who(r).length ? `<span class="tag">${who(r).length}명</span>` : ''}
          ${r.file_id ? '<span class="tag">첨부</span>' : ''}
          <span class="d">${fmtDate(r.date)}</span>
        </a></li>`).join('');

    renderPager($('#pager'), page, pages, (to) => { page = to; draw(); });
  }

  // 검색하면 늘 첫 쪽부터 봅니다
  function search() {
    page = 1;
    draw();
  }

  $('#search').onclick = search;
  q.oninput = search;
  q.onkeydown = (e) => { if (e.key === 'Enter') search(); };
  $('#write').onclick = () => go(WRITE);
  draw();
}

/* ── 작성 · 수정 ────────────────────────── */

/** 명단을 눌러 고르는 참석자 칸 */
function attendeeBox(el, picked = []) {
  const chosen = new Set(picked);

  el.innerHTML = members().map((m) => `
    <label class="check${chosen.has(m) ? ' on' : ''}">
      <input type="checkbox" value="${esc(m)}"${chosen.has(m) ? ' checked' : ''}>
      ${esc(m)}
    </label>`).join('');

  $$('input', el).forEach((box) => {
    box.onchange = () => box.closest('.check').classList.toggle('on', box.checked);
  });

  return () => $$('input:checked', el).map((b) => b.value);
}

async function initWrite() {
  const id = param('id');
  const row = id ? await Store.get('minutes', id) : null;
  if (id && !row) throw new Error('회의록을 찾을 수 없습니다.');

  $('#date').value = row ? row.date : param('date') || ymd(new Date());

  const editor = richEditor($('#body'));
  const getAttendees = attendeeBox($('#attendees'), row ? who(row) : []);

  if (row) {
    $('#title').value = row.title || '';
    editor.set(row.body);
    $('#submit').textContent = '수정하기';
  }

  const picker = filePicker({
    box: $('#file-box'),
    input: $('#file-input'),
    button: $('#upload'),
    existing: row,
  });

  $('#submit').onclick = async () => {
    const title = $('#title').value.trim();
    if (!title) {
      alert('제목을 적어 주세요.');
      $('#title').focus();
      return;
    }
    if (!$('#date').value) {
      alert('회의 날짜를 골라 주세요.');
      $('#date').focus();
      return;
    }

    $('#submit').disabled = true;
    const data = {
      date: $('#date').value,
      title,
      attendees: getAttendees(),
      body: editor.html(),
      ...(await picker.save()),
    };

    if (row) {
      // 고칠 때는 보던 회의록으로 돌아가고, 새로 쓸 때는 목록으로 갑니다
      await Store.update('minutes', row.id, data);
      go(`${VIEW}?id=${row.id}`);
    } else {
      await Store.insert('minutes', data);
      go(LIST);
    }
  };

  $('#cancel').onclick = () => history.back();
}

/* ── 보기 ───────────────────────────────── */

async function initView() {
  const row = await Store.get('minutes', param('id'));
  if (!row) throw new Error('회의록을 찾을 수 없습니다.');

  $('#title').textContent = row.title;
  $('#meta').textContent = fmtDate(row.date);
  renderBody($('#body'), row.body);

  const names = who(row);
  if (names.length) {
    $('#attendees-wrap').hidden = false;
    $('#attendees').innerHTML = names.map((n) => `<span class="who">${esc(n)}</span>`).join('');
  }

  if (row.file_id) {
    $('#file-wrap').hidden = false;
    await renderAttach($('#file'), row);
  }

  kebabMenu($('#menu-btn'), $('#menu-pop'));
  $('#edit').onclick = () => go(`${WRITE}?id=${row.id}`);
  $('#del').onclick = async () => {
    if (!confirm('이 회의록을 지울까요? 되돌릴 수 없습니다.')) return;
    await Store.remove('minutes', row.id);
    go(LIST);
  };
}

boot({ list: initList, write: initWrite, view: initView }[document.body.dataset.mode]);
