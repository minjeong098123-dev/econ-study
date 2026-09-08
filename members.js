/* 명단 관리 — 스터디원 이름을 더하고 지웁니다.
 * 여기서 고친 이름이 뉴스스크랩 작성자와 회의록 참석자 목록에 그대로 쓰입니다. */

boot(async () => {
  let rows = [];

  async function reload() {
    rows = await Store.list('member');
    rows.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    draw();
  }

  function draw() {
    $('#list').innerHTML = rows.length
      ? rows.map((m) => `
          <li class="member">
            <span class="t">${esc(m.name)}</span>
            <button type="button" class="del" data-id="${m.id}" data-name="${esc(m.name)}">삭제</button>
          </li>`).join('')
      : '<li class="empty">아직 등록된 이름이 없습니다.</li>';

    $$('#list .del').forEach((b) => {
      b.onclick = async () => {
        if (!confirm(`${b.dataset.name} 님을 명단에서 뺄까요?`)) return;
        b.disabled = true;
        await Store.remove('member', b.dataset.id);
        await reload();
      };
    });
  }

  $('#add').onclick = async () => {
    const box = $('#new-name');
    const name = box.value.trim();
    if (!name) {
      box.focus();
      return;
    }
    if (rows.some((m) => m.name === name)) {
      alert('이미 있는 이름입니다.');
      box.focus();
      return;
    }
    $('#add').disabled = true;
    try {
      await Store.insert('member', { name });
      box.value = '';
      await reload();
    } finally {
      $('#add').disabled = false;
    }
  };

  $('#new-name').onkeydown = (e) => {
    if (e.key === 'Enter') $('#add').click();
  };

  await reload();
});
