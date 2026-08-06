create type public.user_role as enum ('member', 'coordinator');
create type public.care_model as enum ('self_care', 'virtual_care', 'direct_care');
create type public.plan_level as enum ('basic', 'standard', 'premium');
create type public.medication_source as enum ('otc', 'prescription');
create type public.time_of_day_band as enum ('morning', 'noon', 'evening', 'night');
create type public.document_category as enum ('lab_report', 'prescription', 'scan_imaging', 'other');
create type public.sos_alert_type as enum ('manual', 'wearable_fall');
create type public.sos_alert_status as enum ('open', 'acknowledged', 'resolved', 'false_alarm');
create type public.glucose_context as enum ('fasting', 'pre_meal', 'post_meal', 'bedtime');
create type public.upgrade_lead_status as enum ('new', 'contacted', 'converted', 'declined');
create type public.vital_type as enum (
  'weight_kg','height_cm','heart_rate_bpm','blood_pressure',
  'spo2_pct','respiratory_rate_bpm','sleep_hours','steps','hrv_ms'
);
