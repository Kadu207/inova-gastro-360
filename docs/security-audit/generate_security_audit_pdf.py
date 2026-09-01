#!/usr/bin/env python3
"""Gera relatorio-auditoria-seguranca.pdf — Inova Gastro 360.

Uso (venv isolado):
  docs/security-audit/.venv/Scripts/python docs/security-audit/generate_security_audit_pdf.py
"""

from __future__ import annotations

import math
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parent
OUT_PDF = ROOT / "relatorio-auditoria-seguranca.pdf"
PREVIEW_DIR = ROOT / "preview-pages"

# Paleta
CRIT = colors.HexColor("#B91C1C")
ALTA = colors.HexColor("#EA580C")
MEDIA = colors.HexColor("#D97706")
BAIXA = colors.HexColor("#2563EB")
FORTE = colors.HexColor("#059669")
INFO = colors.HexColor("#64748B")
BG = colors.HexColor("#F8FAFC")
INK = colors.HexColor("#0F172A")
MUTED = colors.HexColor("#475569")
LINE = colors.HexColor("#E2E8F0")

SEV_COLOR = {
    "crítica": CRIT,
    "alta": ALTA,
    "média": MEDIA,
    "baixa": BAIXA,
    "informativa": INFO,
}

PROJECT = "Inova Gastro 360"
AUDIT_DATE = "2026-09-01"

