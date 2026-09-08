/* 시작화면 — 왼쪽에 해야 할 일이 적힌 달력, 오른쪽에 탭으로 넘겨 보는 목록 */

/** 오른쪽 목록에 한 번에 보여 줄 개수 */
const HOME_ROWS = 10;

boot(async () => {
  const [tasks, notices, info, news, minutes] = await Promise.all([
    Store.list('schedule'),
    Store.list('notice'),
    Store.list('info'),
    Store.list('news'),
    Store.list('minutes'),
  ]);

  // 반복 일정은 보고 있는 달 안의 날짜들로 펼쳐서 찍습니다
  function marks(from, to) {
    const m = {};
    [...tasks].sort(byTime).forEach((t) => {
      for (const date of occurrencesOf(t, from, to)) {
        (m[date] ||= []).push({
          text: t.time ? `${t.time} ${t.title}` : t.title,
        });
      }
    });
    return m;
  }

  calendar($('#cal'), { marks });

  /** 제목과 날짜 한 줄짜리 목록 */
  function postList(rows, viewPage, empty) {
    return rows.length
      ? rows.slice(0, HOME_ROWS).map((r) => `
          <li><a href="${viewPage}?id=${r.id}">
            <span class="t">${esc(r.title)}</span>
            <span class="d">${fmtDate(r.created_at)}</span>
          </a></li>`).join('')
      : `<li class="empty">${empty}</li>`;
  }

  const TABS = {
    news: {
      more: 'news.html',
      html: () => weekListHtml(weeksOf(news).slice(0, HOME_ROWS)),
    },
    notice: {
      more: 'notice.html',
      html: () => postList(notices, 'notice-view.html', '아직 올라온 공지가 없습니다.'),
    },
    info: {
      more: 'info.html',
      html: () => postList(info, 'info-view.html', '아직 올라온 글이 없습니다.'),
    },
    minutes: {
      more: 'minutes.html',
      // 회의록은 올린 날이 아니라 회의한 날짜를 보여 줍니다
      html: () => (minutes.length
        ? minutes.slice(0, HOME_ROWS).map((r) => `
            <li><a href="minutes-view.html?id=${r.id}">
              <span class="t">${esc(r.title)}</span>
              <span class="d">${fmtDate(r.date)}</span>
            </a></li>`).join('')
        : '<li class="empty">아직 올라온 회의록이 없습니다.</li>'),
    },
  };

  function show(key) {
    $$('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === key));
    $('#tab-more').href = TABS[key].more;
    $('#tab-list').innerHTML = TABS[key].html();
  }

  $$('.tab').forEach((b) => { b.onclick = () => show(b.dataset.tab); });
  show('news');
});
