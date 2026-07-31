export default function TermosPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <h1 className="text-3xl font-semibold">Termos de Uso</h1>
      <p className="text-sm opacity-70">Inova Gastro 360</p>
      <p>
        Ao utilizar a plataforma Inova Gastro 360, o cliente contratante e seus usuários concordam
        com estes termos, o plano de assinatura vigente e a política de privacidade.
      </p>
      <h2 className="text-xl font-medium">Uso aceitável</h2>
      <p className="text-sm">
        É proibido uso ilícito, tentativa de vazamento cross-tenant, engenharia reversiva maliciosa
        ou sobrecarga deliberada da infraestrutura.
      </p>
      <h2 className="text-xl font-medium">Disponibilidade</h2>
      <p className="text-sm">
        Envidamos esforços razoáveis de disponibilidade; manutenção programada pode ocorrer com
        aviso prévio quando possível.
      </p>
      <p className="text-sm">
        <a className="underline" href="/privacidade">
          Política de privacidade
        </a>
      </p>
    </main>
  );
}