FINDINGS = [
    {
        "id": "F01",
        "cat": "1. Isolamento / banco",
        "sev": "crítica",
        "loc": "apps/workers/integrations/src/webhooks/asaas.ts:169-174 e :89-120",
        "title": "Webhook Asaas sem token obrigatório + assinatura de assinatura confia no body",
        "desc": (
            "Se ASAAS_WEBHOOK_TOKEN estiver ausente, a verificação é pulada. "
            "Eventos SUBSCRIPTION_* mapeiam tenantId/status a partir do JSON do atacante "
            "e chamam apply-subscription sem revalidar na API Asaas."
        ),
        "exploit": (
            "POST forjado com externalReference '<uuid-vitima>:plano' pode ativar/cancelar "
            "billing de qualquer tenant. Condição: token de webhook não configurado "
            "(ou ambiente com PAYMENTS_ENABLED e token vazio)."
        ),
        "fix": (
            "Em produção, falhar se ASAAS_WEBHOOK_TOKEN ausente; para SUBSCRIPTION_*, "
            "buscar a assinatura na API Asaas e só então aplicar status."
        ),
        "code": (
            "if (env.ASAAS_WEBHOOK_TOKEN) {\n"
            "  const valid = verifyAsaasWebhookToken(...);\n"
            "  if (!valid) return 401;\n"
            "}\n"
            "// ...\n"
            "const [tenantId, planCode] = ref.split(\":\");\n"
            "await callApplySubscription(env, { tenantId, status: mapped, ... });"
        ),
    },
    {
        "id": "F02",
        "cat": "1. Isolamento / banco",
        "sev": "crítica",
        "loc": "apps/workers/messaging-bus/src/index.ts:14-16 e :74-82",
        "title": "messaging-bus libera /internal/publish sem INTERNAL_SHARED_SECRET",
        "desc": (
            "internalAuthorized retorna true quando o secret não está definido — "
            "inclusive com ENVIRONMENT=production se a variável faltar."
        ),
        "exploit": (
            "Quem alcançar a porta/rede do messaging-bus pode publicar eventos forjados "
            "para realtime e integrations com branchId arbitrário. "
            "Condição: INTERNAL_SHARED_SECRET ausente no container."
        ),
        "fix": (
            "Fail-closed: sem secret → 403 (espelhar realtime-hub / outbox flush). "
            "Obrigar secret ≥16 e rejeitar placeholders CHANGE_ME_*."
        ),
        "code": (
            "function internalAuthorized(request, env) {\n"
            "  if (!env.INTERNAL_SHARED_SECRET) return true; // fail-open\n"
            "  return request.headers.get(\"x-internal-secret\") === env.INTERNAL_SHARED_SECRET;\n"
            "}"
        ),
    },
    {
        "id": "F03",
        "cat": "3. IDOR",
        "sev": "alta",
        "loc": "apps/workers/realtime-hub/src/index.ts:72-78 + packages/auth/src/session-token.ts:69-72",
        "title": "WebSocket autoriza branch sem amarrar ao tenant (tid) do JWT",
        "desc": (
            "canAccessBranch com branches=[] (admins) aceita qualquer branchId UUID. "
            "Não há SELECT branches.tenant_id === payload.tid."
        ),
        "exploit": (
            "Admin/cliente com JWT válido e branches vazio conecta em /ws?branchId=<uuid "
            "de outro tenant> e recebe eventos operacionais ao vivo se o UUID for conhecido."
        ),
        "fix": (
            "Resolver branchId→tenant_id no hub (ou cache) e exigir === payload.tid "
            "(mesmo padrão de assertCatalogBranchAccess)."
        ),
        "code": (
            "if (!payload || !canAccessBranch(payload, branchId)) return unauthorized();\n"
            "// canAccessBranch: if (user.branches.length === 0) return true;"
        ),
    },
    {
        "id": "F04",
        "cat": "4. Chaves expostas",
        "sev": "alta",
        "loc": "apps/workers/api-gateway/src/lib/config.ts:17-35 + infra/hetzner/.env.production.example:10-12",
        "title": "getJwtSecret / getInternalSecret aceitam placeholders CHANGE_ME_* (≥16 chars)",
        "desc": (
            "Validação só exige comprimento mínimo 16. Strings publicadas no example "
            "(CHANGE_ME_openssl_rand_base64_32) passam. Pagamentos já rejeitam placeholders."
        ),
        "exploit": (
            "Se .env.production for copiado do example sem configure-security-env-vps.sh, "
            "atacante conhece JWT_SECRET/INTERNAL e forja tokens / chama rotas internas."
        ),
        "fix": (
            "Rejeitar /CHANGE_ME|change-me/i (como payments-config PLACEHOLDER) e "
            "exigir entropia mínima; falhar startup em produção."
        ),
        "code": (
            "if (!secret || secret.length < MIN_SECRET_LENGTH) throw ConfigError(...);\n"
            "return secret; // não rejeita CHANGE_ME_openssl_rand_base64_32"
        ),
    },
    {
        "id": "F05",
        "cat": "2. Permissão no navegador",
        "sev": "média",
        "loc": "apps/web/src/components/dashboard/DashboardShell.tsx:32-34 + apps/web/src/lib/nav.ts",
        "title": "Shell/nav só checam token; páginas admin/finance/LGPD sem gate de papel no UI",
        "desc": (
            "useEffect redireciona só se !getToken(). Nav mostra Tenants/Configurações "
            "a qualquer logado. APIs exigem requireRole — UI não."
        ),
        "exploit": (
            "Usuário atendente abre /dashboard/admin/tenants e vê formulários; "
            "mutações falham 403. Não é bypass de API, mas vazamento de UX e superfície."
        ),
        "fix": (
            "Carregar /auth/me e ocultar rotas por role; preferir middleware Next. "
            "Manter requireRole no servidor como fonte da verdade."
        ),
        "code": (
            "useEffect(() => {\n"
            "  if (!isPublic && !getToken()) router.replace(\"/login\");\n"
            "}, [router, isPublic]);"
        ),
    },
    {
        "id": "F06",
        "cat": "3. IDOR",
        "sev": "média",
        "loc": "apps/workers/api-gateway/src/routes/lgpd.ts:70-108 (export :89-94)",
        "title": "LGPD export: qualquer autenticado obtém amostra de pedidos do tenant inteiro",
        "desc": (
            "handleLgpdExport usa requireAuth sem requireRole. Consents filtrados pelo user; "
            "orders filtram só tenant_id + customer_phone IS NOT NULL (até 100)."
        ),
        "exploit": (
            "Qualquer papel autenticado no tenant exporta metadados de pedidos de clientes "
            "(número, canal, status, totais). Over-collection / privilégio horizontal no tenant."
        ),
        "fix": (
            "Restringir a admin_cliente/super_admin e/ou filtrar pedidos ao subject; "
            "não incluir amostra operacional sem necessidade LGPD do titular."
        ),
        "code": (
            "const orders = await sql`\n"
            "  SELECT id, order_number, channel, status, total_cents, ...\n"
            "  FROM orders WHERE tenant_id = ${user.tid}::uuid AND customer_phone IS NOT NULL\n"
            "  LIMIT 100`;"
        ),
    },
    {
        "id": "F07",
        "cat": "3. IDOR",
        "sev": "média",
        "loc": "apps/workers/api-gateway/src/routes/order-payments.ts:47-94 e :260-296; index.ts:419-439",
        "title": "Pagamento de pedido público por branchId+orderId (UUID) sem prova de posse",
        "desc": (
            "POST .../pay e GET .../payment sem requireAuth. Tenant resolvido via branch "
            "(bom). Qualquer um com os UUIDs inicia PIX/cartão ou lê status."
        ),
        "exploit": (
            "IDOR residual de checkout convidado: enumeração/uso de UUIDs vazados. "
            "Design intencional parcial — risco se IDs vazarem em logs/referrer."
        ),
        "fix": (
            "Token de convidado assinado no create-order (HMAC curto) exigido no pay/status."
        ),
        "code": (
            "// index.ts: sem requireAuth\n"
            "await handlePayOrder(request, env, branchId, orderId);"
        ),
    },
    {
        "id": "F08",
        "cat": "4. Chaves expostas",
        "sev": "média",
        "loc": "apps/web/src/lib/api.ts (accessToken/refreshToken em localStorage) + login page",
        "title": "Tokens JWT ainda persistidos em localStorage (além de cookies HttpOnly)",
        "desc": (
            "storeSession grava access/refresh no localStorage; realtimeWsProtocols lê getToken(). "
            "Cookies HttpOnly existem, mas o token permanece acessível a XSS."
        ),
        "exploit": (
            "Qualquer XSS no domínio exfiltra access+refresh. Condição: vulnerabilidade XSS "
            "(hoje não há dangerouslySetInnerHTML encontrado)."
        ),
        "fix": (
            "Concluir migração cookie-only; WS same-site via cookie; "
            "token de uso único curto só se cross-origin."
        ),
        "code": (
            "localStorage.setItem(\"accessToken\", accessToken);\n"
            "if (refreshToken) localStorage.setItem(\"refreshToken\", refreshToken);"
        ),
    },
    {
        "id": "F09",
        "cat": "1. Isolamento / banco",
        "sev": "média",
        "loc": "apps/workers/integrations/src/webhooks/mercadopago.ts:91-100",
        "title": "Webhook Mercado Pago com assinatura opcional",
        "desc": "Se MERCADOPAGO_WEBHOOK_SECRET ausente, o webhook aceita requests sem assinatura.",
        "exploit": (
            "Forçar processamento de notificações para payment IDs conhecidos. "
            "Condição: secret não configurado (legado MP ainda no código)."
        ),
        "fix": "Fail-closed em produção; ou desativar rota MP se ORDER_PAYMENT_PROVIDER=asaas.",
        "code": (
            "if (env.MERCADOPAGO_WEBHOOK_SECRET) {\n"
            "  const valid = verifyMercadoPagoSignature(...);\n"
            "  if (!valid) return 401;\n"
            "}"
        ),
    },
    {
        "id": "F10",
        "cat": "3. IDOR",
        "sev": "baixa",
        "loc": "apps/workers/api-gateway/src/routes/finance.ts:60-73 e :122-132",
        "title": "Financeiro: sessão/caixa por tenant sem ACL de filial no JWT",
        "desc": (
            "Filtra tenant_id corretamente (anti cross-tenant). Papéis finance podem "
            "abrir/fechar sessão em qualquer branchId do tenant sem checar user.branches."
        ),
        "exploit": "Privilégio lateral entre filiais do mesmo tenant (gerente de A opera caixa de B).",
        "fix": "Reusar assertBranchOpsAccess / membership antes de open/close/sangria.",
        "code": (
            "WHERE id = ${sessionId}::uuid AND tenant_id = ${user.tid}::uuid AND status = 'open'"
        ),
    },
    {
        "id": "F11",
        "cat": "4. Chaves expostas",
        "sev": "baixa",
        "loc": "docker-compose.yml:8-11 + packages/database/src/index.ts:6-12",
        "title": "Senha local hardcoded inova_gastro_dev",
        "desc": "Compose local e fallback de DATABASE_URL embutem senha de desenvolvimento.",
        "exploit": "Baixo: bind 127.0.0.1; risco em máquina compartilhada com Docker.",
        "fix": "Usar env POSTGRES_PASSWORD também no compose local; remover fallback com senha.",
        "code": (
            "POSTGRES_PASSWORD: inova_gastro_dev\n"
            "# packages/database: postgresql://inova_gastro:inova_gastro_dev@127.0.0.1:5440/..."
        ),
    },
    {
        "id": "F12",
        "cat": "4. Chaves expostas",
        "sev": "informativa",
        "loc": ".gitignore vs .github/workflows/ci.yml (secrets-guard)",
        "title": ".env.production não está no .gitignore (CI bloqueia se tracked)",
        "desc": "Processo depende do CI secrets-guard; .gitignore raiz não lista .env.production.",
        "exploit": "Risco operacional de commit acidental se CI for pulado.",
        "fix": "Adicionar .env.production ao .gitignore na raiz.",
        "code": "CI: if git ls-files | grep '.env.production' → fail",
    },
]

