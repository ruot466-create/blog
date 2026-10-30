import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const output=ts.transpileModule(fs.readFileSync(new URL('../src/utils/download-validation.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {validateDownloads}=await import('data:text/javascript;base64,'+Buffer.from(output).toString('base64'));
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'blog-download-validation-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const publicDirectory=path.join(root,'public');
 fs.mkdirSync(path.join(publicDirectory,'downloads'),{recursive:true});
 const bytes=Buffer.from('actual downloadable bytes');
 const name='中文 #1.txt';
 const file=path.join(publicDirectory,'downloads',name);
 fs.writeFileSync(file,bytes);
 const item={name,description:'fixture',type:'txt',size:bytes.length,updated:'2026-10-26',url:'/downloads/'+encodeURIComponent(name),sha256:createHash('sha256').update(bytes).digest('hex')};
 return {publicDirectory,item,file};
}

test('有效编码文件名、大小与大写哈希通过且文件不变',t=>{
 const {publicDirectory,item,file}=fixture(t);const before=fs.statSync(file);
 assert.deepEqual(validateDownloads([{...item,sha256:item.sha256.toUpperCase()}],publicDirectory),{localFiles:1,externalLinks:0});
 assert.equal(fs.statSync(file).mtimeMs,before.mtimeMs);
});
test('缺失文件和多个清单错误一起报告',t=>{
 const {publicDirectory,item}=fixture(t);
 assert.throws(()=>validateDownloads([{...item,name:'missing.zip',url:'/downloads/missing.zip'},{...item,name:'wrong-size',size:1}],publicDirectory),error=>{
  assert.match(error.message,/missing.zip/);assert.match(error.message,/wrong-size/);assert.match(error.message,/大小不匹配/);return true;
 });
});
test('错误大小、哈希内容与哈希格式被拒绝',t=>{
 const {publicDirectory,item}=fixture(t);
 assert.throws(()=>validateDownloads([{...item,size:1}],publicDirectory),/大小不匹配/);
 assert.throws(()=>validateDownloads([{...item,sha256:'0'.repeat(64)}],publicDirectory),/校验值不一致/);
 assert.throws(()=>validateDownloads([{...item,sha256:'bad'}],publicDirectory),/格式无效/);
});
test('编码越界路径与原始井号被拒绝',t=>{
 const {publicDirectory,item}=fixture(t);
 assert.throws(()=>validateDownloads([{...item,url:'/downloads/%2e%2e%2fsecret.txt'}],publicDirectory),/路径超出/);
 assert.throws(()=>validateDownloads([{...item,url:'/downloads/name#part.txt'}],publicDirectory),/片段/);
});
test('目录和超过25MiB的真实文件被拒绝',t=>{
 const {publicDirectory,item}=fixture(t);fs.mkdirSync(path.join(publicDirectory,'downloads','folder'));
 assert.throws(()=>validateDownloads([{...item,url:'/downloads/folder'}],publicDirectory),/不是普通文件/);
 const large=path.join(publicDirectory,'downloads','large.zip');const fd=fs.openSync(large,'w');fs.ftruncateSync(fd,25*1024*1024+1);fs.closeSync(fd);
 assert.throws(()=>validateDownloads([{...item,url:'/downloads/large.zip'}],publicDirectory),/超过 25 MiB/);
});
test('外链只检查格式且空清单可用',t=>{
 const {publicDirectory,item}=fixture(t);
 assert.deepEqual(validateDownloads([{...item,url:'https://example.invalid/file.zip?version=1',size:100*1024*1024}],publicDirectory),{localFiles:0,externalLinks:1});
 assert.deepEqual(validateDownloads([],publicDirectory),{localFiles:0,externalLinks:0});
 assert.throws(()=>validateDownloads([{...item,url:'https://'}],publicDirectory),/校验失败/);
 assert.throws(()=>validateDownloads([{...item,url:'//example.invalid/file.zip'}],publicDirectory),/完整 http/);
});
test('零字节文件与未提供可选哈希均可用',t=>{
 const {publicDirectory,item,file}=fixture(t);fs.writeFileSync(file,'');
 assert.deepEqual(validateDownloads([{...item,size:0,sha256:undefined}],publicDirectory),{localFiles:1,externalLinks:0});
});

test('目录联接不能把范围外文件伪装成站内下载',t=>{
 const {publicDirectory,item}=fixture(t);
 const outside=path.resolve(publicDirectory,'..','outside');fs.mkdirSync(outside);
 fs.writeFileSync(path.join(outside,'outside.txt'),'outside');
 fs.symlinkSync(outside,path.join(publicDirectory,'downloads','linked'),process.platform==='win32'?'junction':'dir');
 assert.throws(()=>validateDownloads([{...item,name:'linked-outside',url:'/downloads/linked/outside.txt',size:7,sha256:undefined}],publicDirectory),/实际下载路径超出/);
});
test('范围内目录链接仍可正常使用',t=>{
 const {publicDirectory,item}=fixture(t);
 const inside=path.join(publicDirectory,'downloads','actual');fs.mkdirSync(inside);fs.writeFileSync(path.join(inside,'inside.txt'),'inside');
 fs.symlinkSync(inside,path.join(publicDirectory,'downloads','alias'),process.platform==='win32'?'junction':'dir');
 assert.deepEqual(validateDownloads([{...item,url:'/downloads/alias/inside.txt',size:6,sha256:undefined}],publicDirectory),{localFiles:1,externalLinks:0});
});
