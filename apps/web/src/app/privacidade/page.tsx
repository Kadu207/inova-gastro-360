import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — Inova Gastro 360",
};

export default function PrivacidadePage() {
  return (
    <main className="legal-page">
      <h1>Política de Privacidade</h1>
      <p className="legal-page-eyebrow">Inova Gastro 360 — inovagastro360.inovatitech.com.br</p>
      <p>
        Esta política descreve como a Inova TI Tecnologia da Informação trata dados pessoais no
        SaaS Inova Gastro 360, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei
        13.709/2018).
      </p>

      <h2>Dados coletados</h2>
      <ul>
        <li>Dados de conta: nome, e-mail e perfil de acesso dos usuários do estabelecimento</li>
        <li>Dados de pedidos: nome, telefone e, quando informado, endereço do cliente final</li>
        <li>Preferências de cookies e registros de consentimento</li>
        <li>Logs técnicos de segurança, auditoria e prevenção a fraude</li>
      </ul>

      <h2>Finalidades do tratamento</h2>
      <p>
        Os dados são utilizados para operação do cardápio digital e dos pedidos, autenticação e
        controle de acesso, cobrança da assinatura SaaS, suporte ao cliente, cumprimento de
        obrigações legais e melhoria contínua do produto — sendo que métricas de analytics e
        comunicações de marketing só ocorrem mediante consentimento explícito (opt-in).
      </p>

      <h2>Compartilhamento</h2>
      <p>
        Dados podem ser compartilhados com processadores de pagamento (ex.: Asaas, Stripe) e
        provedores de infraestrutura (Cloudflare, hospedagem) estritamente para viabilizar o
        serviço, sempre sob obrigações contratuais de confidencialidade e segurança.
      </p>

      <h2>Retenção</h2>
      <p>
        Os dados são mantidos pelo tempo necessário às finalidades descritas e às obrigações
        legais e fiscais aplicáveis, sendo eliminados ou anonimizados após esse período ou mediante
        solicitação de exclusão validada.
      </p>

      <h2>Direitos do titular</h2>
      <p>
        Nos termos da LGPD, você pode solicitar confirmação de tratamento, acesso, correção,
        portabilidade, anonimização e eliminação dos seus dados (direito ao esquecimento). A
        exportação dos seus dados pode ser feita diretamente pelo painel administrativo; para
        demais solicitações, entre em contato com o administrador do seu estabelecimento ou com{" "}
        <a href="mailto:privacidade@inovatitech.com.br">privacidade@inovatitech.com.br</a>.
      </p>

      <h2>Cookies</h2>
      <p>
        Utilizamos cookies essenciais (sempre ativos, necessários ao funcionamento do site) e,
        mediante consentimento, cookies de analytics e marketing. Você pode revisar suas
        preferências a qualquer momento pelo banner de cookies exibido no rodapé do site.
      </p>

      <p className="legal-page-back">
        Consulte também os <a href="/termos">termos de uso</a>.
      </p>
    </main>
  );
}
