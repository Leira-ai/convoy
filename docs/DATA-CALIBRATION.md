# Kalibrasi Lapisan Data Convoy (Tahap 3)

Tanggal: 19 Nov 2026. Tahap ini adalah Tahap 3 dari memo `docs/TAHAP-PRARILIS-RISET.md`, dan menutup celah T-10 di `docs/THREAT-MODEL.md`: angka counter proyek yang tampil di halaman kini punya adaptor yang dibuktikan, aturan kesegaran tertulis, dan rekonsiliasi dua RPC. Bukti mentah lengkap ada di `deploy/stage3-calibration.json` (mesin lokal, tidak diterbitkan, pola yang sama seperti state deploy lain); skrip pembuktinya `deploy/calibrate_stage3.py`.

Prinsip yang memayungi seluruh tahap, dari blueprint: untuk produk radar, lapisan data adalah produknya. Angka yang salah tampil dengan percaya diri lebih merusak daripada angka yang jujur tidak tampil.

## 1. Spesifikasi adaptor counter (kanonik)

Satu spesifikasi dipakai persis sama oleh halaman (`web/app.js`, fungsi `probeCounter`) dan oleh skrip kalibrasi. Urutan deteksinya:

1. **Pola kuota.** `quotaOf(address)` DAN `mintedBy(address)` sama sama menjawab. Ini pola keluarga mint bergate Agent ID yang benar benar ditemui di lapangan: kuota per alamat didefinisikan per pemegang ID, dan pemakaian per alamat tercatat terpisah. Counter global diambil dari `totalMinted()`, bila tidak ada dari `totalSupply()`; plafon dari `maxSupply()`, lalu `MAX_SUPPLY()`, lalu `cap()`.
2. **Pola suplai.** `totalSupply()` menjawab dan cabang kuota tidak. Ini pola drop bergaya ERC-721 polos. Plafon dari daftar kandidat yang sama.
3. **Pola tanpa bacaan.** Kedua cabang tidak menjawab. Hasilnya bukan nol dan bukan tebakan: statusnya tidak terdata, dan halaman menampilkan kata TIDAK TERDATA tanpa angka.

Kuota per alamat mengikuti polanya: pada kontrak pola kuota, sisa jatah adalah `quotaOf` dikurangi `mintedBy` (dengan `freeMinted` sebagai cadangan bacaan pemakaian); di luar pola kuota, halaman mencoba bacaan sisa langsung (`freeRemaining`, `remainingFree`, `freeQuotaLeft`); selain itu tidak terdata.

Kenapa hanya tiga pola: SCOPE-FREEZE.md membatasi Tahap 3 pada dua sampai tiga pola ABI terbanyak. Pola di luar ketiganya tampil tidak terdata secara jujur sampai adaptornya ditulis dan dibuktikan dengan cara yang sama seperti di dokumen ini.

Satu keputusan diagnosis yang dicatat: probe yang tidak mendapat satu pun jawaban fungsi BUKAN bukti kegagalan transport. Kesehatan transport dibuktikan terpisah (bacaan nomor blok dari tiap endpoint, plus panggilan kontrol ke kontrak yang dikenal pada blok yang sama). Tanpa pemisahan itu, kontrak yang memang tidak punya counter akan salah dibaca sebagai RPC mati, dan sebaliknya RPC mati bisa menyamar sebagai kontrak tanpa counter.

## 2. Aturan kejujuran angka di halaman

Setiap angka terminting dan kuota yang tampil di halaman kini membawa:

- **Label sumber**: nama fungsi yang menjawab (misalnya `totalMinted()`), alamat kontrak yang dibaca (dipendekkan), nomor blok bacaan, dan waktu baca.
- **Label corroborasi**: salah satu dari "dua RPC cocok", "satu sumber", atau "lewat wallet", sesuai jalur bacanya (lihat aturan rekonsiliasi di bawah).
- **Label basi** bila bacaan lebih tua dari ambang kesegaran.

