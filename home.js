/* 시작화면 — 왼쪽에 해야 할 일이 적힌 달력, 오른쪽에 최근 공지와 최근 주차 */

const HOME_NOTICES = 3;
const HOME_WEEKS = 3;

boot(async () => {
  const [tasks, notices, news] = await Promise.all([
    Store.list('schedule'),
    Store.list('notice'),
    Store.list('news'),
  ]);

  const marks = {};
  [...tasks].sort(byTime).forEach((t) => {
    (marks[t.date] ||= []).push({
      text: t.time ? `${t.time} ${t.title}` : t.title,
    });
  });

  calendar($('#cal'), { marks: () => marks });

  const recent = notices.slice(0, HOME_NOTICES);
  $('#notices').innerHTML = recent.length
    ? recent.map((n) => `
        <li><a href="notice-view.html?id=${n.id}">
          <span class="t">${esc(n.title)}</span>
          <span class="d">${fmtDate(n.created_at)}</span>
        </a></li>`).join('')
    : '<li class="empty">아직 올라온 공지가 없습니다.</li>';

  $('#weeks').innerHTML = weekListHtml(weeksOf(news).slice(0, HOME_WEEKS));
});
