import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/utils/content-utils.ts', import.meta.url), 'utf8');
function load(posts) {
  const exports = {};
  const output = ts.transpileModule(source.replaceAll('import.meta.env.PROD', 'true'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, {
    exports,
    require(name) {
      if (name === 'astro:content') return { getCollection: async (_name, filter) => posts.filter(filter) };
      if (name === '@i18n/i18nKey') return { default: { uncategorized: 'uncategorized' } };
      if (name === '@i18n/translation') return { i18n: () => '未分类' };
      if (name === '@utils/url-utils.ts') return { getCategoryUrl: name => '/archive/?category=' + encodeURIComponent(name) };
      if (name === '../constants/blog') return { BLOG_CATEGORIES: [{ name: '技术' }] };
      throw new Error('Unexpected import: ' + name);
    },
  });
  return exports;
}
const post = (tags, category, draft = false) => ({ data: { tags, category, draft } });
const plain = value => JSON.parse(JSON.stringify(value));

test('特殊属性名标签按普通文本计数', async () => {
  const { getTagList } = load([post(['__proto__', 'constructor', 'toString'], '技术'), post(['__proto__', 'constructor'], '技术')]);
  const tags = plain(await getTagList());
  assert.equal(tags.length, 3);
  for (const [name, expected] of [['__proto__', 2], ['constructor', 2], ['toString', 1]]) {
    assert.equal(tags.find(tag => tag.name === name)?.count, expected, name);
  }
});

test('特殊属性名分类不会继承对象属性或丢失分类', async () => {
  const { getCategoryList } = load(['__proto__', 'constructor', 'toString', '__proto__'].map(category => post([], category)));
  const categories = plain(await getCategoryList());
  assert.equal(categories.length, 3);
  assert.equal(categories.find(category => category.name === '__proto__')?.count, 2);
  assert.equal(categories.find(category => category.name === 'constructor')?.count, 1);
  assert.equal(categories.find(category => category.name === 'toString')?.count, 1);
});

test('普通标签顺序和正式环境草稿排除保持一致', async () => {
  const { getTagList } = load([post(['z', 'Alpha'], '技术'), post(['z'], '技术'), post(['hidden'], '技术', true)]);
  assert.deepEqual(plain(await getTagList()), [{ name: 'Alpha', count: 1 }, { name: 'z', count: 2 }]);
});

test('分类既定顺序、未分类合并及草稿排除保持一致', async () => {
  const { getCategoryList } = load([post([], 'z'), post([], null), post([], '技术'), post([], ''), post([], 'hidden', true)]);
  assert.deepEqual(plain(await getCategoryList()).map(({ name, count }) => ({ name, count })), [
    { name: '技术', count: 1 }, { name: '未分类', count: 2 }, { name: 'z', count: 1 },
  ].sort((a, b) => a.name === '技术' ? -1 : b.name === '技术' ? 1 : a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
});