STRENGTHS = [
    (
        "RLS PostgreSQL + role inova_gastro_app",
        "Migrations ENABLE ROW LEVEL SECURITY por tenant; getSql em produção rejeita owner "
        "inova_gastro (assertAppDbRoleDoesNotBypassRls, db.ts:41-47).",
    ),
    (
        "RBAC no servidor",
        "admin-tenants (super_admin), settings/billing/finance/lgpd mutate com requireRole; "
        "catálogo admin com assertCatalogBranchAccess.",
    ),
    (
        "Orders / print-jobs com escopo de filial",
        "assertBranchOpsAccess (UUID + role ops + branches JWT) em list/get/status/print-jobs.",
    ),
    (
        "Realtime broadcast autenticado",
        "POST /broadcast exige INTERNAL_SHARED_SECRET ≥16; WS exige JWT "
        "(cookie ou Sec-WebSocket-Protocol) — sem token na query.",
    ),
    (
        "Presign desabilitado + imageUrl allowlist",
        "POST .../image/presign → 410; multipart com magic bytes; "
        "isAllowedStoredProductImageUrl scoped a tenant/branch/product.",
    ),
    (
        "XSS frontend",
        "Sem dangerouslySetInnerHTML/innerHTML/eval; productDisplayImage rejeita javascript:; "
        "React escapa texto.",
    ),
    (
        "Pagamentos rejeitam placeholders",
        "payments-config PLACEHOLDER rejeita CHANGE_ME/your-/sk_test_CHANGE_ME para Asaas/MP/Stripe.",
    ),
    (
        "Histórico git",
        "Sem .env / .env.production / .dev.vars reais no histórico; apenas examples e "
        "NEXT_PUBLIC_* de desenvolvimento.",
    ),
]


