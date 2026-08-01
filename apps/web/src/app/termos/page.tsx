import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso — Inova Gastro 360",
};

export default function TermosPage() {
  return (
    <main className="legal-page">
      <h1>Termos de Uso</h1>
      <p className="legal-page-eyebrow">Inova Gastro 360 — inovagastro360.inovatitech.com.br</p>
      <p>
        Ao utilizar a plataforma Inova Gastro 360, o cliente contratante e seus usuários concordam
        com estes termos, com o plano de assinatura vigente e com a{" "}
        <a href="/privacidade">política de privacidade</a>.
      </p>

      <h2>Descrição do serviço</h2>
      <p>
        O Inova Gastro 360 é um SaaS multitenant de gestão para hamburguerias e delivery, cobrindo
        cardápio digital, pedidos, painéis operacionais, impressão de comandas e módulo financeiro,
        fornecido pela Inova TI Tecnologia da Informação.
      </p>

      <h2>Cadastro e responsabilidades</h2>
      <p>
        O cliente contratante é responsável por manter a veracidade dos dados cadastrados, pela
        guarda de suas credenciais de acesso e pelo uso adequado da plataforma por seus usuários e
        colaboradores.
      </p>

      <h2>Uso aceitável</h2>
      <p>
        É proibido uso ilícito da plataforma, tentativa de acesso não autorizado ou vazamento de
        dados entre tenants, engenharia reversa maliciosa, sobrecarga deliberada da infraestrutura
        ou qualquer atividade que comprometa a segurança e a disponibilidade do serviço.
      </p>

      <h2>Assinatura e cobrança</h2>
      <p>
        O acesso às funcionalidades pagas depende de assinatura ativa. Períodos de trial, planos e
        formas de pagamento são detalhados no momento da contratação e podem ser consultados no
        painel de assinatura.
      </p>

      <h2>Disponibilidade</h2>
      <p>
        Envidamos esforços razoáveis para manter a disponibilidade contínua do serviço; janelas de
        manutenção programada podem ocorrer, sempre com aviso prévio quando possível.
      </p>

      <h2>Proteção de dados</h2>
      <p>
        O tratamento de dados pessoais realizado pela plataforma segue a LGPD e está detalhado na{" "}
        <a href="/privacidade">política de privacidade</a>, incluindo os mecanismos de
        consentimento, exportação de dados e direito ao esquecimento.
      </p>

      <p className="legal-page-back">
        Consulte também a <a href="/privacidade">política de privacidade</a>.
      </p>
    </main>
  );
}
