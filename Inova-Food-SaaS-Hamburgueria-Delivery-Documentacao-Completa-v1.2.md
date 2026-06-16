# Inova Food SaaS - Plataforma Web para Hamburgueria e Delivery

**Versao:** 1.0  
**Data:** 11/06/2026  
**Responsavel:** Inova TI Tecnologia da Informacao  
**Projeto:** Software APP WEB SaaS para Hamburgueria, Delivery, Atendimento Local, Gestao Financeira, Cardapio Online, Impressao e Automacoes

---

## 1. Visao Geral do Projeto

Este documento apresenta o estudo completo para desenvolvimento de uma plataforma **SaaS web responsiva** voltada para hamburguerias, lanchonetes, dark kitchens, restaurantes rapidos e operacoes de delivery.

A solucao sera desenvolvida inicialmente como **APP WEB**, acessada via navegador em desktops, tablets, celulares e totens. A estrutura deve permitir evolucao futura para aplicativo mobile nativo ou PWA avancado.

O sistema tera suporte a varias empresas distintas, filiais por empresa, cardapio online, site publico, painel administrativo, delivery, atendimento local, cozinha, impressao de pedidos, financeiro completo, dashboards, integracoes com maquinas de cartao, Chatwoot, n8n, Cloudflare, LGPD, cookies, termos de privacidade e deploy em VPS na Hetzner.

---

## 2. Objetivos do Sistema

### 2.1 Objetivo principal

Criar uma plataforma SaaS para que hamburguerias possam vender online, controlar pedidos, gerenciar entregas, acompanhar financeiro, operar atendimento local, imprimir pedidos em diferentes setores e centralizar automacoes em uma unica ferramenta.

### 2.2 Objetivos especificos

- Disponibilizar site responsivo para cada hamburgueria.
- Criar cardapio online com produtos, categorias, adicionais, combos e promocoes.
- Permitir pedidos para delivery, retirada no balcao e atendimento local.
- Criar painel de pedidos para atendimento, cozinha, entrega e caixa.
- Integrar Chatwoot para atendimento omnichannel.
- Integrar n8n para automacoes, notificacoes e fluxos operacionais.
- Controlar clientes, enderecos, historico de pedidos e preferencia de consumo.
- Controlar entregadores, rotas, status de entrega e taxas.
- Controlar financeiro completo com contas a pagar, receber, caixa, formas de pagamento, conciliacao e dashboard.
- Integrar maquinas de cartao/TEF quando o provedor escolhido permitir.
- Integrar impressoras nao fiscais para balcao, cozinha, caixa e relatorios A4.
- Implementar LGPD, politica de privacidade, cookies, termos de uso e aceite do usuario.
- Preparar arquitetura SaaS multiempresa e multifilial com PostgreSQL.
- Publicar em VPS Hetzner com dominio protegido pela Cloudflare.

---

## 3. Premissas do Projeto

1. O sistema sera SaaS, com varios clientes na mesma plataforma.
2. Cada cliente SaaS sera tratado como um **tenant**.
3. Cada tenant podera ter uma ou mais empresas.
4. Cada empresa podera ter uma ou mais filiais.
5. Cada filial tera operacao propria de pedidos, caixa, impressoras, entregas e horarios.
6. O banco de dados recomendado e **PostgreSQL unico multitenant**, com separacao por `tenant_id`, `company_id` e `branch_id`.
7. O frontend sera desenvolvido com **Next.js + TypeScript**.
8. O backend pode ser desenvolvido em **NestJS** ou **FastAPI**. Recomendacao principal: NestJS para padronizacao com TypeScript.
9. A infraestrutura inicial sera em VPS na Hetzner.
10. O dominio passara pela Cloudflare, com DNS proxy, SSL/TLS, WAF e regras de seguranca.
11. A impressao local exigira um agente local, bridge ou solucao como QZ Tray, pois navegadores nao acessam impressoras termicas diretamente de forma confiavel sem componente local.
12. Integracao com maquinas de cartao depende do fornecedor escolhido: Stone, PagBank, Cielo, Getnet, Mercado Pago ou outro.
13. A sigla **DVH** sera tratada neste documento como **Dynamic Viewport Height** (`dvh`), unidade CSS usada para ajustar a altura da interface ao viewport dinamico do navegador, melhorando a responsividade em desktop, tablet e celular.
14. O projeto adotara SDD, TDD, documentacao viva, Spec Kit e pipeline CI/CD.
15. A revisao juridica final de LGPD, politica de privacidade e termos de uso deve ser feita por advogado ou consultoria especializada.

---

## 4. Escopo Geral do Produto

### 4.1 Modulos da versao 1

- Site publico responsivo da hamburgueria.
- Cardapio online.
- Checkout de pedido.
- Cadastro de cliente.
- Area do cliente.
- Painel administrativo SaaS.
- Painel da loja/filial.
- Painel de atendimento local.
- Painel de delivery.
- Painel da cozinha/KDS.
- Controle de impressoras nao fiscais.
- Gestor financeiro.
- Dashboard geral.
- Cadastro de produtos, categorias, adicionais e combos.
- Cadastro de empresas e filiais.
- Cadastro de usuarios, perfis e permissoes.
- Cadastro de entregadores.
- Controle logistico de entregas.
- Chatwoot integrado.
- n8n integrado.
- DVH - Dynamic Viewport Height (`100dvh`) para responsividade correta de telas e containers.
- LGPD, cookies, privacidade e termos.
- Pipeline CI/CD.
- Testes automatizados.
- Deploy Hetzner + Cloudflare.

### 4.2 Modulos futuros

- Aplicativo mobile do cliente.
- Aplicativo mobile do entregador.
- Totem de autoatendimento.
- Programa de fidelidade avancado.
- Campanhas de marketing automatizadas.
- Integracao nativa com marketplaces como iFood, aiqfome e outros, conforme disponibilidade de API.
- Estoque avancado por ficha tecnica.
- Compras e fornecedores.
- Emissao fiscal, NFC-e/SAT, se desejado em etapa futura.
- Multi-cozinha por praca de preparo.
- BI avancado.
- IA para sugestao de promocoes e previsao de demanda.

---

## 5. Arquitetura Recomendada

### 5.1 Visao macro

