# Bekukan Cakupan Convoy (Scope Freeze)

Tanggal bekukan: 19 Nov 2026. Status: AKTIF. Berkas ini adalah gerbang perubahan cakupan Convoy sejak Tahap 1 memo pra-rilis (`docs/TAHAP-PRARILIS-RISET.md`). Sesudah berkas ini ada, tidak ada fitur baru yang masuk tanpa mengubah berkas ini lebih dulu, dengan alasan tertulis dan tanggal perubahan. Yang tidak tertulis di kolom BERJALAN di bawah ini berarti tidak dibangun pada jendela menuju submisi 9 Des 2026 15:00 WIB.

## Berjalan (di dalam cakupan, dipertahankan dan diselesaikan)

| Fitur | Keadaan saat bekukan | Alasan masuk cakupan |
|---|---|---|
| Kontrak sinyal ConvoySignal: registerDrop, signal, withdrawSignal, gerbang balanceOf registry | Live di testnet, 35 tes perilaku lulus | Inti produk dan satu satunya permukaan on-chain; melayani butir Kedalaman Agent ID 30 persen |
| Radar drop di halaman: daftar drop, hitungan sinyal, jendela buka dan tutup | Live di testnet (irisan 2) | Permukaan utama yang dinilai juri; melayani Kepraktisan 25 persen dan Kelengkapan 25 persen |
| Panel laju bakar dan perkiraan habis dari bacaan counter proyek yang dikenali, dengan label TIDAK TERDATA bila bacaan tidak tersedia | Live di testnet untuk pola bacaan yang dikenali blueprint | Nilai pemain tunggal Convoy: radar berguna walau sinyal masih nol; aturan kejujuran datanya adalah inti kepercayaan produk |
| Panel status sinyal pribadi (Antrean saya): status sinyal pengguna per drop | Live di testnet | Pengguna wajib bisa memeriksa dan membatalkan sinyalnya sendiri tanpa alat luar |
| Adapter transaksi halaman: simulasi sebelum tanda tangan, lembar konfirmasi bahasa polos, pemetaan error kontrak | Live di testnet | Tanpa ini aksi sinyal tidak bisa dilakukan pengguna dari produknya sendiri |
| Mode dua jaringan halaman: mainnet fail-closed sampai kontrak mainnet ada, testnet penuh lewat parameter | Live | Mencegah halaman menjanjikan jaringan yang belum live |
| Gerbang keamanan Tahap 2: analisis statis, peta OWASP SCSVS, fuzz dan tes invarian | Dikerjakan pada tahap ini | Syarat ahli sebelum mainnet; sasaran fuzz adalah daftar invarian di `docs/THREAT-MODEL.md` |
| Kalibrasi lapisan data Tahap 3: adaptor counter untuk dua atau tiga pola ABI terbanyak, label sumber dan kesegaran, rekonsiliasi dua RPC | Belum mulai, terjadwal sesudah tahap ini | Lapisan data adalah produknya; akurasi angka menentukan kepercayaan |
| Uji tugas pengguna nyata Tahap 4 di testnet | DITUTUP DENGAN PENGECUALIAN 19 Nov 2026: diganti uji mandiri terstruktur oleh Muse plus fitur feedback, atas keputusan Leira (lihat Riwayat perubahan). Uji pengguna nyata TIDAK dianggap sudah terjadi; Bagian B tetap menunggu mainnet dan penguji nyata | Satu satunya tahap yang tidak bisa digantikan penilaian pembangun, menurut sumber produk di memo; pengecualian ini dicatat sebagai utang bukti, bukan sebagai kesetaraan |
| Fitur feedback di halaman: tombol masukan selalu terlihat, dialog formulir pendek berkategori, konteks otomatis yang dinyatakan terbuka, pengiriman sebagai draf issue publik di repo GitHub plus tombol salin teks cadangan | Ditambahkan 19 Nov 2026 atas perintah Leira, dibangun pada penutupan Tahap 4 | Kanal masukan pengguna nyata yang tidak bisa diuji sekarang; menggantikan sebagian fungsi penemuan masalah Tahap 4 sesudah produk dipakai orang, tanpa backend dan tanpa mengumpulkan data pribadi |
| Rombakan desain v2: identitas visual Lembar Pantau Lapangan, Strip Antrean sebagai elemen tanda tangan, navigasi seksi dengan penanda aktif, hero dipadatkan, animasi bertujuan yang aman gerak | Ditambahkan 19 Nov 2026 atas perintah Leira sesudah vonis tampilan jelek pada sesi uji P-01 dan tinjauan sesudahnya; arah tertulis di `docs/DESAIN-V2.md` | Kesan pertama dan kerapian adalah temuan uji manusia yang nyata; gerbang tampil menuntut fondasi visual diganti, bukan ditambal |
| Verifikasi dua RPC untuk bacaan papan (jumlah sinyal dan isi drop) pada blok tersemat, dengan keadaan konflik per drop dan garis sumber zona sinyal | Ditambahkan 19 Nov 2026 dari penyelaman keamanan mata segar (temuan K-03 di `docs/KEAMANAN-V2.md`), penilaian F-05 di `docs/FITUR-V2.md` | Angka utama produk tidak boleh bersumber tunggal tanpa label; menutup asimetri dengan angka terminting yang sudah terverifikasi ganda sejak Tahap 3 |
| Batas baca papan 200 drop terbaru dengan garis jujur jumlah yang ditampilkan | Ditambahkan 19 Nov 2026 dari temuan keamanan K-01 dan penilaian F-06 | Pendaftaran drop terbuka untuk siapa pun; spam pendaftaran tidak boleh menenggelamkan permukaan utama produk |
| Garis percik riwayat terminting sesi per kartu (minimal 5 sampel terverifikasi, berlabel selama halaman terbuka) | Ditambahkan 19 Nov 2026 dari audit produk menyeluruh (F-01 di `docs/FITUR-V2.md`) | Pemburu perlu melihat arah bakar, bukan cuma laju sesaat; data sampelnya sudah dikumpulkan halaman |
| Tautan dalam per drop (?drop=) dengan sorot kartu dan tombol Salin tautan | Ditambahkan 19 Nov 2026 (F-02) | Antrean adalah informasi sosial; membagikan satu drop spesifik adalah bahan bakar jaringan atomik produk |
| Rincian drop yang bisa diperluas di kartu (grafik lebih besar, provenance lengkap, riwayat bacaan sesi) | Ditambahkan 19 Nov 2026 (F-03) | Kepercayaan harus bisa diperiksa tanpa meninggalkan papan; bentuk halaman terpisah dibuang karena duplikasi |
| Daftar pantau lokal per perangkat (tombol Pantau, chip saring Dipantau, tersimpan di localStorage) | Ditambahkan 19 Nov 2026 (F-04) | Personalisasi termurah yang terbukti mendorong kunjungan ulang; berlabel jujur bahwa ia bukan pemberitahuan |
| Hitung mundur status berdetak per detik (hanya simpul teks, berhenti saat tab tidak terlihat) | Ditambahkan 19 Nov 2026 (F-07) | Keputusan FCFS hidup di detik; sisa waktu tidak boleh membeku sampai segar berikutnya |
| Deploy mainnet ConvoySignal ke registry Agent ID asli, verifikasi sumber, pemantauan event, runbook insiden | Belum mulai, hanya sesudah konfirmasi eksplisit Leira dan gerbang tahap 2, 3, 4 lulus | Syarat kelayakan hackathon: produk live di mainnet dan jam interaksi hanya berjalan di sana |
| Berkas skill.md untuk agen dan umpan terbaca mesin (agent.md di repo) | agent.md ikut repo publik tahap ini; skill.md menyusul sebelum mainnet | Kanal rekrut ekosistem agen; agen mengantrekan pemiliknya dengan konfirmasi manusia |
| Artefak submisi Tahap 8: video satu alur, README perjalanan pengguna, angka dibekukan dari on-chain | Belum mulai, dijadwalkan pekan terakhir dengan buffer | Artefak adalah yang benar benar dilihat juri; angka klaim wajib bisa diverifikasi juri sendiri |

