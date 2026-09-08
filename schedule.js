/* 일정표 — 날짜를 고르고 그 날 할 일을 적습니다 (휴대폰 일정 앱과 같은 방식) */

/* 시·분 고르기.
 * 브라우저 기본 시간칸(<input type="time">)은 형식이 브라우저 로캘을 따라가서
 * 한국어에서는 '오전/오후 07:30' 으로 나옵니다. lang 속성으로도 바꿀 수 없어서 직접 만듭니다. */

function fillTimeSelects() {
  const h = $('#new-hour');
  const m = $('#new-min');
  const opts = (n) => Array.from({ length: n }, (_, i) => `<option value="${pad(i)}">${pad(i)}</option>`).join('');

  h.innerHTML = `<option value="">종일</option>${opts(24)}`;
  m.innerHTML = opts(60);
  h.onchange = syncTime;
  syncTime();
}

/** 종일이면 분은 고를 필요가 없습니다. */
function syncTime() {
  const m = $('#new-min');
  m.disabled = !$('#new-hour').value;
  if (m.disabled) m.value = '00';
}

/** 저장할 값. 종일이면 빈 문자열입니다. */
function readTime() {
  const h = $('#new-hour').value;
  return h ? `${h}:${$('#new-min').value}` : '';
}

/* ── 반복 ───────────────────────────────── */

function fillRepeat() {
  $('#new-repeat').innerHTML =
    REPEATS.map((r) => `<option value="${r.key}">${r.label}</option>`).join('');
  $('#new-repeat').onchange = syncRepeat;
  syncRepeat();
}

/** 반복을 골랐을 때만 '언제까지' 칸을 보여 줍니다. */
function syncRepeat() {
  const on = !!$('#new-repeat').value;
  const until = $('#new-until');
  until.hidden = !on;
  if (on && !until.value) {
    // 기본은 1년 뒤까지. 학기 끝나는 날로 바꿔 두시면 됩니다.
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    until.value = ymd(d);
  }
}

function resetForm() {
  $('#new-hour').value = '';
  $('#new-repeat').value = '';
  $('#new-title').value = '';
  syncTime();
  syncRepeat();
}

/* ── 화면 ───────────────────────────────── */

boot(async () => {
  let items = await Store.list('schedule');
  let picked = ymd(new Date());

  /** 보고 있는 달 안에서, 반복을 펼쳐 날짜마다 붙입니다. */
  function marks(from, to) {
    const m = {};
    [...items].sort(byTime).forEach((t) => {
      for (const date of occurrencesOf(t, from, to)) {
        (m[date] ||= []).push({
          text: t.time ? `${t.time} ${t.title}` : t.title,
        });
      }
    });
    return m;
  }

  const cal = calendar($('#cal'), {
    marks,
    selected: picked,
    onPick: (date) => {
      picked = date;
      cal.select(date);
      drawDay();
    },
  });

  async function reload() {
    items = await Store.list('schedule');
    cal.draw();
    drawDay();
  }

  function drawDay() {
    $('#day-title').textContent = fmtDate(picked);

    // 그 날에 실제로 걸리는 일정 (반복해서 걸리는 것 포함)
    const list = items
      .filter((t) => occurrencesOf(t, picked, picked).length)
      .sort(byTime);

    // 원래 있어야 하는데 '이 날만 빼기'로 쉬는 일정
    const resting = items.filter((t) => isSkipped(t, picked)).sort(byTime);

    const row = (t) => `
      <li>
        <span class="time">${esc(t.time || '종일')}</span>
        <span class="txt">${esc(t.title)}${
          t.repeat ? `<span class="tag rep">${repeatLabel(t.repeat)}</span>` : ''}</span>
        ${t.repeat
          ? `<button type="button" class="del" data-skip="${t.id}">이 날만 빼기</button>
             <button type="button" class="del" data-all="${t.id}">전체 삭제</button>`
          : `<button type="button" class="del" data-all="${t.id}">삭제</button>`}
      </li>`;

    const restRow = (t) => `
      <li class="resting">
        <span class="time">${esc(t.time || '종일')}</span>
        <span class="txt">${esc(t.title)} <span class="tag rep">이 날은 쉼</span></span>
        <button type="button" class="del" data-back="${t.id}">되돌리기</button>
      </li>`;

    $('#todo').innerHTML =
      (list.length || resting.length
        ? list.map(row).join('') + resting.map(restRow).join('')
        : '<li class="empty">이 날은 적어 둔 일정이 없습니다.</li>');

    $$('#todo .del').forEach((b) => {
      b.onclick = async () => {
        const { skip, all, back } = b.dataset;
        b.disabled = true;

        if (all) {
          const t = items.find((x) => x.id === all);
          if (t.repeat && !confirm('반복되는 일정 전체를 지울까요?')) {
            b.disabled = false;
            return;
          }
          await Store.remove('schedule', all);
        } else if (skip) {
          const t = items.find((x) => x.id === skip);
          await Store.update('schedule', skip, { skips: [...skipsOf(t), picked] });
        } else if (back) {
          const t = items.find((x) => x.id === back);
          await Store.update('schedule', back,
            { skips: skipsOf(t).filter((d) => d !== picked) });
        }
        await reload();
      };
    });
  }

  $('#add').onclick = async () => {
    const title = $('#new-title').value.trim();
    if (!title) {
      $('#new-title').focus();
      return;
    }
    const repeat = $('#new-repeat').value;
    await Store.insert('schedule', {
      date: picked,
      time: readTime(),
      title,
      repeat,
      repeat_until: repeat ? $('#new-until').value : '',
    });
    resetForm();
    await reload();
  };

  $('#new-title').onkeydown = (e) => {
    if (e.key === 'Enter') $('#add').click();
  };

  fillTimeSelects();
  fillRepeat();
  drawDay();
});
