revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public._qty(uuid,uuid), public._current_user_name() from authenticated;