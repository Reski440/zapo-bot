// Fitur: download foto/video Instagram dari link postingan atau reel publik.
//
// Jalur utama: yt-dlp (bisa video). Kalau Instagram membatasi akses anonim,
// bot tunggu 60 detik lalu coba sekali lagi. Cadangan: thumbnail via
// hatch-zeitgeist (foto = foto utuh, reel = cover saja).
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { DL_DIR, YTDLP } from '../config.mjs'
import { log, runCmd, downloadToFile } from './utils.mjs'

const IG_URL_RE = /https?:\/\/(?:www\.)?instagram\.com\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.mkv'])
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

async function findDownloadedFiles(code) {
  let names
  try {
    names = await fs.promises.readdir(DL_DIR)
  } catch { return [] }
  return names.filter((f) => f.startsWith(code + '.')).map((f) => path.join(DL_DIR, f))
}

async function downloadIgWithYtDlp(url, code) {
  const cached = await findDownloadedFiles(code)
  if (cached.length > 0) {
    log('IG_DL cache hit', code)
    return cached
  }
  const template = path.join(DL_DIR, `${code}.%(ext)s`)
  let lastErr = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await runCmd(YTDLP, ['--no-playlist', '--max-filesize', '100M', '-f', 'best[ext=mp4]/best', '-o', template, '--no-warnings', url], 180000)
      lastErr = null
      break
    } catch (e) {
      lastErr = e
      log('IG_DL ytdlp attempt', attempt, 'failed:', e?.stderrTail ?? e?.message ?? String(e))
      if (attempt === 1) await new Promise((r) => setTimeout(r, 60000))
    }
  }
  const files = await findDownloadedFiles(code)
  if (files.length === 0 && lastErr) throw lastErr
  return files
}

// Cadangan: thumbnail postingan (foto = foto utuh, reel = cover saja).
// Cuma jalan kalau tool `hatch-zeitgeist` ada di mesin ini — opsional,
// kalau tidak ada langsung mengembalikan null.
const ZEITGEIST_BIN = '/opt/hatch/bin/hatch-zeitgeist'
function resolveIgThumbnail(url) {
  if (!fs.existsSync(ZEITGEIST_BIN)) return Promise.resolve(null)
  return new Promise((resolve) => {
    execFile(ZEITGEIST_BIN, ['--post-url', url, '--raw', '--no-save'],
      { timeout: 60000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return resolve(null)
        try {
          const j = JSON.parse(stdout)
          resolve(j?.thumbnail_url ?? null)
        } catch { resolve(null) }
      })
  })
}

async function sendIgFile(client, jid, file, url, extraNote) {
  const ext = path.extname(file).toLowerCase()
  const caption = `📥 ${url}` + (extraNote ? `\n\n${extraNote}` : '')
  let content
  if (VIDEO_EXTS.has(ext)) {
    content = { type: 'video', media: file, mimetype: 'video/mp4', caption }
  } else if (IMAGE_EXTS.has(ext)) {
    const mimetype = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
    content = { type: 'image', media: file, mimetype, caption }
  } else {
    content = { type: 'document', media: file, mimetype: 'application/octet-stream', fileName: path.basename(file), caption }
  }
  let lastErr
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await client.message.send(jid, content)
      await fs.promises.unlink(file).catch(() => {})
      return
    } catch (err) {
      lastErr = err
      log('sendIgFile attempt', attempt, 'failed:', err?.message ?? String(err))
      await new Promise((r) => setTimeout(r, 3000 * attempt))
    }
  }
  throw lastErr
}

export async function handleIgdl(ctx) {
  const igMatch = (ctx.text ?? '').match(IG_URL_RE)
  if (!igMatch) return false

  const kind = igMatch[1]
  const code = igMatch[2]
  const isReel = kind === 'reel' || kind === 'reels' || kind === 'tv'
  await ctx.replyText('⏳ Lagi download dari Instagram, tunggu sebentar...')
  let downloaded = false
  try {
    let files = []
    try {
      files = await downloadIgWithYtDlp(igMatch[0], code)
    } catch (e) {
      log('IG_DL ytdlp failed', code, e?.stderrTail ?? e?.message ?? String(e))
    }
    if (files.length > 0) {
      downloaded = true
      const file = files.sort()[0]
      const note = files.length > 1 ? 'Ini slide pertama — carousel belum didukung penuh.' : ''
      await ctx.sendBanner()
      await sendIgFile(ctx.client, ctx.jid, file, igMatch[0], note)
      for (const extra of files.slice(1)) await fs.promises.unlink(extra).catch(() => {})
      log('REPLIED ig download', code, file)
      return true
    }
    const thumbnail = await resolveIgThumbnail(igMatch[0])
    if (!thumbnail) {
      await ctx.replyText('Maaf, tidak bisa download link ini. Kemungkinan postingannya privat atau sudah dihapus.')
      log('IG_DL no media for', code)
      return true
    }
    const dest = path.join(DL_DIR, `${code}.jpg`)
    const bytes = await downloadToFile(thumbnail, dest)
    const caption = isReel
      ? `📥 ${igMatch[0]}\n\nIni cover-nya aja — videonya gagal diunduh.`
      : `📥 ${igMatch[0]}`
    await ctx.sendBanner()
    await ctx.client.message.send(ctx.jid, { type: 'image', media: dest, mimetype: 'image/jpeg', caption })
    await fs.promises.unlink(dest).catch(() => {})
    log('REPLIED ig download', code, bytes, 'bytes', isReel ? '(reel cover fallback)' : '(photo fallback)')
    return true
  } catch (err) {
    const msg = err?.message ?? String(err)
    if (downloaded) {
      await ctx.replyText('Videonya sudah keunduh tapi gagal dikirim ke WhatsApp. Coba kirim linknya lagi.')
    } else {
      await ctx.replyText(`Gagal download: ${msg}`)
    }
    log('IG_DL_ERROR', code, msg)
    return true
  }
}
