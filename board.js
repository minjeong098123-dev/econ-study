/* 공지사항과 정보 공유는 구성이 같아서 이 파일 하나로 셋 다 맡습니다.
 * 페이지가 <body data-board="notice|info" data-mode="list|write|view"> 로 알려 줍니다.
 * 두 게시판 모두 제목·내용·링크·파일을 씁니다. */

const BOARD = document.body.dataset.board;
const PAGE = {
  list: `${BOARD}.html`,
  write: `${BOARD}-write.html`,
  view: `${BOARD}-view.html`,
};

/* ── 목록 ───────────────────────────────── */

/** 한 쪽에 보여 줄 글 개수 */
const PER_PAGE = 10;

async function initList() {
  const rows = await Store.list(BOARD);
  const box = $('#list');
  const q = $('#q');
  let page = 1;

  function draw() {
    const key = q.value.trim().toLowerCase();
    const hit = key
      ? rows.filter((r) => `${r.title} ${r.body}`.toLowerCase().includes(key))
      : rows;

    const pages = Math.max(1, Math.ceil(hit.length / PER_PAGE));
    if (page > pages) page = pages;

    if (!hit.length) {
      box.innerHTML = `<li class="empty">${
        key ? '찾는 글이 없습니다.' : '아직 올라온 글이 없습니다.'
      }</li>`;
      $('#pager').innerHTML = '';
      return;
    }

    box.innerHTML = hit
      .slice((page - 1) * PER_PAGE, page * PER_PAGE)
      .map((r) => `
        <li><a href="${PAGE.view}?id=${r.id}">
          <span class="t">${esc(r.title)}</span>
          ${r.file_id || r.link ? '<span class="tag">첨부</span>' : ''}
          <span class="d">${fmtDate(r.created_at)}</span>
        </a></li>`).join('');

    drawPager(pages);
  }

  function drawPager(pages) {
    const el = $('#pager');
    if (pages <= 1) {
      el.innerHTML = '';
      return;
    }
    const btn = (to, label, opts = '') =>
      `<button type="button" class="pg${opts}" data-go="${to}">${label}</button>`;

    el.innerHTML =
      btn(page - 1, '‹ 이전', page === 1 ? ' off' : '') +
      Array.from({ length: pages }, (_, i) =>
        btn(i + 1, i + 1, i + 1 === page ? ' on' : '')).join('') +
      btn(page + 1, '다음 ›', page === pages ? ' off' : '');

    $$('.pg', el).forEach((b) => {
      b.onclick = () => {
        const to = Number(b.dataset.go);
        if (to < 1 || to > pages || to === page) return;
        page = to;
        draw();
        window.scrollTo({ top: 0 });
      };
    });
  }

  // 검색하면 늘 첫 쪽부터 봅니다
  function search() {
    page = 1;
    draw();
  }

  $('#search').onclick = search;
  q.oninput = search;
  q.onkeydown = (e) => { if (e.key === 'Enter') search(); };
  $('#write').onclick = () => go(PAGE.write);
  draw();
}

/* ── 작성 · 수정 ────────────────────────── */

async function initWrite() {
  const id = param('id');
  const row = id ? await Store.get(BOARD, id) : null;
  if (id && !row) throw new Error('글을 찾을 수 없습니다.');

  const editor = richEditor($('#body'));

  if (row) {
    $('#title').value = row.title || '';
    editor.set(row.body);
    $('#link').value = row.link || '';
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
    const link = $('#link').value.trim();
    if (link && !safeUrl(link)) {
      alert('링크는 http:// 나 https:// 로 시작해야 합니다.');
      $('#link').focus();
      return;
    }

    $('#submit').disabled = true;
    const data = {
      title,
      body: editor.html(),
      link,
      ...(await picker.save()),
    };
    if (row) {
      // 고칠 때는 보던 글로 돌아가고, 새로 쓸 때는 목록으로 갑니다
      await Store.update(BOARD, row.id, data);
      go(`${PAGE.view}?id=${row.id}`);
    } else {
      await Store.insert(BOARD, data);
      go(PAGE.list);
    }
  };

  $('#cancel').onclick = () => history.back();
}

/* ── 보기 ───────────────────────────────── */

async function initView() {
  const id = param('id');
  const row = await Store.get(BOARD, id);
  if (!row) throw new Error('글을 찾을 수 없습니다.');

  $('#title').textContent = row.title;
  $('#date').textContent = fmtDate(row.created_at);
  renderBody($('#body'), row.body);

  const url = safeUrl(row.link);
  if (url) {
    $('#link-wrap').hidden = false;
    const a = $('#link');
    a.href = url;
    a.textContent = row.link;
  }

  if (row.file_id) {
    $('#file-wrap').hidden = false;
    await renderAttach($('#file'), row);
  }

  kebabMenu($('#menu-btn'), $('#menu-pop'));
  $('#edit').onclick = () => go(`${PAGE.write}?id=${row.id}`);
  $('#del').onclick = async () => {
    if (!confirm('이 글을 지울까요? 되돌릴 수 없습니다.')) return;
    await Store.remove(BOARD, row.id);
    go(PAGE.list);
  };
}

boot({ list: initList, write: initWrite, view: initView }[document.body.dataset.mode]);
