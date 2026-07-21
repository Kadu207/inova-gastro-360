# CodeRabbit — Inova Gastro 360

Review automatizado de PRs via [CodeRabbit](https://coderabbit.ai).

## Configuração no repositório

Arquivo [`.coderabbit.yaml`](../.coderabbit.yaml) na raiz:

- Idioma pt-BR, perfil `assertive`
- Path filters (ignora `node_modules`, builds, locks)
- Path instructions por área (API multitenant, workers internos, web, print-agent, Prisma, infra)

## Instalação do GitHub App (manual — uma vez)

1. Abra [CodeRabbit GitHub App](https://github.com/apps/coderabbitai)
2. Instale na organização/usuário **Kadu207**
3. Conceda acesso ao repositório **`inova-gastro-360`**
4. Em um PR de teste, confirme comentário `@coderabbitai`

Sem o app instalado, o YAML não produz reviews.

## Uso em PRs

- Reviews automáticos em `master` / `main` / `develop`
- Mencione `@coderabbitai review` para re-rodar
- `@coderabbitai summary` para resumo

## Relação com CI

| Gate | Onde |
|------|------|
| Lint / typecheck / testes / build | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) |
| `npm audit` (high+) | CI step `security-audit` |
| Segredos tracked | CI step `secrets-guard` |
| Review de segurança/multitenant | CodeRabbit + path_instructions |

PRs MUST estar verdes no CI; CodeRabbit complementa (não substitui) os testes.
