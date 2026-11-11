// Bot WhatsApp sederhana pakai zapo-js (library WhatsApp Web, bukan API resmi).
// Fitur-fitur ada di folder features/ — satu file satu fitur.
// Tambah fitur baru: buat file di features/ lalu daftarkan di daftar FEATURES di bawah.
//
// Jalankan:  npm install
//            node bot.mjs
// Pas pertama jalan, bot minta kode pairing 8 huruf — masukkan di
// WhatsApp > Perangkat Tertaut > Tautkan Perangkat > Tautkan dengan nomor telepon.

import { createPinoLogger, createStore, WaClient } from 'zapo-js'
import { createSqliteStore } from '@zapo-js/store-sqlite'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { OWNER_NUMBER } from './config.mjs'
import { log } from './features/utils.mjs'
import { replyText, sendBanner } from './features/banner.mjs'
import { botMode, isOwner } from './features/mode.mjs'
import { handlePing } from './features/ping.mjs'
import { handleGreeting } from './features/welcome.mjs'
import { handleMenu, sendMenu } from './features/menu.mjs'
import { handleMode } from './features/mode.mjs'
import { handleIgdl } from './features/igdl.mjs'

// Daftar fitur, dicek berurutan sampai ada yang menangani pesan.
const FEATURES = [handlePing, handleGreeting, handleMenu, handleMode, handleIgdl]

// ID tombol yang ditekan user (interactive / buttons / list response).
// Tombol URL (CALL OWNER, FOLLOW) tidak sampai ke bot — ketukannya membuka
// link wa.me di HP user, jadi tidak perlu diproses di sini.
function extractButtonId(event) {
  const m = event.message ?? {}
  const ir = m.interactiveResponseMessage
  if (ir?.nativeFlowResponseMessage?.paramsJson) {
    try {
      const id = JSON.parse(ir.nativeFlowResponseMessage.paramsJson).id
      if (id) return id
    } catch { /* bukan JSON id */ }
  }
  // Fallback: teks tombol yang tampil (body.text berisi label tombol).
  const label = ir?.body?.text ?? ''
  if (label) {
    if (/list menu/i.test(label)) return 'btn_menu'
    if (/ping/i.test(label)) return 'btn_ping'
    if (/download/i.test(label)) return 'btn_igdl'
    if (/public/i.test(label)) return 'btn_mode_public'
    if (/private/i.test(label)) return 'btn_mode_private'
    if (/mode/i.test(label)) return 'btn_mode'
    if (/menu/i.test(label)) return 'btn_menu'
  }
  if (m.buttonsResponseMessage?.selectedButtonId) return m.buttonsResponseMessage.selectedButtonId
  if (m.listResponseMessage?.singleSelectReply?.selectedRowId) return m.listResponseMessage.singleSelectReply.selectedRowId
  return null
}

// ---------- WhatsApp client ----------
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy
const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : null

const logger = await createPinoLogger({ level: 'info', pretty: true })
const store = createStore({
  backends: { sqlite: createSqliteStore({ path: '.auth/state.sqlite', driver: 'auto' }) },
  providers: {
    auth: 'sqlite', signal: 'sqlite', preKey: 'sqlite', session: 'sqlite',
    identity: 'sqlite', senderKey: 'sqlite', appState: 'sqlite', privacyToken: 'sqlite',
    messages: 'sqlite', threads: 'sqlite', contacts: 'sqlite'
  }
})

const client = new WaClient(
  {
    store,
    sessionId: 'default',
    connectTimeoutMs: 15_000,
    nodeQueryTimeoutMs: 30_000,
    ...(proxyAgent ? { proxy: { ws: proxyAgent, mediaUpload: proxyAgent, mediaDownload: proxyAgent } } : {}),
    history: { enabled: false }
  },
  logger
)

client.on('connection', (e) => log('CONNECTION:', e.status, e.reason ?? ''))

let codeRequested = false
async function requestCode(trigger) {
  if (codeRequested) return
  codeRequested = true
  log('Requesting pairing code (trigger:', trigger + ')')
  try {
    const code = await client.auth.requestPairingCode(OWNER_NUMBER)
    log('PAIRING_CODE:', code)
  } catch (err) {
    log('PAIRING_CODE_ERROR:', err?.message ?? String(err))
  }
}
client.on('auth_qr', ({ ttlMs }) => {
  log('AUTH_QR ttlMs=', ttlMs)
  void requestCode('auth_qr')
})
client.on('auth_pairing_required', () => {
  log('AUTH_PAIRING_REQUIRED')
  void requestCode('auth_pairing_required')
})
client.on('auth_pairing_code', ({ code }) => log('AUTH_PAIRING_CODE_EVENT:', code))
client.on('auth_passkey_required', ({ hasSigner }) => log('AUTH_PASSKEY_REQUIRED hasSigner=', hasSigner))
client.on('auth_paired', ({ credentials }) => {
  log('AUTH_PAIRED as', credentials.meJid)
})

// ---------- Routing pesan ke fitur ----------
client.on('message', async (event) => {
  const text = event.message?.conversation ?? event.message?.extendedTextMessage?.text
  const k = event.key ?? {}
  const buttonId = extractButtonId(event)
  log('MESSAGE from', k.remoteJid, ':', (text ?? '').slice(0, 200), buttonId ? `button=${buttonId}` : '')
  const owner = isOwner(event)
  if (botMode === 'private' && !owner) return // mode privat: abaikan orang lain
  const jid = event.key.remoteJid
  // Pengirim pesan: di grup ada di participant, di chat pribadi di remoteJid.
  const senderJid = k.participant || k.remoteJid
  const ctx = {
    client,
    event,
    jid,
    senderJid,
    text,
    cmd: (text ?? '').trim().toLowerCase(),
    owner,
    replyText: (t) => replyText(client, jid, t, senderJid),
    sendBanner: () => sendBanner(client, jid, senderJid)
  }

  // Ketukan tombol (quick reply) ditangani dulu.
  if (buttonId === 'btn_menu') {
    await sendMenu(ctx)
    log('REPLIED menu (button)')
    return
  }

  for (const handle of FEATURES) {
    if (await handle(ctx)) return
  }
})

log('Bot mode:', botMode)
log('Starting connect()...')
void client.connect()
  .then(() => log('CONNECT_RESOLVED (ready)'))
  .catch((e) => log('CONNECT_ERROR:', e?.message ?? String(e)))
