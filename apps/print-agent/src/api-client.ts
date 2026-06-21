import type { PrintAgentConfig } from "./config";

export interface PrintJobRow {
  id: string;
  branch_id: string;
  order_id: string;
  sector: string;
  status: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export class PrintAgentApiClient {
  private accessToken: string | null = null;

  constructor(private readonly config: PrintAgentConfig) {}

  async login(): Promise<void> {
    const res = await fetch(`${this.config.apiBase}/api/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: this.config.email,
        password: this.config.password,
        tenantSlug: this.config.tenantSlug,
      }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(`Login falhou: ${err.error ?? res.status}`);
    }

    const data = (await res.json()) as { accessToken: string };
    this.accessToken = data.accessToken;
  }

  private authHeaders(): HeadersInit {
    if (!this.accessToken) throw new Error("Não autenticado — chame login() primeiro");
    return { authorization: `Bearer ${this.accessToken}` };
  }

  async fetchPendingJobs(): Promise<PrintJobRow[]> {
    const q = new URLSearchParams({
      branchId: this.config.branchId,
      sector: this.config.sector,
      status: "pending",
    });
    const res = await fetch(`${this.config.apiBase}/api/v1/print-jobs?${q}`, {
      headers: this.authHeaders(),
    });

    if (res.status === 401) {
      await this.login();
      return this.fetchPendingJobs();
    }

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(`List print_jobs falhou: ${err.error ?? res.status}`);
    }

    const data = (await res.json()) as { printJobs: PrintJobRow[] };
    return data.printJobs ?? [];
  }

  async markPrinted(jobId: string): Promise<void> {
    const res = await fetch(`${this.config.apiBase}/api/v1/print-jobs/${jobId}`, {
      method: "PATCH",
      headers: { ...this.authHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ status: "printed" }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(`PATCH print_job falhou: ${err.error ?? res.status}`);
    }
  }
}
