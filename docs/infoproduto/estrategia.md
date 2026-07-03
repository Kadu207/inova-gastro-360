# Estratégia de Infoproduto — Inova Gastro 360

> Documento de trabalho do fundador. Última atualização: julho/2026.
> Decisão já tomada: sequência **D → A → B** (build in public → curso/mentoria → boilerplate).

---

## 1. Visão: os dois ativos

O projeto Inova Gastro 360 gera dois ativos vendáveis, e eles não competem entre si:

| Ativo | O que é | Comprador | Monetização |
|---|---|---|---|
| **O software** | SaaS multitenant de hamburgueria/delivery rodando em produção (inovagastro360.inovatitech.com.br) | Restaurantes e hamburguerias BR | Assinatura mensal (negócio SaaS clássico) |
| **O método** | O processo documentado de construir esse SaaS com SDD + Spec Kit + agentes de IA no Cursor: 15 specs, constitution, memory-bank, 14 skills, pipeline de agentes | Devs BR que querem construir SaaS com IA | Conteúdo → curso/mentoria → boilerplate |

O insight central: **o método é vendável antes do software ser lucrativo.** Cada spec escrita, cada bug encontrado, cada decisão de arquitetura já é matéria-prima de conteúdo. O software valida o método; o método financia o software.

O que **não** é o posicionamento: "guru de IA", "renda passiva com SaaS", "faça um app em 1 dia". O posicionamento é de **operador**: alguém construindo um produto real, em produção, com clientes reais, mostrando o processo com defeitos e tudo.

---

## 2. A sequência D → A → B

### Rota D — Build in public (AGORA)

Documentar publicamente a evolução do projeto para construir audiência de devs BR interessados em construir SaaS com agentes de IA.

- **Canal primário:** LinkedIn + X (posts) e uma newsletter (captura de e-mail).
- **Frequência:** 3 conteúdos/semana durante 12 semanas (ver `calendario-conteudo.md`).
- **Primeiro post:** roteiro em [`primeiro-post-build-in-public.md`](primeiro-post-build-in-public.md).
- **Fonte de pauta:** exclusivamente artefatos reais do repo — specs, incidentes, decisões de arquitetura, código.
- **Custo:** tempo (4–6h/semana). Nenhum investimento financeiro obrigatório.

**Critério de passagem D → A:** 300+ e-mails na lista **ou** 1.000+ seguidores no canal primário, **e** pelo menos 10 respostas qualificadas (pessoas perguntando "como você faz X?" ou pedindo para aprender o método). Sem esses números, não há para quem vender — continuar em D.

### Rota A — Curso/Mentoria "SaaS Multitenant com Agentes de IA" (COM AUDIÊNCIA)

Produto educacional usando o Inova Gastro 360 como caso real do início ao fim. Ementa completa em `ementa-curso.md`.

- **Formato de estreia:** mentoria em grupo ao vivo (turma beta, 8–15 pessoas), não curso gravado. Motivo: valida o currículo com risco baixo, gera depoimentos e as gravações viram o curso evergreen depois.
- **Ticket BR:** curso gravado R$ 497–1.997; mentoria em grupo R$ 2.000–5.000.
- **Plataformas candidatas:** Hotmart, Kiwify ou área de membros própria. Decisão adiada até a turma beta — para a beta, checkout simples (Kiwify ou link de pagamento) + comunidade (WhatsApp/Discord) bastam.

**Critério de passagem A → B:** turma beta concluída com NPS/depoimentos positivos, curso gravado publicado, **e** faxina de segurança P0/P1 (spec 015) concluída e auditada. O boilerplate expõe o código a estranhos pagantes; não pode ir a mercado com falhas conhecidas.

### Rota B — Boilerplate premium (DEPOIS)

Venda do código-base como starter kit (modelo ShipFast/Supastarter), US$ 199–349, mercado internacional.

- **Pré-requisito inegociável:** faxina de segurança P0/P1 (spec 015) concluída — RLS validado, segredos fora do repo, rate limit em auth, uploads validados.
- **Diferencial vs concorrentes:** não é só código — é código + o sistema de specs + skills de agente que o mantém. Nenhum boilerplate concorrente entrega o método de evolução com IA.
- **Sinergia:** alunos da Rota A são os primeiros compradores e afiliados naturais da Rota B.

---

## 3. Plano de 90 dias (3 fases de 4 semanas)

### Fase 1 — Faxina + Fundação (semanas 1–4)

| Frente | Ações |
|---|---|
| Segurança | Executar spec 015 (P0/P1): validar RLS em todas as tabelas, remover segredos do repo (ex.: `docs/Senhas - produção.txt` — mover para cofre), rate limit em auth |
| Infra de conteúdo | Escolher canal primário (LinkedIn recomendado para BR), criar landing de captura de e-mail (pode ser uma rota no próprio Next.js), configurar newsletter |
| Conteúdo | Iniciar cadência 3x/semana seguindo `calendario-conteudo.md` (semanas 1–4) |
| Prova | Gravar demo de 2 min do produto em produção para fixar no perfil |

**Meta ao fim da fase:** 12 conteúdos publicados, landing no ar, 50–100 e-mails, spec 015 em andamento avançado.

### Fase 2 — Audiência + Oferta (semanas 5–8)

| Frente | Ações |
|---|---|
| Conteúdo | Manter cadência; dobrar nos formatos que performaram na Fase 1 (medir: salvamentos, respostas, cliques na landing) |
| Oferta | Rascunhar a página de venda da mentoria beta usando `ementa-curso.md`; definir preço da beta (recomendação: R$ 1.500–2.500, abaixo do teto para compensar o risco do aluno pioneiro) |
| Validação | 10–15 conversas 1:1 com seguidores engajados: o que querem aprender, quanto pagariam, qual formato preferem |
| Lista | Sequência de e-mails de boas-vindas (3 e-mails: história do projeto, o método, o que vem por aí) |

