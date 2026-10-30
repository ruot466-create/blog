/* Create a local draft without overwriting an existing article. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const postsDirectory = fileURLToPath(new URL("../src/content/posts/", import.meta.url));

export function createPost(fileName, { directory = postsDirectory, now = new Date() } = {}) {
  if (!fileName || typeof fileName !== "string") throw new Error("请提供文章文件名。");
  const normalized = fileName.replaceAll("\\", "/");
  const parts = normalized.split("/");
  for (const part of parts) {
    if (part.startsWith("_")) throw new Error("Astro 会忽略以下划线开头的文章或目录，请换一个文件名。");
    if (!part || part === "." || part === ".." || /[<>:"|?*\x00-\x1f]/.test(part) || /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)) {
      throw new Error("请使用文章目录内的相对文件名，避免 ..、绝对路径和系统保留字符。");
    }
  }
  if (/\.mdx$/i.test(parts.at(-1))) {
    throw new Error("当前博客未启用 MDX，请使用 .md 文件名。");
  }
  if (/\.md$/i.test(parts.at(-1))) parts[parts.length - 1] = parts.at(-1).replace(/\.md$/i, ".md");
  else parts[parts.length - 1] += ".md";
  const root = path.resolve(directory);
  const fullPath = path.join(root, ...parts);
  // Do not follow an existing directory link outside the article tree.
  let parent = root;
  for (const part of parts.slice(0, -1)) {
    parent = path.join(parent, part);
    if (fs.existsSync(parent) && fs.lstatSync(parent).isSymbolicLink()) {
      throw new Error("文章子目录不能是符号链接或目录联接。");
    }
  }
  const title = parts.at(-1).replace(/\.(md|mdx)$/i, "");
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const content = `---
title: ${JSON.stringify(title)}
published: ${date}
description: ''
image: ''
tags: []
category: '' # 成长 / 技术 / 音乐 / 生活；AI 请写入 tags
draft: true
lang: ''
---
`;
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  let created = false;
  try {
    const fd = fs.openSync(fullPath, "wx");
    created = true;
    try {
      fs.writeFileSync(fd, content);
    } finally {
      fs.closeSync(fd);
    }
  } catch (error) {
    if (created) {
      try { fs.unlinkSync(fullPath); }
      catch (cleanupError) {
        if (cleanupError.code !== "ENOENT") {
          throw new Error(`草稿写入失败且半成品未能清理：${fullPath}（${error.message}；${cleanupError.message}）`, { cause: error });
        }
      }
    }
    if (error.code === "EEXIST") throw new Error(`文章已存在，未覆盖：${fullPath}`);
    throw error;
  }
  return fullPath;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
      console.log('用法：pnpm new-post "文章文件名"（可使用子目录）\n创建本地 Markdown 草稿，默认 draft: true；已有文章不会覆盖。\n带空格或 # 的文件名请加引号；支持 .md，尚未启用 MDX。');
    } else {
      if (args.length !== 1) throw new Error('用法：pnpm new-post "文章文件名"（可使用子目录）');
      console.log(`草稿已创建：${createPost(args[0])}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
