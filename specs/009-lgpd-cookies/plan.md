# Implementation Plan: 009-lgpd-cookies

**Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md) | **Onda**: 4 (básico entregue Onda 3)

## Summary

Consentimento de cookies com banner na web. Versão **básica** entregue (localStorage). Onda 4 expande preferências granulares, registro de consentimento no backend e exportação/portabilidade LGPD.

## Technical Context

**UI**: `apps/web/src/components/CookieBanner.tsx`  
**Storage atual**: `localStorage.cookie-consent = accepted`  
**Layout**: incluído em `apps/web/src/app/layout.tsx`  
**Backend futuro**: tabela `consent_records` + API exportação dados titular

## Níveis de consentimento (alvo Onda 4)

| Categoria | Onda 3 | Onda 4 |
|-----------|--------|--------|
| Essenciais | banner accept | sempre on |
| Analytics | — | opt-in |
| Marketing | — | opt-in |

## Constitution Check

| Princípio | Status |
|-----------|--------|
| Segurança/LGPD | registro auditável pendente |
| Multitenant | consent por tenant + user |

## Referências

- `apps/web/src/components/CookieBanner.tsx`
- `apps/web/src/lib/nav.ts` — "Segurança e LGPD"
