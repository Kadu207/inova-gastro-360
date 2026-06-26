"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE, DEMO_BRANCH_ID, getToken } from "@/lib/api";

interface PrintJob {
  id: string;
  sector: string;
  status: string;
  payload: { orderNumber?: number | string };
  created_at: string;
}

export default function ImpressaoPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({
        branchId: DEMO_BRANCH_ID,
        status: "failed",
      });
      const res = await fetch(`${API_BASE}/api/v1/print-jobs?${q}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setJobs(data.printJobs ?? []);
    } catch {
      setMessage("Não foi possível carregar a fila de impressão.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function requeue(jobId: string) {
    const token = getToken();
    if (!token) return;
    setMessage("");
    const res = await fetch(`${API_BASE}/api/v1/print-jobs/${jobId}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ status: "pending" }),
    });
    if (res.ok) {
      setMessage("Job reenfileirado — o print-agent irá processar.");
      load();
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Erro ao reenfileirar");
    }
  }

  return (
    <div className="os-panel">
      <h2>Impressão — jobs com falha</h2>
      <p className="os-muted">
        Reenfileira jobs <code>failed</code> para <code>pending</code>. O print-agent na cozinha faz o poll
        automaticamente.
      </p>
      {message && <p className="hint">{message}</p>}
      {loading && <p className="os-muted">Carregando…</p>}
      {!loading && jobs.length === 0 && (
        <p className="os-muted">Nenhum job com falha nesta filial.</p>
      )}
      <ul className="os-print-failed-list">
        {jobs.map((job) => (
          <li key={job.id} className="os-print-failed-row">
            <div>
              <strong>Pedido #{job.payload?.orderNumber ?? "?"}</strong>
              <span className="os-badge-status failed">{job.sector}</span>
            </div>
            <button type="button" className="os-btn-outline" onClick={() => requeue(job.id)}>
              Reimprimir
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
