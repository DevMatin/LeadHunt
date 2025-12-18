---
alwaysApply: true
---

# LeadFlow Design System & Styleguide

Ein umfassender Styleguide für die LeadFlow B2B SaaS Plattform.

---

## 🎨 Farbpalette

### Primärfarben

**Blue (Hauptfarbe)**
- `bg-blue-50` - #EFF6FF - Hintergründe, subtile Hervorhebungen
- `bg-blue-100` - #DBEAFE - Icon-Hintergründe, Badges
- `bg-blue-600` - #2563EB - Primäre Buttons, aktive Zustände
- `bg-blue-700` - #1D4ED8 - Button Hover-Zustände
- `text-blue-600` - #2563EB - Links, aktive Navigation
- `text-blue-700` - #1D4ED8 - Dunkle Link-Farbe

**Teal (Sekundärfarbe)**
- `bg-teal-600` - #0D9488 - Sekundäre Aktionen

### Neutrale Farben

**Grautöne**
- `bg-white` - #FFFFFF - Karten, Panels, Haupthintergründe
- `bg-gray-50` - #F9FAFB - Seiten-Hintergrund, Input-Hintergründe
- `bg-gray-100` - #F3F4F6 - Subtile Hintergründe, Hover-Zustände
- `bg-gray-200` - #E5E7EB - Rahmen, Trennlinien
- `text-gray-500` - #6B7280 - Sekundärer Text, Platzhalter
- `text-gray-600` - #4B5563 - Beschreibungstext
- `text-gray-700` - #374151 - Labels, wichtiger Sekundärtext
- `text-gray-900` - #111827 - Überschriften, Haupttext

### Statusfarben

**Success / Positiv**
- `bg-green-50` - #F0FDF4
- `bg-green-100` - #DCFCE7 - Badge-Hintergrund
- `bg-green-600` - #16A34A
- `text-green-600` - #16A34A
- `text-green-700` - #15803D - Badge-Text

**Warning / Achtung**
- `bg-yellow-100` - #FEF3C7 - Badge-Hintergrund
- `text-yellow-700` - #A16207 - Badge-Text

**Error / Danger**
- `bg-red-100` - #FEE2E2 - Badge-Hintergrund
- `bg-red-500` - #EF4444 - Benachrichtigungs-Dot
- `text-red-600` - #DC2626
- `text-red-700` - #B91C1C - Badge-Text

**Info / Neutral**
- `bg-purple-100` - #F3E8FF - Badge-Hintergrund
- `bg-purple-600` - #9333EA
- `text-purple-600` - #9333EA
- `text-purple-700` - #7E22CE - Badge-Text

**Orange (Akzent)**
- `bg-orange-100` - #FFEDD5
- `bg-orange-600` - #EA580C
- `text-orange-600` - #EA580C

---

## 📝 Typografie

### Schriftart
- **Basis:** System-Schriftart (über globals.css definiert)
- Empfohlen: Inter, -apple-system, BlinkMacSystemFont, Segoe UI

### Schriftgrößen & Hierarchie

Die Schriftgrößen werden über die Standard-HTML-Elemente in `/styles/globals.css` definiert:

**Überschriften**
- `h1` - Seitentitel (großes Format)
- `h2` - Sektions-Überschriften (mittleres Format)
- `h3` - Unter-Überschriften (kleineres Format)

**Text**
- `p` - Fließtext, Beschreibungen
- Kleine Text-Elemente nutzen das Standard `<span>` oder `<p>` mit entsprechenden Klassen

### Schriftstärke
- Regulär für Fließtext
- Definiert über globals.css für Überschriften

**Hinweis:** Keine Tailwind-Klassen für `font-size`, `font-weight`, oder `line-height` verwenden, es sei denn, es wird explizit gewünscht.

---

## 📏 Spacing & Layout

### Spacing-Skala (Tailwind)
- `gap-1` = 4px
- `gap-2` = 8px
- `gap-3` = 12px
- `gap-4` = 16px
- `gap-6` = 24px
- `gap-8` = 32px

