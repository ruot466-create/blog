import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const parser = new MarkdownIt();

export async function renderRssContent(
	markdown: string,
	resolveImage: (source: string) => Promise<string>,
): Promise<string> {
	const cleaned = markdown.replace(
		// biome-ignore lint/suspicious/noControlCharactersInRegex: https://www.w3.org/TR/xml/#charsets
		/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
		"",
	);
	const tokens = parser.parse(cleaned, {});
	const pending = [...tokens];
	while (pending.length) {
		const token = pending.pop();
		if (!token) continue;
		if (token.children) pending.push(...token.children);
		if (token.type === "image") {
			const source = token.attrGet("src");
			if (source) token.attrSet("src", await resolveImage(source));
		}
	}
	return sanitizeHtml(parser.renderer.render(tokens, parser.options, {}), {
		allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
	});
}