class DonutChart(Flowable):
    def __init__(self, counts: dict[str, int], width=12 * cm, height=7 * cm):
        super().__init__()
        self.counts = counts
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        total = sum(self.counts.values()) or 1
        cx, cy, r = self.width / 2 - 1.2 * cm, self.height / 2, 2.4 * cm
        start = 90
        order = ["crítica", "alta", "média", "baixa", "informativa"]
        for key in order:
            n = self.counts.get(key, 0)
            if not n:
                continue
            extent = -360 * n / total
            c.setFillColor(SEV_COLOR[key])
            c.wedge(cx - r, cy - r, cx + r, cy + r, start, extent, stroke=0, fill=1)
            start += extent
        c.setFillColor(colors.white)
        c.circle(cx, cy, r * 0.55, stroke=0, fill=1)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(cx, cy - 4, str(total))
        c.setFont("Helvetica", 8)
        c.drawCentredString(cx, cy - 16, "achados")
        # legend
        lx, ly = cx + r + 18, cy + r - 8
        for key in order:
            n = self.counts.get(key, 0)
            if not n:
                continue
            c.setFillColor(SEV_COLOR[key])
            c.rect(lx, ly - 4, 10, 10, stroke=0, fill=1)
            c.setFillColor(INK)
            c.setFont("Helvetica", 8)
            c.drawString(lx + 14, ly - 2, f"{key}: {n}")
            ly -= 16


