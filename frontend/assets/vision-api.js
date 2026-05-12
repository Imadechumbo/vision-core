(function () {
  "use strict";

  const DEFAULT_BASE = "https://visioncore-api-gateway.weiganlight.workers.dev";
  const TIMEOUT_MS = 30000;

  function metaBase() {
    const meta = document.querySelector('meta[name="vision-api-base"]');
    return meta ? meta.getAttribute("content") : "";
  }

  function baseUrl() {
    return window.API_BASE_URL || window.__VISION_API__ || metaBase() || DEFAULT_BASE;
  }

  function normalizePath(path) {
    const raw = String(path || "/").trim();
    if (/^https?:\/\//i.test(raw)) {
      return raw.replace(/\/api\/api\//g, "/api/");
    }
    const cleanBase = String(baseUrl()).replace(/\/+$/, "");
    const cleanPath = raw.startsWith("/") ? raw : `/${raw}`;
    return `${cleanBase}${cleanPath}`.replace(/\/api\/api\//g, "/api/");
  }

  async function request(method, path, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const headers = { Accept: "application/json" };
    const init = { method, headers, signal: controller.signal };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(normalizePath(path), init);
      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        const message = payload && payload.message ? payload.message : `HTTP ${response.status}`;
        throw new Error(`Vision API ${method} ${path} falhou: ${message}`);
      }

      return payload;
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error(`Vision API timeout após ${TIMEOUT_MS / 1000}s em ${method} ${path}`);
      }
      throw new Error(error && error.message ? error.message : `Vision API erro em ${method} ${path}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  async function download(path) {
    const response = await fetch(normalizePath(path), { method: "GET" });
    if (!response.ok) throw new Error(`Download falhou: HTTP ${response.status}`);
    return response.blob();
  }

  window.VisionApi = {
    apiUrl: normalizePath,
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    download
  };
})();
