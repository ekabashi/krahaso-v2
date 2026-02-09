# Krahaso.co v2

Platformë moderne për krahasimin e çmimeve të fluturimeve dhe makinave me qira për udhëtarët nga Kosova dhe diaspora. Krahaso.co ofron akses të lehtë dhe transparent në ofertat më të mira të tregut nga partnerët e verifikuar.

## 🚀 Features

- **Krahasim i çmimeve**: Krahaso çmimet e fluturimeve dhe makinave nga partnerë të shumtë
- **Multi-language**: Mbështetje për Shqip (default), Anglisht, dhe Gjermanisht
- **Real-time Sync**: Sinkronizim automatik i të dhënave nga providerë të shumtë
- **Admin Panel**: Panel superadmin për menaxhimin e sistemit
- **Responsive Design**: UI modern dhe responsive me Nuxt UI
- **SEO Optimized**: Optimizuar për motorët e kërkimit
- **Type-safe**: TypeScript me Drizzle ORM për type safety

## 🛠️ Tech Stack

- **Framework**: [Nuxt 4](https://nuxt.com/) me Vue 3
- **UI**: [Nuxt UI 4](https://ui.nuxt.com/) + Tailwind CSS 4
- **Database**: [Turso (LibSQL)](https://turso.tech/) me [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication & Storage**: [Supabase](https://supabase.com/)
- **Internationalization**: [@nuxtjs/i18n](https://i18n.nuxtjs.org/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Image Optimization**: [@nuxt/image](https://image.nuxt.com/)
- **Charts**: Chart.js + Vue ChartJS
- **Deployment**: Vercel

## 📁 Project Structure

Projekti përdor **Nuxt Layers Architecture** për organizim modular:

```
krahaso.co-v2/
├── layers/
│   ├── shared/          # Komponente dhe utilities të përbashkëta
│   │   ├── app/
│   │   │   ├── components/  # Komponente globale
│   │   │   └── layouts/     # Layouts
│   │   └── i18n/           # Fajllat e përkthimit (sq, en, de)
│   ├── flights/         # Layer për fluturime
│   │   ├── app/
│   │   │   └── pages/      # Faqet e fluturimeve
│   │   └── server/         # API routes dhe logjika server-side
│   └── cars/            # Layer për makinat me qira
│       ├── app/
│       │   └── pages/       # Faqet e makinave
│       └── server/          # API routes dhe logjika server-side
├── app/                 # App root
├── public/              # Assets statike
└── nuxt.config.ts       # Konfigurimi kryesor i Nuxt
```

## 📋 Prerequisites

- **Node.js** 18.x ose më i lartë
- **npm**, **pnpm**, **yarn**, ose **bun**
- **Turso Database** account (për database)
- **Supabase** project (për authentication dhe storage)

## 🔧 Setup

### 1. Clone repository

```bash
git clone <repository-url>
cd krahaso.co-v2
```

### 2. Install dependencies

```bash
# me npm
npm install

# me pnpm
pnpm install

# me yarn
yarn install

# me bun
bun install
```

### 3. Environment Variables

Krijo një `.env` file në root të projektit:

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_STORAGE_BUCKET=customerid

# Turso Database
TURSO_DATABASE_URL=your_turso_database_url
TURSO_AUTH_TOKEN=your_turso_auth_token

# Brevo (Email)
BREVO_API_KEY=your_brevo_api_key

# Public Config
NUXT_PUBLIC_SITE_URL=https://krahaso.co
NUXT_PUBLIC_GTM_ID=your_google_tag_manager_id

# Superadmin
SUPERADMIN_CREATED_BY=autopika

# Provider HTTP Client (Optional)
PROVIDER_HTTP_TIMEOUT_MS=15000
PROVIDER_HTTP_MAX_RETRIES=2
PROVIDER_HTTP_RETRY_DELAY_MS=750

# Flights Layer (Optional)
NUXT_PUBLIC_WHATSAPP_NUMBER=+38349999408
```

### 4. Database Setup

Projekti përdor Turso (LibSQL) si database. Sigurohu që ke krijuar database dhe ke vendosur credentials në `.env`.

### 5. Supabase Setup

1. Krijo një Supabase project
2. Vendos `SUPABASE_URL` dhe `SUPABASE_KEY` në `.env`
3. Krijo storage bucket me emrin `customerid` (ose ndrysho në config)

## 🚀 Development

Start development server:

```bash
# me npm
npm run dev

# me pnpm
pnpm dev

# me yarn
yarn dev

# me bun
bun run dev
```

Aplikacioni do të jetë i disponueshëm në `http://localhost:3000`

### Development Notes

- Projekti përdor **Nuxt Layers** për organizim modular
- Çdo layer ka konfigurimin e vet në `layers/{layer-name}/nuxt.config.ts`
- i18n files janë në `layers/shared/i18n/`
- Komponente të përbashkëta janë në `layers/shared/app/components/`

## 🏗️ Build

Build për production:

```bash
# me npm
npm run build

# me pnpm
pnpm build

# me yarn
yarn build

# me bun
bun run build
```

## 📦 Production

### Preview Production Build

```bash
# me npm
npm run preview

# me pnpm
pnpm preview

# me yarn
yarn preview

# me bun
bun run preview
```

## 🌍 Internationalization

Projekti mbështet 3 gjuhë:

- **Shqip (sq)** - Gjuha default, pa prefix në URL
- **Anglisht (en)** - `/en/` prefix
- **Gjermanisht (de)** - `/de/` prefix

Fajllat e përkthimit janë në `layers/shared/i18n/`:
- `sq.json` - Shqip
- `en.json` - Anglisht  
- `de.json` - Gjermanisht

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build për production
- `npm run generate` - Generate static site
- `npm run preview` - Preview production build
- `npm run postinstall` - Run `nuxt prepare` (auto-run pas install)

## 🔒 Security

Projekti përdor:

- **Content Security Policy (CSP)** headers
- **X-Frame-Options** për clickjacking protection
- **X-XSS-Protection** headers
- **Referrer-Policy** për privacy
- Environment variables për sensitive data

## 📚 Documentation

- [Nuxt Documentation](https://nuxt.com/docs)
- [Nuxt UI Documentation](https://ui.nuxt.com/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Turso Documentation](https://docs.turso.tech/)
- [Supabase Documentation](https://supabase.com/docs)

## 📄 License

Private project - All rights reserved

## 👥 Team

Developed by BlackEagle Solutions L.L.C

---

**Krahaso.co** - Gjej ofertat më të mira për fluturime dhe makina me qira! ✈️🚗