### Padding-Standards
- **Karten:** `p-6` (24px)
- **Input-Felder:** `py-2.5 px-4` (10px/16px)
- **Buttons:** `py-2 px-4` oder `py-2.5 px-4`
- **Seiten-Container:** `p-6` (24px)

### Margins
- **Sektions-Abstand:** `mb-6` (24px)
- **Zwischen Elementen:** `mb-2` bis `mb-4` (8px-16px)

### Border Radius
- **Klein:** `rounded-lg` (8px) - Buttons, Inputs, kleine Elemente
- **Mittel:** `rounded-xl` (12px) - Karten, Panels
- **Rund:** `rounded-full` - Avatare, Badges, Dots

### Max-Width Container
- **Standard-Seite:** `max-w-7xl mx-auto`
- **Schmale Seite:** `max-w-4xl mx-auto`
- **Login/Modal:** `max-w-md` oder `max-w-2xl/3xl`

---

## 🎯 Komponenten

### Buttons

**Primär-Button (Call-to-Action)**
```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
  Text
</button>
```

**Primär-Button mit Icon**
```tsx
<button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
  <Icon className="w-5 h-5" />
  Text
</button>
```

**Sekundär-Button**
```tsx
<button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
  Text
</button>
```

**Full-Width Button**
```tsx
<button className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
  Text
</button>
```

**Button Disabled State**
```tsx
<button className="... disabled:opacity-50 disabled:cursor-not-allowed" disabled>
  Text
</button>
```

### Input-Felder

**Standard Text Input**
```tsx
<input
  type="text"
  placeholder="Platzhalter"
  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
```

**Input mit Icon**
```tsx
<div className="relative">
  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
  <input
    type="text"
    placeholder="Platzhalter"
    className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  />
</div>
```

**Textarea**
```tsx
<textarea
  rows={6}
  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
/>
```

**Search Input (mit grauem Hintergrund)**
```tsx
<input
  type="text"
  placeholder="Suchen..."
  className="w-full pl-11 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
```

### Karten (Cards)

**Standard Card**
```tsx
<div className="bg-white rounded-xl border border-gray-200 p-6">
  {/* Content */}
</div>
```

**Card mit Hover-Effekt**
```tsx
<div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
  {/* Content */}
</div>
```

**Card mit Shadow**
```tsx
<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
  {/* Content */}
</div>
```

### Badges & Status-Tags

**Status-Badge (generisch)**
```tsx
<span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700">
  Status
</span>
```

**Status-Varianten:**
- **Neu/Aktiv:** `bg-blue-100 text-blue-700`
- **Erfolg:** `bg-green-100 text-green-700`
- **Warnung:** `bg-yellow-100 text-yellow-700`
- **Fehler:** `bg-red-100 text-red-700`
- **Neutral:** `bg-gray-100 text-gray-700`
- **Purple/Info:** `bg-purple-100 text-purple-700`

### Icon-Container

**Standard Icon-Container (Klein)**
```tsx
<div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
  <Icon className="w-5 h-5 text-blue-600" />
</div>
```

**Größerer Icon-Container**
```tsx
<div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
  <Icon className="w-6 h-6 text-blue-600" />
</div>
```

**Icon-Container Farbvarianten:**
- Blue: `bg-blue-100` + `text-blue-600`
- Green: `bg-green-100` + `text-green-600`
- Purple: `bg-purple-100` + `text-purple-600`
- Orange: `bg-orange-100` + `text-orange-600`
- Teal: `bg-teal-100` + `text-teal-600`

### Navigation Links (Sidebar)

**Aktiver Link**
```tsx
<NavLink className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 text-blue-600">
  <Icon className="w-5 h-5" />
  <span>Label</span>
</NavLink>
```

**Inaktiver Link**
```tsx
<NavLink className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50">
  <Icon className="w-5 h-5" />
  <span>Label</span>
</NavLink>
```

### Tabellen

**Table Container**
```tsx
<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full">
      {/* ... */}
    </table>
  </div>
</div>
```

