-- Seller product-image uploads. The bucket is public for storefront delivery,
-- while object writes remain limited to users in public.admin_users.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads product images" on storage.objects;
drop policy if exists "admins upload product images" on storage.objects;
drop policy if exists "admins update product images" on storage.objects;
drop policy if exists "admins delete product images" on storage.objects;

create policy "public reads product images"
on storage.objects for select
to public
using (bucket_id = 'product-images');

create policy "admins upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and (select private.is_admin()));

create policy "admins update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and (select private.is_admin()))
with check (bucket_id = 'product-images' and (select private.is_admin()));

create policy "admins delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and (select private.is_admin()));
