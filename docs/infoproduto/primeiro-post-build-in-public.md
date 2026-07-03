# Primeiro post — Build in Public (Rota D)

Use este roteiro para publicar o **primeiro conteúdo** da estratégia infoproduto (spec 015 + auditoria de segurança).

## Título sugerido

**Como auditei meu próprio SaaS multitenant e corrigi 27 falhas antes de vender qualquer coisa**

## Formato

Artigo LinkedIn (800–1200 palavras) ou thread X (8–12 tweets). Anexe screenshot do demo: `https://inovagastro360.inovatitech.com.br`

## Estrutura

1. **Gancho** — "Construí um SaaS de hamburgueria com agentes de IA, Spec Kit e deploy VPS. Antes de vender, rodei uma auditoria no próprio código."
2. **Contexto** — Monorepo Next.js + Workers + Postgres multitenant; demo em produção; metodologia SDD/TDD.
3. **Os 5 críticos** (sem expor segredos):
   - JWT sem fallback hardcoded
   - RLS aplicado + `withTenant` nas transações
   - Refresh token completo (rota + rotação)
   - Onboarding + billing foundation
   - Credenciais demo fora do repo
4. **O que aprendi** — defense-in-depth > confiar só no `WHERE tenant_id`; rate limit em auth; magic bytes em upload.
5. **Agentes embarcados** — EMB-01 pedidos presos, EMB-02 sessões, EMB-03 trial expirando (automação pós go-live).
6. **CTA** — "Estou documentando a jornada completa. Comente **SAAS** se quer receber o checklist P0/P1 que usei."

## Hashtags

`#buildinpublic` `#saas` `#multitenant` `#typescript` `#cursor` `#specdriven`

## Próximo conteúdo (semana 2)

Ver `calendario-conteudo.md` — item "Auditoria de segurança P0/P1".

## Não publicar

- Senhas, JWT secrets, URLs internas da VPS
- Credenciais demo (mesmo rotacionadas)
