'use strict';

/**
 * VISION CORE v1.7 — Community Anonymizer
 *
 * Sanitiza payloads de feedback da comunidade antes de qualquer persistência.
 * REGRA: nunca armazenar secrets, paths privados, código-fonte completo ou .env raw.
 */

// ── Padrões que devem ser redactados ─────────────────────────────────────
const REDACT_PATTERNS = [
  // API Keys
  { re: /sk-[A-Za-z0-9]{20,}/g,          label: 'openai_key' },
  { re: /ghp_[A-Za-z0-9]{36,}/g,         label: 'github_token' },
  { re: /gsk_[A-Za-z0-9]{20,}/g,         label: 'groq_key' },
  { re: /AIza[A-Za-z0-9_-]{30,}/g,       label: 'google_key' },
  { re: /xoxb-[A-Za-z0-9-]{20,}/g,       label: 'slack_bot_token' },
  { re: /xoxp-[A-Za-z0-9-]{20,}/g,       label: 'slack_user_token' },
  // Emails
  { re: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, label: 'email' },
  // IPs
  { re: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, label: 'ip_address' },
  // Paths Windows absolutos
  { re: /[A-Za-z]:\\[^\s\n"',;)]{3,}/g,  label: 'windows_path' },
  // Paths Linux/Mac absolutos
  { re: /\/(home|usr|root|var|etc|tmp|Users|opt)\/[^\s\n"',;)]{3,}/g, label: 'unix_path' },
  // Credenciais inline
  { re: /\b(password|passwd|secret|token|api[_-]?key|auth[_-]?key)\s*[:=]\s*\S+/gi, label: 'credential' },
  // Base64 longo
  { re: /[A-Za-z0-9+/]{60,}={0,2}/g,    label: 'base64_blob' },
  // Blocos .env
  { re: /\.env\s*[=:]\s*\S+/gi,          label: 'env_reference' },
];

// ── Keywords que indicam conteúdo potencialmente sensível ─────────────────
const SENSITIVE_KEYWORDS = [
  'password', 'passwd', 'secret', 'private_key', 'api_key',
  'access_token', 'refresh_token', 'bearer', 'authorization',
  'credential', 'ssh-rsa', 'BEGIN RSA', 'BEGIN OPENSSH',
];

const MAX_STACK_LINES  = 30;
const MAX_FIELD_LENGTH = 800;

// ── Sanitizar um campo de texto ───────────────────────────────────────────
function sanitizeText(text) {
  if (!text) return { clean: '', redactions: [] };
  let s = String(text);
  const redactions = [];

  for (const { re, label } of REDACT_PATTERNS) {
    const before = s;
    s = s.replace(re, `[REDACTED:${label}]`);
    if (s !== before) redactions.push(label);
  }

  return { clean: s.slice(0, MAX_FIELD_LENGTH), redactions };
}

// ── Sanitizar stack trace — limitar linhas ────────────────────────────────
function sanitizeStackTrace(stack) {
  if (!stack) return { clean: '', redactions: [] };
  const lines   = String(stack).split('\n').slice(0, MAX_STACK_LINES);
  const joined  = lines.join('\n');
  return sanitizeText(joined);
}

// ── Detectar conteúdo sensível (antes de sanitizar) ───────────────────────
function detectSensitiveContent(payload) {
  const raw     = JSON.stringify(payload || {}).toLowerCase();
  const found   = [];

  for (const kw of SENSITIVE_KEYWORDS) {
    if (raw.includes(kw.toLowerCase())) found.push(kw);
  }

  for (const { re, label } of REDACT_PATTERNS) {
    if (re.test(raw)) found.push(label);
    re.lastIndex = 0;
  }

  return {
    hasSensitive:  found.length > 0,
    detectedTypes: [...new Set(found)],
  };
}

// ── Sanitizar payload completo ────────────────────────────────────────────
function sanitizeCommunityPayload(payload) {
  if (!payload) {
    return { safe: false, sanitizedPayload: null, redactions: [], reason: 'Payload vazio' };
  }

  // Detectar antes de sanitizar
  const detection = detectSensitiveContent(payload);

  const allRedactions = [];
  function clean(val) {
    const { clean, redactions } = sanitizeText(val);
    allRedactions.push(...redactions);
    return clean;
  }
  function cleanStack(val) {
    const { clean, redactions } = sanitizeStackTrace(val);
    allRedactions.push(...redactions);
    return clean;
  }

  // Campos permitidos — explicitamente nomeados para não vazar dados extras
  const sanitized = {
    title:                clean(payload.title      || ''),
    category:             clean(payload.category   || 'generic'),
    framework:            clean(payload.framework  || ''),
    language:             clean(payload.language   || ''),
    environment:          clean(payload.environment || ''),
    severity:             clean(payload.severity   || 'medium'),
    errorSignature:       clean(payload.errorSignature || payload.error || ''),
    stackTraceSanitized:  cleanStack(payload.stackTrace || payload.stack_trace || ''),
    reproductionSteps:    clean(payload.reproductionSteps || ''),
    attemptedSolution:    clean(payload.attemptedSolution || ''),
    tags:                 Array.isArray(payload.tags) ? payload.tags.map(t => clean(t)).filter(Boolean) : [],
    // Campos de contexto — NÃO incluir source code completo
    // NÃO incluir: .env, secrets, full file content, private paths
  };

  const unique = [...new Set(allRedactions)];
  const hasHighRisk = detection.detectedTypes.some(t =>
    ['openai_key', 'github_token', 'groq_key', 'google_key',
     'slack_bot_token', 'slack_user_token', 'credential'].includes(t)
  );

  return {
    safe:             !hasHighRisk,
    sanitizedPayload: sanitized,
    redactions:       unique,
    reason:           hasHighRisk
      ? `Conteúdo de alto risco detectado: ${detection.detectedTypes.join(', ')}`
      : unique.length > 0
        ? `Redações aplicadas: ${unique.join(', ')}`
        : 'Payload limpo',
    detectedTypes: detection.detectedTypes,
  };
}

module.exports = { sanitizeCommunityPayload, detectSensitiveContent, sanitizeText, sanitizeStackTrace };