```text
Clientes / Atendentes / Cozinha / Gestores
        ↓
Cloudflare DNS + Proxy + WAF + SSL
        ↓
Nginx ou Traefik na VPS Hetzner
        ↓
Next.js Web App
        ↓
API Backend NestJS ou FastAPI
        ↓
PostgreSQL Multitenant
        ↓
Redis / Filas / Workers
        ↓
Storage de arquivos / MinIO / Volume Hetzner
        ↓
Servicos integrados: n8n, Chatwoot, pagamentos, impressao, notificacoes
```

### 5.2 Componentes principais

| Componente | Funcao |
|---|---|
| Next.js | Interface web responsiva, site publico, app administrativo e painéis operacionais |
| Backend API | Regras de negocio, pedidos, financeiro, usuarios, permissoes, integracoes |
| PostgreSQL | Banco de dados relacional SaaS multitenant |
| Redis | Cache, sessao, fila de pedidos, eventos em tempo real |
| Workers | Processamento assíncrono de impressao, notificacoes, webhooks e integrações |
| n8n | Automacoes, webhooks, mensagens, notificacoes e processos internos |
| Chatwoot | Atendimento ao cliente, WhatsApp, chat do site e historico de conversas |
| Cloudflare | DNS, WAF, proxy, SSL/TLS, protecao e cache |
| Hetzner VPS | Hospedagem inicial da aplicacao |
| Print Agent | Ponte local para impressoras termicas e A4 |
| Payment Gateway/TEF | Cartao, Pix, credito, debito e pagamentos online/presenciais |

---

## 6. Stack Tecnica Recomendada

| Camada | Recomendacao |
|---|---|
| Frontend | Next.js + TypeScript |
| UI | Tailwind CSS + Shadcn/UI |
| Estado | TanStack Query + Zustand quando necessario |
| Formularios | React Hook Form + Zod |
| Backend | NestJS + TypeScript |
| ORM | Prisma ou Drizzle |
| Banco | PostgreSQL |
| Cache/Fila | Redis + BullMQ |
| Testes unitarios | Vitest/Jest |
| Testes E2E | Playwright |
| Testes API | Supertest ou Pactum |
| Documentacao API | OpenAPI/Swagger |
| CI/CD | GitHub Actions |
| Deploy | Docker Compose na Hetzner |
| Reverse proxy | Traefik ou Nginx |
| Logs | Grafana Loki ou logs estruturados |
| Monitoramento | Uptime Kuma + Prometheus/Grafana opcional |
| Automacao | n8n self-hosted |
| Atendimento | Chatwoot self-hosted |
| Storage | MinIO ou volume Hetzner inicialmente |
| DNS/Seguranca | Cloudflare |

---

## 7. Arquitetura SaaS e Banco de Dados

### 7.1 Estrategia recomendada

Usar **um banco PostgreSQL unico multitenant** com separacao logica por:

```text
tenant_id
company_id
branch_id
user_id
```

### 7.2 Por que banco unico

- Facilita manutencao.
- Facilita atualizacoes.
- Reduz custo operacional.
- Permite dashboards globais.
- Facilita gestao de planos SaaS.
- Permite separacao por tenant com RLS.
- Permite escalar depois para banco dedicado por cliente enterprise.

### 7.3 Quando usar banco dedicado

Banco dedicado pode ser oferecido apenas para plano Enterprise, quando houver:

- Cliente de grande porte.
- Exigencia contratual de isolamento fisico.
- Alto volume de dados.
- SLA dedicado.
- Ambiente white label exclusivo.

### 7.4 Tabelas principais

```text
tenants
companies
branches
users
roles
permissions
user_branch_access
customers
customer_addresses
product_categories
products
product_variants
product_addons
addon_groups
combos
menus
menu_availability
orders
order_items
order_item_addons
order_status_history
payments
payment_methods
cash_registers
cash_movements
deliveries
delivery_drivers
delivery_zones
delivery_fees
printers
print_jobs
kitchen_stations
financial_accounts
accounts_payable
accounts_receivable
expenses
revenues
bank_accounts
financial_categories
cost_centers
chatwoot_conversations
n8n_workflow_logs
audit_logs
cookie_consents
user_consents
lgpd_requests
system_settings
subscription_plans
subscriptions
billing_invoices
webhooks
integrations
```

