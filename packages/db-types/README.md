# @carebridge/db-types

Structural placeholder. `src/index.ts` exports `SCHEMA_VERSION = 'unpopulated'`
and a `Database` type alias until Supabase Auth work resumes.

## Generating real types

Once the local stack is running (`supabase start` from `supabase/`) or the
hosted `carebridge-dev` project is linked:

```bash
# Against local Supabase:
supabase gen types typescript --local > src/database.types.ts

# Against the hosted project, once linked:
supabase gen types typescript --project-id <project-ref> > src/database.types.ts
```

Then replace the `Database` placeholder in `src/index.ts` with:

```ts
export type { Database } from './database.types';
```

and remove the `SCHEMA_VERSION` placeholder and its test.
