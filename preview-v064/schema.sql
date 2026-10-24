-- Hanam v0.6.4 dedicated Supabase project schema. Apply ONLY to the new empty hanam-community project.
-- This project is independent of martpick, quizpick, goldpick and festamap.
-- Review anonymous Auth policy and bot protection before allowing submissions.
-- All user-submitted material requires moderation (status=pending by default).
-- Never include a service-role key in the static frontend.

create table if not exists public.hanam_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 2 and 24),
  kind text not null check (kind in ('photo', 'story')),
  title text not null check (char_length(btrim(title)) between 2 and 70),
  body text not null default '' check (char_length(body) <= 800),
  zone text,
  spot text,
  status text not null default 'pending' check (status in ('pending','published','removed')),
  created_at timestamptz not null default now(),
  constraint hanam_post_location check (
    (kind='story' and zone is null and spot is null) or
    (kind='photo' and zone is not null and spot is not null and zone ~ '^[A-J]$' and spot in (zone||'-01',zone||'-02'))
  )
);

create table if not exists public.hanam_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.hanam_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  object_path text not null unique,
  ordinal smallint not null check (ordinal between 0 and 9),
  created_at timestamptz not null default now(),
  unique (post_id, ordinal)
);

create table if not exists public.hanam_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.hanam_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 2 and 24),
  body text not null check (char_length(btrim(body)) between 1 and 250),
  status text not null default 'pending' check (status in ('pending','published','removed')),
  created_at timestamptz not null default now()
);

create table if not exists public.hanam_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.hanam_posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('privacy','spam','copyright','abuse','other')),
  detail text not null default '' check (char_length(detail) <= 300),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

create index if not exists hanam_posts_live_idx on public.hanam_posts (created_at desc) where status='published';
create index if not exists hanam_posts_owner_idx on public.hanam_posts (author_id, created_at desc);
create index if not exists hanam_photos_post_idx on public.hanam_photos (post_id, ordinal);
create index if not exists hanam_comments_post_idx on public.hanam_comments (post_id, created_at);

alter table public.hanam_posts enable row level security;
alter table public.hanam_photos enable row level security;
alter table public.hanam_comments enable row level security;
alter table public.hanam_reports enable row level security;

-- Read public, moderated content; anonymous signed-in authors can see their own pending submissions.
create policy hanam_posts_public_read on public.hanam_posts
  for select to anon, authenticated using (status='published');
create policy hanam_posts_own_read on public.hanam_posts
  for select to authenticated using (author_id=(select auth.uid()));
create policy hanam_posts_submit on public.hanam_posts
  for insert to authenticated with check (
    author_id=(select auth.uid()) and status='pending'
  );
create policy hanam_posts_draft_delete on public.hanam_posts
  for delete to authenticated using (author_id=(select auth.uid()) and status='pending');
-- No public UPDATE policy: only trusted dashboard/service moderation changes status.

create policy hanam_photos_public_read on public.hanam_photos
  for select to anon, authenticated using (
    exists (select 1 from public.hanam_posts p where p.id=post_id and p.status='published')
  );
create policy hanam_photos_own_read on public.hanam_photos
  for select to authenticated using (author_id=(select auth.uid()));
create policy hanam_photos_submit on public.hanam_photos
  for insert to authenticated with check (
    author_id=(select auth.uid())
    and split_part(object_path, '/', 1)=(select auth.uid()::text)
    and split_part(object_path, '/', 2)=post_id::text
    and object_path = (select auth.uid()::text) || '/' || post_id::text || '/' || ordinal::text || '.webp'
    and exists (select 1 from storage.objects o where o.bucket_id='hanam-photos' and o.name=object_path)
    and exists (select 1 from public.hanam_posts p where p.id=post_id and p.author_id=(select auth.uid()) and p.kind='photo' and p.status='pending')
  );

create policy hanam_comments_public_read on public.hanam_comments
  for select to anon, authenticated using (
    status='published' and exists(select 1 from public.hanam_posts p where p.id=post_id and p.status='published')
  );
