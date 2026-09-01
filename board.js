/* 공지사항과 정보 공유는 구성이 같아서 이 파일 하나로 셋 다 맡습니다.
 * 페이지가 <body data-board="notice|info" data-mode="list|write|view"> 로 알려 줍니다.
 * 정보 공유에만 '링크' 칸이 하나 더 있습니다. */

const BOARD = document.body.dataset.board;
const HAS_LINK = BOARD === 'info';
const PAGE = {
  list: `${BOARD}.html`,
  write: `${BOARD}-write.html`,
  view: `${BOARD}-view.html`,
};

/* ── 목록 ───────────────────────────────── */

async function initList() {
  const rows = await Store.list(BOARD);
  const box = $('#list');
  const q = $('#q');

  function draw() {
    const key = q.value.trim().toLowerCase();
    const hit = key
      ? rows.filter((r) =>
          `${r.title} ${r.body}`.toLowerCase().includes(key))
      : rows;

    if (!hit.length) {
      box.innerHTML = `<li class="empty">${
        key ? '찾는 글이 없습니다.' : '아직 올라온 글이 없습니다.'
      }</li>`;
      return;
    }
    box.innerHTML = hit.map((r) => `
      <li><a href="${PAGE.view}?id=${r.id}">
        <span class="t">${esc(r.title)}</span>
        ${r.file_id || r.link ? '<span class="tag">첨부</span>' : ''}
        <span class="d">${fmtDate(r.created_at)}</span>
      </a></li>`).join('');
  }

  $('#search').onclick = draw;
  q.oninput = draw;
  q.onkeydown = (e) => { if (e.key === 'Enter') draw(); };
  $('#write').onclick = () => go(PAGE.write);
  draw();
}

/* ── 작성 · 수정 ────────────────────────── */

async function initWrite() {
  const id = param('id');
  const row = id ? await Store.get(BOARD, id) : null;
  if (id && !row) throw new Error('글을 찾을 수 없습니다.');

  if (row) {
    $('#title').value = row.title || '';
    $('#body').value = row.body || '';
    if (HAS_LINK) $('#link').value = row.link || '';
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
    const link = HAS_LINK ? $('#link').value.trim() : '';
    if (link && !safeUrl(link)) {
      alert('링크는 http:// 나 https:// 로 시작해야 합니다.');
      $('#link').focus();
      return;
    }

    $('#submit').disabled = true;
    const data = {
      title,
      body: $('#body').value,
      ...(HAS_LINK ? { link } : {}),
      ...(await picker.save()),
    };
    if (row) {
      await Store.update(BOARD, row.id, data);
      go(`${PAGE.view}?id=${row.id}`);
    } else {
      const made = await Store.insert(BOARD, data);
      go(`${PAGE.view}?id=${made.id}`);
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
  $('#body').textContent = row.body || '';

  const url = HAS_LINK && safeUrl(row.link);
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

  $('#edit').onclick = () => go(`${PAGE.write}?id=${row.id}`);
  $('#del').onclick = async () => {
    if (!confirm('이 글을 지울까요? 되돌릴 수 없습니다.')) return;
    await Store.remove(BOARD, row.id);
    go(PAGE.list);
  };
}

boot({ list: initList, write: initWrite, view: initView }[document.body.dataset.mode]);
