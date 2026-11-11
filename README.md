# zapo-bot

Base bot WhatsApp sederhana pakai [zapo-js](https://github.com/vinikjkkj/zapo) — library WhatsApp Web (TypeScript). Bukan API resmi WhatsApp.

Tujuan repo ini: **tinggal clone, isi config, jalan**. Tidak perlu setup rumit. Cocok buat yang mau punya bot WhatsApp sendiri, atau mau belajar bikin bot dari base yang sudah jalan.

## Fitur

- **ping** → bot balas `pong`. Buat ngetes bot nyala atau tidak.
- **Sapaan** (`hi`, `hello`, `hai`, `halo`, `hey`, `p`) → kartu sapaan: foto profil kamu di atas, info bot (library, uptime, tanggal, jam), dan tombol di bawah.
- **.menu** → menu bot dalam bentuk kartu yang sama.
- **Tombol** — di kartu sapaan dan menu ada 3 tombol:
  - **LIST MENU** → menampilkan menu.
  - **CALL OWNER** → membuka chat WhatsApp dengan nomor pembuat bot.
  - **FOLLOW** → membuka chat WhatsApp dengan nomor pembuat bot.
- **Download Instagram** — kirim link postingan atau reel publik, bot akan download dan kirim balik foto atau videonya (maksimal 100 MB). Kalau link yang sama dikirim lagi, bot langsung kirim file simpanan tanpa download ulang.
- **Banner mengikuti foto profil** — setiap balasan bot memakai foto profil orang yang mengetik perintah sebagai gambarnya. Kalau orang itu tidak punya foto profil, dipakai banner tetap (`banner.jpg` atau URL gambar).
- **Mode publik / privat** — mode privat (bawaan): bot cuma merespon pemilik, pesan dari orang lain diabaikan. Mode publik: bot merespon semua orang. Ganti mode dengan `.mode public` / `.mode private` (khusus pemilik).

## Cara pakai

### Syarat

- [Node.js](https://nodejs.org/) versi 20 atau lebih baru.
- Akun WhatsApp (nomor yang mau dipakai bot).

### Langkah-langkah

```bash
# 1. Clone repo ini
git clone https://github.com/Reski440/zapo-bot.git
cd zapo-bot

# 2. Install dependency (sekali saja)
npm install

# 3. Isi nomormu
cp config.example.json config.json
```

Buka `config.json`, isi nomor WhatsApp kamu (format internasional, tanpa `+`):

```json
{ "phoneNumber": "6281234567890" }
```

```bash
# 4. Jalankan bot
npm start
```

### Pairing (pertama kali saja)

Pas pertama jalan, bot menampilkan kode pairing 8 huruf di terminal, contohnya:

```
PAIRING_CODE: ABCD1234
```

Masukkan kode itu di HP kamu: **WhatsApp → Perangkat Tertaut → Tautkan Perangkat → Tautkan dengan nomor telepon**.

Setelah berhasil, sesi login tersimpan di folder `.auth/` — **jangan dibagikan dan jangan di-commit**. Selama file itu ada, bot bisa jalan lagi tanpa pairing ulang.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `ping` | Bot balas `pong` |
| `hi`, `hello`, `hai`, `halo`, `hey`, `p` | Kartu sapaan + tombol |
| `.menu` | Kartu menu bot |
| `.mode` | Lihat mode bot (khusus pemilik) |
| `.mode public` | Bot merespon semua orang (khusus pemilik) |
| `.mode private` | Bot cuma merespon kamu (khusus pemilik) |
| kirim link Instagram | Download foto/video postingan publik |

## Mengubah banner tetap

Banner tetap dipakai kalau pengirim perintah tidak punya foto profil. Ada 2 cara mengubahnya:

1. **Ganti file** `banner.jpg` dengan gambar kamu sendiri.
2. **Pakai URL gambar** — buka `features/banner.mjs`, ubah `BANNER_SOURCE` menjadi URL gambar (contoh: `https://contoh.com/banner.jpg`). Bot akan mengunduhnya sekali saat pertama dipakai.

## Menambah fitur baru

Fitur dipisah satu file satu fitur di folder `features/`. Buat nambah fitur sendiri:

**1.** Buat file baru, contoh `features/jam.mjs`:

```js
// Fitur: balas jam sekarang.
export async function handleJam(ctx) {
  if (ctx.cmd !== '.jam') return false
  const now = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar' })
  await ctx.replyText(`Jam sekarang: ${now} WITA`)
  return true
}
```

**2.** Daftarkan di `bot.mjs`, di daftar `FEATURES`:

```js
import { handleJam } from './features/jam.mjs'
const FEATURES = [handlePing, handleGreeting, handleMenu, handleMode, handleIgdl, handleJam]
```

Aturannya: fungsi `handle...` menerima `ctx` dan mengembalikan `true` kalau pesan itu ditangani (bot berhenti cek fitur lain), `false` kalau bukan urusannya. Isi `ctx`:

| Isi `ctx` | Keterangan |
| --- | --- |
| `client` | Client zapo-js (kirim pesan, ambil foto profil, dll.) |
| `jid` | Chat tujuan (balasan dikirim ke sini) |
| `senderJid` | Yang mengirim perintah (di grup: peserta, di chat pribadi: lawan chat) |
| `text` | Isi pesan apa adanya |
| `cmd` | Isi pesan, huruf kecil dan sudah di-trim (buat cek perintah) |
| `owner` | `true` kalau pengirim adalah pemilik bot |
| `replyText(teks)` | Balas dengan teks (banner + teks jadi satu pesan gambar) |
| `sendBanner()` | Kirim banner dulu (dipakai sebelum kirim media) |

## Struktur folder

```
bot.mjs            # entry: koneksi WhatsApp + routing pesan ke fitur
config.mjs         # baca config.json (nomor pemilik)
config.json        # nomormu (jangan commit — sudah di .gitignore)
config.example.json# contoh config.json
banner.jpg         # gambar banner tetap
bin/yt-dlp         # yt-dlp buat download video Instagram (sudah disertakan)
features/
  banner.mjs       # banner + balasan teks (banner + caption)
  cards.mjs        # kartu interaktif (gambar atas + teks + tombol)
  igdl.mjs         # download foto/video Instagram
  menu.mjs         # perintah .menu
  mode.mjs         # mode publik/privat + cek pemilik
  ping.mjs         # perintah ping
  profile.mjs      # foto profil + nama tampilan pengirim
  utils.mjs        # log, jalanin perintah, download file
  welcome.mjs      # sapaan (hi, hello, ...) + kartu sapaan
```

File yang **tidak ikut ke repo** (sudah ada di `.gitignore`): `node_modules/`, `.auth/` (sesi login WhatsApp), `downloads/` (file hasil download), `*.log`, `mode.json`, `config.json`.

## Cara kerja download Instagram

1. **Utama: yt-dlp** (sudah ada di `bin/yt-dlp`, tidak perlu install lagi) — bisa download video. Kalau Instagram membatasi akses anonim, bot tunggu 60 detik lalu coba sekali lagi.
2. **Cadangan: thumbnail postingan** — foto = foto utuh, reel = cover saja. Jalur ini cuma jalan di mesin yang punya tool `hatch-zeitgeist`; kalau tidak ada, bot langsung lewati.

Video yang sudah pernah diunduh disimpan dulu di `downloads/` — kalau link yang sama dikirim lagi, bot langsung kirim file simpanan tanpa download ulang.

## Catatan penting

- **Library tidak resmi.** Bot ini memakai zapo-js, library WhatsApp Web pihak ketiga, bukan API resmi WhatsApp. Ada risiko nomor dibatasi atau diblokir WhatsApp, apalagi nomor bisnis. Pakai nomor cadangan kalau bisa.
- **Instagram kadang membatasi download anonim**, apalagi dari IP yang dipakai banyak orang. Kalau gagal, tunggu beberapa menit lalu kirim linknya lagi.
- **Bot harus terus jalan supaya bisa membalas.** Jalankan di server/VPS yang nyala terus, atau pakai `pm2` / `systemd` biar bot nyala lagi sendiri kalau mati. Contoh pakai pm2:
  ```bash
  npm install -g pm2
  pm2 start bot.mjs --name zapo-bot
  pm2 save
  ```
- **Jangan bagikan folder `.auth/`** — isinya sesi login WhatsApp kamu. Siapa pun yang punya file itu bisa mengendalikan akun WhatsApp kamu.

## Lisensi

MIT — bebas dipakai, diubah, dan dibagikan. Lihat file `LICENSE`.
