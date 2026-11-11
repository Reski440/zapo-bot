// Config bot: dibaca dari config.json (jangan commit file itu).
import fs from 'node:fs'
import path from 'node:path'

export const BASE = import.meta.dirname
export const DL_DIR = path.join(BASE, 'downloads')
export const YTDLP = path.join(BASE, 'bin', 'yt-dlp')
export const LOG_FILE = path.join(BASE, 'bot.log')

const config = JSON.parse(fs.readFileSync(path.join(BASE, 'config.json'), 'utf8'))
export const OWNER_NUMBER = String(config.phoneNumber).replace(/\D/g, '')
if (!OWNER_NUMBER) {
  console.error('Isi dulu nomormu di config.json (lihat config.example.json)')
  process.exit(1)
}
