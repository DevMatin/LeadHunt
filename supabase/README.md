# Supabase Migrations

Diese Migrations erstellen die Datenbank-Struktur für LeadHunt.

## Anwendung der Migrations

### Option 1: Via Supabase Dashboard
1. Öffne dein Supabase Projekt
2. Gehe zu SQL Editor
3. Führe die Migrations in der richtigen Reihenfolge aus:
   - `20241217000001_create_searches_table.sql`
   - `20241217000002_create_companies_table.sql`
   - `20241217000003_create_updated_at_trigger.sql`

### Option 2: Via Supabase CLI
```bash
# Falls Supabase CLI noch nicht installiert
npm install -g supabase

# Login
supabase login

# Link zu deinem Projekt
supabase link --project-ref your-project-ref

# Migrations anwenden
supabase db push
```

## Migration Details

1. **create_searches_table.sql**: Erstellt die `searches` Tabelle mit RLS Policies
2. **create_companies_table.sql**: Erstellt die `companies` Tabelle mit RLS Policies und `status` Feld
3. **create_updated_at_trigger.sql**: Erstellt Trigger für automatisches `updated_at` Update



