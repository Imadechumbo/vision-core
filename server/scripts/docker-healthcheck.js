'use strict';

const port = Number(process.env.PORT || 8787);
const host = process.env.HEALTH_HOST || '127.0.0.1';
const url = `http://${host}:${port}/api/health`;

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 4000);

fetch(url, { signal: controller.signal })
  .then(async res => {
    clearTimeout(timer);
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.ok !== true) {
      console.error(`Healthcheck FAIL ${res.status}: ${JSON.stringify(body)}`);
      process.exit(1);
    }
    console.log(`Healthcheck OK: ${body.service || 'vision-core'} ${body.version || ''}`.trim());
    process.exit(0);
  })
  .catch(err => {
    clearTimeout(timer);
    console.error(`Healthcheck FAIL: ${err.message}`);
    process.exit(1);
  });
