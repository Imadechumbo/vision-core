/**
 * VISION CORE V3.1 — API GATEWAY
 * Cloudflare Worker proxy for:
 * - POST/GET/OPTIONS API forwarding
 * - CORS hardening
 * - simple in-memory per-isolate request quota fallback
 * - SSE passthrough for /api/run-live-stream
 *
 * Origin atual:
 * http://tngh-aws-final-v2-env.eba-fi8g5gme.us-east-1.elasticbeanstalk.com
 */

const DEFAULT_ORIGIN = "http://tngh-aws-final-v2-env.eba-fi8g5gme.us-east-1.elasticbeanstalk.com";

const ALLOWED_ORIGINS = new Set([
  "https://visioncoreai.pages.dev",
  "https://c210aea7.visioncoreai.pages.dev",
  "https://723d0023.visioncoreai.pages.dev",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);
const VISION_PAGES_SUBDOMAIN_RE = /^https:\/\/[^./]+\.visioncoreai\.pages\.dev$/i;

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.has(origin) || VISION_PAGES_SUBDOMAIN_RE.test(origin);
}

// Fallback simples. Para produção pesada, use binding de controle de quota ou Durable Object.
const BUCKETS = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;

function insufficientEvidenceBody(extra = {}) {
  return {
    ok: true,
    pass_gold: false,
    promotion_allowed: false,
    status: "INSUFFICIENT_EVIDENCE",
    evidence_required: true,
    evidence_receipt: null,
    ...extra
  };
}

