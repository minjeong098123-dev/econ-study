/* 시작화면 — 왼쪽에 해야 할 일이 적힌 달력, 오른쪽에 탭으로 넘겨 보는 목록 */

/** 오른쪽 목록에 한 번에 보여 줄 개수 */
const HOME_ROWS = 10;

boot(async () => {
  const [tasks, notices, info, news] = await Promise.all([
    Store.list('schedule'),
    Store.list('notice'),
    Store.list('info'),
    Store.list('news'),
  ]);

  const marks = {};
  [...tasks].sort(byTime).forEach((t) => {
    (marks[t.date] ||= []).push({
      text: t.time ? `${t.time} ${t.title}` : t.title,
    });
  });

  calendar($('#cal'), { marks: () => marks });

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
  };

  function show(key) {
    $$('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === key));
    $('#tab-more').href = TABS[key].more;
    $('#tab-list').innerHTML = TABS[key].html();
  }

  $$('.tab').forEach((b) => { b.onclick = () => show(b.dataset.tab); });
  show('news');
});
