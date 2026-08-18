import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  accessTokenExpiresInSeconds,
} from "@inova-gastro-360/auth";

const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

function isSecureRequest(request: Request, environment?: string): boolean {
  if (environment === "production") return true;
  const url = new URL(request.url);
  return url.protocol === "https:";
}

function cookieFlags(secure: boolean): string {
  const parts = ["Path=/", "HttpOnly", "SameSite=Lax"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

/** Anexa cookies HttpOnly de sessão na resposta (login/refresh). */
export function withSessionCookies(
  response: Response,
  request: Request,
  tokens: { accessToken: string; refreshToken: string },
  environment?: string,
): Response {
  const secure = isSecureRequest(request, environment);
  const headers = new Headers(response.headers);
  headers.append(
    "set-cookie",
    `${ACCESS_COOKIE_NAME}=${encodeURIComponent(tokens.accessToken)}; Max-Age=${accessTokenExpiresInSeconds()}; ${cookieFlags(secure)}`,
  );
  headers.append(
    "set-cookie",
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(tokens.refreshToken)}; Max-Age=${REFRESH_MAX_AGE}; ${cookieFlags(secure)}`,
  );
  return new Response(response.body, { status: response.status, headers });
}

/** Limpa cookies de sessão (logout). */
export function clearSessionCookies(
  response: Response,
  request: Request,
  environment?: string,
): Response {
  const secure = isSecureRequest(request, environment);
  const headers = new Headers(response.headers);
  headers.append(
    "set-cookie",
    `${ACCESS_COOKIE_NAME}=; Max-Age=0; ${cookieFlags(secure)}`,
  );
  headers.append(
    "set-cookie",
    `${REFRESH_COOKIE_NAME}=; Max-Age=0; ${cookieFlags(secure)}`,
  );
  return new Response(response.body, { status: response.status, headers });
}
