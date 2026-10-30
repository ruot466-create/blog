import path from "node:path";
import type { ImageMetadata } from "astro";

// Keep unrelated source files and attachments out of the image import graph.
const images = import.meta.glob<ImageMetadata>(
	[
		"../**/*.[jJ][pP][gG]",
		"../**/*.[jJ][pP][eE][gG]",
		"../**/*.[pP][nN][gG]",
		"../**/*.[tT][iI][fF][fF]",
		"../**/*.[wW][eE][bB][pP]",
		"../**/*.[gG][iI][fF]",
		"../**/*.[sS][vV][gG]",
		"../**/*.[aA][vV][iI][fF]",
	],
	{ import: "default" },
);

export async function getLocalImage(
	source: string,
	basePath = "/",
): Promise<ImageMetadata | undefined> {
	const relative = path.posix.join(
		basePath.replaceAll("\\", "/"),
		source.replaceAll("\\", "/"),
	);
	const key = `../${relative.replace(/^\/+/, "")}`;
	const load = images[key];
	return load ? load() : undefined;
}
