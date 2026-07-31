export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <h1 className="text-3xl font-semibold">Política de Privacidade</h1>
      <p className="text-sm opacity-70">Inova Gastro 360 — inovagastro360.inovatitech.com.br</p>
      <p>
        Esta política descreve como a Inova TI Tecnologia da Informação trata dados pessoais no
        SaaS Inova Gastro 360, em conformidade com a LGPD (Lei 13.709/2018).
      </p>
      <h2 className="text-xl font-medium">Dados coletados</h2>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>Dados de conta (nome, e-mail, perfil de acesso)</li>
        <li>Dados de pedidos delivery (nome, telefone, endereço quando informado)</li>
        <li>Registros de consentimento de cookies</li>
        <li>Logs técnicos de segurança e auditoria</li>
      </ul>
      <h2 className="text-xl font-medium">Finalidades</h2>
      <p className="text-sm">
        Operação do cardápio e pedidos, autenticação, cobrança SaaS, suporte, cumprimento legal e
        melhoria do serviço com analytics apenas mediante opt-in.
      </p>
      <h2 className="text-xl font-medium">Direitos do titular</h2>
      <p className="text-sm">
        Você pode solicitar exportação dos seus dados e exercício do direito ao esquecimento pelo
        administrador do tenant ou contato{" "}
        <a className="underline" href="mailto:privacidade@inovatitech.com.br">
          privacidade@inovatitech.com.br
        </a>
        .
      </p>
      <p className="text-sm">
        <a className="underline" href="/termos">
          Termos de uso
        </a>
      </p>
    </main>
  );
}
