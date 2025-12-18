# Apollo Integration

Integration Layer für die Apollo.io REST API zur automatischen Enrichment von Companies und Contacts.

## Wichtige Hinweise

**Endpoint-Namen können sich ändern!** Immer zuerst die offizielle Apollo Dokumentation prüfen:
- Developer Hub: https://docs.apollo.io/
- API Overview: https://docs.apollo.io/docs/api-overview

## Setup

### Environment Variables

```bash
APOLLO_ENABLED=true
APOLLO_API_KEY=your_api_key_here
```

### API Key erstellen

1. Logge dich in dein Apollo Account ein
2. Gehe zu Settings > Integrations
3. Klicke auf Connect neben Apollo API
4. Unter API Keys, wähle Create new key
5. Speichere den generierten Key sicher

## Verwendung

### Feature Flag

Die Integration wird über das Feature Flag `APOLLO_ENABLED` gesteuert:
- `true`: Apollo Enrichment wird verwendet
- `false`: Apollo Enrichment ist deaktiviert

### Credit-Guard

Die Integration prüft automatisch, ob genügend Daten für Enrichment vorhanden sind:
- **Erforderlich:** `website` ODER `name` muss vorhanden sein
- Wenn keines vorhanden ist, wird Enrichment übersprungen (Status: `skipped`)

### Enrichment Status

Die Datenbank speichert den Enrichment-Status:
- `pending`: Wird noch verarbeitet
- `enriched`: Erfolgreich angereichert
- `failed`: Fehler beim Enrichment
- `skipped`: Übersprungen (z.B. wegen Credit-Guard)

## API Endpoints

**WICHTIG:** Die tatsächlichen Endpoint-Namen können sich ändern. Prüfe die offizielle Doku.

### Organization Enrichment

Enriched Organization-Daten basierend auf Domain.

**WICHTIG:** Die offizielle Apollo API unterstützt nur Domain-basierte Enrichment. Name+Location wird nicht mehr unterstützt.

```typescript
import { enrichOrganization } from '@/lib/integrations/apollo/enrich'

const organization = await enrichOrganization('example.com')
```

### Person Search

Findet Top-Decision-Maker einer Organization (max. 1 Person).

```typescript
import { findTopDecisionMaker } from '@/lib/integrations/apollo/enrich'

const person = await findTopDecisionMaker('org-id-123', 'Example Corp', [
  'CEO',
  'Founder',
  'President'
])
```

### Email Finder

Findet verifizierte E-Mail-Adressen für Personen.

```typescript
import { findEmail } from '@/lib/integrations/apollo/enrich'

const email = await findEmail('person-id-123', 'John', 'Doe', 'example.com')
```

### Vollständiges Company Enrichment

Kombinierte Funktion für vollständige Company-Daten:

```typescript
import { enrichCompany } from '@/lib/integrations/apollo/enrich'

const enriched = await enrichCompany(
  'https://example.com',
  'Example Corp',
  'Berlin, Germany',
  {
    includePerson: true,
    includeEmail: true,
    personTitles: ['CEO', 'Founder']
  }
)
```

**Hinweis:** `enrichCompany` benötigt eine Website/Domain. Wenn nur Name+Location vorhanden ist, muss zuerst eine Organization Search durchgeführt werden, um die Domain zu finden.

### People Search mit Standort und Branche

Suche nach Personen in bestimmten Branchen und Städten:

```typescript
import { searchAndEnrichPeople } from '@/lib/integrations/apollo/enrich'

const people = await searchAndEnrichPeople({
  person_locations: ['Köln', 'Berlin'],
  q_keywords: 'Modeling',
  person_titles: ['Model', 'Fashion Model'],
  maxResults: 50,
  includeEmail: true,
  reveal_personal_emails: false
})
```

