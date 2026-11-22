import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const repo = 'Pizzha541/Spectra';
const version = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8')).version;
const tag = 'v' + version;
if (process.env.GITHUB_REF_NAME !== tag) throw new Error('La etiqueta debe coincidir con la versión de Tauri.');
const dir = 'src-tauri/target/release/bundle/nsis';
const name = `SPECTRA_${version}_x64-setup.exe`;
const exe = join(dir, name);
const sig = exe + '.sig';
if (!readdirSync(dir).includes(name)) throw new Error('Falta el instalador x64.');
const signature = readFileSync(sig, 'utf8').trim();
if (!signature) throw new Error('Falta la firma.');
const notesFile = `releases/${tag}.md`;
const notes = existsSync(notesFile) ? readFileSync(notesFile, 'utf8') :
  execFileSync('gh', ['api', `repos/${repo}/releases/generate-notes`, '-f', 'tag_name=' + tag, '--jq', '.body'], {encoding:'utf8'});
const manifest = join(dir, 'latest.json');
writeFileSync(manifest, JSON.stringify({
  version, notes, pub_date: new Date().toISOString(),
  platforms: { 'windows-x86_64': { signature, url: `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(name)}` } }
}, null, 2));
const body = join(dir, 'release-notes.md');
writeFileSync(body, notes);
const flags = version.split('+')[0].includes('-') ? ['--prerelease', '--latest=false'] : [];
execFileSync('gh', ['release', 'create', tag, exe, sig, manifest, '--verify-tag', '--repo', repo,
  '--title', 'SPECTRA ' + version, '--notes-file', body, ...flags], {stdio:'inherit'});
