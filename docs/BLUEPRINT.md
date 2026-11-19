# Blueprint Convoy: Radar Antrean Drop Bergate Agent ID

Tanggal: 19 Nov 2026. Status: irisan 1 (blueprint, kontrak sinyal, tes otomatis, deploy testnet).
Produk dipilih langsung oleh Leira pada 19 Nov 2026 dari daftar ide kategori alat bantu minter dan trader.
Sumber spesifikasi: `~/workspace/goals/pipeline-bounty-dan-hackathon-berbayar/hidden_files/agentid-hackathon-ide-minter-trader-2026-11-19.md` bagian Convoy dan berkas penjelasan pasangannya.

## 1. Aturan resmi yang relevan (dikutip persis dari pengumuman Binance)

Sumber: pengumuman resmi Binance "Agent ID Hackathon" (support announcement 95f5dbe0ea674a48a739b59e046648bf), dibaca penuh pada riset 19 Nov 2026. Kutipan di bawah ini adalah teks persis yang tercatat dari pengumuman itu di berkas kerja pipeline.

Syarat kelayakan trek Innovation:

- "The product must already be live, with at least 30 Agent ID addresses having interacted with the participating contract(s) during the Submission Period."
- "Only contract addresses submitted by participants (including token contracts) will be counted, and interacting addresses must be addresses that hold an Agent ID."
- Cara penyelenggara memeriksa pemegang: "Call balanceOf(address) on the contract; a return value greater than 0 indicates the address holds an Agent ID."
- Periode submisi: 18 Nov 2026 08:00 UTC sampai 9 Des 2026 08:00 UTC (15:00 WIB).

Bobot penilaian trek Innovation (dari pengumuman, sebagaimana tercatat di berkas riset):

- Agent ID Application Depth: 30%
- Practicality: 25%
- Product Completion: 25%
- Innovation: 20%

Garis merah resmi yang mengikat desain Convoy:

- Diskualifikasi untuk "malicious volume manipulation, illegitimate mass account registration for interactions, or other activities showing signs of market manipulation."
- Tanpa login QR web untuk Agentic Wallet; tanpa melewati konfirmasi transaksi pengguna; tanpa transfer tanpa izin.
- Kontrak open-source dengan izin pemilik yang diungkapkan (Convoy: kontrak tanpa owner sama sekali, lihat seksi 3).
- Tanpa peniruan brand Binance atau BNB Chain pada nama produk.
- Tanpa pengumpulan kredensial.
- Tanpa janji return; produk yang bersentuhan dengan trading wajib memuat peringatan risiko.
- Agent ID tidak boleh dikemas sebagai alat mencari wallet orang lain dari nama (Convoy tidak pernah menampilkan resolusi nama ke alamat orang lain; sinyal dicatat per alamat pemanggil sendiri).
- Panduan resmi nomor 4 justru menganjurkan: "During the Submission Period, actively guide Agent ID holders to interact with your project contract(s)." Mengajak pemegang mencoba produk adalah jalur yang diminta penyelenggara.

Checklist angka wajib dari brief:

- [x] Lantai interaksi: minimal 30 alamat Agent ID berinteraksi dengan kontrak selama periode submisi.
- [x] Bobot juri: 30 / 25 / 25 / 20 (Kedalaman, Kepraktisan, Kelengkapan, Inovasi).
- [x] Tenggat submisi: 9 Des 2026 15:00 WIB. Deadline submisi dan syarat isi adalah dua hal berbeda; angka interaksi dibekukan dari bacaan on-chain sebelum paket ditempel.

## 2. Peta skor juri ke fitur