Aturannya, satu per satu:

1. **Rekonsiliasi dua RPC.** Bila tidak ada wallet terhubung, setiap counter dibaca dari dua endpoint RPC independen pada SATU blok yang disematkan (yang lebih rendah dari kedua kepala blok), dan angka hanya tampil bila pola, nilai terminting, dan plafon dari kedua bacaan sama persis. Toleransinya **nol**, dan ini disengaja: counter adalah hitungan diskret, dan keadaan chain pada satu blok bersifat tunggal, jadi selisih apa pun pada blok yang sama berarti salah satu sumber menyajikan data yang salah atau basi. Bila keduanya berselisih, halaman menampilkan status BELUM TERVERIFIKASI dengan penjelasan polos dan TANPA angka; halaman tidak pernah memilih salah satu sisi. Bila hanya satu endpoint yang hidup, angka tampil dari sumber itu dengan label "satu sumber". Bila wallet terhubung, bacaan datang dari provider wallet itu sendiri, yang secara konstruksi adalah satu sumber, dan labelnya menyatakan itu ("lewat wallet").
2. **Ambang kesegaran 90 detik.** Papan menyegarkan diri setiap 30 detik, jadi bacaan yang berumur lebih dari 90 detik sudah melewati tiga siklus segar yang gagal. Sesudah itu angka tetap tampil (ia adalah bacaan terverifikasi terakhir) tetapi berlabel "Basi" di depan label sumbernya, mengikuti praktik produk data di memo riset: nyatakan umur data apa adanya, jangan tampilkan angka basi seolah baru. Bila seluruh transport gagal pada satu siklus, halaman mempertahankan bacaan sebelumnya persis supaya mekanisme label basi ini yang berbicara, bukan kekosongan.
3. **Gagal atau tidak ada fungsi berarti TIDAK TERDATA.** Revert, jawaban kosong, atau fungsi yang tidak ditawarkan kontrak menghasilkan status tidak terdata tanpa angka, persis aturan blueprint. Tidak ada angka cadangan, tidak ada ekstrapolasi.
4. **Laju bakar dari dua sampel berjarak waktu.** Laju dihitung dari sampel bacaan yang terkumpul selama halaman terbuka; dua sampel ujung harus berjarak minimal 15 detik, di bawah itu panel menyatakan laju masih terbaca (belum cukup), bukan angka. Yang tampil adalah RENTANG antara laju jendela penuh dan laju interval terakhir, dan labelnya menyatakan jendela sampelnya secara eksplisit: jumlah bacaan dan rentang waktunya. Perkiraan habis adalah rentang yang diturunkan dari rentang laju itu, bukan satu titik.
5. **Pemisahan sinyal dan terminting tidak berubah.** Angka sinyal (minat, dari kontrak ConvoySignal) dan angka terminting (kejadian, dari kontrak proyek) tetap di zona terpisah dengan bahasa terpisah; aturan tahap ini hanya mengatur angka proyek.

## 3. Bukti adaptor terhadap kontrak nyata (chain 97)

Lima kontrak tiruan counter dideploy di BSC testnet dengan nilai yang diketahui persis. Nilai tanah (ground truth) TIDAK pernah dibaca dari fungsi adaptor kontrak itu sendiri: ia adalah catatan skrip atas argumen konstruktor dan masukan `mintForTest`, yang sesudahnya dibandingkan dengan bacaan adaptor dari dua RPC independen (publicnode dan dataseed bnbchain) pada satu blok tersemat, blok 143620958. Kesehatan transport dibuktikan lebih dulu pada blok yang sama: kedua RPC menjawab panggilan kontrol `dropCount()` pada ConvoySignal dengan nilai 5.

