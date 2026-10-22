-- Demo seller used while auth is out of scope (DEMO_SELLER_ID in .env)
-- sellers.id references auth.users; create a shadow auth user first.
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values ('00000000-0000-0000-0000-000000000001', 'maya@demo.launchkit.app', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into sellers (id, shop_name, ships_from_city, ships_from_country, plan, credits_remaining)
values ('00000000-0000-0000-0000-000000000001', 'Maya Ceramics', 'Portland, OR', 'US', 'maker', 12)
on conflict (id) do nothing;

-- Storage bucket for uploads and rendered outputs
insert into storage.buckets (id, name, public) values ('launches', 'launches', true)
on conflict (id) do nothing;
