# Hanam v0.7.2 — real photo RLS cycle hotfix and upload UX

Standalone Supabase: `abpxhhttsjiatqthspgb`. Existing v0.5, v0.6.x, v0.7.0 and v0.7.1 unchanged.

## Server changes already deployed
- Fixed infinite RLS recursion between `hanam_photos_submit` and `storage.objects` SELECT. Photo metadata insert no longer queries storage objects inside the RLS policy.
- Non-exposed security-definer trigger `hanam_internal.require_complete_photo_post` validates *all* 1–10 image objects in storage before switching a post from pending to published.
- Database test passed: signed-in anonymous owner inserts photo metadata, publishes a post, public anon can read post/photo/storage object. Negative test verified fake metadata without file cannot be published. Tests rolled back.

## UI
- Nickname save does not create an unused anonymous account; first post/comment creates it automatically.
- Shows image count/size and compression/upload notices.
- A missing publish response no longer triggers deletion of photos from an already published post.
- Failure preserves error details, corrects stale moderation wording.
- User-triggered diagnostics at `/preview-v072/check/` retained.

## Not verified
- Exact Supabase Auth anonymous-login setting; must be ON in hanam-community, not Martpick.
- Actual Galaxy WebP upload, comments, reports and browser back-navigation still need browser/device tests.
- Bot prevention beyond per-identity limits and link checks is not complete.
