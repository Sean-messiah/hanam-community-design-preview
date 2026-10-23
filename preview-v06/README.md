# 하남점 커뮤니티 v0.6 — 서버 연동 준비 시안

## 배포 상태
- 기존 v0.5: 계속 운영, 변경 없음.
- v0.6: 별도 미리보기 경로에서 UI/공유 기능 구현. 새 Supabase 프로젝트가 아직 생성되지 않아 **서버 공유 기능은 동작하지 않습니다**.
- Supabase `jurungjurung` 조직의 견적은 **$0/월**, 다만 별도 비용 확인 ID가 필요하여 사용자 동의를 받기 전 생성 중단.

## 설정 방법 (새 프로젝트가 생긴 다음)
1. **하남점 전용** 신규 Supabase 프로젝트(서울 리전) 생성.
2. Auth > Providers > Anonymous Sign-Ins 활성화. 공개 사용 전 CAPTCHA/Turnstile, 사용량 한도, 신고 대응 정책 설정.
3. 프로젝트 전용 SQL Editor에서 `schema.sql` 검토·실행 (기존 quizpick/martpick에는 실행 금지). SQL 검증/보안 Advisor 확인.
4. `config.js`의 `supabaseUrl`과 **publishable** key만 기입. `service_role` 등 비밀 키는 절대 웹에 넣지 않음.
5. 별도 기기/새 프로필 2개로: 익명 인증 → 사진 업로드 → 작성자에게 pending 표시 → 관리자 검토 후 published → 다른 이용자에게 노출 → 신고/댓글 검증.
6. 이후 정식 앱과 통합 시 기존 IndexedDB(`market-neighbor-prototype-v1`)를 절대로 자동 삭제하거나 서버로 전송하지 않음. 데이터 이전은 별도 명시적 동의 후 진행.

## 보안과 운영 제약
- 모든 게시물과 댓글은 **기본 비공개 검토(pending)** 로 저장. SQL Editor에서 관리자 승인 전 타인에게 보이지 않음.
- 사진 Storage는 private; 파일은 1600px 이하 WebP로 압축, 1장 최대 4MB, 게시글 당 10장 제한.
- 익명 이용자는 브라우저 데이터 삭제/기기 변경 후 예전 작성권한을 회복할 수 없음.
- 익명 가입에는 봇 보호(CAPTCHA) 권장. 공개 오픈 전 신고 처리·관리자 도구·스팸 정책이 필요.
- 실제 매장 사진·재고·촬영 허가를 암시하지 않는 비공식 앱. 개인정보·초상권을 포함한 사진은 게시 금지.

## 파일
- `index.html`: v0.6 모바일 UI (기존 레드·블루 디자인 흐름)
- `app.js`: Supabase anonymous auth, 게시글, 이미지, 댓글, 신고 구현
- `config.js`: 안전한 공개 설정 자리
- `schema.sql`: RLS/스토리지 규칙 포함 DDL
- `test.cjs`: 정적 검증 (DB 없는 상태의 기본 검증만)