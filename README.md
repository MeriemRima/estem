# Estem

SaaS multi-tenant restaurant : menu, tables QR, commandes client, dashboard cuisine temps réel (SSE).

## Stack

- Next.js (App Router)
- Prisma + **PostgreSQL** (requis pour Vercel)
- Auth cookie JWT (jose + bcryptjs)

## Variables d'environnement

```bash
# App (pooler transaction)
DATABASE_URL="postgresql://postgres.hlvckmvpoelhghppeqbk:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Migrations / seed (pooler session)
DIRECT_URL="postgresql://postgres.hlvckmvpoelhghppeqbk:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

AUTH_SECRET="une-longue-chaine-secrete"
```

Sur **Vercel**, ajoute les **3** variables : `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`.

## Démarrer en local

1. Copie `.env.example` → `.env` et remplace `[YOUR-PASSWORD]` par ton mot de passe Supabase.
2. Puis :

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Admin seed : `super@estem.ma` / `superadmin123`

## Déployer sur Vercel

1. **Settings → Environment Variables** : `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`
2. Redeploy
3. En local (une fois) pour créer tables + admin sur la DB cloud :

```bash
npx prisma db push
npm run db:seed
```

(utilise le `.env` pointant déjà vers Supabase)

## Parcours

1. Admin des restaurants crée resto + gérant
2. Gérant configure menu & tables QR
3. Client commande via `/o/[slug]/t/[token]`
4. Cuisine live : `/dashboard/[orgId]/kitchen`
