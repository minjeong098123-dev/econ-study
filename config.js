/* 스터디 이름, 명단, Supabase 연결 정보. 바꿀 일이 생기면 이 파일만 고치면 됩니다. */
window.STUDY = {
  NAME: '경제소학회',

  // 순서는 신경 쓰지 않아도 됩니다. 화면에는 늘 가나다순으로 나옵니다.
  MEMBERS: ['김민정', '김민성', '김초원', '신기현', '곽병서'],

  // Supabase 대시보드 > Project Settings > Data API 에서 복사해 넣으세요. (README 참고)
  // anon key 는 공개용이라 코드에 그대로 넣어도 됩니다.
  // service_role 키는 절대 넣지 마세요. 그 키는 모든 권한을 가집니다.
  SUPABASE_URL: 'https://zbaswlevxwobahxhsqla.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_jsrPWDnmycpr4vd6exCPSw_y5uN8Lnb',
};
