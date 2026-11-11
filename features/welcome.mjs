// Fitur: sapaan (hi, hello, hai, halo, hey, p).
// Bot balas kartu sapaan: foto profil pengirim di atas, info bot,
// tombol LIST MENU / CALL OWNER / FOLLOW di bawah.
import { formatUptimeHMS, witaDateTime } from './utils.mjs'
import { getDisplayName } from './profile.mjs'
import { sendCard } from './cards.mjs'
import { replyText } from './banner.mjs'
import { log } from './utils.mjs'

const GREETINGS = new Set(['hi', 'hello', 'hai', 'halo', 'hallo', 'hey', 'p'])

export function welcomeText(name) {
  const { tanggal, waktu } = witaDateTime()
  return (
    `👋 Halo, @${name}!\n\n` +
    'Saya bot WhatsApp otomatis.\n' +
    'Kirim perintah, atau ketuk tombol di bawah untuk mulai.\n\n' +
    '```\n' +
    'Library : zapo-js\n' +
    'Fungsi  : Asisten\n' +
    `Uptime  : ${formatUptimeHMS()}\n` +
    `Tanggal : ${tanggal}\n` +
    `Waktu   : ${waktu} WITA\n` +
    'Prefix  : .\n' +
    '```'
  )
}

export async function handleGreeting(ctx) {
  if (!GREETINGS.has(ctx.cmd)) return false
  const name = await getDisplayName(ctx.client, ctx.senderJid)
  const text = welcomeText(name)
  const sent = await sendCard(ctx.client, ctx.jid, ctx.senderJid, text)
  if (!sent) {
    await replyText(ctx.client, ctx.jid, text, ctx.senderJid)
  }
  log('REPLIED greeting')
  return true
}
