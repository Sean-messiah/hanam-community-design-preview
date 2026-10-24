# 하남점 커뮤니티 v0.7.0 — 직접 게시형 베타
DB: hanam-community (abpxhhttsjiatqthspgb), independent of Martpick.
- 일반 이메일 회원가입 없음: 글/댓글/신고 시작할 때 Supabase Auth anonymous sign-in 자동 생성.
- 글: pending로 생성 후 첨부 사진 및 메타데이터 준비가 끝나면 작성자 status published 전환. 이야기 글도 본문 작성 후 바로 published.
- 댓글: published 즉시 공개. 신고: 서버에만 기록.
- 스팸 제한: 글 10분 3건·일 12건, 댓글 10분 8건·일 40건. 별도 임시 계정을 만들면 우회 가능한 수준의 제한.
- 업로드: WebP 4MB/장, 글 당 번호가 지정된 0..9.webp만 스토리지 RLS 허용.
- 이전 버전은 전부 보존.
## 시작 전 필수
1. 하남점 독립 Supabase Authentication > Providers > Allow anonymous sign-ins 활성화 (기존 마트픽에는 적용하지 말 것).
2. 앱 config.js는 enableSubmissions:true. 서버 hanam_site_settings.submissions_enabled=true가 함께 있어야 실제 글쓰기 활성화.
3. CAPTCHA/Turnstile 및 추가 스팸 대응 권장. 업로드 및 갤럭시 기기 통합 테스트는 아직 미완료.
