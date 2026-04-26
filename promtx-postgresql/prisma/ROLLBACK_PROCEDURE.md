# Prisma Migration Rollback Procedure

Prisma does not have a built-in `migrate rollback` command. Instead, follow these standard procedures to roll back database changes.

## Scenario 1: Rollback in Development

If you just ran a migration and want to revert it:

1. **Revert Prisma Schema**: Revert the changes in `schema.prisma` to the previous state (e.g., via Git: `git checkout prisma/schema.prisma`).
2. **Reset and Re-run**: Run `bunx prisma migrate dev`. Prisma will detect the drift and ask to reset the database, automatically creating a clean state.

## Scenario 2: Production / Safe Rollback (No Data Loss)

If you cannot lose existing data:

1. **Create a Revert Migration**: Instead of deleting the table, modify the schema to remove the fields/tables you want to drop.
2. **Apply**: Run `bunx prisma migrate dev --name revert_feature`. This will safely drop the schema items without wiping the entire DB.

## Scenario 3: Restoring Database from a Backup

If a catastrophic failure occurs:

1. Drop existing tables using standard SQL scripts.
2. Restore the database from the latest `.sql` dump:
   ```bash
   docker exec -i promtx-postgres psql -U postgres -d promtx < backup.sql
   ```
3. Mark migrations as applied without re-running them:
   ```bash
   bunx prisma migrate resolve --applied <migration_name>
   ```
