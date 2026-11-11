// Foto profil pengirim perintah — dipakai sebagai banner balasan bot.
// Kalau user tidak punya foto profil / gagal diambil, kembalikan null
// dan pemanggil pakai banner tetap.
import fs from 'node:fs'
import path from 'node:path'
import { DL_DIR } from '../config.mjs'
import { fetchBytes, log } from './utils.mjs'

const cache = new Map() // jid -> { file, bytes, thumb, at }
const TTL_MS = 24 * 60 * 60 * 1000 // foto profil di-cache 24 jam

function safeName(jid) {
  return String(jid).replace(/[^A-Za-z0-9]/g, '_')
}

export async function getProfilePic(client, jid) {
  if (!jid) return null
  const cached = cache.get(jid)
  if (cached && Date.now() - cached.at < TTL_MS) return cached
  const file = path.join(DL_DIR, `profile-${safeName(jid)}.jpg`)
  try {
    // Pakai file di disk kalau masih baru (hemat kuota, lebih cepat).
    try {
      const stat = await fs.promises.stat(file)
      if (Date.now() - stat.mtimeMs < TTL_MS) {
        const bytes = await fs.promises.readFile(file)
        const result = { file, bytes, thumb: bytes, at: Date.now() }
        cache.set(jid, result)
        return result
      }
    } catch { /* belum ada file — lanjut download */ }

    const pic = await client.profile.getProfilePicture(jid, 'image')
    if (!pic?.url) return null
    const bytes = await fetchBytes(pic.url)
    await fs.promises.mkdir(DL_DIR, { recursive: true })
    await fs.promises.writeFile(file, bytes)
    // Versi kecil buat thumbnail kartu (boleh gagal — pakai gambar utuh).
    let thumb = bytes
    try {
      const preview = await client.profile.getProfilePicture(jid, 'preview')
      if (preview?.url) thumb = await fetchBytes(preview.url)
    } catch { /* abaikan */ }
    const result = { file, bytes, thumb, at: Date.now() }
    cache.set(jid, result)
    return result
  } catch (err) {
    log('getProfilePic failed for', jid, err?.message ?? String(err))
    return null
  }
}

// Nama tampilan pengirim: username WhatsApp kalau ada, kalau tidak nomornya.
export async function getDisplayName(client, jid) {
  try {
    const [u] = await client.profile.getUsernames([jid])
    if (u?.username) return u.username
  } catch { /* abaikan */ }
  const m = String(jid).match(/^(\d+)@s\.whatsapp\.net$/)
  if (m) return m[1]
  return 'teman'
}
