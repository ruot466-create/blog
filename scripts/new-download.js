/* 把一个文件复制到 public/downloads/ 并生成清单条目（含大小和 SHA-256）
   用法：pnpm new-download <文件路径> [一句话说明]
   然后把打印出的条目粘贴进 src/data/downloads.ts 的 DOWNLOADS 数组 */

import crypto from "crypto"
import fs from "fs"
import path from "path"

const args = process.argv.slice(2)

if (args.length === 0) {
  console.error(`Error: No file argument provided
Usage: pnpm new-download <path-to-file> [description]`)
  process.exit(1)
}

const sourcePath = args[0]
const description = args[1] || ""

if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
  console.error(`Error: File not found: ${sourcePath}`)
  process.exit(1)
}

const targetDir = path.join("public", "downloads")
fs.mkdirSync(targetDir, { recursive: true })

const name = path.basename(sourcePath)
const targetPath = path.join(targetDir, name)

if (fs.existsSync(targetPath)) {
  console.error(`Error: public/downloads/${name} already exists.
If you are uploading a new version, remove the old file first, then run this script again.`)
  process.exit(1)
}

fs.copyFileSync(sourcePath, targetPath)

const size = fs.statSync(targetPath).size
const sha256 = crypto.createHash("sha256").update(fs.readFileSync(targetPath)).digest("hex")
const today = new Date()
const updated = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

const ext = path.extname(name).replace(".", "").toLowerCase() || "file"

console.log(`Copied to public/downloads/${name}

Paste this entry into the DOWNLOADS array in src/data/downloads.ts:

\t{
\t\tname: "${name}",
\t\tdescription: "${description}",
\t\ttype: "${ext}",
\t\tsize: ${size},
\t\tupdated: "${updated}",
\t\turl: "/downloads/${name}",
\t\tsha256: "${sha256}",
\t},
`)
