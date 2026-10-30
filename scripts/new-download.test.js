import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

test('分享文件：任意工作目录、特殊字符、拒绝覆盖及只读更新', () => {
 const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-download-'));
 try {
  const scripts = path.join(temp, 'site', 'scripts');
  fs.mkdirSync(scripts, { recursive: true });
  const script = path.join(scripts, 'new-download.mjs');
  fs.copyFileSync(fileURLToPath(new URL('./new-download.js', import.meta.url)), script);
  const source = path.join(temp, '中文 #100%.txt');
  const bytes = Buffer.from('真实文件内容\n');
  fs.writeFileSync(source, bytes);
  const description = '含"引号"、\\路径\n以及换行';
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { cwd: temp, encoding: 'utf8' });
  const result = run(source, description);
  assert.equal(result.status, 0, result.stderr);
  const entry = JSON.parse(result.stdout.slice(result.stdout.indexOf('{'), result.stdout.lastIndexOf('}') + 1));
  assert.equal(entry.description, description);
  assert.equal(entry.size, bytes.length);
  assert.equal(entry.sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(decodeURIComponent(entry.url), '/downloads/中文 #100%.txt');
  assert.ok(!entry.url.includes('#'));
  const target = path.join(temp, 'site', 'public', 'downloads', path.basename(source));
  assert.deepEqual(fs.readFileSync(target), bytes);
  fs.writeFileSync(source, '新版本');
  assert.equal(run(source).status, 1);
  assert.deepEqual(fs.readFileSync(target), bytes);
  assert.equal(run('--info', source).status, 0);
  assert.deepEqual(fs.readFileSync(target), bytes);
  const large = path.join(temp, 'large.zip');
  const fd = fs.openSync(large, 'w');
  fs.ftruncateSync(fd, 25 * 1024 * 1024 + 1);
  fs.closeSync(fd);
  assert.equal(run(large).status, 1);
  assert.ok(!fs.existsSync(path.join(temp, 'site', 'public', 'downloads', 'large.zip')));
  assert.equal(run(path.join(temp, 'missing')).status, 1);
 } finally {
  fs.rmSync(temp, { recursive: true, force: true });
 }
});

test('导入写入失败清理本次半成品，既有目标不受影响', () => {
 const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-download-failure-'));
 try {
  const scripts = path.join(temp, 'site', 'scripts');
  fs.mkdirSync(scripts, { recursive: true });
  const script = path.join(scripts, 'new-download.mjs');
  fs.copyFileSync(fileURLToPath(new URL('./new-download.js', import.meta.url)), script);
  const source = path.join(temp, 'retry.zip');
  const original = Buffer.from('完整原始文件');
  fs.writeFileSync(source, original);
  const preload = path.join(temp, 'fail-write.mjs');
  fs.writeFileSync(preload, `import fs from 'node:fs';
const write = fs.writeFileSync.bind(fs);
fs.copyFileSync = (source, target) => { write(target, 'partial', {flag:'wx'}); throw Object.assign(new Error('controlled disk failure'),{code:'EIO'}); };
fs.writeFileSync = (target, bytes, options) => { if (typeof target === 'number') { write(target, 'partial'); throw Object.assign(new Error('controlled disk failure'),{code:'EIO'}); } return write(target, bytes, options); };
`);
  const target = path.join(temp, 'site', 'public', 'downloads', 'retry.zip');
  const fail = () => spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, script, source], { cwd: temp, encoding: 'utf8' });
  const first = fail();
  assert.equal(first.status, 1, first.stdout);
  assert.match(first.stderr, /controlled disk failure/);
  assert.ok(!fs.existsSync(target), '失败导入不应留下阻止重试的半成品');
  assert.deepEqual(fs.readFileSync(source), original);
  const retry = spawnSync(process.execPath, [script, source], { cwd: temp, encoding: 'utf8' });
  assert.equal(retry.status, 0, retry.stderr);
  assert.deepEqual(fs.readFileSync(target), original);
  assert.equal(fail().status, 1);
  assert.deepEqual(fs.readFileSync(target), original, '不得删除或改写既有目标');
 } finally {
  fs.rmSync(temp, { recursive: true, force: true });
 }
});

test('读取前源文件增长超过25MiB时不生成目标', () => {
 const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-download-growing-'));
 try {
  const scripts = path.join(temp, 'site', 'scripts');
  fs.mkdirSync(scripts, { recursive: true });
  const script = path.join(scripts, 'new-download.mjs');
  fs.copyFileSync(fileURLToPath(new URL('./new-download.js', import.meta.url)), script);
  const source = path.join(temp, 'growing.zip');
  fs.writeFileSync(source, 'initial');
  const preload = path.join(temp, 'grow-source.mjs');
  fs.writeFileSync(preload, `import fs from 'node:fs';
const stat = fs.statSync.bind(fs);
fs.statSync = (file, ...args) => { const result = stat(file, ...args); if (file === process.env.VERIFY_SOURCE) { const fd = fs.openSync(file, 'r+'); fs.ftruncateSync(fd, 25*1024*1024+1); fs.closeSync(fd); } return result; };
`);
  const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, script, source], { cwd: temp, encoding: 'utf8', env: {...process.env, VERIFY_SOURCE: source} });
  assert.equal(result.status, 1, '读取到超限内容后应拒绝导入');
  assert.match(result.stderr, /25 MiB/);
  assert.ok(!fs.existsSync(path.join(temp, 'site', 'public', 'downloads', 'growing.zip')));
 } finally {
  fs.rmSync(temp, { recursive: true, force: true });
 }
});

test('零字节和恰好25MiB的文件仍可导入', () => {
 const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-download-boundary-'));
 try {
  const scripts = path.join(temp, 'site', 'scripts');
  fs.mkdirSync(scripts, { recursive: true });
  const script = path.join(scripts, 'new-download.mjs');
  fs.copyFileSync(fileURLToPath(new URL('./new-download.js', import.meta.url)), script);
  for (const size of [0, 25 * 1024 * 1024]) {
   const source = path.join(temp, `boundary-${size}.zip`);
   const fd = fs.openSync(source, 'w');
   fs.ftruncateSync(fd, size);
   fs.closeSync(fd);
   const result = spawnSync(process.execPath, [script, source], { cwd: temp, encoding: 'utf8' });
   assert.equal(result.status, 0, result.stderr);
   const entry = JSON.parse(result.stdout.slice(result.stdout.indexOf('{'), result.stdout.lastIndexOf('}') + 1));
   const target = path.join(temp, 'site', 'public', 'downloads', path.basename(source));
   assert.equal(entry.size, size);
   assert.equal(fs.statSync(target).size, size);
   assert.equal(entry.sha256, createHash('sha256').update(fs.readFileSync(target)).digest('hex'));
  }
 } finally {
  fs.rmSync(temp, { recursive: true, force: true });
 }
});

test('分享导入CLI帮助为只读且展示--info入口',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'blog-download-help-'));
 try{
  const site=path.join(temp,'site');
  const scripts=path.join(site,'scripts');
  fs.mkdirSync(scripts,{recursive:true});
  const script=path.join(scripts,'new-download.mjs');
  fs.copyFileSync(fileURLToPath(new URL('./new-download.js',import.meta.url)),script);
  for(const flag of ['--help','-h']){
   const result=spawnSync(process.execPath,[script,flag],{cwd:temp,encoding:'utf8'});
   assert.equal(result.status,0,result.stderr);
   assert.match(result.stdout,/用法/);
   assert.match(result.stdout,/--info/);
   assert.deepEqual(fs.readdirSync(site),['scripts']);
  }
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
