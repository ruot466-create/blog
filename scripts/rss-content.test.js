import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test, { after } from 'node:test';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';
import ts from 'typescript';

const cache = new URL('../.astro/', import.meta.url);
fs.mkdirSync(cache, { recursive: true });
const directory = fs.mkdtempSync(new URL('rss-test-', cache));
const modulePath = path.join(directory, 'rss-content.mjs');
const output = ts.transpileModule(fs.readFileSync(new URL('../src/utils/rss-content.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
fs.writeFileSync(modulePath, output);
after(() => { fs.unlinkSync(modulePath); fs.rmdirSync(directory); });
const { renderRssContent } = await import(pathToFileURL(modulePath).href);

test('正文图片、引用和列表内图片全部解析，保留替代文本和标题', async () => {
  const calls = [];
  const html = await renderRssContent('![中文](./a.png "说明")\n\n> ![b](./b.png)\n\n- ![c](./c.png)', async source => {
    calls.push(source); return 'https://example.com/assets/' + source.slice(2);
  });
  assert.deepEqual(calls.sort(), ['./a.png', './b.png', './c.png']);
  assert.match(html, /src="https:\/\/example.com\/assets\/a.png" alt="中文" title="说明"/);
  assert.match(html, /<blockquote>/);
  assert.match(html, /<li>/);
});

test('无图片文章保留原渲染结果，代码示例不当成图片处理', async () => {
  const markdown = '# Heading\n\n[link](./post/)\n\n```md\n![example](./example.png)\n```\n\n`![inline](./inline.png)`';
  const expected = sanitizeHtml(new MarkdownIt().render(markdown), { allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']) });
  assert.equal(await renderRssContent(markdown, async () => { throw new Error('不应解析代码图片'); }), expected);
});

test('图片结果仍经过原有 HTML 安全过滤', async () => {
  const html = await renderRssContent('![unsafe](./image.png)', async () => 'javascript:alert(1)');
  assert.match(html, /alt="unsafe"/);
  assert.doesNotMatch(html, /src=|javascript:/);
});

test('XML 禁用控制字符在渲染前删除', async () => {
  assert.equal(await renderRssContent('a\x01b\uFFFFc', async source => source), '<p>abc</p>\n');
});

test('解析失败传递到构建，避免悄悄输出错误地址', async () => {
  await assert.rejects(renderRssContent('![image](./image.png)', async () => { throw new Error('asset failure'); }), /asset failure/);
});

test('同一文件多次引用均保留在结果中', async () => {
  const html = await renderRssContent('![one](./x.png) ![two](./x.png)', async () => 'https://example.com/x.webp');
  assert.equal(html.match(/https:\/\/example.com\/x.webp/g).length, 2);
  assert.match(html, /alt="one"/);
  assert.match(html, /alt="two"/);
});
