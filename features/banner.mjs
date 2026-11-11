// Banner: gambar yang ikut terkirim di setiap balasan bot.
// Banner mengikuti foto profil user yang mengetik perintah; kalau user
// tidak punya foto profil (atau gagal diambil), pakai banner tetap di bawah.
import path from 'node:path'
import { BASE } from '../config.mjs'
import { downloadToFile } from './utils.mjs'
import { getProfilePic } from './profile.mjs'

// Bisa diganti URL gambar (https://...) — bot akan mengunduhnya sekali.
const BANNER_SOURCE = 'https://cdn.filn.pp.ua/uploads/betabotzapi/f294b.jpg'
let bannerFile = null

export async function getBannerFile() {
  if (bannerFile) return bannerFile
  if (BANNER_SOURCE.startsWith('http://') || BANNER_SOURCE.startsWith('https://')) {
    const dest = path.join(BASE, 'banner.jpg')
    await downloadToFile(BANNER_SOURCE, dest)
    bannerFile = dest
  } else {
    bannerFile = BANNER_SOURCE
  }
  return bannerFile
}

// Gambar banner untuk balasan: foto profil pengirim, fallback banner tetap.
export async function getReplyBanner(client, senderJid) {
  if (senderJid) {
    const pic = await getProfilePic(client, senderJid)
    if (pic) return pic.file
  }
  return getBannerFile()
}

// Balasan teks dikirim sebagai gambar banner + teks sebagai caption.
export async function replyText(client, jid, text, senderJid) {
  try {
    const banner = await getReplyBanner(client, senderJid)
    await client.message.send(jid, { type: 'image', media: banner, mimetype: 'image/jpeg', caption: text })
  } catch {
    await client.message.send(jid, text)
  }
}

// Untuk balasan berupa media: kirim banner dulu, baru medianya.
export async function sendBanner(client, jid, senderJid) {
  try {
    const banner = await getReplyBanner(client, senderJid)
    await client.message.send(jid, { type: 'image', media: banner, mimetype: 'image/jpeg' })
  } catch { /* banner gagal — lanjut tanpa banner */ }
}