| Butir juri | Bobot | Fitur Convoy yang melayaninya |
|---|---|---|
| Kedalaman Aplikasi Agent ID | 30% | Sinyal antre digerbang `balanceOf` registry lebih dari 0 di dalam kontrak, satu ID satu sinyal per drop ditegakkan on-chain. Tanpa Agent ID, angka antrean Convoy tidak bisa ada; alamat biasa secara kontrak tidak bisa ikut menghitung permintaan. Panel Quota pribadi juga hanya bermakna bagi pemegang ID karena kuota proyek bergate didefinisikan per ID. |
| Kepraktisan | 25% | Menjawab beban harian nyata pemburu mint bergate: drop apa berikutnya, berapa orang nyata yang antre, berapa cepat kuota terbakar. Aksi pertama satu panggilan ringan tanpa dana dan tanpa approval. |
| Kelengkapan Produk | 25% | Kontrak sinyal teruji otomatis dan live, halaman papan drop dengan laju bakar dan perkiraan habis (irisan 2), panel Quota pribadi (irisan 2), berkas skill.md dan umpan terbaca mesin untuk agen (irisan berikutnya). |
| Inovasi | 20% | Radar mint yang ada (MintMintr dan sejenisnya) hanya membaca counter proyek; tidak satu pun bisa menunjukkan berapa orang nyata yang berniat ikut, karena wallet bisa digandakan tanpa biaya. Sinyal soulbound membuat angka permintaan sebuah drop untuk pertama kalinya bisa dipercaya sebagai hitungan orang. |

Fitur tanpa butir skor ditunda. Convoy secara sadar TIDAK menilai keamanan kontrak drop (itu wilayah cek mekanis seperti MintGuard) dan TIDAK mengumpulkan suara bahaya (itu wilayah registri alert). Convoy mengukur permintaan dan waktu.

## 3. Desain kontrak: ConvoySignal

Satu kontrak, tanpa memegang dana apa pun (tidak ada fungsi payable, tidak ada jalur keluar nilai), tanpa owner dan tanpa fungsi admin apa pun, sehingga tidak ada pihak yang bisa mengubah, menghapus, atau memalsukan sinyal orang lain. Alamat registry Agent ID bersifat immutable, ditetapkan sekali di konstruktor.

### 3.1 Model data drop

Setiap drop yang terdaftar disimpan sebagai satu struct:

| Kolom | Tipe | Arti |
|---|---|---|
| `dropContract` | address | Alamat kontrak drop atau proyek bergate yang dilacak. Wajib bukan alamat nol. |
| `opensAt` | uint64 | Waktu buka drop (unix). Boleh 0 bila proyek belum mengumumkan waktu pasti. |
| `closesAt` | uint64 | Waktu tutup jendela (unix). Boleh 0 bila belum diketahui; bila terisi, wajib lebih besar dari `opensAt`. |
| `label` | string | Label tampil drop (nama proyek dan fase), teks bebas dari pendaftar. |
| `registrar` | address | Alamat yang mendaftarkan drop, dicatat apa adanya untuk jejak audit. |
| `signalCount` | uint256 | Jumlah sinyal aktif saat ini pada drop itu. |
| `exists` | bool | Penanda drop valid. |

Drop diindeks dengan `dropId` berurutan mulai dari 0; `dropCount()` memberi jumlah drop terdaftar.

### 3.2 Mekanik sinyal

- `signal(dropId)`: pemanggil wajib pemegang Agent ID, diperiksa di dalam kontrak lewat `agentID.balanceOf(msg.sender) > 0`. Satu pemegang hanya bisa punya satu sinyal aktif per drop: panggilan kedua pada drop yang sama melempar error dan tidak mengubah hitungan. Sinyal selalu atas nama `msg.sender` sendiri; fungsi tidak menerima parameter alamat, jadi memalsukan sinyal atas nama orang lain mustahil secara struktur.
- `withdrawSignal(dropId)`: menarik sinyal aktif milik pemanggil sendiri; hitungan berkurang satu. Menarik sinyal yang tidak ada melempar error. Penarikan tidak digerbang balanceOf, supaya pemilik sinyal selalu bisa membatalkan sinyalnya sendiri.
- Bacaan publik: `signalCountOf(dropId)`, `hasSignaled(dropId, account)`, `getDrop(dropId)`, `dropCount()`, `agentID()`.
- Semua perubahan memancarkan event: `DropRegistered(dropId, dropContract, opensAt, closesAt, label, registrar)`, `Signaled(dropId, account)`, `SignalWithdrawn(dropId, account)`. Halaman dan pengindeks membaca antrean dari event dan bacaan ini, bukan dari backend pribadi.

### 3.3 Yang tidak ada, dengan sengaja

- Tidak ada fungsi payable, withdraw, sweep, pause, atau ganti registry.
- Tidak ada batasan siapa yang boleh memberi sinyal selain gerbang pemegang Agent ID itu sendiri.
- Tidak ada penilaian keamanan, tidak ada skor bahaya, tidak ada janji hasil apa pun di dalam kontrak.