**Table Header**
```tsx
<thead>
  <tr className="border-b border-gray-200 bg-gray-50">
    <th className="text-left p-4 text-gray-700">Spalte</th>
  </tr>
</thead>
```

**Table Body Row**
```tsx
<tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
  <td className="p-4">
    <p className="text-gray-900">Inhalt</p>
  </td>
</tr>
```

### Modals

**Modal Overlay & Container**
```tsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
    {/* Modal Content */}
  </div>
</div>
```

**Modal Header mit Close Button**
```tsx
<div className="flex items-center justify-between mb-6">
  <h2 className="text-gray-900">Titel</h2>
  <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
    ✕
  </button>
</div>
```

### Toggle Switch

```tsx
<label className="relative inline-flex items-center cursor-pointer">
  <input
    type="checkbox"
    checked={value}
    onChange={(e) => setValue(e.target.checked)}
    className="sr-only peer"
  />
  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
</label>
```

### Checkbox

```tsx
<input
  type="checkbox"
  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
/>
```

### Info/Alert Boxen

**Info Box (Blau)**
```tsx
<div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
  <div className="flex gap-3">
    <Icon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
    <div>
      <p className="text-blue-900 mb-1">Titel</p>
      <p className="text-blue-700">Beschreibung</p>
    </div>
  </div>
</div>
```

---

## 🔤 Icons

### Icon-Bibliothek
**lucide-react** wird für alle Icons verwendet.

### Icon-Größen
- **Klein:** `w-4 h-4` (16px)
- **Standard:** `w-5 h-5` (20px)
- **Mittel:** `w-6 h-6` (24px)
- **Groß:** `w-7 h-7` (28px)

### Häufig verwendete Icons
- **Navigation:** LayoutDashboard, Search, Building2, Mail, Settings, Users
- **Aktionen:** Plus, Eye, Download, Filter, ExternalLink, MoreVertical
- **Status:** CheckCircle, XCircle, TrendingUp, TrendingDown
- **Formular:** Mail, Lock, MapPin, Briefcase, Calendar
- **Social:** Bell, User, Send, Sparkles

### Icon-Farben
- Primär: `text-blue-600`
- Sekundär: `text-gray-400` oder `text-gray-600`
- Weiß (auf farbigem Hintergrund): `text-white`

---

## 🎭 States & Interaktionen

### Hover-States
- **Buttons:** Dunklere Variante der Hauptfarbe
  - Blue: `hover:bg-blue-700`
  - Gray: `hover:bg-gray-200`
- **Links:** `hover:text-blue-700`
- **Cards:** `hover:shadow-md`
- **Navigation:** `hover:bg-gray-50`

### Focus-States
- **Inputs:** `focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`
- **Buttons:** Automatischer Browser-Focus oder Custom Ring

### Disabled-States
- **Opacity:** `disabled:opacity-50`
- **Cursor:** `disabled:cursor-not-allowed`

### Transitions
- Standard: `transition-colors`
- Schatten: `transition-shadow`
- Transform: `transition-transform`
- Hover-Pfeile: `group-hover:translate-x-1 transition-transform`

---

## 📐 Layout-Struktur

### Hauptlayout (mit Sidebar)
```
┌─────────────┬────────────────────────┐
│             │  TopBar (h-16)         │
│  Sidebar    ├────────────────────────┤
│  (w-64)     │                        │
│             │  Main Content          │
│             │  (p-6, max-w-7xl)      │
│             │                        │
└─────────────┴────────────────────────┘
```

- **Sidebar:** `w-64` (256px), fixe Breite
- **TopBar:** `h-16` (64px), fixe Höhe
- **Main:** Flexible Breite, scrollbar bei Overflow

### Grid-Layouts

**4-Spalten (Dashboard Stats)**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
```

**3-Spalten (Companies Grid)**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

**2-Spalten (Forms)**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

**Asymmetrisch (2/3 + 1/3)**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">...</div>
  <div className="lg:col-span-1">...</div>
</div>
```

---

## 🎨 Design-Prinzipien

