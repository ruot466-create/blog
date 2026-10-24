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
	/** 下载地址，以 /downloads/ 开头 */
	url: string;
	/** SHA-256 校验值，可选；安装包等重要文件建议提供 */
	sha256?: string;
}

// 暂无文件：页面显示空状态。添加第一个文件后这里就是列表。
export const DOWNLOADS: DownloadItem[] = [];