## 4. Laju bakar dan perkiraan habis (lapisan baca halaman, irisan 2)

Halaman Convoy menggabungkan dua sumber angka:

1. Antrean orang nyata: `signalCountOf(dropId)` dari kontrak ConvoySignal, selalu bisa dibaca karena ABI-nya milik sendiri.
2. Counter proyek: total terminting dan kuota atau suplai maksimum dari kontrak drop itu sendiri, dibaca lewat panggilan view ke kontrak drop.

Rumus yang dipakai halaman, ditulis terbuka:

- Laju bakar = perubahan total terminting dibagi perubahan waktu di antara dua bacaan berurutan (per blok atau per interval polling), dalam satuan mint per menit.
- Sisa kuota = kuota maksimum dikurangi total terminting.
- Perkiraan waktu habis = sisa kuota dibagi laju bakar terkini, ditampilkan sebagai rentang jujur (memakai laju bakar jendela pendek dan jendela lebih panjang), bukan satu angka palsu presisi.

Kejujuran data yang wajib ditegakkan halaman:

- ABI tiap proyek berbeda. Nama fungsi counter tidak seragam (ada yang `totalMinted`, `minted`, `supply`, counter per fase, atau hanya endpoint statistik off-chain). Bacaan yang tidak tersedia untuk sebuah drop ditampilkan sebagai TIDAK TERDATA, bukan ditebak, bukan diisi angka karangan.
- Sinyal antre adalah minat, bukan jaminan mint. Halaman wajib menampilkan angka antrean apa adanya sebagai hitungan pemegang yang menyatakan niat, terpisah dari angka terminting yang nyata.
- Bila kontrak drop tidak bisa dibaca sama sekali, drop tetap tampil dengan antreannya, dan panel counternya berlabel tidak terdata.

## 5. Panel Quota pribadi (fitur sekunder, irisan 2)

Panel pribadi pengguna menampilkan, untuk drop terdaftar, sisa jatah gratis pengguna itu sendiri bila kontrak drop menyediakan bacaan kuota per alamat (pola yang terlihat di ekosistem: `freeMinted`, `mintedBy`, `quotaOf` dan sejenisnya, bentuknya berbeda per proyek). Aturan kejujurannya sama: proyek yang counter per alamatnya tidak bisa dibaca ditandai tidak terdata. Panel ini murni lapisan baca di halaman; kontrak ConvoySignal tidak menyimpan data kuota apa pun.

## 6. Rencana antispam pendaftaran drop

- Pendaftaran drop terbuka untuk siapa pun, termasuk proyek itu sendiri, karena insentif proyek adalah memamerkan antreannya. Yang disimpan kontrak hanya alamat kontrak drop, dua waktu, label, dan pendaftar.
- Spam pendaftaran tidak bisa menggelembungkan angka permintaan: sinyal hanya sah dari pemegang Agent ID, satu per drop, dan pendaftaran palsu tidak membawa satu pun sinyal. Drop sampah tanpa antrean terlihat apa adanya sebagai drop tanpa antrean.
- Lapisan kurasi tampil ada di halaman (daftar unggulan yang diverifikasi manusia), bukan di kontrak, supaya kontrak tetap tanpa owner dan tanpa kuasa sensor. Drop yang terbukti penipuan ditandai di lapisan tampil dan diumumkan, bukan dihapus dari kontrak (kontrak memang tidak punya fungsi hapus).
- Duplikat pendaftaran kontrak yang sama dimungkinkan secara kontrak (misalnya dua fase berbeda); halaman mengelompokkan per alamat kontrak dan fase dari label serta jendela waktunya.

## 7. Urutan bangun

1. Irisan 1 (tugas ini): blueprint, kontrak ConvoySignal, tes otomatis lokal, deploy testnet dengan alur hidup terbukti, verifikasi sumber.
2. Irisan 2: halaman papan drop (mode testnet dulu), pembacaan antrean dan counter, laju bakar dan perkiraan habis, panel Quota pribadi, gerbang tampil penuh sebelum ditunjukkan.
3. Irisan 3: berkas skill.md untuk agen, umpan terbaca mesin, kurasi drop awal dari proyek bergate yang sedang live.
4. Mainnet hanya sesudah konfirmasi eksplisit Leira, dengan pola yang sama seperti produk sebelumnya: simulasi dulu, verifikasi sumber, pemasangan alamat ke halaman.