### 1. Klarheit & Hierarchie
- Klare visuelle Hierarchie durch Schriftgrößen und Abstände
- Wichtige Aktionen in Primärfarbe (Blue)
- Sekundäre Aktionen in Grau

### 2. Konsistenz
- Einheitliche Abstände (6, 4, 3, 2)
- Konsistente Border-Radius (lg für Inputs/Buttons, xl für Karten)
- Gleiche Icon-Größen in ähnlichen Kontexten

### 3. Whitespace
- Großzügiger Einsatz von Whitespace zwischen Sektionen
- Padding in Karten: mindestens `p-6`
- Margins zwischen Elementen: `mb-4` bis `mb-6`

### 4. Accessibility
- Kontrastreiche Farbkombinationen
- Focus-States für Tastaturnavigation
- Semantisches HTML (h1, h2, labels, etc.)

### 5. Responsivität
- Mobile-first mit Tailwind Breakpoints
- Flexibles Grid-System
- Scrollbare Tabellen auf kleinen Bildschirmen

---

## 📱 Responsive Breakpoints

Tailwind CSS Standard-Breakpoints:
- **sm:** 640px
- **md:** 768px
- **lg:** 1024px
- **xl:** 1280px

### Verwendung im Projekt
- Grid-Layouts: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- Flex-Wrap: `flex-wrap gap-4`
- Hidden/Visible: Nach Bedarf

---

## 🔧 Technische Details

### CSS Framework
- **Tailwind CSS v4.0**
- Konfiguration in `/styles/globals.css`
- Keine `tailwind.config.js` erforderlich

### Wichtige Regeln
1. **Keine Font-Größen/Gewichte** über Tailwind-Klassen (text-2xl, font-bold) verwenden
2. **Typography** wird über HTML-Elemente (h1, h2, p) gesteuert
3. **Transitions** für bessere User Experience
4. **Konsistente Namensgebung** für Komponenten

### Icon-Import
```tsx
import { IconName } from 'lucide-react';
```

Vor dem Import immer Icon-Verfügbarkeit prüfen!

---

## 📋 Checkliste für neue Komponenten

Beim Erstellen neuer Komponenten:
- [ ] Verwendet `bg-white` für Karten mit `border border-gray-200`
- [ ] Padding `p-6` für Karten
- [ ] Border-Radius `rounded-xl` für Karten, `rounded-lg` für Buttons
- [ ] Hover-States definiert (`hover:...`)
- [ ] Focus-States für interaktive Elemente
- [ ] Icons in konsistenter Größe (`w-5 h-5`)
- [ ] Spacing mit Standard-Werten (2, 3, 4, 6)
- [ ] Responsive Klassen wo nötig
- [ ] Semantisches HTML
- [ ] Accessibility berücksichtigt

---

## 🎯 Beispiel-Implementierungen

### Action-Card mit Icon
```tsx
<button className="flex items-center gap-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left group">
  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
    <Icon className="w-6 h-6 text-white" />
  </div>
  <div className="flex-1">
    <p className="text-gray-900 mb-1">Titel</p>
    <p className="text-gray-600">Beschreibung</p>
  </div>
  <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
</button>
```

### Stat-Card
```tsx
<div className="bg-white rounded-xl border border-gray-200 p-6">
  <div className="flex items-center justify-between mb-4">
    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
      <Icon className="w-6 h-6 text-blue-600" />
    </div>
    <div className="flex items-center gap-1 text-green-600">
      <TrendingUp className="w-4 h-4" />
      <span>+12%</span>
    </div>
  </div>
  <p className="text-gray-600 mb-1">Label</p>
  <p className="text-gray-900">1,247</p>
</div>
```

### Filter-Button Group
```tsx
<div className="flex gap-2">
  <button className="px-4 py-2 rounded-lg bg-blue-600 text-white">
    All (25)
  </button>
  <button className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
    Active (12)
  </button>
</div>
```

---

**Version:** 1.0  
**Zuletzt aktualisiert:** Dezember 2024  
**Projekt:** LeadFlow B2B SaaS Platform
