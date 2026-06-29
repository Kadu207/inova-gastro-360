import { healthHandler, jsonResponse } from "./lib";
import { handleLogin, handleMe } from "./routes/auth";
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
import { requireAuth } from "./middleware/auth";
import { isOutboxFlushAuthorized } from "./lib/outbox-dispatch";
import { flushPendingOutbox } from "./lib/outbox-replay";
import { checkStackHealth } from "./routes/health-stack";

import type { GatewayEnv } from "./types/env";

export interface Env extends GatewayEnv {}

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, PUT, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, Idempotency-Key, X-Requested-With",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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

    return withCors(jsonResponse({ error: "not_found", path }, 404));
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(flushPendingOutbox(env));
  },
};
