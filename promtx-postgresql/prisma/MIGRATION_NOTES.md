# Migration Notes: SQLite FTS5 to PostgreSQL tsvector

## Overview
The original application used SQLite's `FTS5` extension for full-text search on conversations. Since we are migrating to PostgreSQL, we will utilize PostgreSQL's native Full-Text Search (FTS) capabilities with `tsvector` and `tsquery`, indexed by a `GIN` (Generalized Inverted Index).

## Implementation Strategy

### 1. Database Schema
Instead of a separate virtual table (`conversations_fts`), PostgreSQL allows adding a generated full-text search column directly to the `conversations` table, or generating it on the fly in queries.

To optimize performance, we can add a `tsvector` column:
```sql
ALTER TABLE conversations ADD COLUMN search_vector tsvector;
```

### 2. Auto-Updating via Triggers
We use a PostgreSQL trigger to automatically update the full-text search index when a conversation title or related messages change:

```sql
CREATE OR REPLACE FUNCTION conversations_fts_trigger() RETURNS trigger AS $$
begin
  new.search_vector := to_tsvector('turkish', coalesce(new.title, ''));
  return new;
end
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_fts_update
  BEFORE INSERT OR UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION conversations_fts_trigger();
```

### 3. Querying (Prisma vs Raw SQL)
Prisma Client supports full-text search natively in PostgreSQL via `search`:

```typescript
const results = await prisma.conversation.findMany({
  where: {
    title: {
      search: 'arama_terimi',
    },
  },
});
```

## Conclusion
This approach eliminates the need for external synchronization logic between SQLite and FTS5, utilizing PostgreSQL's superior indexing mechanisms.
