// Kartu interaktif: gambar di atas (foto profil pengirim / banner tetap),
// teks di tengah, tombol di bawah (LIST MENU, CALL OWNER, FOLLOW).
// Tombol CALL OWNER dan FOLLOW membuka chat dengan nomor pembuat bot.
import fs from 'node:fs'
import { OWNER_NUMBER } from '../config.mjs'
import { getProfilePic } from './profile.mjs'
import { getBannerFile } from './banner.mjs'
import { log } from './utils.mjs'

const ownerUrl = `https://wa.me/${OWNER_NUMBER}`

function quickReplyButton(displayText, id) {
  return { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: displayText, id }) }
}
function urlButton(displayText, url) {
  return { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: displayText, url, merchant_url: url }) }
}

// Kirim kartu interaktif. Kembalikan true kalau terkirim, false kalau gagal.
export async function sendCard(client, jid, senderJid, bodyText) {
  try {
    // Gambar header: foto profil pengirim dulu, kalau tidak ada pakai banner tetap.
    let imageBytes = null
    let thumbBytes = null
    const pic = senderJid ? await getProfilePic(client, senderJid) : null
    if (pic) {
      imageBytes = pic.bytes
      thumbBytes = pic.thumb
    } else {
      try {
        const banner = await getBannerFile()
        imageBytes = await fs.promises.readFile(banner)
        thumbBytes = imageBytes
      } catch { /* tidak ada gambar — kirim kartu tanpa header */ }
    }

    let header
    if (imageBytes) {
      const media = await client.message.upload(imageBytes, { type: 'image', mimetype: 'image/jpeg' })
      header = {
        imageMessage: {
          url: media.url,
          directPath: media.directPath,
          mediaKey: media.mediaKey,
          fileSha256: media.fileSha256,
          fileEncSha256: media.fileEncSha256,
          fileLength: media.fileLength,
          mediaKeyTimestamp: media.mediaKeyTimestamp,
          mimetype: media.mimetype,
          jpegThumbnail: thumbBytes
        },
        hasMediaAttachment: true
      }
    }

    await client.message.send(jid, {
      interactiveMessage: {
        ...(header ? { header } : {}),
        body: { text: bodyText },
        footer: { text: 'Bot Test • zapo-js' },
        nativeFlowMessage: {
          buttons: [
            quickReplyButton('↩️ LIST MENU', 'btn_menu'),
            urlButton('📞 CALL OWNER', ownerUrl),
            urlButton('↗️ FOLLOW', ownerUrl)
          ],
          messageVersion: 1
        }
      }
    })
    return true
  } catch (err) {
    log('CARD_ERROR:', err?.message ?? String(err))
    return false
  }
}
