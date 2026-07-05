"use client";

import { useEffect, useState } from "react";
import {
  fetchBillingPlans,
  fetchBillingSubscription,
  fetchPaymentsStatus,
  formatBRL,
  startBillingCheckout,
  type BillingSubscription,
  type PaymentsStatus,
} from "@/lib/api";

export default function BillingPage() {
  const [sub, setSub] = useState<BillingSubscription | null>(null);
  const [plans, setPlans] = useState<{ code: string; name: string; price_cents: number }[]>([]);
  const [payStatus, setPayStatus] = useState<PaymentsStatus | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchBillingSubscription(), fetchBillingPlans(), fetchPaymentsStatus()])
      .then(([s, p, ps]) => {
        setSub(s);
        setPlans(p);
        setPayStatus(ps);
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : "Erro ao carregar assinatura"))
      .finally(() => setLoading(false));
  }, []);

  async function upgrade(planCode: string) {
    setMessage("");
    try {
      const url = await startBillingCheckout(planCode);
      window.location.href = url;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro no checkout");
    }
  }

  if (loading) return <p className="os-muted">Carregando assinatura…</p>;

  return (
    <div className="os-page">
      <h1>Assinatura SaaS</h1>
      {message && <p className="os-hint">{message}</p>}

      {payStatus && !payStatus.saasBilling && (
        <section className="os-panel">
          <p className="os-hint">
            Cobrança Stripe será ativada na entrega do produto. Seu trial/plano atual continua visível abaixo.
          </p>
        </section>
      )}

      {sub && (
        <section className="os-panel">
          <p>
            Status: <strong>{sub.status}</strong>
          </p>
          {sub.plan && (
            <p>
              Plano atual: {sub.plan.name} ({formatBRL(sub.plan.priceCents)}/mês)
            </p>
          )}
          {sub.trialEndsAt && sub.status === "trialing" && (
            <p className="os-hint">Trial até {new Date(sub.trialEndsAt).toLocaleDateString("pt-BR")}</p>
          )}
          {sub.status === "past_due" && (
            <p className="os-hint">Pagamento pendente — regularize para evitar restrições.</p>
          )}
        </section>
      )}

      <section className="os-panel">
        <h2>Planos disponíveis</h2>
        <ul className="billing-plans">
          {plans.map((p) => (
            <li key={p.code}>
              <strong>{p.name}</strong> — {formatBRL(p.price_cents)}/mês
              <button
                type="button"
                className="os-btn-primary"
                onClick={() => upgrade(p.code)}
                disabled={!payStatus?.saasBilling}
              >
                {payStatus?.saasBilling ? "Assinar" : "Em breve"}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
