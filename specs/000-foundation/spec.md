# Feature Specification: 000-foundation

**Feature Branch**: `000-foundation`  
**Created**: 2026-06-14  
**Status**: Approved (Onda 0)  
**Product**: Inova Gastro 360

## User Story 1 - Monorepo operacional (P1)

**Given** desenvolvedor clona o repositório, **When** executa install e test, **Then** monorepo builda sem erros.

**Acceptance Scenarios**:
1. `npm install` resolve workspaces
2. `npm run test` passa nos packages e workers
3. `PORT_REGISTRY.md` documenta portas sem conflito

## User Story 2 - Spec Kit ativo (P1)

**Given** constitution em `.specify/memory/`, **When** nova feature inicia, **Then** segue fluxo SDD.

## Technical Requirements

- Turborepo + npm workspaces
- Docker Compose Postgres :5440, Redis :6390
- Memória permanente: memory-bank, AGENTS.md, .cursor/rules
