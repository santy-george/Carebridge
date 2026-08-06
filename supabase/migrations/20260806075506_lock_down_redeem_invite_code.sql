-- redeem_invite_code() had no auth.uid() is null guard, and the blanket
-- `alter default privileges ... grant execute on functions to anon,
-- authenticated, service_role` in 20260805095146_grants.sql meant `anon`
-- could call it directly. An anonymous caller got a distinguishable
-- response for a bad code (P0001 invalid_or_expired_code) vs. a valid one
-- (a 23502 not-null violation inserting member_links.user_id = auth.uid()
-- with auth.uid() null under the anon role) -- a working invite-code oracle
-- with no auth required. Lock the grant down to `authenticated` only, and
-- add an explicit guard in the function body as defence in depth (so the
-- function is safe even if grants are ever loosened again).
revoke execute on function public.redeem_invite_code(text) from public, anon;
grant execute on function public.redeem_invite_code(text) to authenticated;

create or replace function public.redeem_invite_code(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_invite public.member_invites;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_invite from public.member_invites
    where code = p_code and used_at is null and expires_at > now()
    for update;

  if not found then
    raise exception 'invalid_or_expired_code';
  end if;

  insert into public.member_links (member_id, user_id, relationship_label, is_self)
    values (v_invite.member_id, auth.uid(), v_invite.relationship_label, v_invite.is_self)
    on conflict (member_id, user_id) do nothing;

  update public.member_invites
    set used_at = now(), used_by_user_id = auth.uid()
    where id = v_invite.id;

  return v_invite.member_id;
end;
$$;