| Kontrak bukti | Alamat | Pola yang dibuktikan | Nilai tanah (catatan skrip) | Bacaan adaptor RPC A | Bacaan adaptor RPC B | Hasil |
|---|---|---|---|---|---|---|
| MockDropQuota Q1 | `0x3B55c0206BfaA200099f5Ded31c714f538f19f92` | kuota, keadaan normal | totalMinted 3 (sesudah bukti perselisihan: 4), plafon 100, quotaOf 3, mintedBy deployer 1 (sesudah: 2), mintedBy pemegang B 2 | kuota, 3, 100, quotaOf 3, mintedBy 1 | kuota, 3, 100, quotaOf 3, mintedBy 1 | cocok persis, dua RPC sepakat |
| MockDropQuota Q2 | `0x56bcB584034F0D15F32072434d3A9f3632786f52` | kuota, kasus tepi kuota habis | totalMinted 2, plafon 2, quotaOf 2, mintedBy deployer 2 (sama dengan kuota dan plafon) | kuota, 2, 2, quotaOf 2, mintedBy 2 | kuota, 2, 2, quotaOf 2, mintedBy 2 | cocok persis, dua RPC sepakat |
| MockDropQuota Q3 | `0x2331c588d6C1396c79E66786fEac16a834f405f4` | kuota, kasus tepi belum ada mint | totalMinted 0, plafon 500, quotaOf 5, mintedBy 0 | kuota, 0, 500, quotaOf 5, mintedBy 0 | kuota, 0, 500, quotaOf 5, mintedBy 0 | cocok persis, dua RPC sepakat |
| MockDropSupply S1 | `0xF85840609888C82eb4A6540EEfd19d8dD79FE050` | suplai, keadaan normal | totalSupply 7, MAX_SUPPLY 1000; kontrak sengaja TANPA totalMinted, quotaOf, mintedBy, maxSupply | suplai, 7, 1000, plafon dari MAX_SUPPLY() | suplai, 7, 1000, plafon dari MAX_SUPPLY() | cocok persis, deteksi jatuh ke pola suplai seperti dirancang |
| MockDropSupply S2 | `0xf4eCB0D24e11218bF86deB2ceF2730696613159E` | suplai, kasus tepi suplai habis | totalSupply 250, MAX_SUPPLY 250 | suplai, 250, 250 | suplai, 250, 250 | cocok persis, dua RPC sepakat |
| TitipEscrow testnet (kontrak nyata yang sudah ada, kontrak drop 0) | `0x69CFC14869706EbD12EcD38a5746A0684E06b519` | tanpa bacaan publik | tidak menawarkan satu pun fungsi kandidat adaptor | pola none | pola none | cocok: halaman wajib menampilkan TIDAK TERDATA untuk drop 0 |

Fungsi sumber yang terbukti dipakai: pola kuota mengambil terminting dari `totalMinted()` dan plafon dari `maxSupply()`; pola suplai mengambil terminting dari `totalSupply()` dan plafon dari `MAX_SUPPLY()`. Bacaan per alamat tambahan yang dibuktikan: `mintedBy` pemegang B pada Q1 terbaca 2 dari kedua RPC, sama dengan catatan skrip.

