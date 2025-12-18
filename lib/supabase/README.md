# Supabase Clients

## Client-Typen

### 1. Browser Client (`client.ts`)
- Für Client Components
- Verwendet `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Respektiert RLS Policies
- Session wird in Cookies gespeichert

### 2. Server Client (`server.ts`)
- Für Server Components und API Routes
- Verwendet `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Respektiert RLS Policies
- Nutzt User-Session aus Cookies

### 3. Admin Client (`admin.ts`) - Optional
- **Nur für spezielle Admin-Operationen**
- Verwendet `SUPABASE_SERVICE_ROLE_KEY`
- **Umgeht RLS komplett**
- **Niemals im Browser verwenden!**
- Nur für:
  - Background Jobs ohne User-Kontext
  - Admin-Dashboard
  - Bulk-Operationen über mehrere User
  - Programmatische Migrationen

## Verwendung

### Browser Client
```tsx
'use client'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
```

### Server Client
```tsx
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
```

### Admin Client (nur wenn nötig)
```tsx
import { createAdminClient } from '@/lib/supabase/admin'

// Nur in API Routes oder Server Actions
const supabase = createAdminClient()
```

## Wann welchen Client verwenden?

- **99% der Fälle:** Server Client (`server.ts`)
- **Client Components:** Browser Client (`client.ts`)
- **Admin/Background:** Admin Client (`admin.ts`) - nur wenn wirklich nötig

