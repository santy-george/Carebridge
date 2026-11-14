-- Home's SpO2 ring read only manually entered SpO2 (vitals_readings), so
-- wearable SpO2 -- Apple Watch samples and Fitbit nightly averages via the
-- Google Health API -- never reached it. Adds the latest wearable SpO2;
-- Home shows whichever of the two is newer. Otherwise unchanged (still
-- SECURITY INVOKER, so every table's RLS applies as before).
create or replace function public.get_home_dashboard(p_member_id uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'full_name', (
      select full_name from public.members where id = p_member_id
    ),
    'medical_profile', (
      select jsonb_build_object(
        'conditions', conditions,
        'conditions_other', conditions_other,
        'allergies', allergies
      )
      from public.medical_profile
      where member_id = p_member_id
    ),
    'checkin', (
      select jsonb_build_object(
        'wellness_score', wellness_score,
        'checkin_date', checkin_date
      )
      from public.checkins
      where member_id = p_member_id
      order by checkin_date desc, created_at desc
      limit 1
    ),
    'vitals', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'vital_type', vital_type,
        'value', value,
        'recorded_at', recorded_at
      ) order by recorded_at desc), '[]'::jsonb)
      from public.vitals_readings
      where member_id = p_member_id
        and vital_type in ('blood_pressure', 'spo2_pct', 'weight_kg', 'height_cm')
    ),
    'glucose', (
      select jsonb_build_object(
        'value_mg_dl', value_mg_dl,
        'context', context,
        'reading_date', reading_date,
        'reading_time', reading_time
      )
      from public.glucose_readings
      where member_id = p_member_id
      order by reading_date desc, reading_time desc
      limit 1
    ),
    'heart_rate', (
      select jsonb_build_object('value', value, 'recorded_at', recorded_at)
      from public.wearable_readings
      where member_id = p_member_id
        and reading_type = 'heart_rate'
        and value is not null
      order by recorded_at desc
      limit 1
    ),
    'respiratory_rate', (
      select jsonb_build_object('value', value, 'recorded_at', recorded_at)
      from public.wearable_readings
      where member_id = p_member_id
        and reading_type = 'respiratory_rate'
        and value is not null
      order by recorded_at desc
      limit 1
    ),
    'spo2', (
      select jsonb_build_object('value', value, 'recorded_at', recorded_at)
      from public.wearable_readings
      where member_id = p_member_id
        and reading_type = 'spo2'
        and value is not null
      order by recorded_at desc
      limit 1
    ),
    'steps', (
      select jsonb_build_object('value', value, 'day', day)
      from public.daily_activity_totals
      where member_id = p_member_id
        and reading_type = 'step_count'
      order by day desc
      limit 1
    ),
    'sleep_sessions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'started_at', started_at,
        'ended_at', ended_at
      ) order by started_at desc), '[]'::jsonb)
      from public.sleep_sessions
      where member_id = p_member_id
        and stage != 'awake'
        and started_at >= now() - interval '24 hours'
    )
  );
$$;

grant execute on function public.get_home_dashboard(uuid) to authenticated;