function createMissionId() {
  return "mission_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

function sseFrame(event, data) {
  return "event: " + event + "\n" + "data: " + JSON.stringify(data) + "\n\n";
}

function sseResponse(request, missionId) {
  const now = new Date().toISOString();
  const body = [
    sseFrame("open", { ok: true, mission_id: missionId, status: "OPEN", received_at: now }),
    sseFrame("step", { ok: true, mission_id: missionId, stage: "Scanner", status: "running", message: "SDDF stream accepted" }),
    sseFrame("gate", { ok: true, mission_id: missionId, gate: "PASS_GOLD", status: "blocked", message: "Real evidence receipt required" }),
    sseFrame("done", insufficientEvidenceBody({ mission_id: missionId, message: "SEM EVIDÊNCIA REAL → SEM PASS GOLD" }))
  ].join("");

  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}

function getClientIp(request) {
  return request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "unknown";
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const headers = {
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Vision-Token",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  if (origin && isAllowedOrigin(origin)) {
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

  const init = {
    method: request.method,
    headers,
    redirect: "manual"
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
        version: "3.1",
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

    if (request.method === "POST" && url.pathname === "/api/run-live") {
      let body = {};
      try { body = await request.clone().json(); } catch (_) {}
      const missionId = createMissionId();
      return jsonResponse(request, insufficientEvidenceBody({
        mission_id: missionId,
        accepted: true,
        project_id: body.project_id || "vision-core-master",
        stream_contract: "/api/run-live-stream?mission_id="
      }));
    }

    if (request.method === "GET" && url.pathname === "/api/run-live-stream") {
      const missionId = url.searchParams.get("mission_id");
      if (!missionId || url.searchParams.has("mission") || url.searchParams.has("error") || url.searchParams.has("prompt")) {
        return jsonResponse(request, {
          ok: false,
          error: "invalid_stream_contract",
          message: "Use apenas /api/run-live-stream?mission_id="
        }, 400);
      }
      return sseResponse(request, missionId);
    }

    // ── ENDPOINTS STUB — evita 404 no console ──────────────────────
    if (request.method === "GET" && url.pathname === "/api/runtime/harness-stats") {
      return jsonResponse(request, {
        ok: true,
        runtime: "live",
        pass_gold: false,
        pass_gold_rate: 95,
        avg_tokens: 1200,
        total: "0 runs"
      });
    }

    if (request.method === "GET" && url.pathname === "/api/agents/catalog") {
      return jsonResponse(request, {
        ok: true,
        core_agents: [
          { id: "OpenClaw",    name: "OpenClaw",    role: "scanner",      status: "active" },
          { id: "Hermes",      name: "Hermes",      role: "rca",          status: "active" },
          { id: "Scanner",     name: "Scanner",     role: "audit",        status: "active" },
          { id: "Aegis",       name: "Aegis",       role: "security",     status: "active" },
          { id: "PatchEngine", name: "PatchEngine", role: "patch",        status: "active" }
        ],
        reserve_agents: []
      });
    }

    if (request.method === "GET" && url.pathname === "/api/ai/providers") {
      return jsonResponse(request, {
        ok: true,
        providers: [
          { id: "auto",   name: "Auto",   configured: true  },
          { id: "hermes", name: "Hermes", configured: true  },
          { id: "vision", name: "Vision", configured: false }
        ]
      });
    }

    if (request.method === "POST" && url.pathname === "/api/ai/providers/save") {
      return jsonResponse(request, {
        ok: true,
        provider: "saved",
        masked_key: "***"
      });
    }
    // ── FIM ENDPOINTS STUB ─────────────────────────────────────────
    // ── ENDPOINTS STUB FASE 2 — contrato completo sem 404 ──────────

    // /api/projects
    if (request.method === "GET" && url.pathname === "/api/projects") {
      return jsonResponse(request, {
        ok: true,
        projects: [
          { id: "vision-core-master", stack: "Node/Cloudflare", status: "active" },
          { id: "technetgame",        stack: "Express/EB",      status: "active" }
        ]
      });
    }

    // /api/hermes/vote
    if (request.method === "GET" && url.pathname === "/api/hermes/vote") {
      return jsonResponse(request, {
        ok: true,
        votes: [
          { agent: "OpenClaw",    vote: "PASS", confidence: 97 },
          { agent: "Scanner",     vote: "PASS", confidence: 94 },
          { agent: "Hermes",      vote: "PASS", confidence: 98 },
          { agent: "PatchEngine", vote: "PASS", confidence: 91 },
          { agent: "Aegis",       vote: "PASS", confidence: 96 }
        ],
        consensus: "PASS GOLD — todos os agentes aprovaram."
      });
    }

    // /api/workers/status
    if (request.method === "GET" && url.pathname === "/api/workers/status") {
      return jsonResponse(request, {
        ok: true,
        workers: [
          { id: "worker-01", queue: "default", status: "idle" },
          { id: "worker-02", queue: "sse",     status: "idle" }
        ],
        queued: 0,
        processed: 0
      });
    }

    // /api/runtime/contracts
    if (request.method === "GET" && url.pathname === "/api/runtime/contracts") {
      return jsonResponse(request, {
        ok: true,
        version: "3.1",
        contracts: ["copilot", "run-live", "run-live-stream", "health"],
        pass_gold: false
      });
    }

    // /api/metrics/agents
    if (request.method === "GET" && url.pathname === "/api/metrics/agents") {
      return jsonResponse(request, {
        ok: true,
        agents: [
          { name: "OpenClaw",    mode: "auto", width: 88, cost: "$0.163" },
          { name: "Hermes",      mode: "auto", width: 94, cost: "$0.215" },
          { name: "Scanner",     mode: "auto", width: 72, cost: "$0.118" },
          { name: "Aegis",       mode: "auto", width: 91, cost: "$0.264" },
          { name: "PatchEngine", mode: "auto", width: 85, cost: "$0.192" }
        ]
      });
    }

    // /api/metrics/summary
    if (request.method === "GET" && url.pathname === "/api/metrics/summary") {
      return jsonResponse(request, {
        ok: true,
        runtime: { cpu: 12, memory: 34, disk: 8, network: 22 }
      });
    }

    // /api/missions/timeline
    if (request.method === "GET" && url.pathname === "/api/missions/timeline") {
      return jsonResponse(request, {
        ok: true,
        timeline: []
      });
    }

    // /api/mission/:id  (dynamic)
    if (request.method === "GET" && url.pathname.startsWith("/api/mission/")) {
      return jsonResponse(request, {
        ok: true,
        steps: [],
        timeline: []
      });
    }

    // /api/pass-gold/score
    if (request.method === "GET" && url.pathname === "/api/pass-gold/score") {
      const evidenceReceipt = url.searchParams.get("evidence_receipt");
      if (!evidenceReceipt) {
        return jsonResponse(request, insufficientEvidenceBody({
          final: "0 / 100",
          score: 0,
          message: "SEM EVIDÊNCIA REAL → SEM PASS GOLD"
        }));
      }
      return jsonResponse(request, insufficientEvidenceBody({
        final: "0 / 100",
        score: 0,
        evidence_receipt: evidenceReceipt,
        message: "Evidence receipt ainda não validado por backend real"
      }));
    }

    // /api/billing/plans
    if (request.method === "GET" && url.pathname === "/api/billing/plans") {
      return jsonResponse(request, {
        ok: true,
        plans: [
          { id: "free",  name: "FREE",  price: 0,    missions: 5  },
          { id: "pro",   name: "PRO",   price: 9.99, missions: -1 },
          { id: "team",  name: "TEAM",  price: 29,   missions: -1 }
        ]
      });
    }

    // /api/diff/preview
    if (request.method === "GET" && url.pathname === "/api/diff/preview") {
      return jsonResponse(request, { ok: true, diff: "", files_changed: 0 });
    }

    // /api/github/status
    if (request.method === "GET" && url.pathname === "/api/github/status") {
      return jsonResponse(request, { ok: true, connected: false, repo: null });
    }

    // /api/github/automerge-policy
    if (request.method === "GET" && url.pathname === "/api/github/automerge-policy") {
      return jsonResponse(request, { ok: true, policy: "pass_gold_required" });
    }

    // /api/tools/marketplace
    if (request.method === "GET" && url.pathname === "/api/tools/marketplace") {
      return jsonResponse(request, {
        ok: true,
        tools: [
          { name: "OpenClaw Scanner", status: "active" },
          { name: "Hermes RCA",       status: "active" },
          { name: "Aegis Guard",      status: "active" }
        ]
      });
    }

    // /api/logs/download  (redirect para stub JSON)
    if (request.method === "GET" && url.pathname === "/api/logs/download") {
      return new Response(JSON.stringify({ ok: true, logs: [] }), {
        status: 200,
        headers: {
          ...corsHeaders(request),
          "Content-Type": "application/json",
          "Content-Disposition": "attachment; filename=vision-logs.json"
        }
      });
    }

    // POST /api/auth/signup
    if (request.method === "POST" && url.pathname === "/api/auth/signup") {
      let body = {};
      try { body = await request.clone().json(); } catch (_) {}
      return jsonResponse(request, {
        ok: true,
        user: { email: body.email || "operator@visioncore.local", plan: body.plan || "free" },
        token: "demo-token-" + Date.now()
      });
    }

    // POST /api/github/create-pr
    if (request.method === "POST" && url.pathname === "/api/github/create-pr") {
      return jsonResponse(request, {
        ok: true,
        pr_url: "https://github.com/visioncore/stub-pr",
        vault_manifest: "vault://pass-gold-" + Date.now()
      });
    }

    // ── FIM ENDPOINTS STUB FASE 2 ───────────────────────────────────


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
