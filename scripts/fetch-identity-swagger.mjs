/**
 * Downloads Identity OpenAPI JSON from the local Identity API.
 * Usage: node scripts/fetch-identity-swagger.mjs [url]
 * Default: http://localhost:8400/swagger/v1/swagger.json
 */
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outFile = path.join(root, 'identity-swagger.json');
const url = process.argv[2] ?? 'http://localhost:8400/swagger/v1/swagger.json';

const opts = new URL(url);
const lib = opts.protocol === 'https:' ? https : http;

/** @type {http.RequestOptions} */
const requestOptions = {
  hostname: opts.hostname,
  port: opts.port || (opts.protocol === 'https:' ? 443 : 80),
  path: `${opts.pathname}${opts.search}`,
  method: 'GET',
  headers: { Accept: 'application/json' },
};

if (opts.protocol === 'https:') {
  requestOptions.rejectUnauthorized = false;
}

const req = lib.request(requestOptions, (res) => {
  if (res.statusCode && res.statusCode >= 400) {
    console.error(`HTTP ${res.statusCode} from ${url}`);
    process.exit(1);
  }
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    try {
      JSON.parse(body);
    } catch {
      console.error('Response is not valid JSON. Is the Identity API running?');
      process.exit(1);
    }
    fs.writeFileSync(outFile, body, 'utf8');
    console.log(`Wrote ${outFile}`);
  });
});

req.on('error', (err) => {
  console.error(err.message);
  console.error('Start the ERP host (port 8400) and retry.');
  process.exit(1);
});

req.end();
