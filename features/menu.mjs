// Fitur: menu bot (dikirim sebagai kartu: foto profil pengirim di atas,
// teks menu di tengah, tombol LIST MENU / CALL OWNER / FOLLOW di bawah).
import { botMode } from './mode.mjs'
import { formatUptime } from './utils.mjs'
import { sendCard } from './cards.mjs'
import { replyText } from './banner.mjs'
import { log } from './utils.mjs'

export function menuText() {
  return (
    '🤖 *MENU BOT*\n\n' +
    'Halo! Berikut perintah yang bisa kamu pakai.\n\n' +
    '```\n' +
    'ping     Balas pong\n' +
    '.menu    Tampilkan menu ini\n' +
    'link IG  Download foto & video IG\n' +
    '.mode    Mode bot (khusus pemilik)\n' +
    '\n' +
    `Mode   : ${botMode}\n` +
    'Status : online\n' +
    `Uptime : ${formatUptime()}\n` +
    '```'
  )
}

export async function sendMenu(ctx) {
  const sent = await sendCard(ctx.client, ctx.jid, ctx.senderJid, menuText())
  if (!sent) {
    await replyText(ctx.client, ctx.jid, menuText(), ctx.senderJid)
  }
  log('REPLIED menu')
}

export async function handleMenu(ctx) {
  if (ctx.cmd !== '.menu' && ctx.cmd !== '!menu' && ctx.cmd !== 'menu') return false
  await sendMenu(ctx)
  return true
}
