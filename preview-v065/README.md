# 하남점 v0.6.5 — 관리자 승인 + 서버 글쓰기 잠금

**프로젝트:** Supabase `abpxhhttsjiatqthspgb` (독립 서버)

- 일반 테스트 앱: `/preview-v065/`
- 관리자 승인: `/preview-v065/admin/`
- 신규 관리자 등록 불가, 비밀번호 로그인만 지원
- `hanam_moderators` 등록된 비익명 Auth 사용자만 사진·글·댓글 승인/반려 및 신고 확인 가능
- 업데이트는 `status` 컬럼으로 한정 (작성자/본문 수정 불가)
- DB `hanam_site_settings.submissions_enabled=false`이므로 직접 API를 호출해도 신규 업로드 불가
- UI `enableSubmissions:false`로 별도 잠금 유지
- 모든 사진 승인 전에 타인 얼굴·개인정보·저작권 및 업로드 파일 수(1–10장)를 확인할 것

## 관리자 최초 설정 (콘솔에서만)
1. [독립 서버 Auth 사용자 관리](https://supabase.com/dashboard/project/abpxhhttsjiatqthspgb/auth/users)에서 관리자 이메일/비밀번호로 사용자 계정 생성. 계정을 본인 소유임을 확인하고 이메일을 확정할 것.
2. 아래 SQL을 독립 프로젝트의 SQL Editor에서 수행. `ADMIN_EMAIL_HERE`를 실제 인증된 이메일로 바꿀 것. 새 회원가입을 허용해 일반 이용자가 스스로 관리자 테이블에 등록할 수 없도록 RLS 적용.

```sql
insert into public.hanam_moderators(user_id)
select id from auth.users
where email = 'ADMIN_EMAIL_HERE' and is_anonymous is false;
```

3. `/preview-v065/admin/` 접속 → 관리자 로그인 → 권한 확인. 관리자 목록은 가입된 UID 외에는 조회 불가.
4. [독립 서버 Auth Providers](https://supabase.com/dashboard/project/abpxhhttsjiatqthspgb/auth/providers)에서 **익명 로그인은 CAPTCHA 및 봇 보호 준비 후** 활성화. 마트픽 설정은 변경하지 않음.
5. 실제 게시글/사진 테스트·운영자 승인·RLS 보안 검증이 완료되면 SQL Editor에서 `update public.hanam_site_settings set submissions_enabled=true,updated_at=now() where id=true;` 와 정적 `config.js`의 `enableSubmissions:true`를 함께 적용해 쓰기 오픈. 현재는 둘 다 OFF.

**중요:** 기존 v0.5, v0.6.3, v0.6.4는 보존하고 이 경로만 새로 배포합니다.
