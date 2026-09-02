/* 데이터 저장소 — Supabase.
 *
 * 글은 표에, 파일은 저장소(study-files)에 올라갑니다.
 * 스터디원 누구든 같은 내용을 보게 됩니다.
 *
 * 바깥에서 쓰는 것은 Store / Files / renderAttach 셋뿐입니다.
 * 이름과 돌려주는 값은 브라우저에 저장하던 때와 똑같이 맞춰 두었습니다.
 * (file_id 는 저장소에 올린 파일의 경로입니다.)
 */

const BUCKET = 'study-files';

/** 주소와 키가 들어와 있는지. 비어 있으면 화면에 안내만 띄웁니다. */
const CONFIGURED =
  /^https?:\/\//.test(CFG.SUPABASE_URL || '') && (CFG.SUPABASE_ANON_KEY || '').length > 20;

const sb = CONFIGURED
  ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY)
  : null;

/** Supabase 가 돌려준 오류를 그대로 던집니다. */
function check({ data, error }) {
  if (error) throw error;
  return data;
}

const Store = {
  /** 표 하나를 통째로. 최신순입니다. */
  async list(table) {
    return check(
      await sb.from(table).select('*').order('created_at', { ascending: false })
    ) || [];
  },

  async get(table, id) {
    return check(await sb.from(table).select('*').eq('id', id).maybeSingle());
  },

  async insert(table, row) {
    return check(await sb.from(table).insert(row).select().single());
  },

  async update(table, id, patch) {
    check(await sb.from(table).update(patch).eq('id', id));
  },

  /**
   * 고유한 칸(예: presentation.week)을 기준으로, 있으면 고치고 없으면 넣습니다.
   * 두 사람이 동시에 눌러도 한 줄만 남습니다.
   */
  async upsert(table, row, onConflict) {
    return check(await sb.from(table).upsert(row, { onConflict }).select().single());
  },

  /** 글을 지우면 첨부파일과 글 안에 넣은 이미지도 같이 지웁니다. */
  async remove(table, id) {
    const row = await Store.get(table, id);
    check(await sb.from(table).delete().eq('id', id));
    if (!row) return;
    if (row.file_id) await Files.remove(row.file_id);
    for (const path of pastedImages(row)) await Files.remove(path);
  },
};

/* ── 첨부파일 ───────────────────────────── */

const Files = {
  /** 파일 하나를 올리고 { file_id, file_name } 을 돌려줍니다. */
  async put(file) {
    // 같은 이름을 올려도 덮어쓰지 않도록 경로를 새로 만듭니다
    const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const { error } = await sb.storage.from(BUCKET).upload(path, file);
    if (error) throw error;
    return { file_id: path, file_name: file.name };
  },

  async remove(path) {
    if (path) await sb.storage.from(BUCKET).remove([path]);
  },

  /**
   * 공개 주소.
   * 이름을 주면 그 이름으로 내려받고, 안 주면 그냥 여는 주소입니다.
   * (글 안에 넣은 이미지는 내려받기가 아니라 보여야 하므로 이름 없이 부릅니다.)
   */
  url(path, name) {
    return sb.storage.from(BUCKET)
      .getPublicUrl(path, name ? { download: name } : undefined).data.publicUrl;
  },
};

/** 글 안에 붙여넣은 이미지들의 저장소 경로 */
function pastedImages(row) {
  const base = `${CFG.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  return [...`${row.body || ''}${row.memo || ''}`.matchAll(/src="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => u.startsWith(base))
    .map((u) => decodeURIComponent(u.slice(base.length).split('?')[0]));
}

/** '첨부파일 · 이름' 한 줄. 첨부가 없으면 비웁니다. */
async function renderAttach(el, row) {
  if (!el) return;
  if (!row || !row.file_id) {
    el.innerHTML = '';
    return;
  }
  // 파일이 다른 주소(Supabase)에 있어서 download 속성은 듣지 않습니다.
  // 대신 주소에 붙은 download 값이 원래 이름으로 받게 해 줍니다.
  const href = Files.url(row.file_id, row.file_name);
  el.innerHTML = `<a class="file-link" href="${esc(href)}">${esc(row.file_name || '내려받기')}</a>`;
}
