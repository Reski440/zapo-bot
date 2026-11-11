// Mode publik / privat + siapa pemilik bot.
import fs from 'node:fs'
import path from 'node:path'
import { BASE, OWNER_NUMBER } from '../config.mjs'

const MODE_FILE = path.join(BASE, 'mode.json')

// Default privat: bot cuma merespon pemilik.
export let botMode = 'private'
try {
  botMode = JSON.parse(fs.readFileSync(MODE_FILE, 'utf8')).mode === 'public' ? 'public' : 'private'
} catch { /* belum ada mode.json */ }

export function saveMode(m) {
  botMode = m
  fs.writeFileSync(MODE_FILE, JSON.stringify({ mode: m }) + '\n')
}

export function isOwner(event) {
  const k = event.key ?? {}
  if (k.fromMe) return true
  const addrs = [k.participant, k.participantAlt, k.remoteJid, k.remoteJidAlt]
  return addrs.some((a) => a && a.startsWith(OWNER_NUMBER + '@'))
}

// Perintah .mode (khusus pemilik). Kembalikan true kalau perintah ini ditangani.
export async function handleMode(ctx) {
  const { cmd, owner } = ctx
  if (!owner) return false
  if (cmd !== '.mode' && cmd !== '.mode public' && cmd !== '.mode private') return false
  if (cmd === '.mode public' || cmd === '.mode private') {
    saveMode(cmd === '.mode public' ? 'public' : 'private')
    await ctx.replyText(`Mode bot sekarang: *${botMode}*.` + (botMode === 'private' ? '\nBot cuma merespon kamu.' : '\nBot merespon semua orang.'))
  } else {
    await ctx.replyText(
      `Mode bot: *${botMode}*.\n\nGanti mode:\n• .mode public — bot merespon semua orang\n• .mode private — bot cuma merespon kamu`
    )
  }
  return true
}