### 7.5 Exemplo de modelagem base

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE companies (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  legal_name VARCHAR(255),
  trade_name VARCHAR(255) NOT NULL,
  document_number VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE branches (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  timezone VARCHAR(80) DEFAULT 'America/Sao_Paulo',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

---

## 8. Layout Completo do Projeto

## 8.1 Site publico da hamburgueria

### Objetivo

Apresentar a marca, cardapio, horarios, endereco, promocoes, links de pedido e canal de atendimento.

### Secoes

```text
Topo com logo, menu e botao Pedir Agora
Banner principal com chamada comercial
Categorias de destaque
Mais vendidos
Promocoes
Como funciona
Area de entrega
Depoimentos
Localizacao
Rodape com LGPD, termos, privacidade e cookies
```

### Wireframe

```text
┌──────────────────────────────────────────────────────────────┐
│ LOGO             Cardapio  Promocoes  Contato   [Pedir Agora]│
├──────────────────────────────────────────────────────────────┤
│ Banner: O melhor burger artesanal da cidade                  │
│ [Ver Cardapio] [Pedir pelo WhatsApp/Chat]                    │
├──────────────────────────────────────────────────────────────┤
│ Categorias: Burgers | Combos | Porcoes | Bebidas | Sobremesa │
├──────────────────────────────────────────────────────────────┤
│ Mais vendidos                                                │
│ [Produto] [Produto] [Produto] [Produto]                      │
├──────────────────────────────────────────────────────────────┤
│ Promocoes da semana                                          │
├──────────────────────────────────────────────────────────────┤
│ Area de entrega | Horarios | Formas de pagamento             │
├──────────────────────────────────────────────────────────────┤
│ Politica de Privacidade | Cookies | Termos de Uso            │
└──────────────────────────────────────────────────────────────┘
```

---

## 8.2 Cardapio online

### Funcoes

- Categorias.
- Busca.
- Filtros por disponibilidade.
- Produtos com foto.
- Produtos com adicionais obrigatorios/opcionais.
- Combos.
- Promocoes.
- Carrinho lateral.
- Entrega, retirada ou consumo local.

### Wireframe

```text
┌──────────────────────────────────────────────────────────────┐
│ Cardapio Online                         [Carrinho R$ 58,90]  │
├──────────────────────────────────────────────────────────────┤
│ Busca produto...                                             │
│ [Burgers] [Combos] [Porcoes] [Bebidas] [Sobremesas]          │
├──────────────────────────────┬───────────────────────────────┤
│ Lista de produtos            │ Carrinho                      │
│ [Foto] Burger Smash          │ 2x Burger Smash               │
│ R$ 29,90                     │ 1x Batata                     │
│ [Adicionar]                  │ Taxa entrega                  │
│                              │ Total                         │
│ [Foto] Combo Duplo           │ [Finalizar Pedido]            │
└──────────────────────────────┴───────────────────────────────┘
```

---

## 8.3 Checkout do cliente

### Funcoes

- Identificacao do cliente.
- Cadastro/login rapido.
- Endereco.
- Tipo de pedido: delivery, retirada ou local.
- Cupom.
- Observacoes.
- Forma de pagamento.
- Troco.
- Confirmacao.

```text
┌──────────────────────────────────────────────────────────────┐
│ Finalizar Pedido                                             │
├──────────────────────────────┬───────────────────────────────┤
│ Dados do cliente             │ Resumo do pedido              │
│ Nome                         │ Itens                         │
│ Telefone                     │ Subtotal                      │
│ Endereco                     │ Taxa de entrega               │
│ Complemento                  │ Cupom                         │
│ Pagamento                    │ Total                         │
│ [Confirmar Pedido]           │                               │
└──────────────────────────────┴───────────────────────────────┘
```

---

## 8.4 Painel de pedidos - Delivery

### Funcoes

- Pedidos recebidos.
- Status em tempo real.
- Aceitar/rejeitar pedido.
- Tempo estimado.
- Atribuir entregador.
- Imprimir pedido.
- Enviar mensagem ao cliente.

```text
┌──────────────────────────────────────────────────────────────┐
│ Painel Delivery - Filial Centro                              │
├──────────────────────────────────────────────────────────────┤
│ [Novos] [Em preparo] [Saiu para entrega] [Entregues]         │
├──────────────────────────────────────────────────────────────┤
│ Pedido #1025 | Cliente: Maria | Total R$ 79,80               │
│ Endereco: Rua X, 123 | Pagamento: Cartao na entrega          │
│ [Aceitar] [Imprimir] [Enviar para cozinha] [Atribuir motoboy]│
├──────────────────────────────────────────────────────────────┤
│ Pedido #1026 | Cliente: Joao | Total R$ 42,50                │
└──────────────────────────────────────────────────────────────┘
```

---

## 8.5 Painel de atendimento local / balcao

### Funcoes

- Novo pedido local.
- Pedido para mesa/comanda.
- Pedido para retirada.
- Fechamento de pedido.
- Pagamento.
- Impressao no balcao/cozinha/caixa.

```text
┌──────────────────────────────────────────────────────────────┐
│ Atendimento Local / Balcao                                   │
├───────────────┬────────────────────────────┬────────────────┤
│ Categorias    │ Produtos                   │ Pedido atual   │
│ Burgers       │ [Burger] [Combo] [Bebida]  │ Itens          │
│ Bebidas       │                            │ Total          │
│ Combos        │                            │ [Enviar cozinha]│
│               │                            │ [Fechar venda] │
└───────────────┴────────────────────────────┴────────────────┘
```

---

## 8.6 Painel da cozinha / KDS

### Funcoes

- Pedidos por ordem de chegada.
- Filtros por setor: chapa, montagem, fritadeira, bebidas.
- Tempo decorrido.
- Observacoes do cliente.
- Status: recebido, em producao, pronto.
- Impressao automatica.

```text
┌──────────────────────────────────────────────────────────────┐
│ Cozinha - Producao                                           │
├──────────────────────────────────────────────────────────────┤
│ [Chapa] [Montagem] [Fritadeira] [Bebidas] [Todos]            │
├──────────────────────────────────────────────────────────────┤
│ Pedido #1025 - Delivery - 08 min                             │
│ 2x Smash Burger sem cebola                                   │
│ 1x Batata grande                                             │
│ Obs: enviar maionese separada                                │
│ [Iniciar] [Pronto]                                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 8.7 Painel financeiro completo

### Funcoes

- Visao de caixa.
- Entradas.
- Saidas.
- Contas a pagar.
- Contas a receber.
- Taxas de cartao.
- Vendas por forma de pagamento.
- Fechamento de caixa.
- DRE gerencial.
- Resultado por filial.
- Exportacao de relatorios.

```text
┌──────────────────────────────────────────────────────────────┐
│ Dashboard Financeiro                                         │
├──────────────────────────────────────────────────────────────┤
│ [Vendas Hoje] [Ticket Medio] [Lucro Estimado] [Pedidos]      │
├──────────────────────────────┬───────────────────────────────┤
│ Grafico vendas por dia       │ Grafico formas de pagamento   │
├──────────────────────────────┴───────────────────────────────┤
│ Contas a pagar | Contas a receber | Caixa | DRE | Relatorios │
└──────────────────────────────────────────────────────────────┘
```

---

## 8.8 Dashboard geral SaaS

```text
┌──────────────────────────────────────────────────────────────┐
│ Inova Food SaaS - Admin                                      │
├───────────────┬──────────────────────────────────────────────┤
│ Menu lateral  │ Indicadores gerais                           │
│ Tenants       │ Clientes ativos                              │
│ Planos        │ Pedidos do dia                               │
│ Faturamento   │ Receita SaaS                                 │
│ Suporte       │ Consumo de storage                           │
│ Logs          │ Consumo de mensagens / automacoes            │
│ Configuracoes │ Alertas de sistema                           │
└───────────────┴──────────────────────────────────────────────┘
```

---

## 8.9 Painel de impressoras

```text
┌──────────────────────────────────────────────────────────────┐
│ Impressoras - Filial Centro                                  │
├──────────────────────────────────────────────────────────────┤
│ [Nova Impressora] [Testar Todas]                             │
├──────────────────────────────────────────────────────────────┤
│ Balcao - EPSON TM-T20 - Status Online - [Teste] [Editar]     │
│ Cozinha - Bematech MP4200 - Status Online - [Teste] [Editar] │
│ Caixa A4 - HP LaserJet - Status Online - [Teste] [Editar]    │
└──────────────────────────────────────────────────────────────┘
```

---

## 9. Impressao Nao Fiscal

### 9.1 Tipos de impressao

| Local | Uso |
|---|---|
| Balcao | Fechamento de pedido, senha, retirada |
| Cozinha | Producao de itens |
| Caixa | Relatorios administrativos e fechamento |
| A4 | Relatorios, listas, conferencias e documentos internos |

### 9.2 Estrategia tecnica

O navegador nao deve imprimir diretamente em impressoras termicas sem confirmacao do usuario. Para uma operacao profissional, recomenda-se:

```text
APP WEB Next.js
    ↓
API Backend
    ↓
Fila de print_jobs
    ↓
Agente local de impressao instalado na filial
    ↓
Impressoras locais: USB, rede, termica e A4
```

### 9.3 Agente local de impressao

O agente local pode ser desenvolvido em:

- Node.js + Electron.
- Go.
- Python.
- Java.
- QZ Tray, se adotado como solucao de ponte.

### 9.4 Recursos do agente

- Sincronizar impressoras cadastradas.
- Receber jobs de impressao via polling seguro ou websocket.
- Confirmar impressao.
- Reimprimir pedidos.
- Sinalizar erro de impressora offline.
- Separar impressao por setor.
- Permitir impressao A4.

---

## 10. Integracao com Maquinas de Cartao

### 10.1 Cenarios de integracao

| Cenario | Descricao |
|---|---|
| Pagamento online | Cliente paga no checkout web via API de gateway |
| Pagamento presencial sem integracao | Atendente registra manualmente no sistema |
| TEF/POS integrado | Sistema envia valor para terminal ou pinpad |
| Conciliacao posterior | Sistema importa/consulta transacoes do provedor |

### 10.2 Provedores possiveis

- Stone.
- PagBank/PagSeguro.
- Cielo.
- Getnet.
- Mercado Pago.
- Rede.
- Outros conforme disponibilidade de API/TEF.

### 10.3 Observacao importante

A integracao com maquina fisica geralmente depende de credenciamento, homologacao, SDK, DLL, TEF, pinpad ou solucao proprietaria do adquirente. Portanto, a etapa de cartao deve ter uma fase especifica de analise do provedor escolhido.

### 10.4 Fluxo de pagamento presencial integrado

```text
Atendente fecha pedido
↓
Seleciona cartao credito/debito/pix presencial
↓
Sistema envia valor para integracao TEF/POS
↓
Cliente paga na maquininha
↓
Provedor retorna status
↓
Pedido e caixa sao atualizados
↓
Comprovante e fechamento ficam registrados
```

---

## 11. Chatwoot

### 11.1 Uso no projeto

- Chat no site.
- Atendimento via WhatsApp, quando integrado.
- Atendimento de pedidos.
- Historico do cliente.
- Triagem automatica.
- Suporte ao consumidor.
- Atendimento interno por filial.

### 11.2 Fluxos Chatwoot

```text
Cliente abre chat
↓
Chatwoot identifica telefone/e-mail
↓
Sistema busca cliente e pedidos
↓
Atendente visualiza historico
↓
n8n pode disparar automacoes
↓
Pedido ou suporte fica vinculado ao cadastro
```

---

## 12. n8n

### 12.1 Uso no projeto

- Enviar notificacao de novo pedido.
- Enviar status do pedido ao cliente.
- Enviar alerta para gestor.
- Criar rotinas de fechamento diario.
- Criar fluxos de marketing.
- Integrar Chatwoot com sistema.
- Integrar Webhooks de pagamento.
- Gerar relatorios automaticos.

### 12.2 Workflows iniciais

```text
Novo pedido recebido
Pagamento confirmado
Pedido atrasado
Pedido saiu para entrega
Pedido entregue
Cliente abandonou carrinho
Fechamento diario de caixa
Relatorio semanal do gestor
Falha de impressao
```

---

## 13. DVH - Dynamic Viewport Height para responsividade

### 13.1 Definicao operacional

Neste escopo, **DVH** se refere a **Dynamic Viewport Height**, especificamente ao uso da unidade CSS `dvh`, como em `height: 100dvh`. Essa abordagem ajuda o layout a ocupar corretamente a altura visivel do navegador, evitando problemas comuns em telas responsivas, principalmente em celulares, tablets e navegadores com barras dinamicas.

Exemplo padrao a ser adotado no projeto:

```css
body {
  width: 100%;
}

.container {
  width: 100%;
  height: 100dvh;
  background-color: #f0f0f0;
}
```

Recomendacao para compatibilidade e layout seguro:

```css
.app-shell {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
}
```

Aplicacao prevista:

- telas de login e cadastro;
- layout principal administrativo;
- cardapio online responsivo;
- painel de pedidos do delivery;
- painel de atendimento local;
- painel de cozinha/producao;
- dashboard financeiro;
- modais e containers que precisam ocupar a altura correta da tela.

### 13.2 Funcoes

- Consolidar pedidos do site, balcao, atendimento e canais externos.
- Padronizar status dos pedidos.
- Direcionar pedido para filial correta.
- Enviar pedido para cozinha.
- Acionar impressao.
- Acionar entrega.
- Atualizar painel do cliente.
- Acionar notificacoes.

### 13.3 Observacao

O uso de `100dvh` deve ser padronizado nos layouts principais do sistema, especialmente em telas de login, dashboards, cardapio online, painel de atendimento, painel da cozinha, delivery e area administrativa. Quando necessario, devem ser usados fallbacks com `min-height: 100vh` para compatibilidade.

---

## 14. Gestor Financeiro Completo

### 14.1 Funcionalidades

- Caixa por filial.
- Abertura e fechamento de caixa.
- Sangria e suprimento.
- Contas a pagar.
- Contas a receber.
- Receitas por canal.
- Despesas por categoria.
- Formas de pagamento.
- Taxas de cartao.
- Relatorio de vendas.
- Relatorio de ticket medio.
- Relatorio por produto.
- Relatorio por categoria.
- Relatorio por filial.
- DRE gerencial.
- Exportacao CSV, XLSX e PDF.

### 14.2 Dashboard financeiro

Indicadores:

```text
Vendas do dia
Vendas do mes
Ticket medio
Pedidos por canal
Pedidos cancelados
Taxa de entrega recebida
Taxas de cartao
Lucro estimado
Despesas do mes
Saldo de caixa
Contas vencidas
Contas a vencer
```

---

## 15. Logistica de Entregas

### 15.1 Funcionalidades

- Cadastro de entregadores.
- Cadastro de zonas de entrega.
- Taxa por bairro, raio ou CEP.
- Pedido aguardando entregador.
- Pedido em rota.
- Pedido entregue.
- Registro de tempo de entrega.
- Controle de taxa paga ao entregador.
- Historico de entregas.
- Painel de mapa em etapa futura.

### 15.2 Status de entrega

```text
Aguardando preparo
Pronto para retirada
Aguardando entregador
Saiu para entrega
Entregue
Falha na entrega
Cancelado
```

---

## 16. LGPD, Privacidade, Cookies e Termos

### 16.1 Itens obrigatorios

- Politica de Privacidade.
- Termos de Uso.
- Politica de Cookies.
- Banner de cookies.
- Preferencias de cookies.
- Registro de consentimento.
- Aceite dos termos no primeiro acesso.
- Logs de auditoria.
- Controle de acesso por perfil.
- Exportacao de dados do titular.
- Anonimizacao/inativacao de usuario.
- Canal para solicitacoes LGPD.

### 16.2 Dados tratados

- Nome.
- Telefone.
- E-mail.
- Endereco.
- Historico de pedidos.
- Preferencias de consumo.
- Dados de pagamento tokenizados ou referencias de transacao.
- Conversas de atendimento.
- Dados de usuarios internos.
- Logs de acesso.
- IP e user-agent.

### 16.3 Cookies

Tipos de cookies:

```text
Essenciais: login, carrinho, seguranca e sessao.
Analiticos: metricas de uso, se consentido.
Marketing: campanhas e remarketing, se consentido.
Preferencias: idioma, filial, modo de exibicao.
```

### 16.4 Banner sugerido

```text
Utilizamos cookies para melhorar sua experiencia, manter sua sessao segura,
personalizar conteudos e analisar o uso da plataforma. Voce pode aceitar todos,
rejeitar cookies nao essenciais ou configurar suas preferencias.

[Aceitar todos] [Rejeitar nao essenciais] [Configurar]
```

---

## 17. Seguranca

### 17.1 Requisitos

- HTTPS obrigatorio.
- Cloudflare Proxy ativo para web/API.
- WAF ativado.
- Regras de firewall na Cloudflare e na VPS.
- Autenticacao segura.
- RBAC por perfil.
- Separacao por tenant/empresa/filial.
- Row-Level Security no PostgreSQL quando aplicavel.
- Rate limit.
- Protecao contra brute force.
- Logs de auditoria.
- Backup criptografado.
- Segredos em variaveis de ambiente.
- Rotacao de credenciais.
- Validacao de uploads.
- Politica de retencao de dados.

---

## 18. Cloudflare

### 18.1 Configuracoes recomendadas

- DNS gerenciado pela Cloudflare.
- Registros A/CNAME proxied para trafego web.
- SSL/TLS Full Strict.
- WAF habilitado.
- Rate limiting para rotas sensiveis.
- Cache apenas para assets estaticos.
- Page Rules ou Rulesets para seguranca.
- Bloqueio por pais, se necessario.
- Bot Fight Mode, se aplicavel.
- HSTS apos validacao do ambiente.

### 18.2 Subdominios sugeridos

```text
app.dominio.com.br
api.dominio.com.br
admin.dominio.com.br
chat.dominio.com.br
n8n.dominio.com.br
status.dominio.com.br
```

---

## 19. Infraestrutura Hetzner

### 19.1 Ambiente inicial recomendado

Para piloto/producao inicial:

```text
8 vCPU
16 GB RAM
240 GB NVMe ou superior
Volume adicional de 500 GB para arquivos/backups locais
Debian 12/13 ou Ubuntu LTS
Docker + Docker Compose
```

### 19.2 Ambiente minimo para desenvolvimento/homologacao

```text
4 vCPU
8 GB RAM
160 GB NVMe
```

### 19.3 Evolucao futura

```text
Servidor 1: Next.js + API
Servidor 2: PostgreSQL
Servidor 3: n8n + Chatwoot + Workers
Storage separado: MinIO/S3/Storage Box
Load Balancer na frente
```

---

## 20. Pipeline, TDD, SDD e Spec Kit

## 20.1 Estrategia de desenvolvimento

O projeto deve seguir uma combinacao de:

- SDD - Spec Driven Development.
- TDD - Test Driven Development.
- CI/CD com GitHub Actions.
- Pull Requests obrigatorios.
- Code review.
- Testes automatizados.
- Documentacao viva.
- Spec Kit para gerar/organizar especificacoes por funcionalidade.

### 20.2 Fluxo SDD

```text
1. Criar especificacao da funcionalidade
2. Definir criterios de aceite
3. Definir contratos de API
4. Definir modelo de dados
5. Gerar plano de implementacao
6. Criar testes antes ou junto da implementacao
7. Implementar
8. Validar testes
9. Atualizar documentacao
```

### 20.3 Fluxo TDD

```text
Red: escrever teste que falha
Green: implementar o minimo para passar
Refactor: melhorar codigo sem quebrar teste
Repeat: repetir por funcionalidade
```

### 20.4 Pipeline CI/CD

```text
Push/Pull Request
↓
Lint
↓
Typecheck
↓
Unit tests
↓
Integration tests
↓
Build Docker
↓
E2E tests em ambiente staging
↓
Deploy staging
↓
Aprovacao manual
↓
Deploy producao
```

### 20.5 Estrutura Spec Kit sugerida

```text
.specify/
  memory/
  templates/
specs/
  001-auth-multitenant/
  002-cardapio-online/
  003-pedidos-delivery/
  004-painel-cozinha/
  005-financeiro/
  006-impressao-local/
  007-pagamentos/
  008-chatwoot-n8n/
  009-lgpd-cookies/
```

---

## 21. Estrutura de Repositorio

```text
inova-food-saas/
├── apps/
│   ├── web/                 # Next.js
│   ├── api/                 # NestJS/FastAPI
│   ├── print-agent/          # Agente local de impressao
│   └── worker/               # Workers e filas
├── packages/
│   ├── ui/                   # Componentes compartilhados
│   ├── config/               # Configuracoes
│   ├── database/             # Prisma/Drizzle schema
│   ├── validation/           # Zod schemas
│   └── types/                # Tipos compartilhados
├── infra/
│   ├── docker/
│   ├── nginx/
│   ├── traefik/
│   ├── cloudflare/
│   └── hetzner/
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── lgpd.md
│   ├── deployment.md
│   └── runbook.md
├── specs/
├── tests/
└── docker-compose.yml
```

---

## 22. Docker Compose Inicial

```yaml
version: '3.9'
services:
  web:
    build: ./apps/web
    depends_on:
      - api
    environment:
      - NEXT_PUBLIC_API_URL=https://api.seudominio.com.br

  api:
    build: ./apps/api
    depends_on:
      - postgres
      - redis
    environment:
      - DATABASE_URL=postgresql://app:secret@postgres:5432/inova_food
      - REDIS_URL=redis://redis:6379

  postgres:
    image: postgres:16
    environment:
      - POSTGRES_DB=inova_food
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=secret
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  n8n:
    image: n8nio/n8n:latest
    environment:
      - N8N_HOST=n8n.seudominio.com.br
    volumes:
      - n8n_data:/home/node/.n8n

  chatwoot:
    image: chatwoot/chatwoot:latest
    depends_on:
      - postgres
      - redis

  worker:
    build: ./apps/worker
    depends_on:
      - redis
      - postgres

volumes:
  postgres_data:
  n8n_data:
```

---

## 23. Perfis de Usuario

| Perfil | Acesso |
|---|---|
| Super Admin SaaS | Todos os tenants e configuracoes globais |
| Admin do Cliente | Todas as empresas/filiais do tenant |
| Gestor de Filial | Operacao completa de uma filial |
| Caixa | Pedidos, pagamentos, fechamento de caixa |
| Atendente | Pedidos local/delivery e clientes |
| Cozinha | Painel de producao |
| Entregador | Entregas atribuidas |
| Financeiro | Financeiro, relatorios e contas |
| Marketing | Cardapio, promocoes e campanhas |
| Cliente final | Cardapio, pedidos e historico |

---

## 24. Cronograma Completo de Desenvolvimento

O cronograma abaixo considera um desenvolvimento profissional para uma versao SaaS inicial robusta. O prazo pode variar conforme equipe, integracoes escolhidas e disponibilidade das credenciais de pagamento/TEF.

## Fase 1 - Descoberta, planejamento e especificacao

### Dia 1 - Kickoff do projeto

- Definir visao do produto.
- Definir publico-alvo.
- Definir escopo MVP e escopo futuro.
- Definir nomenclatura oficial do produto.

Entregaveis:

```text
Documento de visao
Lista de modulos
Mapa de prioridades
```

### Dia 2 - Levantamento de regras de negocio

- Mapear fluxo de atendimento local.
- Mapear fluxo de delivery.
- Mapear fluxo da cozinha.
- Mapear fluxo financeiro.
- Mapear fluxo de impressao.

### Dia 3 - Definicao tecnica

- Escolher backend definitivo.
- Escolher ORM.
- Escolher estrategia de impressao.
- Escolher provedor de pagamento inicial.
- Definir infraestrutura Hetzner.

### Dia 4 - Especificacao SaaS/multitenant

- Definir tenant, empresa e filial.
- Definir isolamento de dados.
- Definir planos SaaS.
- Definir limites por plano.

### Dia 5 - Especificacao LGPD e documentos legais

- Mapear dados pessoais.
- Definir cookies.
- Definir aceite de termos.
- Definir logs de auditoria.

---

## Fase 2 - UX/UI e prototipos

### Dia 6 - Mapa de navegacao

- Criar menus.
- Criar sitemap.
- Definir fluxo por perfil.

### Dia 7 - Layout site publico

- Home.
- Cardapio.
- Promocoes.
- Contato.
- Privacidade/cookies/termos.

### Dia 8 - Layout cardapio e checkout

- Cardapio.
- Produto.
- Adicionais.
- Carrinho.
- Checkout.

### Dia 9 - Layout paineis operacionais

- Painel delivery.
- Painel balcao.
- Painel cozinha.
- Painel caixa.

### Dia 10 - Layout dashboards e financeiro

- Dashboard geral.
- Dashboard financeiro.
- Contas.
- Caixa.
- Relatorios.

---

## Fase 3 - Base tecnica e infraestrutura

### Dia 11 - Repositorio e monorepo

- Criar monorepo.
- Configurar apps e packages.
- Configurar ESLint, Prettier e TypeScript.

### Dia 12 - Setup Next.js

- Criar app web.
- Criar layout base.
- Criar tema.
- Criar rotas publicas e privadas.

### Dia 13 - Setup API

- Criar backend.
- Criar estrutura modular.
- Criar healthcheck.
- Criar Swagger/OpenAPI.

### Dia 14 - Banco de dados

- Criar PostgreSQL.
- Criar schema inicial.
- Criar migrations.
- Criar seed.

### Dia 15 - CI/CD inicial

- GitHub Actions.
- Lint.
- Typecheck.
- Testes.
- Build.

### Dia 16 - Docker e ambiente local

- Docker Compose.
- Variaveis.
- Documentacao de setup.

### Dia 17 - Hetzner staging

- VPS.
- Docker.
- Firewall.
- Nginx/Traefik.
- SSL.

### Dia 18 - Cloudflare

- DNS.
- Proxy.
- WAF.
- Regras de cache.
- Regras de seguranca.

---

## Fase 4 - Autenticacao, SaaS e permissoes

### Dia 19 - Autenticacao

- Login.
- Logout.
- Recuperacao de senha.
- Sessoes.

### Dia 20 - Multiempresa/multifilial

- Tenant.
- Empresa.
- Filial.
- Contexto ativo.

### Dia 21 - Usuarios e permissoes

- Roles.
- Permissions.
- RBAC.
- Acesso por filial.

### Dia 22 - Painel SaaS admin

- Clientes SaaS.
- Planos.
- Status.
- Bloqueio/suspensao.

---

## Fase 5 - Cardapio online

### Dia 23 - Categorias e produtos

- CRUD categorias.
- CRUD produtos.
- Fotos.
- Precos.
- Disponibilidade.

### Dia 24 - Adicionais e combos

- Grupos de adicionais.
- Regras obrigatorias/opcionais.
- Combos.
- Promocoes.

### Dia 25 - Cardapio publico

- Visualizacao responsiva.
- Busca.
- Filtros.
- Produtos.

### Dia 26 - Carrinho

- Adicionar/remover itens.
- Observacoes.
- Calculo total.

### Dia 27 - Checkout

- Cliente.
- Endereco.
- Entrega/retirada/local.
- Pagamento.

---

## Fase 6 - Pedidos e operacao

### Dia 28 - Pedido base

- Criar pedido.
- Itens.
- Status.
- Historico.

### Dia 29 - Painel delivery

- Novos pedidos.
- Aceitar/rejeitar.
- Tempo estimado.

### Dia 30 - Painel local/balcao

- Pedido rapido.
- Fechamento.
- Envio cozinha.

### Dia 31 - Painel cozinha/KDS

- Cards de producao.
- Status.
- Tempo.
- Setores.

### Dia 32 - Status em tempo real

- Websocket/SSE.
- Atualizacao em paineis.
- Notificacoes internas.

---

## Fase 7 - Impressao

### Dia 33 - Modelagem impressoras

- Cadastro de impressoras.
- Setores.
- Templates de impressao.

### Dia 34 - Fila de impressao

- Print jobs.
- Status.
- Reimpressao.

### Dia 35 - Agente local MVP

- Comunicacao com API.
- Listar impressoras.
- Imprimir teste.

### Dia 36 - Impressao por setor

- Balcao.
- Cozinha.
- Caixa.
- A4.

### Dia 37 - Tratamento de falhas

- Impressora offline.
- Reenvio.
- Logs.

---

## Fase 8 - Delivery e logistica

### Dia 38 - Entregadores

- Cadastro.
- Status.
- Disponibilidade.

### Dia 39 - Zonas de entrega

- Bairro.
- CEP.
- Raio.
- Taxas.

### Dia 40 - Despacho de entrega

- Atribuir entregador.
- Status.
- Tempo estimado.

### Dia 41 - Painel entregas

- Aguardando.
- Em rota.
- Entregue.

---

## Fase 9 - Financeiro

### Dia 42 - Caixa

- Abertura.
- Fechamento.
- Sangria.
- Suprimento.

### Dia 43 - Formas de pagamento

- Dinheiro.
- Pix.
- Cartao.
- Online.
- Voucher.

### Dia 44 - Contas a pagar/receber

- CRUD.
- Vencimentos.
- Status.

### Dia 45 - Despesas e receitas

- Categorias.
- Centro de custo.
- Lancamentos.

### Dia 46 - Dashboard financeiro

- Indicadores.
- Graficos.
- Filtros.

### Dia 47 - Relatorios administrativos

- PDF.
- CSV.
- A4.
- Relatorio de caixa.

---

## Fase 10 - Pagamentos e TEF/POS

### Dia 48 - Analise do provedor

- Definir Stone/PagBank/outro.
- Validar documentacao.
- Validar credenciais.
- Validar homologacao.

### Dia 49 - Pagamento online

- Checkout API.
- Webhook.
- Confirmacao.

### Dia 50 - Pagamento presencial

- Fluxo manual.
- Preparacao TEF/POS.
- Registro de NSU/autorizacao.

### Dia 51 - Conciliacao inicial

- Relatorio por transacao.
- Status.
- Divergencias.

---

## Fase 11 - Chatwoot, n8n e responsividade com DVH

### Dia 52 - Instalacao/configuracao Chatwoot

- Instalar.
- Configurar inbox.
- Widget.
- Usuarios.

### Dia 53 - Integracao Chatwoot

- Webhooks.
- Vinculo cliente.
- Historico.

### Dia 54 - Instalacao/configuracao n8n

- Instalar.
- Criar credenciais.
- Criar webhooks.

### Dia 55 - Workflows n8n

- Novo pedido.
- Pedido atrasado.
- Entrega.
- Fechamento diario.

### Dia 56 - Padronizacao responsiva com DVH

- Consolidacao de canais.
- Normalizacao de status.
- Regras de roteamento.

---

## Fase 12 - LGPD, privacidade e cookies

### Dia 57 - Politicas e paginas legais

- Privacidade.
- Cookies.
- Termos.

### Dia 58 - Banner e consentimentos

- Banner.
- Preferencias.
- Registro.

### Dia 59 - Solicitacoes LGPD

- Exportacao.
- Correcao.
- Anonimizacao.
- Logs.

---

## Fase 13 - Testes, QA e seguranca

### Dia 60 - Testes unitarios

- Servicos.
- Regras de negocio.
- Validacoes.

### Dia 61 - Testes de integracao

- API.
- Banco.
- Filas.

### Dia 62 - Testes E2E

- Cardapio.
- Checkout.
- Pedidos.
- Cozinha.
- Financeiro.

### Dia 63 - Testes de impressao

- Balcao.
- Cozinha.
- Caixa.
- A4.

### Dia 64 - Testes de seguranca

- Permissoes.
- Tenant isolation.
- Rate limit.
- Upload.

### Dia 65 - Testes de carga inicial

- Pedidos simultaneos.
- Paineis em tempo real.
- Impressao.

---

## Fase 14 - Homologacao e producao

### Dia 66 - Correcao de bugs

- Corrigir pendencias criticas.
- Ajustar telas.

### Dia 67 - Homologacao operacional

- Simular dia de vendas.
- Simular delivery.
- Simular cozinha.
- Simular caixa.

### Dia 68 - Homologacao financeira

- Caixa.
- Relatorios.
- Contas.
- Pagamentos.

### Dia 69 - Deploy producao

- Publicar.
- Configurar dominio.
- Backup.
- Monitoramento.

### Dia 70 - Treinamento e go-live assistido

- Treinar admin.
- Treinar caixa.
- Treinar cozinha.
- Treinar delivery.
- Acompanhar operacao.

---

## 25. Prazo Estimado

| Modelo | Prazo |
|---|---:|
| MVP enxuto | 60 a 75 dias uteis |
| SaaS profissional recomendado | 90 a 120 dias uteis |
| SaaS completo com TEF/POS, impressao e financeiro avancado | 150 a 180 dias uteis |

Para o escopo deste documento, a recomendacao realista e:

```text
120 a 150 dias uteis
```

Caso a integracao com TEF/POS exija homologacao externa complexa, o prazo pode aumentar.

---

## 26. Etapas do MVP Recomendado

### MVP 1 - Venda online e operacao basica

- Site.
- Cardapio.
- Checkout.
- Pedidos.
- Painel delivery.
- Painel cozinha.
- Impressao basica.
- Caixa basico.

### MVP 2 - SaaS e financeiro

- Multiempresa.
- Filiais.
- Financeiro completo.
- Dashboards.
- Planos SaaS.
- Permissoes.

### MVP 3 - Automacoes e atendimento

- Chatwoot.
- n8n.
- DVH (`100dvh`) aplicado aos layouts responsivos.
- Notificacoes.

### MVP 4 - Pagamentos e TEF

- Pagamento online.
- TEF/POS.
- Conciliacao.

---

## 27. Criterios de Aceite

### 27.1 Plataforma

- Usuário consegue acessar o sistema com login seguro.
- Admin consegue criar tenant, empresa e filial.
- Admin consegue cadastrar usuarios e permissoes.
- Dados de um tenant nao aparecem para outro.

### 27.2 Cardapio

- Usuario consegue cadastrar produto com foto, preco e adicionais.
- Cliente consegue montar pedido online.
- Carrinho calcula total corretamente.
- Checkout gera pedido.

### 27.3 Operacao

- Pedido aparece no painel correto.
- Cozinha recebe pedido.
- Delivery recebe pedido.
- Status atualiza em tempo real.

### 27.4 Impressao

- Pedido imprime no balcao.
- Pedido imprime na cozinha.
- Relatorio imprime no caixa/A4.
- Falha de impressao gera alerta.

### 27.5 Financeiro

- Caixa abre e fecha.
- Formas de pagamento sao registradas.
- Contas a pagar/receber funcionam.
- Dashboard financeiro exibe dados corretos.

### 27.6 LGPD

- Banner de cookies aparece.
- Usuario pode configurar cookies.
- Aceite de termos e registrado.
- Logs de auditoria funcionam.

---

## 28. Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| Integracao TEF complexa | Definir provedor cedo e iniciar homologacao separada |
| Impressao local instavel | Criar agente local robusto com fila e reimpressao |
| Escopo muito grande | Dividir em MVPs |
| Operacao real diferente do previsto | Fazer homologacao em ambiente real |
| Dados de tenants misturados | RLS, testes de isolamento e revisao de seguranca |
| LGPD incompleta | Revisao juridica e matriz de tratamento |
| Cloudflare mal configurada | Checklist de seguranca e testes |
| Carga alta em horarios de pico | Redis, filas e testes de carga |

---

## 29. Requisitos para Cursor / Agente de Desenvolvimento

Prompt inicial sugerido:

```text
Voce e um engenheiro full-stack senior. Desenvolva a plataforma Inova Food SaaS conforme a documentacao do projeto. Use Next.js + TypeScript para o frontend, NestJS + TypeScript para API, PostgreSQL multitenant, Redis, Docker Compose, testes automatizados, arquitetura modular, SDD, TDD e Spec Kit. O produto deve atender hamburguerias e delivery, com cardapio online, pedidos, cozinha, delivery, financeiro, impressao, Chatwoot, n8n, LGPD, Cloudflare e deploy Hetzner. Siga criterios de aceite, crie testes antes das funcionalidades criticas e mantenha a documentacao atualizada.
```

---

## 30. Documentos que devem acompanhar o projeto

- README tecnico.
- Guia de deploy Hetzner.
- Guia Cloudflare.
- Guia de backup.
- Guia de restauracao.
- Manual do administrador SaaS.
- Manual do lojista.
- Manual do caixa.
- Manual da cozinha.
- Manual do delivery.
- Politica de privacidade.
- Termos de uso.
- Politica de cookies.
- Matriz LGPD.
- Contrato SaaS.
- Proposta comercial.

---

## 31. Referencias Tecnicas Consultadas

- Next.js App Router e Route Handlers: documentacao oficial Next.js.
- PostgreSQL Row-Level Security: documentacao oficial PostgreSQL.
- Cloudflare WAF, proxy DNS e seguranca de aplicacoes: documentacao oficial Cloudflare.
- n8n Webhooks e automacoes: documentacao oficial n8n.
- Chatwoot plataforma open-source de atendimento: documentacao/site oficial Chatwoot.
- PagBank APIs e PlugPag: documentacao oficial PagBank.
- Stone TEF/POS: documentacao oficial Stone/TEF.
- GitHub Spec Kit e Spec-Driven Development: documentacao oficial GitHub.
- TDD: referencias IBM/Martin Fowler.

---

## 32. Conclusao

O projeto e tecnicamente viavel e possui forte potencial comercial como SaaS para hamburguerias, lanchonetes e operacoes de delivery. O diferencial esta na combinacao de cardapio online, atendimento local, delivery, cozinha, impressao, financeiro completo, automacoes, Chatwoot, n8n, LGPD e arquitetura preparada para multiempresas e filiais.

A recomendacao e iniciar por um MVP operacional com cardapio, pedidos, cozinha, delivery, impressao e caixa basico, ja aplicando responsividade com `100dvh`, evoluindo depois para financeiro completo, TEF/POS, automacoes avancadas e recursos comerciais SaaS.


---

# Anexo Visual - Layouts do Projeto

A imagem abaixo apresenta uma visão consolidada dos principais layouts previstos para o APP WEB SaaS de Hamburgueria e Delivery, incluindo site responsivo, cardápio online, dashboard, delivery, atendimento local, cozinha/KDS, financeiro, impressoras, clientes, Chatwoot e configurações multiempresa/multifilial.

![Layouts do Projeto - APP WEB Hamburgueria e Delivery SaaS](a_clean_high_detail_ui_ux_mockup_collage_dashbo.png)

## Telas representadas no anexo

- Site público responsivo da hamburgueria.
- Cardápio online com carrinho e checkout.
- Dashboard administrativo completo.
- Painel de pedidos delivery.
- Mapa e logística de entregas.
- Painel de atendimento local/balcão.
- Painel de cozinha/KDS para produção.
- Módulo financeiro com receitas, despesas e fluxo de caixa.
- Integração com máquinas de cartão.
- Configuração de impressoras não fiscais e A4.
- Cadastro de clientes.
- Chatwoot para atendimento omnichannel.
- Configurações de empresas, filiais, usuários e permissões.

