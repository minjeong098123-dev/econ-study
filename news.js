/* 뉴스스크랩 — 왼쪽 달력에서 날짜를 눌러 쓰고, 오른쪽에서 주차별로 모아 봅니다 */

boot(async () => {
  const rows = await Store.list('news');

  // 달력 칸에는 그날 쓴 사람 이름이 뜨고, 이름을 누르면 그 사람 글로 갑니다
  const marks = {};
  rows.forEach((r) => {
    (marks[r.date] ||= []).push({
      text: r.author,
      href: `news-view.html?id=${r.id}`,
    });
  });

  calendar($('#cal'), {
    marks: () => marks,
    onPick: (date) => go(`news-write.html?date=${date}`),
  });

  // 그 주에 스크랩이 하나라도 올라오면 'n월 n주차'가 생깁니다
  $('#weeks').innerHTML = weekListHtml(weeksOf(rows));
});
