import { BranchRealtimeHub, healthHandler } from "./lib";

export interface Env {
  BRANCH_HUB: DurableObjectNamespace;
}

export { BranchRealtimeHub };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return healthHandler("realtime-hub");
    }

    const branchId = url.searchParams.get("branchId") ?? "default";
    const id = env.BRANCH_HUB.idFromName(branchId);
    const stub = env.BRANCH_HUB.get(id);

    const targetPath = url.pathname === "/ws" ? "/ws" : url.pathname;
    const targetUrl = new URL(request.url);
    targetUrl.pathname = targetPath;

    return stub.fetch(new Request(targetUrl.toString(), request));
  },
};
