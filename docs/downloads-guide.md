# 分享中心维护指南

分享中心页面在 `/downloads/`，导航入口「分享」。页面内容完全由集中式清单 `src/data/downloads.ts` 驱动：清单为空时显示空状态，有条目时逐条渲染名称、说明、类型、版本、大小、更新时间和下载链接。

## 添加一个新文件

1. 确认文件可以公开分发（版权、隐私都没有问题）。
2. 在仓库根目录运行：

   ```sh
   pnpm new-download <文件路径> "一句话说明"
   ```

   脚本会把文件复制到 `public/downloads/`，并打印一段清单条目（自动算好文件大小、SHA-256 和今天的日期）。
3. 把打印的条目粘贴进 `src/data/downloads.ts` 的 `DOWNLOADS` 数组，补上 `description`，需要的话加 `version` 字段。
4. `pnpm build` 后在 preview 里点一次「下载」，确认文件能正常保存。

## 更新文件（发新版本）

1. 删除 `public/downloads/` 里的旧文件，把新文件复制进去（文件名可以保持一致，也可以带版本号）。
2. 重跑 `pnpm new-download <新文件路径>`，得到新的大小、SHA-256 和日期。
3. 在清单里更新对应条目的 `version`、`size`、`sha256`、`updated`，说明文字顺带核对一遍。

## 限制与升级路径

- 博客通过 Cloudflare Workers 静态资产部署（`wrangler.toml` 指向 `dist/`），**单文件上限 25 MiB**；`public/` 下的文件会进入 Git 仓库并随每次部署上传。
- 超过 25 MiB 或者数量、体积明显变大的文件，改用 GitHub Releases（单文件最大 2 GiB）或 Cloudflare R2 存储，然后把清单里的 `url` 直接写成外部链接即可，页面代码不用改。
- 不要把包含 API Key、令牌或个人信息的文件放进 `public/`——这个目录下的所有内容都会被公开访问。
