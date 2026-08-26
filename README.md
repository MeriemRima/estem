# Estem

SaaS multi-tenant restaurant : menu, tables QR, commandes client, dashboard cuisine temps réel (SSE).

## Stack

- Next.js (App Router)
- Prisma + SQLite
- Auth cookie JWT (jose + bcryptjs)

## Démarrer

```bash
npm install
cp .env.example .env   # ou utiliser le .env déjà présent
npx prisma db push
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Parcours MVP

1. **Signup** → crée Owner + Organization
2. **Dashboard** → catégories & plats
3. **Tables & QR** → génère un QR par table
4. **Client** → scan/ouvre `/o/[slug]/t/[token]` et commande
5. **Cuisine** → `/dashboard/[orgId]/kitchen` reçoit les commandes en live

## Multi-tenant

Toutes les tables métier sont isolées par `organizationId`. RBAC : `OWNER` | `ADMIN` | `MEMBER`.
