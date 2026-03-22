/**
 * PWAアイコン生成スクリプト
 * Node.js の組み込みモジュールのみで PNG を生成する
 * カラー: #3b82f6 (Tailwind blue-500)
 */

import { createWriteStream } from 'fs'
import { deflateSync, crc32 } from 'zlib'
import path from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const iconsDir = path.join(__dirname, '../public/icons')

mkdirSync(iconsDir, { recursive: true })

// アイコンカラー
const BG_R = 59, BG_G = 130, BG_B = 246   // #3b82f6 (blue-500)
const FG_R = 255, FG_G = 255, FG_B = 255  // white

function uint32BE(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n >>> 0, 0)
  return b
}

function buildCrc32(data) {
  // CRC32テーブルを使って計算
  const table = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const byte of data) {
    crc = (table[(crc ^ byte) & 0xff] ^ (crc >>> 8)) >>> 0
  }
  return uint32BE((crc ^ 0xffffffff) >>> 0)
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([typeBuf, data])
  return Buffer.concat([uint32BE(data.length), typeBuf, data, buildCrc32(crcData)])
}

/**
 * サイズ x サイズ のシンプルなPNGを生成する
 * 背景色 + 中央に「¥」を模した十字マーク
 */
function createIconPNG(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR: width, height, bit depth=8, color type=2 (RGB), compression=0, filter=0, interlace=0
  const ihdr = pngChunk(
    'IHDR',
    Buffer.concat([uint32BE(size), uint32BE(size), Buffer.from([8, 2, 0, 0, 0])])
  )

  // 画像データを構築（行ごとにフィルタバイト0を先頭に付ける）
  const rows = []
  const cx = size / 2  // 中心X
  const cy = size / 2  // 中心Y
  const r = size * 0.28  // マークの半径
  const stroke = Math.max(2, size * 0.06) // 線の太さ

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3)
    row[0] = 0 // filter type: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      // 丸い背景（角丸の正方形）
      const cornerR = size * 0.2
      const inRoundRect = isInRoundRect(x, y, 0, 0, size, size, cornerR)

      // ¥マークを簡略化：縦棒 + 2本の横棒
      const inVertBar  = Math.abs(dx) < stroke && Math.abs(dy) < r
      const inHBar1    = Math.abs(dy - (-r * 0.15)) < stroke * 0.7 && Math.abs(dx) < r * 0.65
      const inHBar2    = Math.abs(dy - (r * 0.25))  < stroke * 0.7 && Math.abs(dx) < r * 0.65
      // 斜め線（¥の上部）
      const inDiag1    = Math.abs(dx + dy * 0.7) < stroke && dy < -r * 0.1
      const inDiag2    = Math.abs(dx - dy * 0.7) < stroke && dy < -r * 0.1

      const isMark = inVertBar || inHBar1 || inHBar2 || inDiag1 || inDiag2

      let pr, pg, pb
      if (!inRoundRect) {
        pr = 255; pg = 255; pb = 255  // 外側は白（透明の代わり）
      } else if (isMark) {
        pr = FG_R; pg = FG_G; pb = FG_B  // マーク: 白
      } else {
        pr = BG_R; pg = BG_G; pb = BG_B  // 背景: 青
      }

      const off = 1 + x * 3
      row[off] = pr; row[off + 1] = pg; row[off + 2] = pb
    }
    rows.push(row)
  }

  const rawData = Buffer.concat(rows)
  const compressed = deflateSync(rawData, { level: 6 })
  const idat = pngChunk('IDAT', compressed)
  const iend = pngChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdr, idat, iend])
}

function isInRoundRect(px, py, rx, ry, rw, rh, cr) {
  if (px < rx || px >= rx + rw || py < ry || py >= ry + rh) return false
  // 四隅の角丸チェック
  const corners = [
    { x: rx + cr, y: ry + cr },
    { x: rx + rw - cr, y: ry + cr },
    { x: rx + cr, y: ry + rh - cr },
    { x: rx + rw - cr, y: ry + rh - cr },
  ]
  for (const c of corners) {
    if (px < c.x - cr || px > c.x + cr || py < c.y - cr || py > c.y + cr) continue
    const dx = px - c.x, dy = py - c.y
    if (dx * dx + dy * dy > cr * cr) return false
  }
  return true
}

// アイコン生成
for (const size of [192, 512]) {
  const buf = createIconPNG(size)
  const outPath = path.join(iconsDir, `icon-${size}x${size}.png`)
  createWriteStream(outPath).write(buf)
  console.log(`✅ Generated: ${outPath} (${buf.length} bytes)`)
}
