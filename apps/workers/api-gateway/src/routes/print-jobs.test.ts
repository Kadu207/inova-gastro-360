import { describe, it, expect } from "vitest";
import { handleListPrintJobs, handleUpdatePrintJobStatus } from "./print-jobs";
import { testEnv, DEMO_BRANCH_ID } from "../test/helpers";

describe("print-jobs handlers — validação (sem DB)", () => {
  const env = testEnv();
  const user = {
    sub: "user-1",
    tid: "tenant-1",
    email: "a@b.com",
    role: "admin_cliente",
    branches: [],
  };

  it("list exige branchId", async () => {
    const res = await handleListPrintJobs(new Request("http://test/api/v1/print-jobs"), env, user);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("branch_id_required");
  });

  it("list rejeita status inválido", async () => {
    const res = await handleListPrintJobs(
      new Request(`http://test/api/v1/print-jobs?branchId=${DEMO_BRANCH_ID}&status=unknown`),
      env,
      user,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_status");
  });

  it("update rejeita status inválido", async () => {
    const res = await handleUpdatePrintJobStatus(
      new Request("http://test/api/v1/print-jobs/x", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      }),
      env,
      user,
      DEMO_BRANCH_ID,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("validation_error");
  });
});
