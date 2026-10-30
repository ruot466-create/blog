# 分享中心维护指南

可先运行 `pnpm new-download --help` 查看参数；`--help` / `-h` 只显示帮助，不创建目录或复制文件。

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

1. 先把旧文件备份到 `public/` 之外，再把新文件复制到 `public/downloads/`（文件名可以保持一致，也可以带版本号）。
2. 对已经放好的文件运行 `pnpm new-download --info public/downloads/<文件名>`，得到新的大小、SHA-256 和日期。`--info` 只读，不会复制或覆盖文件。
3. 在清单里更新对应条目的 `version`、`size`、`sha256`、`updated`，说明文字顺带核对一遍。常规导入拒绝覆盖同名文件，避免误替换。

文件名中的中文、空格、`#` 和 `%` 会自动编码成可用的下载地址；说明文字中的引号、换行和反斜线会保留。脚本始终写入本博客的 `public/downloads/`，不随启动目录改变。超过项目约定的 25 MiB 上限时会在复制前停止。

导入会在创建目标前按实际读取内容复查 25 MiB 上限；发生写入失败时清理本次创建的半成品，保留源文件与已有同名目标，修复原因后可直接重试。

修改导入脚本后可运行 `node --test scripts/new-download.test.js` 验证这些边界。

## 限制与升级路径

- 博客通过 Cloudflare Workers 静态资产部署（`wrangler.toml` 指向 `dist/`），**单文件上限 25 MiB**；`public/` 下的文件会进入 Git 仓库并随每次部署上传。
- 超过 25 MiB 或者数量、体积明显变大的文件，改用 GitHub Releases（单文件最大 2 GiB）或 Cloudflare R2 存储，然后把清单里的 `url` 直接写成外部链接即可，页面代码不用改。
- 不要把包含 API Key、令牌或个人信息的文件放进 `public/`——这个目录下的所有内容都会被公开访问。

## 正式构建前的清单校验

`pnpm build` 会在生成页面前检查站内下载：文件存在、实际路径位于 `public/downloads` 范围内（含目录链接解析）、大小与清单一致、可选 SHA-256 正确，且不超过 25 MiB。报错会列出具体条目，可重新运行 `--info` 更新元数据。HTTP(S) 外链只检查地址格式，不在构建时联网验证。
