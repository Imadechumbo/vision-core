(function () {
  "use strict";

  const meta = document.querySelector('meta[name="vision-api-base"]');
  const apiBaseUrl = (meta && meta.content ? meta.content : "").replace(/\/$/, "");

  function apiUrl(path) {
    const cleanPath = String(path || "");
    if (/^https?:\/\//i.test(cleanPath)) return cleanPath;
    if (!apiBaseUrl) return cleanPath;
    return apiBaseUrl + (cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`);
  }

  async function requestJson(path, options) {
    const response = await fetch(apiUrl(path), {
      headers: { "Content-Type": "application/json", ...(options && options.headers ? options.headers : {}) },
      ...(options || {})
    });
    const text = await response.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }
    }
    if (!response.ok) {
      const error = new Error(`VISION API ${response.status}`);
      error.response = response;
      error.data = data;
      throw error;
    }
    return data || {};
  }

  window.VisionAPI = Object.freeze({ apiBaseUrl, apiUrl, requestJson });
})();
