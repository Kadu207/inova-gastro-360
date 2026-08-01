import { healthHandler, jsonResponse } from "./lib";
import { handleLogin, handleMe, handleRefresh, handleLogout } from "./routes/auth";
import { handleCreateTenant } from "./routes/admin-tenants";
import { handleCatalogCategories, handleCatalogProducts } from "./routes/catalog";
import {
  handleAdminCreateCategory,
  handleAdminCreateProduct,
  handleAdminDeleteCategory,
  handleAdminDeleteProduct,
  handleAdminListCategories,
  handleAdminListProducts,
  handleAdminUpdateCategory,
  handleAdminUpdateProduct,
} from "./routes/catalog-admin";
import {
  handleAdminPresignProductImage,
  handleAdminUploadProductImage,
} from "./routes/catalog-upload";
import { handleServeCatalogMedia } from "./routes/catalog-media";
import {
  handleCreateOrder,
  handleListOrders,
  handleUpdateOrderStatus,
  handleGetOrder,
} from "./routes/orders";
import { handleListPrintJobs, handleUpdatePrintJobStatus } from "./routes/print-jobs";
import {
  handleApplyOrderPayment,
  handleApplySubscriptionPayment,
} from "./routes/internal-payments";
import {
  handlePayOrder,
  handleGetOrderPayment,
  handlePayInPerson,
} from "./routes/order-payments";
import {
  handleGetSubscription,
  handleListPlans,
  handleBillingCheckout,
  handleBillingPortal,
} from "./routes/billing";
import {
  handleOpenCash,
  handleCloseCash,
  handleCashSangria,
  handleCashSuprimento,
  handleGetOpenCash,
  handleCreatePayable,
  handleListPayables,
  handleGetPayable,
  handlePayPayable,
  handleCreateReceivable,
  handleListReceivables,
  handleGetReceivable,
  handleReceiveReceivable,
  handleFinanceDre,
  handleFinanceExport,
} from "./routes/finance";
import { handlePaymentsStatus } from "./routes/payments-status";
import { requireAuth } from "./middleware/auth";
import { isOutboxFlushAuthorized } from "./lib/outbox-dispatch";
import { flushPendingOutbox } from "./lib/outbox-replay";
import { checkStackHealth } from "./routes/health-stack";
import { ConfigError, isOriginAllowed, parseAllowedOrigins } from "./lib/config";

import type { GatewayEnv } from "./types/env";

export interface Env extends GatewayEnv {}

const CORS_METHODS = "GET, POST, PATCH, DELETE, PUT, OPTIONS";
const CORS_ALLOW_HEADERS = "Content-Type, Authorization, Idempotency-Key, X-Requested-With";

/** Aplica cabeçalhos CORS ecoando apenas origens permitidas. */
function applyCors(response: Response, request: Request, env: Env): Response {
  const headers = new Headers(response.headers);
  const origin = request.headers.get("origin");
  if (origin && isOriginAllowed(origin, parseAllowedOrigins(env))) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "origin");
    headers.set("access-control-allow-methods", CORS_METHODS);
    headers.set("access-control-allow-headers", CORS_ALLOW_HEADERS);
  }
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (err) {
      if (err instanceof ConfigError) {
        console.error("server_misconfigured", err.message);
        return applyCors(jsonResponse({ error: "server_misconfigured" }, 500), request, env);
      }
      console.error("unhandled_error", err);
      return applyCors(jsonResponse({ error: "internal_error" }, 500), request, env);
    }
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(flushPendingOutbox(env));
  },
};

