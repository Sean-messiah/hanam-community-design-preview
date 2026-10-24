# 하남점 커뮤니티 v0.6.4 — 독립 서버

- Supabase 조직: alphahahahaha
- Supabase 프로젝트: hanam-community (`abpxhhttsjiatqthspgb`)
- DB: `hanam_posts`, `hanam_photos`, `hanam_comments`, `hanam_reports`
- Storage: private `hanam-photos` bucket, WebP up to 4MB
- RLS: enabled on all 4 tables, dashboard security advisor reports 0 issues at migration time
- Client: **read-only** (`enableSubmissions:false`)
- No service role secrets in browser. The key in config.js is a public publishable key.
- Goldpick Supabase is PAUSED/INACTIVE, not deleted; its Edge Functions are offline.
- Old v0.5 stable remains at repository root. Old v0.6.3 preview points to Martpick, but this v0.6.4 preview does NOT.

## Before enabling submissions
1. On this **new dedicated** Supabase project, turn on Authentication > Providers > Anonymous Sign-Ins; do not enable on Martpick.
2. Add CAPTCHA and/or rate limiting, moderation workflow, and test anonymous user/photo upload RLS end-to-end.
3. Only after security tests, set `enableSubmissions:true` in this preview's config.js; all submissions require moderation and remain pending by default.
