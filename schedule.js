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

function resetTime() {
  $('#new-hour').value = '';
  syncTime();
}

boot(async () => {
  let items = await Store.list('schedule');
  let picked = ymd(new Date());

  function marks() {
    const m = {};
    [...items].sort(byTime).forEach((t) => {
      (m[t.date] ||= []).push({
        text: t.time ? `${t.time} ${t.title}` : t.title,
      });
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
    const list = items.filter((t) => t.date === picked).sort(byTime);

    $('#todo').innerHTML = list.length
      ? list.map((t) => `
          <li>
            <span class="time">${esc(t.time || '종일')}</span>
            <span class="txt">${esc(t.title)}</span>
            <button type="button" class="del" data-id="${t.id}">삭제</button>
          </li>`).join('')
      : '<li class="empty">이 날은 적어 둔 일정이 없습니다.</li>';

    $$('#todo .del').forEach((b) => {
      b.onclick = async () => {
        await Store.remove('schedule', b.dataset.id);
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
    await Store.insert('schedule', { date: picked, time: readTime(), title });
    $('#new-title').value = '';
    resetTime();
    await reload();
  };

  $('#new-title').onkeydown = (e) => {
    if (e.key === 'Enter') $('#add').click();
  };

  fillTimeSelects();
  drawDay();
});
