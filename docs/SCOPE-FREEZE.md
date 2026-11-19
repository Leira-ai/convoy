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
| Uji tugas pengguna nyata Tahap 4 di testnet | Belum mulai, terjadwal | Satu satunya tahap yang tidak bisa digantikan penilaian pembangun, menurut sumber produk di memo |
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
