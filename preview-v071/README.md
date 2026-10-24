# 하남점 커뮤니티 v0.7.1 — 글쓰기 연결 및 실제 사진 업로드 진단
- Dedicated Supabase abpxhhttsjiatqthspgb only.
- v0.7.0, v0.6.5, v0.5 all preserved.
- /preview-v071/ app retains direct instant posting, guest nickname flow.
- /preview-v071/check/ has user-triggered diagnostics: read-only server check, anonymous Auth sign-in, WebP upload → photo metadata → own status published → signed URL → cleanup.
- The diagnostic image creates a temporary post that becomes publicly visible briefly, then removes it. If a failure occurs cleanup is best effort, and logs warn.
- Test page is NOT automatic. It only writes when the visitor explicitly starts a test.
- Anonymous user provider in dedicated project must be enabled manually by project operator.
- Do not use service-role keys in browser. Public publishable key is expected.
