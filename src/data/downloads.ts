// 分享中心的文件清单。
// 新增文件：pnpm new-download <文件路径> [说明]，然后把打印出的条目粘贴到 DOWNLOADS 里。
// 详细流程见 docs/downloads-guide.md。
export interface DownloadItem {
	/** 文件名，与 public/downloads/ 下的文件同名 */
	name: string;
	/** 一句话说明 */
	description: string;
	/** 文件类型，如 zip / 7z / exe / pdf */
	type: string;
	/** 版本号，可选 */
	version?: string;
	/** 文件大小（字节） */
	size: number;
	/** 更新日期，格式 YYYY-MM-DD */
	updated: string;
	/** 下载地址：站内 /downloads/... 或 http(s) 外部文件链接 */
	url: string;
	/** SHA-256 校验值，可选；安装包等重要文件建议提供 */
	sha256?: string;
}

export const DOWNLOADS: DownloadItem[] = [
	{
		name: "learning-checklist.zip",
		description:
			"学习清单：离线可用的网页版学习待办清单，解压后双击 index.html 即用，任务自动保存在浏览器本地，附中文使用说明（README.txt）。",
		type: "zip",
		version: "1.0",
		size: 8389,
		updated: "2026-10-25",
		url: "/downloads/learning-checklist.zip",
		sha256: "f00954c0c0285c8c1bb141685a8dd2ab1d7831ee31d98aa723598e079e676ba8",
	},
	{
		name: "pelican-ride.zip",
		description:
			"鹈鹕海岸骑行：手绘 SVG 网页小动画，单文件离线可用，支持暂停/播放与 0.4×–2× 调速，附打开方式和操作说明（README.txt）。",
		type: "zip",
		version: "1.0",
		size: 4898,
		updated: "2026-10-25",
		url: "/downloads/pelican-ride.zip",
		sha256: "92b5b26734acfc879365889572b7eedf5abc1f6086de2f0cc6ea98133254a9ca",
	},
	{
		name: "ai-collaboration-prompt.md",
		description:
			"AI 编程协作提示词（公开通用版）：与 AI 结对编程的工作方式约定，含输出纪律、安全边界和 L0–L3 帮助等级，整段粘贴到系统提示词即可使用。",
		type: "md",
		version: "1.0",
		size: 6136,
		updated: "2026-10-25",
		url: "/downloads/ai-collaboration-prompt.md",
		sha256: "a9052b3be23fa40e64e02803991277572b5ef42081e4e1e0c26e23a288eac0dc",
	},
];
