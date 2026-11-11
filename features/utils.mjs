// Helper yang dipakai bareng oleh fitur-fitur bot.
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import { LOG_FILE, DL_DIR } from '../config.mjs'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

export function log(...a) {
  const line = new Date().toISOString() + ' ' + a.join(' ')
  console.log(line)
  fs.appendFileSync(LOG_FILE, line + '\n')
}

export function runCmd(cmd, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        err.stderrTail = (stderr || '').trim().split('\n').slice(-2).join(' ')
        return reject(err)
      }
      resolve(stdout)
    })
  })
}

export function formatUptime() {
  const s = Math.floor(process.uptime())
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h} jam ${m} menit` : m > 0 ? `${m} menit ${sec} detik` : `${sec} detik`
}

// Uptime format jam: 34:06:52 (dipakai di kartu sapaan).
export function formatUptimeHMS() {
  const s = Math.floor(process.uptime())
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

// Tanggal + jam di zona waktu WITA, format Indonesia.
export function witaDateTime() {
  const now = new Date()
  const tanggal = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' }).format(now)
  const waktu = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Makassar' }).format(now).replace(/:/g, '.')
  return { tanggal, waktu }
}

// Ambil isi URL sebagai Buffer, coba sampai 2x kalau koneksi putus.
export async function fetchBytes(url, timeoutMs = 30000) {
  let lastErr
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(timeoutMs) })
      if (!res.ok) throw new Error(`fetch HTTP ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (err) {
      lastErr = err
      log('fetchBytes attempt', attempt, 'failed:', err?.message ?? String(err))
      await new Promise((r) => setTimeout(r, 2000 * attempt))
    }
  }
  throw lastErr
}

// Download file dari URL, coba sampai 3x kalau koneksi putus.
export async function downloadToFile(url, dest, maxBytes = 50 * 1024 * 1024) {
  let lastErr
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(90000) })
      if (!res.ok) throw new Error(`download HTTP ${res.status}`)
      const len = Number(res.headers.get('content-length') || 0)
      if (len > maxBytes) throw new Error('filenya lebih dari 50 MB')
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length > maxBytes) throw new Error('filenya lebih dari 50 MB')
      await fs.promises.mkdir(DL_DIR, { recursive: true })
      await fs.promises.writeFile(dest, buf)
      return buf.length
    } catch (err) {
      lastErr = err
      log('downloadToFile attempt', attempt, 'failed:', err?.message ?? String(err))
      await new Promise((r) => setTimeout(r, 2000 * attempt))
    }
  }
  throw lastErr
}