**Parameter:**
- `person_locations`: Array von Städten (z.B. ['Köln', 'Berlin'])
- `organization_locations`: Array von Firmenstandorten
- `q_keywords`: Branche/Keywords (z.B. 'Modeling', 'Fashion')
- `person_titles`: Array von Job-Titeln
- `maxResults`: Maximale Anzahl Ergebnisse (Standard: 100)
- `includeEmail`: Ob Email-Adressen abgerufen werden sollen (Standard: true)
- `reveal_personal_emails`: Ob persönliche Emails abgerufen werden sollen (Standard: false)

**WICHTIG:** 
- People API Search verbraucht **keine Credits**
- Email-Enrichment verbraucht **Credits pro Person**
- Die Suche gibt standardmäßig keine Email-Adressen zurück - diese müssen separat abgerufen werden

### Export-Funktionalität

Exportiere gefundene Personen als CSV oder JSON:

```typescript
import { searchAndEnrichPeople, exportToCSV, exportToJSON } from '@/lib/integrations/apollo/enrich'

const people = await searchAndEnrichPeople({
  person_locations: ['Köln', 'Berlin'],
  q_keywords: 'Modeling',
  includeEmail: true
})

const csv = exportToCSV(people)
const json = exportToJSON(people)
```

**CSV-Format:**
- Name, First Name, Last Name, Title, Email, Email Status, Organization Name, Location

**JSON-Format:**
- Vollständige Objekte mit allen verfügbaren Feldern

## Authentifizierung

Die Integration verwendet den `X-Api-Key` Header für die Authentifizierung. Dies ist die Standard-Methode für Apollo API Keys.

**Hinweis:** Die Apollo-Dokumentation zeigt in der UI "Bearer Token", aber die API akzeptiert auch `X-Api-Key` Header, was die gängigere Methode ist.

## Rate Limiting

- **Limit:** 120 Requests pro Minute (Standard, kann je nach Pricing Plan variieren)
- Automatisches Warten bei Limit-Überschreitung
- Implementiert in `client.ts`
- Rate Limits können über die Apollo API abgefragt werden

## Retry Logic

- **Max Retries:** 3
- **Strategy:** Exponential Backoff
- **Retryable Errors:** 5xx, 429, Network Errors

## Logging

Strukturiertes Logging für alle Apollo Requests:
- Erfolgreiche Requests
- Fehler mit Details (Status Code, Error Message)
- Timestamps

## Credit Usage

**Wichtig:** Jeder Enrichment-Request verbraucht Apollo Credits. Die Integration optimiert Credit-Verbrauch durch:
- Credit-Guard (nur enrich wenn Daten vorhanden)
- Nur 1 Person pro Company
- Nur Top-Decision-Maker
- Kein automatisches Re-Enrichment

**Credit-Verbrauch nach Endpoint:**
- **Organization Enrichment:** Verbraucht Credits
- **People API Search:** Verbraucht **KEINE** Credits
- **People Enrichment (Email Match):** Verbraucht Credits pro Person
- **Bulk Operations:** Verbrauchen Credits pro Eintrag

**Tipp:** Nutze `searchAndEnrichPeople()` mit `includeEmail: false` für eine kostenlose Suche, und rufe dann nur für interessante Personen die Emails ab.

## Datenbank-Felder

Die `companies` Tabelle enthält folgende Apollo-Felder:
- `apollo_enrichment_status`: Status der Enrichment
- `apollo_error_reason`: Fehlergrund (nullable)
- `apollo_organization_id`: Apollo Organization ID (nullable)
- `apollo_enriched_at`: Zeitpunkt der erfolgreichen Enrichment (nullable)

## Fehlerbehandlung

Bei Apollo-Fehlern:
1. Fehler wird geloggt
2. Status wird auf `failed` gesetzt
3. `apollo_error_reason` wird gespeichert

## Testing

Für Tests mit Apollo API:
```bash
APOLLO_ENABLED=true
APOLLO_API_KEY=your_test_key
```

