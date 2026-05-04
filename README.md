# Dezzapego

Classificados online para publicar e encontrar anúncios no Brasil. O app usa React, Vite, Supabase, Vercel serverless functions, Stripe/PixGo para destaques pagos e PWA.

## Rodando localmente

1. Instale as dependências:

```bash
npm install
```

2. Copie `.env.example` para `.env` e preencha as variáveis necessárias.

3. Inicie o app:

```bash
npm run dev
```

## Comandos

```bash
npm run typecheck      # valida TypeScript
npm run build          # valida TypeScript, gera build e sitemap
npm run check          # alias para a verificação completa
npm run generate:sitemap
```

## Configuração

As variáveis públicas do frontend usam o prefixo `VITE_`. Chaves secretas, como `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PIXGO_API_KEY` e `PIXGO_WEBHOOK_SECRET`, devem existir apenas no ambiente serverless/Vercel.

Consulte `.env.example`, `STORAGE_POLICIES.md` e `supabase_database_complete.sql` para configurar Supabase, storage, pagamentos e SEO.
