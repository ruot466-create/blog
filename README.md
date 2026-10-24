# ruo3t3 的博客

记录成长、技术、音乐和生活。基于 Astro 与 Fuwari，部署到 Cloudflare Workers。

## 本地使用

需要 Node.js 22 与 pnpm（版本见 `package.json`）。

```sh
pnpm install
pnpm dev
```

正式效果与搜索功能使用构建后的预览验证：

```sh
pnpm check
pnpm build
pnpm preview
```

## 内容入口

| 位置 | 用途 |
| --- | --- |
| `src/content/posts/` | 已发布文章与草稿 |
| `src/content/spec/` | 关于、近况、工具清单 |
| `src/constants/blog.ts` | 四个栏目的顺序与介绍 |
| `src/config.ts` | 站点信息、导航与个人资料 |
| `templates/` | 通用、阶段总结、技术、练琴模板 |
| `public/images/` | 文章图片 |

运行 `pnpm new-post 文件名` 创建草稿，写好后将 `draft` 改为 `false`。分类固定为成长、技术、音乐、生活，AI 使用标签。

写作选题与发布步骤见 [写作与维护](docs/writing-guide.md)，历史取舍见 [博客决策记录](docs/decisions-blog.md)。

## 部署

推送 `main` 后由 `.github/workflows/deploy.yml` 构建并部署到 Cloudflare Workers。静态资源配置在 `wrangler.toml`；站点地址在 `astro.config.mjs`。

## 主题与许可

主题来自 [Fuwari](https://github.com/saicaca/fuwari)，框架为 [Astro](https://astro.build/)。主题的原始中文说明保留在 [docs/README.zh-CN.md](docs/README.zh-CN.md)。代码许可见 [LICENSE](LICENSE)，文章许可由 `src/config.ts` 控制；图片等第三方素材的权利以各处署名为准。
