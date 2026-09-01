/* 'n월 n주차' — 그 주에 올라온 주제를 작성자별로 모아 보고, 발표자를 뽑습니다 */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 한 번 돌려 봅니다. 자기가 쓴 주제는 빼고, 맡은 개수가 적은 사람부터 채웁니다. */
function oneRound(topics, people) {
  const count = Object.fromEntries(people.map((p) => [p, 0]));
  const out = {};
  for (const t of shuffle(topics)) {
    const cand = people.filter((p) => p !== t.author);
    if (!cand.length) return null;
    const least = Math.min(...cand.map((p) => count[p]));
    const pick = shuffle(cand.filter((p) => count[p] === least))[0];
    count[pick]++;
    out[t.key] = pick;
  }
  const n = Object.values(count);
  return { out, spread: Math.max(...n) - Math.min(...n) };
}

/**
 * 주제마다 발표자를 한 명씩 뽑습니다.
 * 자기가 쓴 주제는 절대 맡지 않습니다.
 *
 * 뽑는 순서가 나쁘면 마지막에 남은 주제가 전부 한 사람 것이라 3개·1개로 갈릴 때가 있습니다.
 * 그래서 몇 번 돌려 보고 가장 고르게 나뉜 것을 씁니다.
 * (5명이 두 개씩 올리면 한 사람당 두 개씩 돌아갑니다.)
 */
function assignPresenters(topics, people) {
  let best = null;
  for (let i = 0; i < 50; i++) {
    const round = oneRound(topics, people);
    if (!round) return null;
    if (!best || round.spread < best.spread) best = round;
    if (best.spread <= 1) break;
  }
  return best.out;
}

boot(async () => {
  const week = param('week');
  if (!week) throw new Error('주차가 정해지지 않았습니다.');

  const label = weekLabel(week);
  document.title = `${label} · 경제소학회`;
  $('#h').textContent = label;

  const rows = (await Store.list('news')).filter((r) => weekStart(r.date) === week);

  // 한 사람이 주제 두 개를 올립니다. 비어 있는 칸은 건너뜁니다.
  const topics = [];
  rows.forEach((r) => {
    [1, 2].forEach((n) => {
      if (r[`t${n}`]) {
        topics.push({
          key: `${r.id}-${n}`,
          no: n,
          name: r[`t${n}`],
          author: r.author,
          rowId: r.id,
        });
      }
    });
  });

  await drawTopics(rows, topics);

  /* 배정 결과는 저장해 둡니다. 새로 고쳐도 그대로 남아 있어야 하니까요. */
  const saved = (await Store.list('presentation')).find((p) => p.week === week);
  let map = saved ? saved.map : null;
  drawAssign();

  $('#draw').onclick = async () => {
    if (!topics.length) {
      alert('이 주에 올라온 주제가 없습니다.');
      return;
    }
    if (map && !confirm('이미 배정돼 있습니다. 다시 뽑을까요?')) return;

    map = assignPresenters(topics, members());
    if (!map) {
      alert('배정할 사람이 없습니다. config.js 의 명단을 확인해 주세요.');
      return;
    }
    await Store.upsert('presentation', { week, map }, 'week');
    drawAssign();
  };

  function drawAssign() {
    $('#assign').innerHTML = topics.length
      ? topics.map((t) => `
          <tr>
            <td>${esc(t.name)}<div class="muted" style="font-size:12px">${esc(t.author)}</div></td>
            <td class="p">${map && map[t.key] ? esc(map[t.key]) : '—'}</td>
          </tr>`).join('')
      : '<tr><td colspan="2" class="empty">올라온 주제가 없습니다.</td></tr>';
  }
});

/** 작성자별로 묶어서 주제 두 개와 첨부파일을 보여 줍니다 */
async function drawTopics(rows, topics) {
  const host = $('#topics');
  if (!rows.length) {
    host.innerHTML = '<div class="card"><div class="empty">이 주에 올라온 스크랩이 없습니다.</div></div>';
    return;
  }

  host.innerHTML = rows.map((r) => {
    const mine = topics.filter((t) => t.rowId === r.id);
    return `
      <section class="card" style="margin-bottom:16px">
        <h2>${esc(r.author)}
          <a class="more" href="news-view.html?id=${r.id}">원본 보기 ›</a>
        </h2>
        <div class="muted" style="font-size:13px;margin:-8px 0 12px">
          ${esc(r.title)} · ${fmtDate(r.date)}
        </div>
        ${r.memo ? `<p style="white-space:pre-wrap;margin:0 0 14px">${esc(r.memo)}</p>` : ''}
        ${mine.length
          ? mine.map((t) => `
              <div class="topic">
                <div class="topic-row">
                  <span class="who">주제 ${t.no}</span>
                  <span class="name">${esc(t.name)}</span>
                </div>
              </div>`).join('')
          : '<div class="muted" style="font-size:14px">적어 둔 주제가 없습니다.</div>'}
        ${r.file_id ? `<div class="week-file" data-file="${r.id}"></div>` : ''}
      </section>`;
  }).join('');

  // 첨부파일 링크는 저장소에서 꺼내와야 해서 그린 뒤에 채웁니다
  for (const r of rows) {
    if (!r.file_id) continue;
    const slot = $(`[data-file="${r.id}"]`);
    if (!slot) continue;
    const wrap = document.createElement('span');
    await renderAttach(wrap, r);
    slot.innerHTML = `<span class="muted">첨부파일 · </span>${wrap.innerHTML}`;
  }
}
