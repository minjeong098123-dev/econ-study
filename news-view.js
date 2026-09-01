/* 뉴스스크랩 한 건 — 제목, 메모, 주제, 파일을 한 화면에 */

boot(async () => {
  const row = await Store.get('news', param('id'));
  if (!row) throw new Error('스크랩을 찾을 수 없습니다.');

  $('#title').textContent = row.title;
  $('#meta').textContent = `${row.author} · ${fmtDate(row.date)}`;
  $('#memo').textContent = row.memo || '';

  const topics = [1, 2]
    .map((n) => ({ name: row[`t${n}`], url: safeUrl(row[`u${n}`]) }))
    .filter((t) => t.name);

  if (topics.length) {
    $('#topics-wrap').hidden = false;
    $('#topics').innerHTML = topics.map((t) => `
      <li><a ${t.url ? `href="${esc(t.url)}" target="_blank" rel="noopener"` : ''}>
        <span class="t">${esc(t.name)}</span>
        ${t.url ? '<span class="tag">기사</span>' : ''}
      </a></li>`).join('');
  }

  if (row.file_id) {
    $('#file-wrap').hidden = false;
    await renderAttach($('#file'), row);
  }

  $('#edit').onclick = () => go(`news-write.html?id=${row.id}`);
  $('#del').onclick = async () => {
    if (!confirm('이 스크랩을 지울까요? 되돌릴 수 없습니다.')) return;
    await Store.remove('news', row.id);
    go('news.html');
  };
});
