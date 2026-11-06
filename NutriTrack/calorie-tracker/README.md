# NutriTrack

Webová aplikácia (PWA) na sledovanie kalórií a makroživín. Umožňuje zapisovať
jedlá po dňoch, vyhľadávať potraviny (Open Food Facts + slovenské základné
potraviny), skenovať čiarové kódy, ukladať opakované jedlá, prezerať kalendár
s plnením cieľa a vypočítať odporúčaný denný príjem podľa profilu.

**Technológie:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase

## Spustenie

Potrebné: **Node.js 20+**

```bash
npm install
npm run dev
```

Otvor http://localhost:3000.

Aplikácia beží v **demo režime** – nepotrebuje žiadne kľúče, dáta sa ukladajú
v prehliadači a prihlásenie je automatické (na prihlasovacej stránke funguje
ľubovoľný e-mail a kód).

Voliteľne s vlastnou databázou: vytvor projekt na [supabase.com](https://supabase.com),
spusti SQL súbory zo `supabase/migrations/` a skopíruj `.env.local.example`
do `.env.local` s vlastnými hodnotami.

Testy: `npm test`