class BarChart(Flowable):
    def __init__(self, by_cat: dict[str, int], width=16 * cm, height=7 * cm):
        super().__init__()
        self.by_cat = by_cat
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        items = list(self.by_cat.items())
        if not items:
            return
        max_v = max(v for _, v in items) or 1
        left, bottom, top = 3.2 * cm, 1.2 * cm, self.height - 0.4 * cm
        bar_w = (self.width - left - 0.5 * cm) / len(items) * 0.7
        gap = (self.width - left - 0.5 * cm) / len(items)
        c.setStrokeColor(LINE)
        c.line(left, bottom, self.width - 0.3 * cm, bottom)
        for i, (label, val) in enumerate(items):
            h = (top - bottom) * (val / max_v)
            x = left + i * gap + (gap - bar_w) / 2
            c.setFillColor(ALTA if val >= 3 else MEDIA if val >= 2 else BAIXA)
            c.rect(x, bottom, bar_w, h, stroke=0, fill=1)
            c.setFillColor(INK)
            c.setFont("Helvetica-Bold", 9)
            c.drawCentredString(x + bar_w / 2, bottom + h + 4, str(val))
            c.setFont("Helvetica", 6.5)
            short = label.split(". ", 1)[-1][:22]
            c.drawCentredString(x + bar_w / 2, bottom - 12, short)


class SeverityChip(Flowable):
    def __init__(self, sev: str, width=2.4 * cm, height=0.55 * cm):
        super().__init__()
        self.sev = sev
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        c.setFillColor(SEV_COLOR.get(self.sev, INFO))
        c.roundRect(0, 0, self.width, self.height, 3, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 7)
        c.drawCentredString(self.width / 2, 4, self.sev.upper())


