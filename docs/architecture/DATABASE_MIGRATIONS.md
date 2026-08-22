# Database migrations

`supabase/migrations` is the sole executable schema history. Prisma maps the
domain but does not own migrations; never run `prisma db push` or create
`prisma/migrations`. `prisma/postgres-constraints.sql` is review-only.

The six 20260729 files preserve already-recorded historical identities. The
20260813000000 reconstruction migration creates the accepted pre-Speaking
schema, after which the existing Speaking migrations replay normally. The two
20260818 migrations remove obsolete DZ/single-session constraints and seed the
published BandScale v1 records.

Safe replay gate:

```text
supabase start
supabase db reset --local --no-seed
supabase db lint --local --schema app_private --fail-on error
```

Never use `db reset --linked`. Before any remote migration-history repair,
capture a schema-only dump and compare the exact remote ledger and live schema.
