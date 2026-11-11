// puml2png.mjs —— 用 PlantUML 官方服务器把 .puml 渲染成 .png
// 用法: node puml2png.mjs <puml文件或目录> [...]
// 依赖: Node 18+（内置 zlib / https），无需 Java 与 plantuml.jar
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import https from 'node:https';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

function encode64(buf) {
  let out = '';
  for (let i = 0; i < buf.length; i += 3) {
    const b1 = buf[i];
    const b2 = i + 1 < buf.length ? buf[i + 1] : 0;
    const b3 = i + 2 < buf.length ? buf[i + 2] : 0;
    out += ALPHABET[b1 >> 2];
    out += ALPHABET[((b1 & 0x3) << 4) | (b2 >> 4)];
    out += ALPHABET[((b2 & 0xf) << 2) | (b3 >> 6)];
    out += ALPHABET[b3 & 0x3f];
  }
  return out;
}

function plantumlPath(source) {
  return encode64(zlib.deflateRawSync(Buffer.from(source, 'utf8'), { level: 9 }));
}

function fetchPng(urlPath) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      { host: 'www.plantuml.com', path: urlPath, headers: { 'User-Agent': 'puml2png/1.0' } },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          // PlantUML 语法错误时返回 HTTP 400 + 一张写着错误原因的 PNG
          if (res.statusCode !== 200) {
            return resolve({ ok: false, status: res.statusCode, body });
          }
          resolve({ ok: true, body });
        });
      }
    );
    req.setTimeout(120000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function collect(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs
    .readdirSync(target)
    .filter((f) => f.toLowerCase().endsWith('.puml'))
    .map((f) => path.join(target, f));
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('用法: node puml2png.mjs <puml文件或目录> [...]');
  process.exit(1);
}

let failed = 0;
for (const target of args) {
  for (const file of collect(target)) {
    const source = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    const base = path.basename(file, path.extname(file));
    const png = path.join(path.dirname(file), base + '.png');
    try {
      const res = await fetchPng('/plantuml/png/' + plantumlPath(source));
      const isPng = res.body.length > 8 && res.body[0] === 0x89 && res.body[1] === 0x50;
      if (!res.ok) {
        if (isPng) {
          const errPng = path.join(path.dirname(file), base + '.error.png');
          fs.writeFileSync(errPng, res.body);
          throw new Error(`语法错误(HTTP ${res.status})，错误图已存到 ${path.basename(errPng)}`);
        }
        throw new Error(`HTTP ${res.status}`);
      }
      if (!isPng) throw new Error('返回内容不是 PNG');
      fs.writeFileSync(png, res.body);
      console.log(`OK   ${path.basename(file)} -> ${path.basename(png)} (${res.body.length} bytes)`);
    } catch (err) {
      failed++;
      console.error(`FAIL ${path.basename(file)}: ${err.message}`);
    }
  }
}
process.exit(failed === 0 ? 0 : 2);