## Ditunda (di luar cakupan jendela ini, dengan alasan)

| Fitur | Alasan ditunda |
|---|---|
| Adaptor counter untuk banyak pola proyek di luar dua atau tiga pola ABI terbanyak | Beban per proyek tidak sebanding dengan sisa jendela; pola di luar itu tampil TIDAK TERDATA secara jujur, bukan ditebak |
| Panel Quota lanjut: sisa jatah gratis per alamat untuk pola bacaan kuota di luar yang sudah dikenali (freeRemaining, remainingFree, freeQuotaLeft, quotaOf dikurangi mintedBy/freeMinted) | Fitur sekunder; bacaan dasarnya sudah berjalan dan sisanya tidak memetakan ke butir skor resmi |
| Kurasi drop otomatis atau penilaian keamanan kontrak drop | Di luar janji produk: Convoy mengukur permintaan dan waktu, bukan menilai keamanan; itu wilayah alat cek mekanis lain |
| Notifikasi dorong, bot Telegram, atau pengingat di luar halaman | Tidak memetakan ke butir skor dan menambah permukaan operasional yang tidak bisa dipantau solo dalam jendela ini |
| Dukungan chain selain BNB Chain dan BSC testnet | Brief hanya mengakui BNB Chain; chain lain mengencerkan bukti interaksi |
| Indeks atau backend pribadi untuk membaca event | Halaman membaca langsung dari RPC; backend menambah asumsi kepercayaan yang tidak perlu untuk skala ini |