def styles():
    base = getSampleStyleSheet()
    return {
        "cover_title": ParagraphStyle(
            "cover_title",
            parent=base["Title"],
            fontSize=22,
            leading=28,
            textColor=INK,
            alignment=TA_CENTER,
            spaceAfter=12,
        ),
        "h1": ParagraphStyle(
            "h1", parent=base["Heading1"], fontSize=16, textColor=INK, spaceBefore=10, spaceAfter=8
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading2"], fontSize=12, textColor=INK, spaceBefore=8, spaceAfter=6
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontSize=9,
            leading=13,
            textColor=MUTED,
            alignment=TA_JUSTIFY,
        ),
        "body_left": ParagraphStyle(
            "body_left", parent=base["Normal"], fontSize=9, leading=12, textColor=MUTED, alignment=TA_LEFT
        ),
        "small": ParagraphStyle(
            "small", parent=base["Normal"], fontSize=8, leading=11, textColor=MUTED
        ),
        "code": ParagraphStyle(
            "code",
            parent=base["Code"],
            fontName="Courier",
            fontSize=7,
            leading=9,
            textColor=INK,
            backColor=BG,
            leftIndent=4,
            rightIndent=4,
        ),
        "issue": ParagraphStyle(
            "issue",
            parent=base["Normal"],
            fontName="Courier",
            fontSize=7.5,
            leading=10,
            textColor=INK,
        ),
    }


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    w, h = A4
    canvas.line(2 * cm, h - 1.4 * cm, w - 2 * cm, h - 1.4 * cm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(2 * cm, h - 1.15 * cm, f"Relatório de Auditoria de Segurança — {PROJECT}")
    canvas.line(2 * cm, 1.4 * cm, w - 2 * cm, 1.4 * cm)
    canvas.drawRightString(w - 2 * cm, 1.0 * cm, f"Página {doc.page}")
    canvas.drawString(2 * cm, 1.0 * cm, AUDIT_DATE)
    canvas.restoreState()


def build_issue_md(f: dict) -> str:
    sev = f["sev"]
    return f"""--- ISSUE {f['id']} ---
# [Segurança] {f['title']}

**Labels sugeridas:** `security`, `severity:{sev}`

## Problema
{f['desc']}

## Por que é explorável
{f['exploit']}

## Evidência
`{f['loc']}`

```
{f['code']}
```

## Impacto
Severidade **{sev}** — categoria {f['cat']}.

## Sugestão de correção
{f['fix']}

## Critérios de aceite
- [ ] Correção aplicada e coberta por teste automatizado (reprodução do cenário falha com 401/403)
- [ ] Não é possível explorar o fluxo descrito com o pré-requisito de configuração documentado
- [ ] Code review / CI verdes no pacote afetado
--- FIM ISSUE {f['id']} ---"""


def main():
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    S = styles()
    counts = {"crítica": 0, "alta": 0, "média": 0, "baixa": 0, "informativa": 0}
    by_cat: dict[str, int] = {}
    for f in FINDINGS:
        counts[f["sev"]] = counts.get(f["sev"], 0) + 1
        by_cat[f["cat"]] = by_cat.get(f["cat"], 0) + 1

    story = []

    # CAPA
    story.append(Spacer(1, 2.5 * cm))
    story.append(Paragraph(f"Relatório de Auditoria de Segurança — {PROJECT}", S["cover_title"]))
    story.append(Spacer(1, 0.4 * cm))
    story.append(
        Paragraph(
            f"<b>Data:</b> {AUDIT_DATE}<br/>"
            f"<b>Escopo:</b> monorepo TypeScript (api-gateway, integrations, messaging-bus, "
            f"realtime-hub, web Next.js, packages/auth|database|runtime-node), "
            f"Docker Compose VPS, CI GitHub Actions, exemplos de env.<br/>"
            f"<b>Método:</b> revisão estática do código atual (sem especulação).",
            S["body"],
        )
    )
    story.append(Spacer(1, 0.6 * cm))
    story.append(Paragraph("Nota metodológica — mapeamento das categorias à stack", S["h2"]))
    story.append(
        Paragraph(
            "<b>Stack detectada:</b> TypeScript monorepo (npm workspaces + Turbo); "
            "backend Workers/Node fetch routers; PostgreSQL 16 + Prisma + <b>RLS</b> "
            "(<font face='Courier'>app.current_tenant_id</font> / "
            "<font face='Courier'>withTenant</font>); auth JWT HS256 "
            "(<font face='Courier'>requireAuth</font>/<font face='Courier'>requireRole</font> "
            "+ cookies HttpOnly); frontend Next.js 15 (App Router, export estático); "
            "deploy Docker Compose em VPS Hetzner + Wrangler; CI em "
            "<font face='Courier'>.github/workflows</font>.",
            S["body"],
        )
    )
    story.append(Spacer(1, 0.3 * cm))
    story.append(
        Paragraph(
            "1) <b>Banco sem tranca</b> → RLS Postgres + filtros manuais "
            "<font face='Courier'>tenant_id</font>/<font face='Courier'>user.tid</font> "
            "+ role <font face='Courier'>inova_gastro_app</font>. "
            "Não é Supabase RLS.<br/>"
            "2) <b>Permissão no navegador</b> → cruzar UI Next com "
            "<font face='Courier'>requireRole</font> no api-gateway.<br/>"
            "3) <b>IDOR</b> → todos os handlers em "
            "<font face='Courier'>apps/workers/*/src</font> com ID em path/query/body.<br/>"
            "4) <b>Chaves</b> → source, examples, compose, CI, scripts; defaults "
            "<font face='Courier'>CHANGE_ME*</font>; histórico git.<br/>"
            "5) <b>XSS</b> → React/Next (dangerouslySetInnerHTML, href/src) + templates backend.",
            S["body"],
        )
    )
    story.append(PageBreak())

    # RESUMO
    story.append(Paragraph("1. Resumo executivo", S["h1"]))
    total = len(FINDINGS)
    story.append(
        Paragraph(
            f"Foram identificados <b>{total} achados</b> verificados no código: "
            f"{counts['crítica']} críticos, {counts['alta']} altos, {counts['média']} médios, "
            f"{counts['baixa']} baixos, {counts['informativa']} informativos. "
            f"O isolamento multitenant por RLS + JWT está majoritariamente presente; "
            f"os riscos centrais concentram-se em <b>webhooks/fail-open de segredos internos</b> "
            f"e em lacunas de amarração branch↔tenant no realtime.",
            S["body"],
        )
    )
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("Distribuição por severidade", S["h2"]))
    story.append(DonutChart(counts))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("Distribuição por categoria", S["h2"]))
    story.append(BarChart(by_cat))
    story.append(PageBreak())

    # PONTOS FORTES / FRACOS
    story.append(Paragraph("2. Pontos fortes", S["h1"]))
    for title, detail in STRENGTHS:
        story.append(Paragraph(f"<font color='#059669'><b>● {title}</b></font>", S["body_left"]))
        story.append(Paragraph(detail, S["small"]))
        story.append(Spacer(1, 0.15 * cm))

    story.append(Paragraph("3. Pontos fracos (riscos centrais)", S["h1"]))
    story.append(
        Paragraph(
            "• Webhooks Asaas/MP e messaging-bus <b>fail-open</b> quando o secret está ausente.<br/>"
            "• Realtime WS autentica JWT mas <b>não valida tenant da filial</b>.<br/>"
            "• Placeholders longos de JWT/INTERNAL passam na validação de startup.<br/>"
            "• UI não esconde superfícies admin por papel (API segura; UX/LGPD export fracos).<br/>"
            "• Tokens ainda no localStorage (superfície XSS residual).",
            S["body"],
        )
    )
    story.append(PageBreak())

    # TABELA
    story.append(Paragraph("4. Achados detalhados", S["h1"]))
    header = [
        Paragraph("<b>Sev.</b>", S["small"]),
        Paragraph("<b>Local</b>", S["small"]),
        Paragraph("<b>Descrição</b>", S["small"]),
    ]
    rows = [header]
    for f in FINDINGS:
        chip = SeverityChip(f["sev"])
        rows.append(
            [
                chip,
                Paragraph(f"<font face='Courier' size='7'>{f['loc']}</font>", S["small"]),
                Paragraph(f"<b>{f['id']}</b> — {f['title']}<br/>{f['desc']}", S["small"]),
            ]
        )
    t = Table(rows, colWidths=[2.6 * cm, 6.2 * cm, 8.2 * cm], repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF2FF")),
                ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG]),
            ]
        )
    )
    story.append(t)
    story.append(PageBreak())

    # DETALHE POR CATEGORIA
    story.append(Paragraph("5. Detalhamento por categoria (arquivo:linha)", S["h1"]))
    current_cat = None
    for f in FINDINGS:
        if f["cat"] != current_cat:
            current_cat = f["cat"]
            story.append(Paragraph(current_cat, S["h2"]))
        block = [
            Paragraph(
                f"<b>{f['id']}</b> [{f['sev'].upper()}] {f['title']}",
                S["body_left"],
            ),
            Paragraph(f"<b>Local:</b> <font face='Courier'>{f['loc']}</font>", S["small"]),
            Paragraph(f"<b>Explorabilidade:</b> {f['exploit']}", S["small"]),
            Paragraph("<b>Trecho:</b>", S["small"]),
            Preformatted(f["code"], S["code"], maxLineLength=100),
            Paragraph(f"<b>Correção:</b> {f['fix']}", S["small"]),
            Spacer(1, 0.25 * cm),
        ]
        story.append(KeepTogether(block))

    story.append(PageBreak())
    story.append(Paragraph("6. Recomendações priorizadas", S["h1"]))
    recs = [
        (
            "P1",
            "Fail-closed em webhooks Asaas/MP e messaging-bus sem secret; "
            "revalidar SUBSCRIPTION_* na API Asaas.",
        ),
        (
            "P2",
            "Amarração branchId→tenant_id no realtime WS; rejeitar placeholders JWT/INTERNAL "
            "no startup (como payments-config).",
        ),
        (
            "P3",
            "Restringir LGPD export a admins/subject; ACL de filial no finance; "
            "ocultar nav admin por role; concluir cookie-only tokens.",
        ),
        (
            "P4",
            "Adicionar .env.production ao .gitignore; token de convidado para pay/status; "
            "remover senha hardcoded do compose local/fallback Prisma.",
        ),
    ]
    for code, text in recs:
        story.append(Paragraph(f"<b>{code}.</b> {text}", S["body_left"]))
        story.append(Spacer(1, 0.15 * cm))

    # Cobertura verificada OK
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("7. Cobertura — o que foi verificado e está correto", S["h1"]))
    story.append(
        Paragraph(
            "Handlers settings (company/branches/users), admin-tenants, catalog-admin "
            "(assertCatalogBranchAccess), orders list/get/status e print-jobs "
            "(assertBranchOpsAccess), finance listagens com tenant_id, LGPD erasure com role, "
            "billing mutate com role, internal outbox flush fail-closed, Stripe webhook "
            "com constructEvent, upload multipart com magic bytes, ausência de "
            "dangerouslySetInnerHTML, sanitização de image_url http(s).",
            S["body"],
        )
    )

    story.append(PageBreak())
    story.append(Paragraph("8. ISSUES PARA O GITHUB", S["h1"]))
    story.append(
        Paragraph(
            "Copie cada bloco entre os delimitadores para abrir uma issue. "
            "Achados locais (compose + fallback DB) foram agrupados na issue F11.",
            S["body"],
        )
    )
    story.append(Spacer(1, 0.3 * cm))

    # Agrupar F11 only; others individual. F12 stays separate as process.
    for f in FINDINGS:
        story.append(Preformatted(build_issue_md(f), S["issue"], maxLineLength=110))
        story.append(Spacer(1, 0.35 * cm))

    doc = SimpleDocTemplate(
        str(OUT_PDF),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=f"Auditoria de Segurança — {PROJECT}",
        author="Cursor Security Audit",
    )
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(f"PDF: {OUT_PDF}")

    # Raster preview
    import pypdfium2 as pdfium

    pdf = pdfium.PdfDocument(str(OUT_PDF))
    n = len(pdf)
    print(f"pages: {n}")
    for i in range(n):
        page = pdf[i]
        bitmap = page.render(scale=1.5)
        pil = bitmap.to_pil()
        out = PREVIEW_DIR / f"page-{i + 1:02d}.png"
        pil.save(out)
        print(f"preview: {out}")


if __name__ == "__main__":
    main()
