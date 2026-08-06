# @carebridge/db-types

Real Supabase-generated types, populated 2026-08-06 against the hosted
`Care Bridge App` project (ref `bbthbboakoicoyiuclll`, ap-south-1).
`src/database.types.ts` is generated output — don't hand-edit it.
`src/index.ts` re-exports its `Database` type.

## Regenerating

After any schema migration lands (locally and pushed via `supabase db push`
from `supabase/`), regenerate:

```bash
# Against local Supabase (supabase start first):
supabase gen types typescript --local > src/database.types.ts

# Against the hosted project:
supabase gen types typescript --project-id bbthbboakoicoyiuclll > src/database.types.ts
```

`src/index.test.ts` type-checks that the core tables (`members`, `profiles`,
`checkins`) still exist in the generated schema — a stale or wrong-project
regeneration fails the build.
