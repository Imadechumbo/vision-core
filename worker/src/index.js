/**
 * VISION CORE V3.2 — API GATEWAY
 * Cloudflare Worker proxy for:
 * - POST/GET/OPTIONS API forwarding
 * - CORS hardening
 * - simple in-memory per-isolate request quota fallback
 * - SSE passthrough for /api/run-live-stream
 *
 * Origin atual:
 * http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
 */

const DEFAULT_ORIGIN = "http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com";

const ALLOWED_ORIGINS = new Set([
  "https://visioncoreai.pages.dev",
  "https://visioncore.technetgame.com.br",
  "https://c210aea7.visioncoreai.pages.dev",
  "https://723d0023.visioncoreai.pages.dev",
  "https://cc369d83.visioncoreai.pages.dev",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

// Fallback simples. Para produção pesada, use binding de controle de quota ou Durable Object.
const BUCKETS = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;

function getClientIp(request) {
  return request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "unknown";
}

function allowedCorsOrigin(origin) {
  return (
    /^https:\/\/[a-z0-9-]+\.visioncoreai\.pages\.dev$/.test(origin) ||
    origin === "https://visioncoreai.pages.dev" ||
    /^http:\/\/localhost:\d+$/.test(origin) ||
    /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
  );
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";

  const headers = {
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Vision-Token, X-Vision-Key",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };

  if (allowedCorsOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function jsonResponse(request, body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function checkRateLimit(key) {
  const now = Date.now();
  const item = BUCKETS.get(key);

  if (!item || now - item.start > RATE_LIMIT_WINDOW_MS) {
    BUCKETS.set(key, { start: now, count: 1 });
    return { ok: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  item.count += 1;
  if (item.count > RATE_LIMIT_MAX) {
    return { ok: false, remaining: 0 };
  }

  return { ok: true, remaining: RATE_LIMIT_MAX - item.count };
}

function sanitizeRequestHeaders(request) {
  const headers = new Headers(request.headers);

  // Evita problemas de host/origin entre Cloudflare e EB.
  headers.delete("host");
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ipcountry");
  headers.delete("cf-ray");
  headers.delete("cf-visitor");
  headers.delete("x-forwarded-proto");
  headers.delete("x-real-ip");

  // Marca tráfego vindo do gateway.
  headers.set("X-Vision-Gateway", "v3.1");
  headers.set("X-Forwarded-Proto", "https");

  return headers;
}

function withGatewayHeaders(request, originResponse, extra = {}) {
  const headers = new Headers(originResponse.headers);

  for (const [k, v] of Object.entries(corsHeaders(request))) {
    headers.set(k, v);
  }

  headers.set("X-Vision-Gateway", "v3.1");
  headers.set("Cache-Control", "no-store");

  for (const [k, v] of Object.entries(extra)) {
    headers.set(k, v);
  }

  return headers;
}

async function proxyToOrigin(request, env, ctx) {
  const incomingUrl = new URL(request.url);
  const originBase = (env && env.ORIGIN_BASE) || DEFAULT_ORIGIN;
  const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, originBase);

  const headers = sanitizeRequestHeaders(request);

  // §26: Gemini pode levar até 45s. Dar 52s ao subrequest (+ margem) antes de desistir.
  // NOTA: CF Workers Standard — I/O wait não consome CPU time; isso funciona em paid plan.
  // Em free plan (30s wall-clock total), requests Gemini-heavy podem estourar no nível CF.
  // §46fix-gateway: /api/deploy/* faz 5+ chamadas GitHub API sequenciais → 30s
  //   Endpoints cobertos: zip-release, merge-pr (§50)
  // §48: /api/chat/apply-patch pode ter AEGIS spawn + PASS GOLD engine → 15s
  const isChatPost    = request.method === "POST" && incomingUrl.pathname.includes("/api/chat");
  const isDeployPost  = request.method === "POST" && incomingUrl.pathname.startsWith("/api/deploy/");
  // §50fix-gateway: /api/deploy/merge-pr — squash merge PR GitHub API, coberto por isDeployPost (30s)
  const isApplyPatch  = request.method === "POST" && incomingUrl.pathname.includes("/api/chat/apply-patch");
  const subrequestTimeout = isChatPost ? 52000 : isDeployPost ? 30000 : isApplyPatch ? 15000 : 10000;

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(subrequestTimeout)
  };

  // GET/HEAD não podem ter body.
  if (!["GET", "HEAD"].includes(request.method.toUpperCase())) {
    init.body = request.body;
  }

  const originResponse = await fetch(targetUrl.toString(), init);

  const isSSE =
    incomingUrl.pathname.includes("/run-live-stream") ||
    (originResponse.headers.get("content-type") || "").includes("text/event-stream");

  const responseHeaders = withGatewayHeaders(
    request,
    originResponse,
    isSSE
      ? {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no"
        }
      : {}
  );

  // SSE: heartbeat ping a cada 15s para evitar timeout de CDN/proxy
  // ctx e passado pelo caller quando detectado SSE
  if (isSSE && originResponse.body && ctx) {
    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    ctx.waitUntil((async () => {
      const reader = originResponse.body.getReader();
      let pingHandle = null;

      const sendPing = async () => {
        try {
          await writer.write(encoder.encode("event: ping\ndata: alive\n\n"));
        } catch (_) {
          if (pingHandle) clearInterval(pingHandle);
        }
      };

      pingHandle = setInterval(sendPing, 15000);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch (_) {
        // conexao encerrada pelo cliente ou origin
      } finally {
        clearInterval(pingHandle);
        try { await writer.close(); } catch (_) {}
      }
    })());

    return new Response(readable, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders
    });
  }

  return new Response(originResponse.body, {
    status: originResponse.status,
    statusText: originResponse.statusText,
    headers: responseHeaders
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (url.pathname === "/" || url.pathname === "/health" || url.pathname === "/api-gateway/health") {
      return jsonResponse(request, {
        ok: true,
        service: "vision-core-api-gateway",
        version: "3.2",
        origin: (env && env.ORIGIN_BASE) || DEFAULT_ORIGIN,
        supports: ["GET", "POST", "OPTIONS", "SSE"],
        pass_gold_policy: "required"
      });
    }

    if (!url.pathname.startsWith("/api/")) {
      return jsonResponse(request, {
        ok: false,
        error: "not_found",
        message: "VISION CORE API Gateway só encaminha rotas /api/*"
      }, 404);
    }

    const ip = getClientIp(request);
    const bucketKey = `${ip}:${url.pathname}`;
    const limit = checkRateLimit(bucketKey);

    if (!limit.ok) {
      return jsonResponse(request, {
        ok: false,
        error: "rate_limited",
        message: "Limite temporário atingido no VISION CORE API Gateway.",
        retry_after_seconds: 60
      }, 429);
    }


    try {
      const res = await proxyToOrigin(request, env, ctx);
      res.headers.set("X-RateLimit-Remaining", String(limit.remaining));
      return res;
    } catch (err) {
      return jsonResponse(request, {
        ok: false,
        error: "gateway_origin_failure",
        message: String(err && err.message ? err.message : err),
        origin: (env && env.ORIGIN_BASE) || DEFAULT_ORIGIN
      }, 502);
    }
  }
};

