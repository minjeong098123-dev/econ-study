/* 뉴스스크랩 쓰기 · 고치기.
 * 새로 쓸 때는 ?date=2026-09-01, 고칠 때는 ?id=... 로 들어옵니다. */

boot(async () => {
  const id = param('id');
  const row = id ? await Store.get('news', id) : null;
  if (id && !row) throw new Error('스크랩을 찾을 수 없습니다.');

  const date = row ? row.date : param('date') || ymd(new Date());
  $('#when').textContent = fmtDate(date);

  $('#author').innerHTML =
    '<option value="">작성자</option>' +
    members().map((m) => `<option>${esc(m)}</option>`).join('');

  const editor = richEditor($('#memo'));

  if (row) {
    $('#title').value = row.title || '';
    $('#author').value = row.author || '';
    editor.set(row.memo);
    $('#t1').value = row.t1 || '';
    $('#t2').value = row.t2 || '';
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
    const author = $('#author').value;
    if (!title) return warn('제목을 적어 주세요.', '#title');
    if (!author) return warn('작성자를 골라 주세요.', '#author');

    $('#submit').disabled = true;
    const data = {
      date,
      title,
      author,
      memo: editor.html(),
      t1: $('#t1').value.trim(),
      t2: $('#t2').value.trim(),
      ...(await picker.save()),
    };

    if (row) {
      // 고칠 때는 보던 글로 돌아가고, 새로 쓸 때는 목록으로 갑니다
      await Store.update('news', row.id, data);
      go(`news-view.html?id=${row.id}`);
    } else {
      await Store.insert('news', data);
      go('news.html');
    }
  };

  $('#cancel').onclick = () => go('news.html');
});

function warn(msg, sel) {
  alert(msg);
  $(sel).focus();
}
