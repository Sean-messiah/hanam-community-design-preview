# 하남점 v0.7.3 — 사진 안 잘리게 · 내 게시물 · 삭제 복구 · 갤럭시 뒤로가기

- [독립 Supabase](https://supabase.com/dashboard/project/abpxhhttsjiatqthspgb) 전용.
- 이전 v0.5~v0.7.2 모두 유지.
- 내 정보: 본인의 게시물(공개/업로드 중/삭제 정리 필요) 최대 120건 별도 표시.
- 삭제: 먼저 DB에서 status=removed로 비공개 → 사진 파일 정리 → DB 행 삭제. 실패하면 `내 정보`에서 재시도 가능.
- 사진 썸네일은 contain으로 전체 이미지가 보이도록 수정.
- 탭 이동을 history에 기록해 갤럭시 Back으로 이전 탭/모달로 복귀.
- `/preview-v073/check/` 기존 테스트 페이지 유지.

**DB 선행 조건**: `hanam_posts_owner_hide`, `hanam_posts_owner_delete_removed`, `hanam_storage_hidden_owner_read`, `hanam_storage_hidden_owner_delete` RLS 추가되어야 본인 글 삭제 가능. 익명로그인, 실기기 업로드 및 스팸 보호는 검증 과제.
