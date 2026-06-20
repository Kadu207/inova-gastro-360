# Implementation Plan: 012-cursor-tooling-sdd-tdd

**Branch**: `feat/cursor-tooling-sdd-tdd` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

## Summary

Formalizar no repositório o pipeline SDD/TDD/Spec Kit e a integração com MCPs/skills do Cursor, alinhado à constitution v1.0.0 e ao deploy Cloudflare já em produção.

## Technical Context

**Language/Version**: TypeScript 5.8, Node 20+  
**Primary Dependencies**: Vitest, Turbo, Wrangler 4.x, Spec Kit 0.7  
**Testing**: Vitest (packages + workers + web)  
**Target Platform**: Linux dev + Cloudflare Workers (edge)  
**Project Type**: Monorepo npm workspaces  

## Constitution Check

| Princípio | Status |
|-----------|--------|
| I SDD | plan.md + tasks.md criados para specs 010 e 012 |
| II TDD | novos testes auth + api-gateway |
| III Multitenant | teste JWT `tid` |
| IV Event-first | documentado em cloudflare-workers rule (Queues fase 2) |
| V Simplicity | MCP example sem secrets no repo |

## Project Structure

```text
.cursor/
├── rules/
│   ├── inova-gastro-360.mdc      # always apply
│   ├── specify-rules.mdc         # SDD/TDD workflow
│   └── cloudflare-workers.mdc    # Workers + bindings
├── skills/speckit-*              # 14 skills locais
└── mcp.json.example

.specify/
├── feature.json                  # feature ativa
├── workflows/speckit/workflow-registry.json
└── scripts/bash/update-agent-context.sh

docs/cursor-tooling.md            # matriz MCP/skills
vitest.config.ts                  # monorepo test runner
```

## Fases

1. **Infra Spec Kit** — feature.json, registry, update-agent-context.sh  
2. **Rules Cursor** — specify-rules, cloudflare-workers, AGENTS.md  
3. **TDD** — vitest root + testes críticos  
4. **Docs** — cursor-tooling.md, memory-bank sync  
5. **Spec 010** — marcar produção + plan/tasks retrospectivos  