create policy hanam_comments_own_read on public.hanam_comments
  for select to authenticated using (author_id=(select auth.uid()));
create policy hanam_comments_submit on public.hanam_comments
  for insert to authenticated with check (
    author_id=(select auth.uid()) and status='pending'
    and exists (select 1 from public.hanam_posts p where p.id=post_id and (p.status='published' or p.author_id=(select auth.uid())))
  );

create policy hanam_reports_submit on public.hanam_reports
  for insert to authenticated with check (
    reporter_id=(select auth.uid()) and
    exists (select 1 from public.hanam_posts p where p.id=post_id and p.status='published' and p.author_id<>(select auth.uid()))
  );
-- No SELECT/DELETE policy for reports: reporters must not inspect others' reports.

revoke all on public.hanam_posts, public.hanam_photos, public.hanam_comments, public.hanam_reports from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.hanam_posts, public.hanam_photos, public.hanam_comments to anon;
grant select, insert, delete on public.hanam_posts to authenticated;
grant select, insert on public.hanam_photos, public.hanam_comments to authenticated;
grant insert on public.hanam_reports to authenticated;

-- Private image bucket, 4 MB per resized WebP. Create only when this project is dedicated to Hanam.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hanam-photos','hanam-photos',false,4194304,array['image/webp'])
on conflict (id) do nothing;

create policy hanam_storage_upload on storage.objects
  for insert to authenticated with check (
    bucket_id='hanam-photos'
    and split_part(name,'/',1)=(select auth.uid()::text)
    -- Exactly 10 possible object names per draft (0.webp ... 9.webp).
    and split_part(name,'/',3) in ('0.webp','1.webp','2.webp','3.webp','4.webp','5.webp','6.webp','7.webp','8.webp','9.webp')
    and name = (select auth.uid()::text) || '/' || split_part(name,'/',2) || '/' || split_part(name,'/',3)
    and exists (
      select 1 from public.hanam_posts p
      where p.id::text=split_part(name,'/',2) and p.author_id=(select auth.uid())
        and p.kind='photo' and p.status='pending'
    )
  );
create policy hanam_storage_view on storage.objects
  for select to anon, authenticated using (
    bucket_id='hanam-photos' and exists(
      select 1 from public.hanam_photos f
      join public.hanam_posts p on p.id=f.post_id
      where f.object_path=name and (p.status='published' or p.author_id=(select auth.uid()))
    )
  );
-- Allow an owner to read newly uploaded draft objects *before* inserting photo metadata.
-- Otherwise the metadata INSERT verification of storage.objects would be blocked by RLS.
create policy hanam_storage_pending_owner_read on storage.objects
  for select to authenticated using (
    bucket_id='hanam-photos'
    and split_part(name,'/',1)=(select auth.uid()::text)
    and split_part(name,'/',3) in ('0.webp','1.webp','2.webp','3.webp','4.webp','5.webp','6.webp','7.webp','8.webp','9.webp')
    and exists(select 1 from public.hanam_posts p where p.id::text=split_part(name,'/',2) and p.author_id=(select auth.uid()) and p.kind='photo' and p.status='pending')
  );

create policy hanam_storage_draft_delete on storage.objects
  for delete to authenticated using (
    bucket_id='hanam-photos'
    and split_part(name,'/',1)=(select auth.uid()::text)
    and exists(select 1 from public.hanam_posts p where p.id::text=split_part(name,'/',2) and p.author_id=(select auth.uid()) and p.status='pending')
  );

-- Moderation (operator executes ONLY in Supabase SQL Editor, never in browser):
-- update public.hanam_posts set status='published' where id='VERIFIED_UUID' and status='pending';
-- update public.hanam_comments set status='published' where id='VERIFIED_UUID' and status='pending';
-- update public.hanam_posts set status='removed' where id='VERIFIED_UUID';
-- Verify each image is authorized, no personal information, and within posting rules before publishing.