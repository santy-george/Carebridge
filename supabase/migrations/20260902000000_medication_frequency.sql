-- medications.frequency has existed as a free-form text column since the
-- original schema but was never surfaced in the UI. Constrain it to a fixed
-- set of cadences (with 'daily' as the default) so the app can filter which
-- days a medication is actually due, instead of showing every medication
-- every day.
create type public.medication_frequency as enum ('daily', 'alternate_days', 'weekly', 'monthly');

alter table public.medications
  alter column frequency drop default,
  alter column frequency type public.medication_frequency using (
    case
      when frequency in ('daily', 'alternate_days', 'weekly', 'monthly')
        then frequency::public.medication_frequency
      else 'daily'::public.medication_frequency
    end
  ),
  alter column frequency set default 'daily',
  alter column frequency set not null;
