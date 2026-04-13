/**
 * Downloads OpenAPI spec for codegen. Tries HTTPS :8500 then HTTP :8400 (see MyERP.Host launchSettings).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const outPath = path.join(__dirname, '..', 'swagger.json');
const paths = ['/swagger/v1/swagger.json'];

function get(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.get(
      url,
      {
        ...options,
        rejectUnauthorized: u.protocol === 'https:' ? false : undefined,
      },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

async function main() {
  const bases = ['https://localhost:8500', 'http://localhost:8400'];
  for (const base of bases) {
    for (const p of paths) {
      const url = `${base}${p}`;
      try {
        const body = await get(url);
        if (body.includes('"openapi"') || body.includes('"swagger"')) {
          fs.writeFileSync(outPath, body, 'utf8');
          console.log(`Wrote ${outPath} from ${url}`);
          return;
        }
      } catch (e) {
        console.warn(`Skip ${url}: ${e.message}`);
      }
    }
  }
  console.error('Could not download swagger. Start the API (https profile on 8500 or http on 8400).');
  process.exit(1);
}

main();
