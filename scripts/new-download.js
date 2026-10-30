/* 复制分享文件并打印清单条目；--info 只读取元数据，不复制或覆盖文件。 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const maxBytes = 25 * 1024 * 1024;
let incompleteTarget;

function readBounded(file) {
 const fd = fs.openSync(file, "r");
 const chunks = [];
 let total = 0;
 try {
  while (true) {
   const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, maxBytes + 1 - total));
   const count = fs.readSync(fd, chunk, 0, chunk.length, null);
   if (!count) break;
   total += count;
   if (total > maxBytes) throw new Error("文件超过项目约定的 25 MiB 上限，请使用外部下载地址。");
   chunks.push(chunk.subarray(0, count));
  }
  return Buffer.concat(chunks, total);
 } finally {
  fs.closeSync(fd);
 }
}


try {
 const args = process.argv.slice(2);
 if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
  console.log('用法：pnpm new-download [--info] <文件路径> ["一句话说明"]\n常规导入：复制到本博客 public/downloads 并打印清单条目，已有文件不会覆盖。\n--info：仅读取大小与 SHA-256，不复制文件。单文件上限 25 MiB。');
 } else {
  const infoOnly = args[0] === "--info";
  if (infoOnly) args.shift();
  if (!args[0] || args.length > 2) throw new Error('用法：pnpm new-download [--info] <文件路径> ["一句话说明"]');
  const sourcePath = path.resolve(args[0]);
  const stat = fs.statSync(sourcePath);
  if (!stat.isFile()) throw new Error(`不是普通文件：${sourcePath}`);
  if (stat.size > maxBytes) throw new Error("文件超过项目约定的 25 MiB 上限，请使用外部下载地址。");
  const name = path.basename(sourcePath);
  const targetPath = path.join(root, "public", "downloads", name);
  // Read a bounded snapshot before creating any output; source files can still grow.
  const bytes = readBounded(sourcePath);
  if (!infoOnly) {
   fs.mkdirSync(path.dirname(targetPath), { recursive: true });
   const fd = fs.openSync(targetPath, "wx");
   incompleteTarget = targetPath;
   try {
    fs.writeFileSync(fd, bytes);
   } finally {
    fs.closeSync(fd);
   }
   incompleteTarget = undefined;
  }
  const today = new Date();
  const updated = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const entry = {
   name,
   description: args[1] || "",
   type: path.extname(name).slice(1).toLowerCase() || "file",
   size: bytes.length,
   updated,
   url: `/downloads/${encodeURIComponent(name)}`,
   sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
  // JSON 字符串也是合法的 TypeScript 字符串，保留引号、反斜线和换行。
  console.log(`${infoOnly ? "仅读取" : "已复制到 public/downloads"}：${name}\n\n把下列条目粘贴到 src/data/downloads.ts 的 DOWNLOADS 数组：\n\n${JSON.stringify(entry, null, "\t")},\n`);
 }
} catch (error) {
 if (incompleteTarget) {
  try { fs.unlinkSync(incompleteTarget); }
  catch (cleanupError) { console.error(`本次半成品未能清理：${incompleteTarget}（${cleanupError.message}）`); }
 }
 console.error(error.code === "EEXIST"
  ? "目标文件已存在，未覆盖。仅读取大小和校验值可使用 --info；更新前请备份旧文件。"
  : `分享文件处理失败：${error.message}`);
 process.exitCode = 1;
}

