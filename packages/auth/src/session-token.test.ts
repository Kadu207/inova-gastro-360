import { describe, it, expect } from "vitest";
import {
  ACCESS_COOKIE_NAME,
  WS_PROTOCOL_MARKER,
  buildWsProtocols,
  canAccessBranch,
  extractAccessToken,
  hasOrderOpsRole,
  parseCookieHeader,
  realtimeRoomKey,
} from "./session-token";

describe("session-token", () => {
  it("parseCookieHeader decodifica pares", () => {
    expect(parseCookieHeader(`${ACCESS_COOKIE_NAME}=abc%20123; other=1`)).toEqual({
      [ACCESS_COOKIE_NAME]: "abc 123",
      other: "1",
    });
  });

  it("extractAccessToken prioriza Bearer", () => {
    const headers = new Headers({
      authorization: "Bearer from-header",
      cookie: `${ACCESS_COOKIE_NAME}=from-cookie`,
    });
    expect(extractAccessToken(headers)).toBe("from-header");
  });

  it("extractAccessToken usa cookie e depois Sec-WebSocket-Protocol", () => {
    expect(
      extractAccessToken(new Headers({ cookie: `${ACCESS_COOKIE_NAME}=cook` })),
    ).toBe("cook");
    expect(
      extractAccessToken(
        new Headers({ "sec-websocket-protocol": `${WS_PROTOCOL_MARKER}, ws.jwt.token` }),
      ),
    ).toBe("ws.jwt.token");
  });

  it("extractAccessToken ignora query (não lê URL)", () => {
    expect(extractAccessToken(new Headers())).toBeNull();
  });

  it("canAccessBranch: vazio = todas; lista restringe", () => {
    expect(canAccessBranch({ branches: [] }, "b1")).toBe(true);
    expect(canAccessBranch({ branches: ["b1"] }, "b1")).toBe(true);
    expect(canAccessBranch({ branches: ["b1"] }, "b2")).toBe(false);
    expect(canAccessBranch({ branches: [] }, "default")).toBe(false);
  });

  it("compõe sala realtime com tenant e filial", () => {
    expect(realtimeRoomKey("tenant-a", "branch-b")).toBe("tenant-a:branch-b");
  });

  it("hasOrderOpsRole e buildWsProtocols", () => {
    expect(hasOrderOpsRole("cozinha")).toBe(true);
    expect(hasOrderOpsRole("financeiro")).toBe(false);
    expect(buildWsProtocols("tok")).toEqual([WS_PROTOCOL_MARKER, "tok"]);
  });
});