Transaksi pembentuk nilai tanah (semua disimulasikan dulu sebelum disiarkan): deploy Q1 `0xd601f97403ff7c10a91c64680e7cb2a200f70146657187ee2cdb4c4357fd53e1`, deploy Q2 `0x4e7c065b6d0f00b2565225de5103244637d0b214d47de1135a5174395e82f6eb`, deploy Q3 `0x4b757a6e2be5c48c2ebae7bb767f7565a92171521bf4825b2ceff47047ae7c4f`, deploy S1 `0x3b903801dfbc8d72d079960f52130bd9e5677f02ff809130b7b414dd626c1bc2`, deploy S2 `0xea3f91f93ba5abf53c05d5cd06fa3e81f962fba922b78a29d229fc5a40d0667c`, mint Q1 deployer `0x182ea2ed5b9ba790969c7088c0141efbd0d2feeb0ae826ce143018931620bd10`, mint Q1 pemegang B `0xb6edc9bb5e3f0fcb0f7fc82918e666b3c75300197b68494906dbbf3e38467943`, mint Q2 deployer `0x156c151e3370f691006e8ff23d583fac5de6486305523eb70bd2c71decdf73db`. Empat mock terdaftar sebagai drop Convoy supaya halaman menampilkannya sebagai data nyata: Q1 drop 1 (`0x50a167a7613b62090ab04a8864be4b045838a705ba2332982246f20f3947e952`), S1 drop 2 (`0x738152c71dc7afb2a37f2c9fca607840b95bbed3ffeb71762ec50a3eadb5a33e`), Q2 drop 3 (`0x0904e09ddffa7fbd8e39314302b54e1ce91b0f48c236d9a0f3997d459ad14b88`), Q3 drop 4 (`0x2f22110baa8b5d3a930d1c24ab26a927b6b8329b7ac80eafb5bc28251f5e5cd2`). S2 tidak didaftarkan; ia bukti pola saja, karena keadaan habisnya sudah terwakili Q2 di papan.

## 4. Bukti cabang perselisihan dua RPC

Aturan rekonsiliasi tidak hanya diuji pada keadaan sepakat. Cabang perselisihannya dibuktikan dengan data chain nyata: `totalMinted` Q1 dibaca pada blok 143620993 bernilai 3; satu transaksi `mintForTest` disiarkan (`0x8390b4f2fdc2053fbcce4d646db454c37b06227c7553e5e7493f1625d7f245b5`, terkonfirmasi di blok 143620997); bacaan pada blok mint dari RPC kedua bernilai 4. Fungsi rekonsiliasi yang sama dengan yang dipakai halaman menilai pasangan (3, 4) itu sebagai **berselisih**, persis perilaku yang membuat halaman menyembunyikan angka alih alih memilih sisi. Sesudahnya Q1 diprobe ulang pada blok tersemat baru 143620998: kedua RPC sepakat lagi pada nilai tanah final (totalMinted 4, mintedBy deployer 2). Nilai final Q1 yang tampil di papan adalah nilai sesudah bukti ini: terminting 4 dari 100, sisa jatah deployer 1 dari 3, sisa jatah pemegang B 1 dari 3.

## 5. Penerapan di frontend dan pemeriksaan visual

Perubahan tahap ini hanya menyentuh lapisan data di `web/app.js`; desain visual tidak berubah dan elemen Pelat Antrean tetap. Yang diterapkan:

- Probe counter halaman sekarang menjalankan spesifikasi kanonis yang sama dengan harness kalibrasi (urutan fungsi, aturan pola, dan aturan TIDAK TERDATA identik), sehingga bukti seksi 3 berlaku untuk kode yang benar benar tampil.
- Tanpa wallet, angka dibaca dari dua RPC publik pada satu blok tersemat dan direkonsiliasi dengan toleransi nol; perselisihan tampil sebagai belum terverifikasi tanpa angka. Dengan wallet, bacaan berasal dari RPC wallet itu sendiri dan dilabeli "lewat wallet" (satu sumber menurut konstruksinya).
- Setiap angka terminting dan kuota membawa garis sumber (fungsi, alamat kontrak terpotong, nomor blok untuk bacaan papan, jam baca, dan label corroborasi). Ambang basi 90 detik diterapkan pada garis sumber papan maupun panel Antrean saya.
- Laju bakar hanya dihitung dari sampel berstatus ok, jendela minimum 15 detik, dan labelnya menyatakan jendela sampelnya ("Jendela sampel: n bacaan selama w").
- Bacaan counter, sampel, status sinyal, dan kuota dipertahankan antar siklus penyegaran, sehingga bacaan yang selesai tidak lenyap saat papan dibangun ulang.
- Satu cacat nyata ditemukan dan diperbaiki selama QA tahap ini: pengayaan halaman (counter, sinyal, kuota) semula menulis hasil ke objek entri yang ditangkap saat siklus dimulai, padahal siklus berikutnya mengganti objek objek itu; pada transport lambat, hasil bacaan drop urutan akhir selalu mendarat di objek yatim yang tidak pernah dirender, sehingga panel menampilkan keadaan kosong siklus sebelumnya walaupun chain menjawab benar (dibuktikan dengan perekaman panggilan RPC halaman: quotaOf dan mintedBy Q2 menjawab 2 dan 0 berulang kali sementara barisnya tetap "tidak terdata"). Perbaikannya: hasil ditulis ke entri live dengan id yang sama, dicari pada saat penulisan. Sesudah perbaikan, baris kuota Q1 (sisa 1 dari 3), Q2 (sisa 2 dari 2), dan Q3 (sisa 5 dari 5) untuk pemegang B semuanya tampil dengan garis sumber dan cocok dengan nilai tanah.

