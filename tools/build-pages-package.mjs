import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_ALLOWLIST = resolve(ROOT, 'bin/pages-allowlist.txt');
const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:sk|ghp|github_pat|glpat)[_-][A-Za-z0-9_-]{20,}\b/,
  /\bAKIA[A-Z0-9]{16}\b/,
];

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function readAllowlist(path = DEFAULT_ALLOWLIST) {
  const files = readFileSync(path, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!files.length || new Set(files).size !== files.length) throw new Error('Pages allowlist must be non-empty and unique');
  for (const file of files) {
    if (file.startsWith('/') || file.includes('..') || file.includes('\\')) throw new Error(`Unsafe allowlist path: ${file}`);
  }
  return files.sort();
}

export function buildPagesPackage({ source = resolve(ROOT, 'frontend'), output, allowlist = DEFAULT_ALLOWLIST } = {}) {
  if (!output) throw new Error('Output directory is required');
  const outputRoot = resolve(output);
  const sourceRoot = resolve(source);
  if (outputRoot === dirname(outputRoot) || outputRoot === sourceRoot || sourceRoot.startsWith(outputRoot + sep)) {
    throw new Error(`Unsafe output directory: ${outputRoot}`);
  }
  rmSync(outputRoot, { recursive: true, force: true });
  mkdirSync(outputRoot, { recursive: true });
  const publishedFiles = readAllowlist(allowlist).map((file) => [file, file]);
  publishedFiles.push(['index.html', 'vision-core-next.html']);
  const entries = publishedFiles.map(([publishedPath, sourcePath]) => {
    const sourceFile = resolve(sourceRoot, sourcePath);
    if (!sourceFile.startsWith(sourceRoot + sep)) throw new Error(`Path escaped frontend: ${sourcePath}`);
    const bytes = readFileSync(sourceFile);
    if (SECRET_PATTERNS.some((pattern) => pattern.test(bytes.toString('utf8')))) throw new Error(`Secret-like value detected in ${sourcePath}`);
    const destination = resolve(outputRoot, publishedPath);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(sourceFile, destination);
    return { path: publishedPath, bytes: bytes.length, sha256: hash(bytes) };
  }).sort((a, b) => a.path.localeCompare(b.path));
  const packageSha256 = hash(entries.map(({ path, sha256 }) => `${path}\0${sha256}`).join('\n'));
  const manifest = { schema_version: 1, package_sha256: packageSha256, files: entries };
  writeFileSync(resolve(outputRoot, 'deployment-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const output = process.argv[2];
  const manifest = buildPagesPackage({ output });
  console.log(`Pages package: ${manifest.files.length} files, sha256 ${manifest.package_sha256}`);
}