**Meta ao fim da fase:** 150–250 e-mails, 500+ seguidores, oferta escrita e validada em conversas, lista de espera aberta.

### Fase 3 — Lançamento semente (semanas 9–12)

| Frente | Ações |
|---|---|
| Aquecimento | Semanas 9–10: conteúdos que expõem o método completo e anunciam a mentoria (ver calendário) |
| Lançamento | Semana 11: abrir carrinho para a lista de espera primeiro (48h de exclusividade), depois público. Janela curta: 5–7 dias |
| Fechamento | Semana 12: encerrar vendas, onboarding da turma, primeira sessão ao vivo |

**Meta ao fim da fase:** 8–15 alunos na beta (a R$ 1.500–2.500 ≈ R$ 12k–37k de receita), critério de passagem D→A cumprido.

**Se a meta de audiência não for atingida até a semana 9:** NÃO lançar. Estender a Rota D por mais 4–8 semanas, revisar formatos e canais. Lançar sem audiência é o risco nº 1 (ver seção 6).

---

## 4. Decisões pendentes do fundador

Decisões que precisam de dono e prazo. Nenhuma bloqueia o início da Rota D.

| # | Decisão | Opções | Recomendação | Prazo |
|---|---|---|---|---|
| 1 | Mercado BR vs internacional | (a) BR primeiro; (b) internacional direto; (c) ambos | BR primeiro para Rotas D e A (idioma, ticket, comunidade); internacional só na Rota B (boilerplate em inglês) | Antes da semana 5 |
| 2 | Licença do código para alunos | (a) leitura apenas (repo privado espelhado); (b) licença de uso pessoal/comercial sem redistribuição; (c) sem acesso ao código | (b) com contrato simples — é o maior diferencial da oferta; proibir redistribuição/revenda | Antes da página de venda (semana 6) |
| 3 | Marca pessoal vs marca produto | (a) tudo no nome do fundador; (b) marca "Inova Gastro 360"; (c) híbrido | Híbrido: conteúdo e curso na marca pessoal (pessoas seguem pessoas), produto SaaS mantém marca própria | Antes da semana 2 (define os perfis) |
| 4 | SaaS em paralelo | (a) pausar SaaS e focar em infoproduto; (b) manter ambos | Manter ambos com o SaaS em ritmo reduzido — o SaaS em produção É a prova social do curso; sem ele o método vira teoria | Contínua — revisar a cada fase |

---

## 5. Métricas de validação por fase

| Fase | Métrica primária | Meta | Métricas secundárias |
|---|---|---|---|
| D (semanas 1–4) | E-mails capturados | 50–100 | 12 posts publicados; taxa de resposta/salvamento por post |
| D (semanas 5–8) | E-mails capturados | 150–250 | 500+ seguidores; 10+ conversas 1:1; taxa de abertura da newsletter > 40% |
| D→A (semanas 9–12) | Alunos pagantes na beta | 8–15 | Receita R$ 12k–37k; conversão lista→venda ≥ 3% |
| A (pós-beta) | NPS / depoimentos | ≥ 8 de 10 alunos recomendariam | Conclusão dos entregáveis por módulo ≥ 60% |
| A→B | Curso gravado publicado + spec 015 auditada | Ambos concluídos | Primeiras vendas evergreen sem lançamento |
| B | Vendas do boilerplate | 10 vendas nos primeiros 60 dias | Tickets de suporte por venda < 2 |

Regra geral: **medir demanda antes de produzir.** A ementa só vira aulas gravadas depois que a beta pagou por ela.

---

## 6. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| **Lançar sem audiência** (risco principal) | Alta se houver ansiedade de monetizar | Lançamento fracassa, desmoraliza a oferta e o fundador | Critério de passagem D→A é numérico e inegociável (300 e-mails ou 1.000 seguidores). Sem número, sem carrinho |
| Constância de conteúdo quebra (semana 5–6 é o vale clássico) | Alta | Audiência para de crescer | Calendário com 36 pautas prontas derivadas do repo; produzir em lote (2h, 3 posts); pautas vêm do trabalho que já está sendo feito |
| Vender método sem o SaaS ter tração | Média | Ataque à credibilidade ("ensina o que não fez") | Posicionamento honesto: "estou construindo, mostro o processo" — não "fiquei rico". Demo em produção pública é a âncora de prova |
| Vazamento/insegurança do código ao abrir para alunos | Média | Dano reputacional e legal | Spec 015 antes de qualquer acesso ao código; licença com cláusula de não redistribuição; repo espelhado (não o principal) |
| Conteúdo expõe segredos/dados de clientes | Baixa | Alto (LGPD, segurança) | Checklist antes de publicar: nenhum screenshot com env vars, tokens, dados reais de tenant |
| Fundador vira "criador de conteúdo" e o SaaS morre | Média | Perde o ativo que sustenta a narrativa | Teto de 6h/semana em conteúdo durante a Rota D; SaaS mantém pelo menos 1 spec em andamento |
| Plataforma (Hotmart/Kiwify) morde margem ou trava regras | Baixa | Margem menor | Beta em checkout simples; decisão de plataforma só com volume que justifique área de membros própria |

---

## 7. Resumo executivo

1. **Agora:** build in public 3x/semana com pautas do repo, landing de e-mail no ar, spec 015 em execução.
2. **Gate 1:** 300 e-mails ou 1.000 seguidores → lançar mentoria beta (8–15 alunos, R$ 1.500–2.500).
3. **Gate 2:** beta com depoimentos + segurança auditada → curso evergreen + boilerplate internacional.