## Dibuang (tidak dibangun, keputusan sadar)

| Gagasan | Alasan dibuang |
|---|---|
| Skor numerik evaluasi internal sebagai bahasa kesiapan rilis | Tidak ada sumber ahli yang mengakuinya sebagai bukti; kesiapan dinyatakan sebagai daftar gerbang lulus atau gagal dengan bukti |
| Matriks screenshot raksasa sebagai gerbang utama kualitas | Ia menguji kerapian, bukan tugas pengguna; cukup lebar kunci yang dilihat manusia plus uji tugas nyata |
| Fungsi owner, admin, pause, atau ganti registry di kontrak | Kontrak tanpa kuasa adalah model keamanannya; menambah kuasa berarti menambah permukaan serangan dan melanggar janji siapa bisa melakukan apa |
| Menyimpan data kuota pengguna di dalam kontrak | Kuota adalah data proyek lain yang berubah; kontrak hanya menyimpan sinyal, sisanya lapisan baca |
| Hitungan kunjungan atau pendaftaran sebagai angka keberhasilan | Metrik kesombongan menurut literatur jaringan; yang dihitung hanya sinyal dan transaksi yang selesai |

## Aturan perubahan

Perubahan berkas ini wajib mencatat: tanggal, butir yang berubah, alasan, dan siapa yang menyetujui (untuk perubahan cakupan produk, persetujuan Leira). Perubahan yang lahir dari temuan keamanan dicatat juga di `docs/SECURITY-GATE.md`.

## Riwayat perubahan

| Tanggal | Butir yang berubah | Alasan | Disetujui oleh |
|---|---|---|---|
| 19 Nov 2026 | Fitur feedback di halaman ditambahkan ke daftar Berjalan | Perintah langsung Leira saat menutup Tahap 4: pengguna beneran harus punya jalur memberi masukan begitu mereka memakai produk, karena uji pengguna nyata diganti uji mandiri | Leira |
| 19 Nov 2026 | Baris uji tugas Tahap 4 ditandai DITUTUP DENGAN PENGECUALIAN | Keputusan Leira: merekrut 3 sampai 5 pemegang nyata terlalu susah baginya saat ini, jadi tahap ditutup dengan uji mandiri terstruktur oleh Muse plus fitur feedback. Pengecualian ini tidak membuat uji mandiri setara uji pengguna nyata; risikonya (terutama gesekan Developer Mode yang belum terbukti pada manusia) tetap tercatat terbuka di `docs/USER-TEST-KIT.md` | Leira |
| 19 Nov 2026 | Delapan butir v2 ditambahkan ke daftar Berjalan: rombakan desain v2, verifikasi dua RPC bacaan papan, batas baca papan, garis percik sesi, tautan dalam per drop, rincian terluas di kartu, daftar pantau lokal, hitung mundur berdetak | Perintah Leira: tetap Convoy tetapi style diganti dan semua aspek digali dari expert sampai ke akar, termasuk fitur, UX, data, kinerja, dan keamanan. Tiap butir dinilai tertulis dulu di `docs/FITUR-V2.md` dan `docs/KEAMANAN-V2.md` dengan dua saringan produk sebelum masuk cakupan; yang lolos tapi tidak muat (umpan aktivitas log, pengingat luar halaman, OG per drop, riwayat akurasi perkiraan, mode rapat) tetap di daftar Ditunda | Leira |