async function route(request: Request, env: Env): Promise<Response> {
  const withCors = (response: Response): Response => applyCors(response, request, env);
  {
    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/health" || path === "/api/health") {
      return withCors(healthHandler("api-gateway"));
    }

    if (path === "/health/stack" && request.method === "GET") {
      const stack = await checkStackHealth(env);
      return withCors(jsonResponse(stack, stack.status === "ok" ? 200 : 503));
    }

    if (path === "/" && request.method === "GET") {
      return withCors(
        jsonResponse({
          service: "api-gateway",
          app: "Inova Gastro 360",
          health: "/health",
          api: "/api/v1/status",
          docs: "https://github.com/Kadu207/inova-gastro-360",
        }),
      );
    }

    if (path === "/api/v1/status" && request.method === "GET") {
      return withCors(
        jsonResponse({
          app: "Inova Gastro 360",
          layer: "api-gateway",
          environment: env.ENVIRONMENT ?? "development",
          onda: 2,
        }),
      );
    }

    if (path === "/api/v1/auth/login" && request.method === "POST") {
      return withCors(await handleLogin(request, env));
    }

    if (path === "/api/v1/auth/me" && request.method === "GET") {
      return withCors(await handleMe(request, env));
    }

    if (path === "/api/v1/auth/refresh" && request.method === "POST") {
      return withCors(await handleRefresh(request, env));
    }

    if (path === "/api/v1/auth/logout" && request.method === "POST") {
      return withCors(await handleLogout(request, env));
    }

    if (path === "/api/v1/admin/tenants" && request.method === "POST") {
      const auth = await requireAuth(request, env);
      if (!auth.ok) return withCors(auth.response);
      return withCors(await handleCreateTenant(request, env, auth.user));
    }

    if (path.startsWith("/media/") && (request.method === "GET" || request.method === "HEAD")) {
      return handleServeCatalogMedia(request, env);
    }

    const branchMatch = path.match(/^\/api\/v1\/branches\/([^/]+)\/catalog\/(categories|products)$/);
    if (branchMatch && request.method === "GET") {
      const branchId = branchMatch[1];
      const type = branchMatch[2];
      if (type === "categories") return withCors(await handleCatalogCategories(request, env, branchId));
      return withCors(await handleCatalogProducts(request, env, branchId));
    }

    const adminCategoriesMatch = path.match(/^\/api\/v1\/branches\/([^/]+)\/catalog\/admin\/categories(?:\/([^/]+))?$/);
    if (adminCategoriesMatch) {
      const auth = await requireAuth(request, env);
      if (!auth.ok) return withCors(auth.response);
      const branchId = adminCategoriesMatch[1];
      const categoryId = adminCategoriesMatch[2];

      if (!categoryId && request.method === "GET") {
        return withCors(await handleAdminListCategories(request, env, auth.user, branchId));
      }
      if (!categoryId && request.method === "POST") {
        return withCors(await handleAdminCreateCategory(request, env, auth.user, branchId));
      }
      if (categoryId && request.method === "PATCH") {
        return withCors(await handleAdminUpdateCategory(request, env, auth.user, branchId, categoryId));
      }
      if (categoryId && request.method === "DELETE") {
        return withCors(await handleAdminDeleteCategory(env, auth.user, branchId, categoryId));
      }
    }

    const adminPresignMatch = path.match(
      /^\/api\/v1\/branches\/([^/]+)\/catalog\/admin\/products\/([^/]+)\/image\/presign$/,
    );
    if (adminPresignMatch && request.method === "POST") {
      const auth = await requireAuth(request, env);
      if (!auth.ok) return withCors(auth.response);
      return withCors(
        await handleAdminPresignProductImage(
          request,
          env,
          auth.user,
          adminPresignMatch[1],
          adminPresignMatch[2],
        ),
      );
    }

    const adminImageMatch = path.match(
      /^\/api\/v1\/branches\/([^/]+)\/catalog\/admin\/products\/([^/]+)\/image$/,
    );
    if (adminImageMatch && request.method === "POST") {
      const auth = await requireAuth(request, env);
      if (!auth.ok) return withCors(auth.response);
      return withCors(
        await handleAdminUploadProductImage(
          request,
          env,
          auth.user,
          adminImageMatch[1],
          adminImageMatch[2],
        ),
      );
    }

    const adminProductsMatch = path.match(
      /^\/api\/v1\/branches\/([^/]+)\/catalog\/admin\/products(?:\/([^/]+))?$/,
    );
    if (adminProductsMatch) {
      const auth = await requireAuth(request, env);
      if (!auth.ok) return withCors(auth.response);
      const branchId = adminProductsMatch[1];
      const productId = adminProductsMatch[2];

      if (!productId && request.method === "GET") {
        return withCors(await handleAdminListProducts(request, env, auth.user, branchId));
      }
      if (!productId && request.method === "POST") {
        return withCors(await handleAdminCreateProduct(request, env, auth.user, branchId));
      }
      if (productId && request.method === "PATCH") {
        return withCors(await handleAdminUpdateProduct(request, env, auth.user, branchId, productId));
      }
      if (productId && request.method === "DELETE") {
        return withCors(await handleAdminDeleteProduct(env, auth.user, branchId, productId));
      }
    }

    if (path === "/api/v1/billing/plans" && request.method === "GET") {
      return withCors(await handleListPlans(request, env));
    }

    if (path === "/api/v1/payments/status" && request.method === "GET") {
      return withCors(await handlePaymentsStatus(request, env));
    }

    if (path.startsWith("/api/v1/billing")) {
      const auth = await requireAuth(request, env);
      if (!auth.ok) return withCors(auth.response);

      if (path === "/api/v1/billing/subscription" && request.method === "GET") {
        return withCors(await handleGetSubscription(request, env, auth.user));
      }
      if (path === "/api/v1/billing/checkout" && request.method === "POST") {
        return withCors(await handleBillingCheckout(request, env, auth.user));
      }
      if (path === "/api/v1/billing/portal" && request.method === "POST") {
        return withCors(await handleBillingPortal(request, env, auth.user));
      }
    }

    if (path.startsWith("/api/v1/finance")) {
      const auth = await requireAuth(request, env);
      if (!auth.ok) return withCors(auth.response);

      if (path === "/api/v1/finance/cash/open" && request.method === "POST") {
        return withCors(await handleOpenCash(request, env, auth.user));
      }
      const cashBranch = path.match(/^\/api\/v1\/finance\/cash\/branch\/([^/]+)$/);
      if (cashBranch && request.method === "GET") {
        return withCors(await handleGetOpenCash(request, env, auth.user, cashBranch[1]));
      }
      const cashClose = path.match(/^\/api\/v1\/finance\/cash\/([^/]+)\/close$/);
      if (cashClose && request.method === "POST") {
        return withCors(await handleCloseCash(request, env, auth.user, cashClose[1]));
      }
      const cashSangria = path.match(/^\/api\/v1\/finance\/cash\/([^/]+)\/sangria$/);
      if (cashSangria && request.method === "POST") {
        return withCors(await handleCashSangria(request, env, auth.user, cashSangria[1]));
      }
      const cashSuprimento = path.match(/^\/api\/v1\/finance\/cash\/([^/]+)\/suprimento$/);
      if (cashSuprimento && request.method === "POST") {
        return withCors(await handleCashSuprimento(request, env, auth.user, cashSuprimento[1]));
      }
      if (path === "/api/v1/finance/payables" && request.method === "GET") {
        return withCors(await handleListPayables(request, env, auth.user));
      }
      if (path === "/api/v1/finance/payables" && request.method === "POST") {
        return withCors(await handleCreatePayable(request, env, auth.user));
      }
      const payablePayMatch = path.match(/^\/api\/v1\/finance\/payables\/([^/]+)\/pay$/);
      if (payablePayMatch && request.method === "POST") {
        return withCors(await handlePayPayable(request, env, auth.user, payablePayMatch[1]));
      }
      const payableGetMatch = path.match(/^\/api\/v1\/finance\/payables\/([^/]+)$/);
      if (payableGetMatch && request.method === "GET") {
        return withCors(await handleGetPayable(request, env, auth.user, payableGetMatch[1]));
      }
      if (path === "/api/v1/finance/receivables" && request.method === "GET") {
        return withCors(await handleListReceivables(request, env, auth.user));
      }
      if (path === "/api/v1/finance/receivables" && request.method === "POST") {
        return withCors(await handleCreateReceivable(request, env, auth.user));
      }
      const receivableReceiveMatch = path.match(/^\/api\/v1\/finance\/receivables\/([^/]+)\/receive$/);
      if (receivableReceiveMatch && request.method === "POST") {
        return withCors(await handleReceiveReceivable(request, env, auth.user, receivableReceiveMatch[1]));
      }
      const receivableGetMatch = path.match(/^\/api\/v1\/finance\/receivables\/([^/]+)$/);
      if (receivableGetMatch && request.method === "GET") {
        return withCors(await handleGetReceivable(request, env, auth.user, receivableGetMatch[1]));
      }
      if (path === "/api/v1/finance/dre" && request.method === "GET") {
        return withCors(await handleFinanceDre(request, env, auth.user));
      }
      if (path === "/api/v1/finance/export" && request.method === "GET") {
        return withCors(await handleFinanceExport(request, env, auth.user));
      }
    }

    const branchOrderPayMatch = path.match(
      /^\/api\/v1\/branches\/([^/]+)\/orders\/([^/]+)\/pay$/,
    );
    if (branchOrderPayMatch && request.method === "POST") {
      return withCors(
        await handlePayOrder(request, env, branchOrderPayMatch[1], branchOrderPayMatch[2]),
      );
    }

    const branchOrderPaymentMatch = path.match(
      /^\/api\/v1\/branches\/([^/]+)\/orders\/([^/]+)\/payment$/,
    );
    if (branchOrderPaymentMatch && request.method === "GET") {
      return withCors(
        await handleGetOrderPayment(
          request,
          env,
          branchOrderPaymentMatch[1],
          branchOrderPaymentMatch[2],
        ),
      );
    }

    const branchPayInPersonMatch = path.match(
      /^\/api\/v1\/branches\/([^/]+)\/orders\/([^/]+)\/pay-in-person$/,
    );
    if (branchPayInPersonMatch && request.method === "POST") {
      return withCors(
        await handlePayInPerson(
          request,
          env,
          branchPayInPersonMatch[1],
          branchPayInPersonMatch[2],
        ),
      );
    }

    if (path === "/api/v1/orders" && request.method === "GET") {
      const auth = await requireAuth(request, env);
      if (!auth.ok) return withCors(auth.response);
      return withCors(await handleListOrders(request, env, auth.user));
    }

    if (path === "/api/v1/orders" && request.method === "POST") {
      const auth = await requireAuth(request, env);
      const user = auth.ok ? auth.user : undefined;
      return withCors(await handleCreateOrder(request, env, user));
    }

    const orderMatch = path.match(/^\/api\/v1\/orders\/([^/]+)(?:\/status)?$/);
    if (orderMatch) {
      const orderId = orderMatch[1];
      const auth = await requireAuth(request, env);
      if (!auth.ok) return withCors(auth.response);

      if (path.endsWith("/status") && request.method === "PATCH") {
        return withCors(await handleUpdateOrderStatus(request, env, auth.user, orderId));
      }
      if (request.method === "GET") {
        return withCors(await handleGetOrder(request, env, auth.user, orderId));
      }
    }

    if (path === "/api/v1/print-jobs" && request.method === "GET") {
      const auth = await requireAuth(request, env);
      if (!auth.ok) return withCors(auth.response);
      return withCors(await handleListPrintJobs(request, env, auth.user));
    }

    const printJobMatch = path.match(/^\/api\/v1\/print-jobs\/([^/]+)$/);
    if (printJobMatch && request.method === "PATCH") {
      const auth = await requireAuth(request, env);
      if (!auth.ok) return withCors(auth.response);
      return withCors(await handleUpdatePrintJobStatus(request, env, auth.user, printJobMatch[1]));
    }

    if (path === "/internal/outbox/flush" && request.method === "POST") {
      if (!isOutboxFlushAuthorized(request, env)) {
        return withCors(jsonResponse({ error: "forbidden" }, 403));
      }
      const result = await flushPendingOutbox(env);
      return withCors(jsonResponse({ ok: true, ...result }));
    }

    if (path === "/internal/payments/apply-order" && request.method === "POST") {
      return withCors(await handleApplyOrderPayment(request, env));
    }

    if (path === "/internal/payments/apply-subscription" && request.method === "POST") {
      return withCors(await handleApplySubscriptionPayment(request, env));
    }

    return withCors(jsonResponse({ error: "not_found", path }, 404));
  }
}
