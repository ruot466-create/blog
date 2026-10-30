import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createPost } from './new-post.js';

function fixture(t) {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'blog-new-post-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  return directory;
}

test('nested Unicode draft has quoted title, local date and default draft status',t=>{
 const directory=fixture(t);
 const target=createPost('技术/问答 #1.MD',{directory,now:new Date(2026,9,26)});
 const content=fs.readFileSync(target,'utf8');
 assert.equal(target,path.join(directory,'技术','问答 #1.md'));
 assert.equal(JSON.parse(content.split('\n')[1].slice(7)),'问答 #1');
 assert.match(content,/published: 2026-10-26\n/);
 assert.match(content,/draft: true\n/);
});
test('existing article is never overwritten',t=>{
 const directory=fixture(t);
 const target=createPost('keep',{directory});
 fs.writeFileSync(target,'用户原文');
 assert.throws(()=>createPost('keep',{directory}),/未覆盖/);
 assert.equal(fs.readFileSync(target,'utf8'),'用户原文');
});
test('traversal, absolute paths, alternate streams and reserved filenames are rejected',t=>{
 const directory=fixture(t);
 for(const name of ['', '../outside','..\\outside','nested/../../outside','/absolute','C:\\absolute','title: subtitle','bad?','bad*','a//b','trailing.','name ','NUL.md','nested/COM1.txt']) {
  assert.throws(()=>createPost(name,{directory}),undefined,name);
 }
 assert.deepEqual(fs.readdirSync(directory),[]);
});
test('Windows-style nested Markdown paths are preserved',t=>{
 const directory=fixture(t);
 const target=createPost('nested\\post.md',{directory});
 assert.equal(target,path.join(directory,'nested','post.md'));
});
test('unsupported MDX fails before creating a file',t=>{
 const directory=fixture(t);
 for(const name of ['post.mdx','nested/post.MDX']) {
  assert.throws(()=>createPost(name,{directory}),/未启用 MDX/);
 }
 assert.deepEqual(fs.readdirSync(directory),[]);
});
test('Astro-ignored underscore names fail before creating output',t=>{
 const directory=fixture(t);
 for(const name of ['_hidden','folder/_post.md','_folder/post.md']) {
  assert.throws(()=>createPost(name,{directory}),/Astro 会忽略/);
 }
 assert.deepEqual(fs.readdirSync(directory),[]);
});
test('directory links cannot redirect output',t=>{
 const directory=fixture(t),outside=fixture(t);
 fs.symlinkSync(outside,path.join(directory,'redirect'),process.platform==='win32'?'junction':'dir');
 assert.throws(()=>createPost('redirect/escape',{directory}),/符号链接/);
 assert.deepEqual(fs.readdirSync(outside),[]);
});
test('CLI from another working directory writes to repository and refuses duplicate',t=>{
 const directory=fixture(t);
 const name=`verification-${process.pid}-${Date.now()}`;
 const target=fileURLToPath(new URL(`../src/content/posts/${name}.md`,import.meta.url));
 t.after(()=>fs.rmSync(target,{force:true}));
 const script=fileURLToPath(new URL('./new-post.js',import.meta.url));
 const run=spawnSync(process.execPath,[script,name],{cwd:directory,encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 assert(fs.existsSync(target));
 assert.deepEqual(fs.readdirSync(directory),[]);
 const rerun=spawnSync(process.execPath,[script,name],{cwd:directory,encoding:'utf8'});
 assert.equal(rerun.status,1);
});

test('草稿写入失败不留下半篇文章，并允许直接重试',t=>{
 const directory=fixture(t);
 const target=path.join(directory,'failed-draft.md');
 const originalWrite=fs.writeFileSync;
 t.mock.method(fs,'writeFileSync',(file,content,options)=>{
  if(typeof file==='number'||file===target){
   originalWrite(file,'---\ntitle:',typeof file==='number'?undefined:options);
   throw Object.assign(new Error('controlled draft write failure'),{code:'EIO'});
  }
  return originalWrite(file,content,options);
 });
 assert.throws(()=>createPost('failed-draft',{directory}),/controlled draft write failure/);
 assert.ok(!fs.existsSync(target),'失败后不应留半篇文章阻止重试');
 t.mock.restoreAll();
 assert.equal(createPost('failed-draft',{directory}),target);
 assert.match(fs.readFileSync(target,'utf8'),/draft: true/);
});

test('草稿清理失败明确报告原错误与半成品路径',t=>{
 const directory=fixture(t);
 const target=path.join(directory,'cleanup-failed.md');
 const originalWrite=fs.writeFileSync;
 t.mock.method(fs,'writeFileSync',(file,content,options)=>{
  if(typeof file==='number'){
   originalWrite(file,'partial');
   throw Object.assign(new Error('controlled original error'),{code:'EIO'});
  }
  return originalWrite(file,content,options);
 });
 t.mock.method(fs,'unlinkSync',()=>{throw Object.assign(new Error('controlled cleanup denial'),{code:'EACCES'});});
 assert.throws(()=>createPost('cleanup-failed',{directory}),error=>{
  assert.match(error.message,/controlled original error/);
  assert.match(error.message,/controlled cleanup denial/);
  assert.ok(error.message.includes(target));
  return true;
 });
 assert.equal(fs.readFileSync(target,'utf8'),'partial');
 t.mock.restoreAll();
});

test('新文章CLI帮助为只读，不创建名为--help的草稿',t=>{
 const directory=fixture(t);
 const site=path.join(directory,'site');
 const scripts=path.join(site,'scripts');
 fs.mkdirSync(scripts,{recursive:true});
 const script=path.join(scripts,'new-post.mjs');
 fs.copyFileSync(fileURLToPath(new URL('./new-post.js',import.meta.url)),script);
 for(const flag of ['--help','-h']){
  const result=spawnSync(process.execPath,[script,flag],{cwd:directory,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/用法/);
  assert.deepEqual(fs.readdirSync(site),['scripts'],'帮助不应创建src或文章');
 }
});
