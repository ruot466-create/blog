import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const page = fs.readFileSync(new URL('../src/pages/guitar.astro', import.meta.url), 'utf8');
const start = page.indexOf('// ---- 节拍器 ----');
const end = page.indexOf('// 首屏默认', start);
assert(start >= 0 && end > start, '必须找到实际生产节拍器代码');
const production = ts.transpileModule(page.slice(start, end), {
 compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
 reportDiagnostics: true,
});
assert(!production.diagnostics.some(d => d.category === ts.DiagnosticCategory.Error));

function element() {
 const handlers = new Map();
 return {
  children: [], value: '', textContent: '', checked: false,
  classList: { add() {}, remove() {} },
  addEventListener(name, handler) { handlers.set(name, handler); },
  appendChild(child) { this.children.push(child); },
  fire(name) { handlers.get(name)?.({ target: this }); },
 };
}
function metronome(meter, { bpm = 90, accelerate = true } = {}) {
 const ids = ['metro-toggle', 'metro-bpm', 'metro-value', 'metro-dot', 'metro-meters', 'metro-accel', 'metro-beat'];
 const elements = Object.fromEntries(ids.map(id => [id, element()]));
 elements['metro-bpm'].value = String(bpm);
 elements['metro-accel'].checked = accelerate;
 const intervals = new Map();
 let nextId = 0;
 const ac = {
  currentTime: 0,
  createOscillator: () => ({ frequency: {}, connect() {}, start() {}, stop() {} }),
  createGain: () => ({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }),
 };
 vm.runInNewContext(production.outputText, {
  document: { getElementById: id => elements[id], createElement: element },
  getCtx: () => ac, track() {}, out: () => ({}),
  setTimeout() {},
  setInterval(fn, delay) { const id = ++nextId; intervals.set(id, { fn, delay }); return id; },
  clearInterval(id) { intervals.delete(id); },
 });
 const meterButton = elements['metro-meters'].children.find(button => button.textContent === meter);
 assert(meterButton, `生产界面必须有${meter}拍号`);
 meterButton.fire('click');
 return {
  start() { elements['metro-toggle'].fire('click'); },
  stop() { elements['metro-toggle'].fire('click'); },
  beat() { assert.equal(intervals.size, 1); [...intervals.values()][0].fn(); },
  get bpm() { return Number(elements['metro-bpm'].value); },
  get intervalCount() { return intervals.size; },
  get delay() { return [...intervals.values()][0]?.delay; },
  get label() { return elements['metro-beat'].textContent; },
 };
}

for (const meter of ['4/4', '3/4', '6/8', '2/4']) {
 test(`${meter}渐快始终在第8拍加4 BPM`, () => {
  const metro = metronome(meter);
  metro.start(); // Start emits the first beat immediately.
  for (let count = 2; count <= 7; count++) metro.beat();
  assert.equal(metro.bpm, 90, '前7拍不能提前加速');
  metro.beat();
  assert.equal(metro.bpm, 94, '第8拍必须加速');
  assert.equal(metro.delay, 60000 / 94);
  for (let count = 1; count <= 8; count++) metro.beat();
  assert.equal(metro.bpm, 98);
  assert.equal(metro.intervalCount, 1, '加速不得重复开启定时器');
  metro.stop();
  assert.equal(metro.intervalCount, 0);
  assert.equal(metro.label, '已停止');
 });
}

test('未勾选渐快保持速度，停止后不再保留定时器', () => {
 const metro = metronome('3/4', { accelerate: false });
 metro.start();
 for (let i = 0; i < 24; i++) metro.beat();
 assert.equal(metro.bpm, 90);
 metro.stop();
 assert.equal(metro.intervalCount, 0);
});

test('渐快速度不会超过200 BPM', () => {
 const metro = metronome('4/4', { bpm: 198 });
 metro.start();
 for (let i = 0; i < 23; i++) metro.beat();
 assert.equal(metro.bpm, 200);
 assert.equal(metro.intervalCount, 1);
 assert.equal(metro.delay, 300);
 metro.stop();
});
