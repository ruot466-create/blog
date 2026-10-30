import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { DownloadItem } from "../data/downloads";

const maximumBytes = 25 * 1024 * 1024;
const localOrigin = "https://local-download.invalid";

function isOutside(directory: string, file: string): boolean {
	const relative = path.relative(directory, file);
	return (
		relative === ".." ||
		relative.startsWith(`..${path.sep}`) ||
		path.isAbsolute(relative)
	);
}

export function validateDownloads(
	items: readonly DownloadItem[],
	publicDirectory: string,
) {
	const directory = path.resolve(publicDirectory, "downloads");
	const errors: string[] = [];
	let localFiles = 0;
	let externalLinks = 0;
	for (const item of items) {
		try {
			const address = new URL(item.url, localOrigin);
			if (/^https?:\/\//i.test(item.url)) {
				externalLinks++;
				continue;
			}
			if (
				address.origin !== localOrigin ||
				!address.pathname.startsWith("/downloads/")
			) {
				throw new Error("地址必须是 /downloads/ 下的文件或完整 http(s) 外链");
			}
			if (address.hash)
				throw new Error("本地下载地址含片段，请将文件名中的 # 编码为 %23");
			const file = path.resolve(
				publicDirectory,
				`.${decodeURIComponent(address.pathname)}`,
			);
			if (isOutside(directory, file))
				throw new Error("下载路径超出 public/downloads");
			if (isOutside(fs.realpathSync(directory), fs.realpathSync(file))) {
				throw new Error("实际下载路径超出 public/downloads");
			}
			if (
				!Number.isSafeInteger(item.size) ||
				item.size < 0 ||
				item.size > maximumBytes
			) {
				throw new Error("清单大小必须是 0 至 25 MiB 的整数字节数");
			}
			const expectedHash = item.sha256?.toLowerCase();
			if (expectedHash && !/^[a-f0-9]{64}$/.test(expectedHash))
				throw new Error("SHA-256 格式无效");
			const fd = fs.openSync(file, "r");
			try {
				const stat = fs.fstatSync(fd);
				if (!stat.isFile()) throw new Error("目标不是普通文件");
				if (stat.size > maximumBytes) throw new Error("实际文件超过 25 MiB");
				const hash = createHash("sha256");
				const buffer = new Uint8Array(64 * 1024);
				let size = 0;
				while (true) {
					const count = fs.readSync(
						fd,
						buffer,
						0,
						Math.min(buffer.length, maximumBytes + 1 - size),
						null,
					);
					if (count === 0) break;
					size += count;
					if (size > maximumBytes) throw new Error("读取时文件增长超过 25 MiB");
					hash.update(buffer.subarray(0, count));
				}
				if (size !== item.size)
					throw new Error(`大小不匹配：清单 ${item.size} B，实际 ${size} B`);
				if (expectedHash && hash.digest("hex") !== expectedHash)
					throw new Error("SHA-256 校验值不一致");
			} finally {
				fs.closeSync(fd);
			}
			localFiles++;
		} catch (error) {
			errors.push(
				`${item.name}：${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	if (errors.length > 0)
		throw new Error(
			`分享清单校验失败：\n${errors.map((error) => `- ${error}`).join("\n")}`,
		);
	return { localFiles, externalLinks };
}