Penerbitan: Worker pratinjau `convoy` diterbitkan ulang (deployment `92a5fbd003b445eea2a52d1fa05751d8`, 19 Nov 2026); kelima berkas yang dilayani (index.html, app.js, styles.css, favicon.svg, og.png) terverifikasi byte identik dengan `web/` lewat curl, dan akar situs menjawab 200.

Pemeriksaan visual terfokus pada panel yang berubah: papan dan panel Antrean saya pada lebar 390 dan 1280, tema gelap dan terang, keadaan tanpa wallet dan terhubung wallet; semua gambar dilihat satu per satu. Hasil: luapan horizontal nol di semua varian, garis sumber membungkus rapi di lebar sempit, zona SINYAL dan TERMINTING tetap terpisah, dan tidak ada cacat tata letak yang berasal dari perubahan tahap ini. Perilaku transien yang teramati di lingkungan QA: pada transport jembatan lokal yang putus putus, satu kartu sesekali tampil TIDAK TERDATA selama satu siklus lalu pulih sendiri di siklus berikutnya; tidak pernah ada angka salah yang tampil, sesuai aturan gagal tertutup.

Regresi sesudah perubahan: `npm test` hijau penuh (35 tes perilaku plus fuzz invarian 750 langkah, statistik per seed identik dengan tahap 2), dan alur sinyal dari halaman lulus 14 dari 14 pemeriksaan dengan rekonsiliasi on-chain (pemegang B memberi sinyal ke drop 0, hitungan naik 1 ke 2, menariknya, hitungan kembali 1, hasSignaled terbaca benar di kedua keadaan).

## 6. Keterbatasan data yang masih tersisa

- Adaptor mencakup tepat tiga pola. Bentuk ABI lain apa pun tetap TIDAK TERDATA menurut desain; Convoy tidak menebak angka untuk kontrak yang tidak cocok dengan pola yang terbukti.
- Rekonsiliasi dua RPC hanya berlaku untuk penjelajahan tanpa wallet. Dengan wallet terhubung, bacaan mengikuti RPC wallet pengguna (satu sumber), dan halaman melabelinya apa adanya.
- Semantik kuota diasumsikan quotaOf dikurangi mintedBy seperti pada kontrak mint Agent ID yang dikenal. Kontrak yang memakai nama fungsi sama dengan arti berbeda akan terbaca keliru; ini asumsi warisan yang sama keluarganya dengan kejujuran registri pada model ancaman, dan belum ada cara memverifikasinya dari ABI saja.
- Laju bakar hanya punya sampel selama halaman terbuka; tidak ada riwayat sisi server, jadi taksiran selalu dimulai ulang pada kunjungan baru.
- Cap waktu baca dan ambang basi memakai jam dinding perangkat pembaca; perangkat dengan jam yang salah akan menilai kesegaran secara salah.
- Selama kalibrasi, RPC B (bsc-testnet-dataseed) sesekali menjawab 403 ke lingkungan ini; halaman memperlakukan ujung yang gagal sebagai satu sumber atau mempertahankan bacaan sebelumnya, tidak pernah sebagai angka nol.
