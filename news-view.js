/* 뉴스스크랩 한 건 — 제목, 메모, 주제, 파일을 한 화면에 */

boot(async () => {
  const row = await Store.get('news', param('id'));
  if (!row) throw new Error('스크랩을 찾을 수 없습니다.');

  $('#title').textContent = row.title;
  $('#meta').textContent = `${row.author} · ${fmtDate(row.date)}`;
  $('#memo').textContent = row.memo || '';

  const topics = [row.t1, row.t2].filter(Boolean);

  if (topics.length) {
    $('#topics-wrap').hidden = false;
    $('#topics').innerHTML = topics
      .map((name, i) => `
        <li><a><span class="tag">주제 ${i + 1}</span>
          <span class="t">${esc(name)}</span>
        </a></li>`).join('');
  }

  if (row.file_id) {
    $('#file-wrap').hidden = false;
    await renderAttach($('#file'), row);
  }

  kebabMenu($('#menu-btn'), $('#menu-pop'));
  $('#edit').onclick = () => go(`news-write.html?id=${row.id}`);
  $('#del').onclick = async () => {
    if (!confirm('이 스크랩을 지울까요? 되돌릴 수 없습니다.')) return;
    await Store.remove('news', row.id);
    go('news.html');
  };
});
