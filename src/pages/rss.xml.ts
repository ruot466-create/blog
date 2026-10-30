import { getImage } from "astro:assets";
import rss from "@astrojs/rss";
import { getSortedPosts } from "@utils/content-utils";
import { getLocalImage } from "@utils/image-utils";
import { renderRssContent } from "@utils/rss-content";
import { getDir, url } from "@utils/url-utils";
import type { APIContext } from "astro";
import { siteConfig } from "@/config";

export async function GET(context: APIContext) {
	const blog = await getSortedPosts();
	const site = context.site ?? "https://fuwari.vercel.app";

	return rss({
		title: siteConfig.title,
		description: siteConfig.subtitle || "No description",
		site,
		items: await Promise.all(
			blog.map(async (post) => {
				const content =
					typeof post.body === "string" ? post.body : String(post.body || "");
				const link = url(`/posts/${post.slug}/`);
				const articleUrl = new URL(link, site);
				const renderedContent = await renderRssContent(
					content,
					async (source) => {
						if (source.startsWith("/") || /^https?:\/\//i.test(source)) {
							return new URL(source, site).href;
						}
						if (/^[a-z][a-z\d+.-]*:/i.test(source)) return source;
						const localPath = decodeURIComponent(source.split(/[?#]/, 1)[0]);
						const image = await getLocalImage(
							localPath,
							`content/posts/${getDir(post.id)}`,
						);
						if (!image) return new URL(source, articleUrl).href;
						const generated = await getImage({ src: image });
						return new URL(generated.src, site).href;
					},
				);
				return {
					title: post.data.title,
					pubDate: post.data.published,
					description: post.data.description || "",
					link,
					content: renderedContent,
				};
			}),
		),
		customData: `<language>${siteConfig.lang}</language>`,
	});
}
