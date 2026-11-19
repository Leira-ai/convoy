# Paket Uji Tugas Tahap 4 Convoy: Protokol, Lembar Pengamatan, dan Analisis

Tanggal: 19 Nov 2026. Status: DITUTUP DENGAN PENGECUALIAN pada 19 Nov 2026 atas keputusan Leira. Uji pengguna nyata TIDAK pernah dijalankan; tahap ini ditutup dengan uji mandiri terstruktur oleh pembangun plus fitur feedback, dan hasil serta daftar yang belum terbukti dicatat di Seksi 6 berkas ini. Pengecualian ini tidak membuat uji mandiri setara uji pengguna nyata.
Objek uji: halaman testnet live https://convoy.utterhq.workers.dev/?network=testnet
Metode: uji tugas mengikuti Nielsen Norman Group. Penguji mengerjakan tugas nyata sambil berpikir keras (think aloud), moderator mengamati tanpa membantu, dan yang diukur adalah perilaku, bukan pendapat. Sekitar 5 penguji per putaran menemukan sebagian besar masalah; dua putaran kecil dengan perbaikan di antaranya mengalahkan satu uji besar.
Pasangan berkas: panduan penguji di `docs/PANDUAN-PENGUJI.md`, draf ajakan di `~/workspace/goals/pipeline-bounty-dan-hackathon-berbayar/files/draf-ajakan-uji-convoy.md`.

## 1. Kenyataan teknis yang dinyatakan terus terang

Protokol ini dibangun di atas satu kenyataan yang tidak disembunyikan dari siapa pun, termasuk dari penguji:

- Penguji yang dicari adalah pemegang Agent ID mainnet, orang nyata dari komunitas pemburu mint bergate.
- Halaman yang diuji berjalan di testnet BSC (chain 97) dan membaca registry tiruan (mock), bukan registry Agent ID mainnet. Nama Agent ID mainnet milik penguji tidak tercatat di registry tiruan itu.
- Akibatnya, sesudah penguji menyambungkan walletnya, tombol sinyal akan berada pada keadaan non-pemegang: nonaktif, dengan pesan penjelas bahwa hanya pemegang Agent ID yang bisa memberi sinyal. Ini bukan kerusakan. Keadaan non-pemegang itu sendiri adalah objek uji di Bagian A: apakah pesannya dipahami orang nyata, dan apakah penguji mengerti apa yang ia butuhkan di versi aslinya.
- Karena itu protokol dibagi dua bagian. Bagian A menguji pemahaman, navigasi, dan jalur menyambung, tanpa satu pun transaksi. Bagian B menguji sinyal sungguhan, dan hanya bisa berjalan sesudah kontrak mainnet live. Memaksakan uji sinyal di testnet dengan nama tiruan akan menguji hal yang salah: penguji tidak akan pernah memakai nama tiruan itu di dunia nyata, dan gesekan yang paling menentukan, Developer Mode di aplikasi Binance, hanya nyata di jalur mainnet.

Pemisahan ini ditulis di panduan penguji dan dibacakan di pembukaan sesi, supaya tidak ada penguji yang merasa dijebak keadaan non-pemegang.

## 2. Profil penguji dan rekrutmen

- Pemegang Agent ID mainnet yang aktif memburu mint bergate, dari komunitas yang sudah dikenal (Boltbook, Airdrop Finder). Bukan anggota tim, bukan akun buatan, bukan akun kedua milik siapa pun.
- Putaran 1: 3 sampai 5 orang. Putaran 2: 3 sampai 5 orang yang BERBEDA dari putaran 1, supaya perbaikan diuji oleh mata segar.
- Setiap penguji memakai HP dan aplikasi Binance miliknya sendiri. Tidak ada perangkat atau akun yang disediakan tim.
- Rekrutmen dilakukan Leira dari draf ajakan yang sudah ia setujui. Tidak ada janji imbalan uang. Yang ditawarkan: akses awal dan nama tercatat sebagai penguji pendiri di halaman Convoy.
- Penguji Bagian B adalah orang yang sama dari putaran 1 dan 2, diundang kembali sesudah mainnet live.

## 3. Susunan sesi

- Durasi Bagian A: 45 sampai 60 menit per penguji, satu moderator, satu penguji, tanpa penonton lain.
- Bentuk: panggilan video dengan berbagi layar HP, direkam hanya dengan izin penguji. Bila rekaman ditolak, moderator mencatat manual dan sesi tetap sah.
- Urutan sesi: pembukaan dan persetujuan (5 menit), tiga pertanyaan latar (3 menit), pemeriksaan lima detik (2 menit), tugas A1 sampai A8 (30 sampai 40 menit), tanya jawab penutup (5 menit).
- Moderator tidak menyentuh perangkat penguji dan tidak membuka halaman dari sisinya selama tugas berjalan.

### 3.1 Kata kata pembukaan, dibacakan persis

"Kami sedang menguji halaman Convoy, dan yang diuji adalah halamannya, bukan kamu. Tidak ada jawaban salah. Kalau kamu macet, itu informasi berharga buat kami, bukan kegagalanmu. Tolong ucapkan apa yang sedang kamu pikirkan selama mengerjakan, seperti sedang bercerita. Versi yang kamu buka ini versi uji di jaringan tes. Nama Agent ID asli milikmu tidak tercatat di versi uji ini, jadi tombol sinyalmu akan tampil sebagai non-pemegang. Itu memang disengaja dan termasuk yang kami uji: apakah pesannya jelas. Di sesi ini tidak ada transaksi apa pun dan tidak ada biaya. Kami tidak akan pernah meminta kunci privat, frasa pemulihan, atau kata sandi. Boleh kami rekam layarnya supaya tidak ada yang terlewat?"

### 3.2 Tiga pertanyaan latar, sebelum tugas

1. "Drop bergate terakhir yang kamu ikuti, kamu tahu dari mana?"
2. "Biasanya kamu memutuskan ikut atau tidak dalam waktu berapa lama sejak drop diumumkan?"
3. "Pernah gagal mint karena kuota habis di tengah jalan? Ceritakan singkat."

Jawaban dicatat apa adanya di lembar pengamatan. Pertanyaan ini konteks, bukan tugas, dan tidak dinilai.

## 4. Pemeriksaan lima detik (bukan tugas, selalu pertama)

Moderator menampilkan halaman selama lima detik, lalu meminta penguji berpaling atau menutup tampilan, lalu bertanya:

- "Halaman tadi tentang apa?"
- "Angka apa yang paling kamu ingat?"
- "Menurutmu halaman itu buat siapa?"

Hipotesis: judul halaman dan Pelat Antrean menyampaikan dalam lima detik bahwa ini radar antrean drop bergate yang dihitung dari orang nyata.
Kriteria tercatat baik: penguji menyebut radar atau antrean drop dan menyebut bahwa angka antreannya berasal dari pemegang Agent ID. Hasil pemeriksaan ini dicatat terpisah dan tidak masuk hitungan keberhasilan tugas; ia pemeriksaan kesan pertama, bukan gerbang.

## 5. Daftar tugas Bagian A

Setiap tugas ditulis dengan: kata kata persis yang dibacakan moderator, hipotesis yang diuji, kriteria berhasil yang terukur, titik pengamatan, dan batas waktu menyerah. Bila batas waktu tercapai, moderator mengucapkan "Kita lanjut ke tugas berikutnya, bagian ini sudah cukup memberi kami informasi," dan tugas dicatat gagal dengan titik macet terakhir. Moderator tidak memberi petunjuk dalam bentuk apa pun sebelum batas itu.

### Tugas A1: Menemukan drop yang paling dekat bukanya

Kata kata tugas: "Anggap kamu pemburu mint bergate yang baru membuka halaman ini pagi ini. Tunjukkan drop mana yang paling dekat waktu bukanya, dan jam berapa drop itu buka."

Hipotesis: susunan papan dan tampilan waktu (absolut plus relatif) membuat pemburu menemukan pembukaan berikutnya tanpa bantuan dan tanpa salah membaca tutup sebagai buka.

Kriteria berhasil: penguji menunjuk drop dengan waktu buka terdekat di antara drop terdaftar di papan dan membacakan jam bukanya dengan benar, dalam waktu maksimal 2 menit, tanpa satu pun petunjuk.

Titik pengamatan: jalur gulir (apakah ia membaca dari atas atau mencari), apakah ia berhenti di drop pertama tanpa membandingkan, apakah ia membaca waktu buka atau waktu tutup, apakah format relatif membantunya atau justru membingungkan.

Batas menyerah: 2 menit.

### Tugas A2: Membedakan angka sinyal dan angka terminting

Kata kata tugas: "Lihat drop contoh kuota yang ada di papan. Berapa orang yang sudah menyatakan niat ikut drop itu, dan berapa yang benar benar sudah mint? Sesudah itu jelaskan bedanya dua angka itu dengan kata katamu sendiri."

Hipotesis: dua zona yang terpisah (SINYAL ANTRE amber dan SUDAH TERMINTING teal) membuat orang nyata tidak mencampuradukkan minat dengan kejadian, yang merupakan risiko penyajian terbesar produk ini.

Kriteria berhasil: penguji membacakan kedua angka dengan benar dari kartunya, lalu menjelaskan bahwa angka sinyal adalah pernyataan niat pemegang Agent ID sedangkan angka terminting adalah kejadian nyata dari kontrak proyek. Penjelasan harus memuat kata niat atau minat untuk angka pertama dan kata sudah terjadi atau sudah mint untuk angka kedua. Waktu maksimal 3 menit.

Titik pengamatan: urutan mata (zona mana dibaca duluan), apakah ia menjumlahkan atau membandingkan kedua angka seolah satu metrik, kata persis yang ia pakai untuk tiap angka, apakah label zonanya dibaca atau ditebak dari warna saja.

Batas menyerah: 3 menit.

### Tugas A3: Membaca laju bakar dan perkiraan habis

Kata kata tugas: "Untuk drop yang panel bakarnya terisi, seberapa cepat kuota drop itu habis, dan kira kira kapan kuotanya habis? Tunjukkan dari bagian mana kamu membaca itu."

Hipotesis: panel laju bakar, yang menampilkan laju sebagai rentang dan perkiraan habis sebagai rentang dengan label jendela sampel, bisa dibaca pemburu sebagai informasi keputusan, bukan sebagai angka pasti yang menipu.

Kriteria berhasil: penguji menemukan panel bakar tanpa diarahkan, membacakan laju bakar dan perkiraan habis sebagai rentang (memakai kata sekitar, antara, atau rentang sejenis), dan bisa menunjuk label jendela sampelnya bila ditanya "angka itu dihitung dari pengamatan berapa lama?" Waktu maksimal 3 menit.

Titik pengamatan: apakah perkiraan dibaca sebagai satu titik pasti, apakah label sumber dan jendela sampel diperhatikan sama sekali, apakah ia membandingkan laju dua drop atau hanya membaca satu.

Batas menyerah: 3 menit.

### Tugas A4: Membaca keadaan TIDAK TERDATA

Kata kata tugas: "Lihat drop pertama di papan. Panel counternya menampilkan apa? Menurutmu kenapa tampilannya begitu, dan apakah angka antrean drop itu tetap bisa kamu percaya?"

Hipotesis: label TIDAK TERDATA dengan alasan tertulis dibaca sebagai kejujuran data, bukan sebagai halaman rusak, dan penguji tetap membedakan kepercayaan pada angka antrean (dari kontrak Convoy) dari kepercayaan pada counter proyek.

Kriteria berhasil: penguji menyatakan counter proyek drop itu tidak bisa dibaca atau tidak terdata, memberi alasan yang sejalan dengan teks alasan di panel, dan menyatakan angka antreannya tetap berasal dari kontrak Convoy sendiri. Waktu maksimal 3 menit.

Titik pengamatan: apakah reaksi pertamanya menganggap seluruh drop atau seluruh halaman rusak, apakah alasan tertulis dibaca sampai selesai, apakah kepercayaan pada papan secara keseluruhan runtuh karena satu panel tidak terdata.

Batas menyerah: 3 menit.

### Tugas A5: Menyambungkan wallet dan membaca keadaan non-pemegang

Kata kata tugas: "Sekarang sambungkan wallet yang biasa kamu pakai untuk Agent ID ke halaman ini. Sesudah tersambung, tunjukkan apa statusmu untuk memberi sinyal, dan bacakan apa kata halaman tentang yang kamu butuhkan."

Hipotesis: jalur sambung wallet bisa ditemukan orang nyata tanpa diarahkan, dan pesan keadaan non-pemegang menjelaskan dengan bahasa polos siapa yang bisa memberi sinyal, tanpa membuat penguji merasa ditolak atau halamannya rusak.

Kriteria berhasil: penguji menyambungkan walletnya sendiri tanpa petunjuk langkah, menemukan status atau tombol sinyal yang nonaktif, dan membacakan atau parafrasekan pesan non-pemegang dengan benar, termasuk bahwa yang bisa memberi sinyal adalah pemegang Agent ID. Waktu maksimal 4 menit. Penjelasan bahwa versi uji memakai registry tiruan diberikan moderator hanya di tanya jawab penutup, bukan selama tugas.

Titik pengamatan: jalur sambung yang dipilih (tombol di kepala halaman atau di panel), keraguan di permintaan sambung, apakah ia mencari cari tombol sinyal di kartu drop atau di panel pribadinya, reaksi emosional pertama saat melihat tombol nonaktif, kata persis yang ia pakai untuk menjelaskan pesannya.

Batas menyerah: 4 menit.

### Tugas A6: Membaca panel antrean pribadi dan sisa jatah

Kata kata tugas: "Masih dengan wallet tersambung, temukan panel antreanmu. Untuk drop contoh kuota di papan, bacakan sisa jatah gratis atas namamu, dan tunjukkan dari mana angka itu dibaca."

Hipotesis: panel Antrean saya bisa ditemukan tanpa diarahkan, dan garis sumber di bawah angka (fungsi yang menjawab, alamat kontrak, jam baca) cukup terlihat untuk membuat angka kuota bisa dipercaya atau dipertanyakan dengan benar.

Kriteria berhasil: penguji membuka panel Antrean saya, membacakan sisa jatah untuk drop yang diminta dengan benar, dan menunjuk garis sumbernya saat diminta menunjukkan asal angka. Waktu maksimal 3 menit.

Titik pengamatan: apakah panel pribadi dicari di kepala halaman atau digulir, apakah garis sumber dibaca atau diabaikan, apakah sisa jatah dibedakan dari angka sinyal dan angka terminting atau tercampur lagi.

Batas menyerah: 3 menit.

### Tugas A7: Penelusuran Developer Mode di aplikasi Binance, berhenti sebelum transaksi

Kata kata tugas: "Bayangkan besok versi aslinya sudah live dan kamu mau memberi sinyal dari HP ini. Tunjukkan langkahmu di aplikasi Binance, dari membuka aplikasi sampai titik kamu siap menyambung ke kontrak Convoy. Berhenti sebelum transaksi apa pun, dan jangan menyetujui tanda tangan apa pun."

Hipotesis: gesekan terbesar produk ini, menyalakan Developer Mode dan mencapai titik panggil kontrak kustom, bisa dilewati pemegang nyata tanpa pendampingan, atau titik macetnya bisa dipetakan persis untuk diperbaiki di panduan dan di halaman.

Kriteria berhasil: penguji mencapai keadaan Developer Mode aktif dan titik masuk interaksi kontrak kustom di aplikasinya, tanpa petunjuk langkah dari moderator, dalam waktu maksimal 6 menit. Bila aplikasi di HP penguji tidak menyediakan jalur itu sama sekali, tugas dicatat sebagai temuan platform, bukan kegagalan penguji, dan jalur terjauh yang ia capai dicatat lengkap.

Titik pengamatan: jalur menu persis yang ia tempuh (ditulis langkah demi langkah apa adanya), titik ia berhenti dan berpikir, menu yang ia buka lalu tinggalkan, peringatan aplikasi yang muncul dan bagaimana ia membacanya, apakah ia sadar setiap transaksi tetap butuh konfirmasinya sendiri.

Aturan berhenti keras: moderator menghentikan tugas seketika bila layar tanda tangan atau konfirmasi transaksi muncul. Kalimat berhentinya: "Berhenti di sini, jangan ditekan. Titik ini sudah cukup untuk kami." Tidak ada pengecualian.

Batas menyerah: 6 menit, atau aturan berhenti keras, mana yang lebih dulu.

### Tugas A8: Penjelasan balik sebagai penutup tugas

Kata kata tugas: "Terakhir, jelaskan dengan kata katamu sendiri, seperti menjelaskan ke teman sesama pemburu: Convoy ini apa, angka mana di papan yang paling kamu percaya dan kenapa, dan apa yang akan kamu cek di halaman ini sebelum sebuah drop buka."

Hipotesis: sesudah mengerjakan A1 sampai A7, model mental penguji tentang produk ini utuh: antrean dari orang nyata, laju bakar sebagai penentu waktu, dan sinyal sebagai niat, bukan janji.

Kriteria berhasil: penjelasan memuat tiga unsur tanpa diminta satu per satu: antrean dihitung dari pemegang Agent ID nyata, laju bakar atau perkiraan habis sebagai alat memutuskan waktu, dan sinyal bukan jaminan mint. Waktu maksimal 3 menit.

Titik pengamatan: unsur yang hilang, kesalahpahaman yang bertahan sampai akhir sesi, kata kata penguji yang lebih baik dari kata kata halaman (dicatat persis, bahan perbaikan teks).

Batas menyerah: tidak ada; tugas ini selalu dijalankan sampai penguji selesai bicara atau 3 menit berlalu.

## 6. Penutupan dengan pengecualian dan hasil uji mandiri (19 Nov 2026)

### 6.1 Keputusan dan batasnya, dinyatakan apa adanya

Leira memutuskan pada 19 Nov 2026 bahwa merekrut 3 sampai 5 pemegang Agent ID nyata terlalu susah baginya saat ini, jadi ia memberi pengecualian untuk tahap ini: pembangun sendiri yang menguji, dengan tambahan fitur feedback supaya pengguna beneran bisa memberi masukan nanti saat memakai produk. Tiga hal wajib dibaca bersama keputusan itu:

1. Uji mandiri ini TIDAK setara uji pengguna nyata dan tidak pernah boleh dikutip sebagai penggantinya. Pembangun tahu persis ke mana harus melihat; penguji nyata tidak. Yang diuji di sini adalah bahwa halaman dan angkanya benar dan bisa ditemukan oleh operator yang mengikuti kata kata tugas kit ini secara harfiah, bukan bahwa manusia asing akan berhasil.
2. Risiko yang hanya bisa dijawab manusia nyata tetap terbuka seluruhnya, terutama gesekan Developer Mode di aplikasi Binance milik penguji (tugas A7). Daftar lengkapnya ada di 6.5.
3. Kompensasinya bersifat parsial dan berjalan sesudah produk dipakai orang: fitur feedback (6.6) memberi jalur masukan nyata, tetapi masukan sukarela tidak menggantikan pengamatan tugas yang terstruktur.

### 6.2 Metode uji mandiri

- Skrip: `qa/selftest-stage4.js`, hasil mentah `qa/selftest-stage4-result.json`, screenshot per tugas di `qa/shots-stage4/`.
- Profil browser bersih tanpa keadaan lama untuk tiap fase, viewport 390 kali 844 (ukuran HP, medium penguji yang direncanakan kit ini), bahasa ID, tema gelap bawaan.
- Operator skrip hanya membaca apa yang tampil di halaman, memutuskan dari tampilan, dan setiap keputusan dicocokkan dengan nilai tanah on-chain yang dibaca independen lewat ethers. Waktu diukur per tugas; waktu yang tercatat adalah waktu sistem dan eksekusi operator, bukan waktu baca manusia, dan batas menyerah kit tidak dipakai sebagai vonis karena operator skrip tidak bisa menyerah seperti manusia.
- Catatan transport, terus terang: Chromium di lingkungan ini tidak bisa menjangkau RPC publik secara langsung (ERR_TUNNEL_CONNECTION_FAILED teramati hidup; halaman menjawab dengan keadaan galat jujurnya, bukan angka basi, yang merupakan perilaku benar). Fase dingin karena itu memakai provider jembatan lokal dengan eth_accounts menjawab kosong, transport QA yang sama dengan Tahap 3. Logika baca, rekonsiliasi, dan render halamanlah yang berjalan; hanya kabelnya yang berbeda.
- A5 dijalankan sebagai akun uji non-pemegang lewat jembatan lokal, meniru persis keadaan penguji nyata di halaman testnet. A6 dijalankan sebagai pemegang tiruan B. Wallet yang dipakai bukan aplikasi wallet milik manusia; perbedaan itu bagian dari yang belum terbukti.
- A3 membutuhkan laju bakar hidup: sesudah sampel pertama mendarat, satu mintForTest nyata disiarkan ke mock kuota Q1 (tx `0x453d3b948350853103ca0a636072f7c548124844fed098f083ce6dc6eee02193`, totalMinted 5 ke 6) supaya sampel berikutnya menghasilkan laju, perkiraan habis, dan label jendela sampel yang asli untuk dibaca.

### 6.3 Lembar pengamatan, terisi dari uji mandiri

| Tugas | Hasil | Waktu | Bukti inti | Titik macet dan catatan |
|---|---|---|---|---|
| Cek 5 detik | LULUS-PROKSI | 5 dtk | Judul "Antrean drop, dihitung dari orang nyata." plus pelat berisi status, label drop, dan angka sinyal 1 | Proksi: kesan dibaca dari teks hero oleh skrip, bukan dari manusia yang berpaling sesudah lima detik |
| A1 | LULUS | di bawah 1 dtk eksekusi operator | Jawaban dari tampilan sama dengan kebenaran chain (drop 0, buka paling awal); semua jam buka dan tutup pada 5 kartu cocok dengan nilai chain yang diformat sama | Semua drop uji sudah berstatus dibuka saat uji berjalan, jadi tugas menyusut menjadi membaca dan membandingkan jam buka; tidak ada drop yang akan buka di masa depan di papan uji, dan papan tidak mengurutkan kartu berdasarkan waktu buka |
| A2 | LULUS | 3 dtk | Kartu Q1: sinyal tampil 0 (chain 0), terminting "5 / 100" (chain 5 / 100 pada putaran final), catatan zona memuat "menyatakan minat" dan "kejadian nyata" | Penjelasan balik dengan kata sendiri tidak bisa dilakukan skrip; yang teruji angka dan label zonanya |
| A3 | LULUS sesudah perbaikan F-01 | 32 dtk sistem | Sesudah mint nyata: terminting "6 / 100", laju "1.88 mint per menit", perkiraan "sekitar 50 menit", label "Jendela sampel: 2 bacaan selama <1 menit" | Putaran pertama GAGAL pada bentuk rentang (lihat F-01). Waktu terukur adalah waktu sistem sampai panel hidup, bukan waktu baca |
| A4 | LULUS | di bawah 1 dtk | Zona terminting drop 0 tampil "Tidak terdata", baris bakar memuat alasan tertulisnya, angka sinyal tetap tampil 1 sesuai chain | Tidak ada titik macet pada operator |
| A5 | LULUS | 22 dtk sistem | Wallet bar terhubung sebagai akun non-pemegang; tombol "Ikut antre" nonaktif; pesan tampil persis: "Hanya pemegang Agent ID yang bisa memberi sinyal. Wallet kamu tidak memegang Agent ID di registry ini." | Reaksi emosional dan pemahaman manusia atas pesan ini tidak teruji; wallet bukan aplikasi milik manusia |
| A6 | LULUS | 26 dtk sistem | Baris Antrean saya untuk Q1: "Sisa jatah gratis kamu: 1 / 3", cocok dengan chain (quotaOf B 3 dikurangi mintedBy B 2), garis sumber memuat "Sumber: quotaOf() − mintedBy()" dan label "lewat wallet"; tombol sinyal pemegang aktif sebagai kontras A5 | Tidak ada titik macet pada operator |
| A7 | BELUM TERBUKTI | tidak dijalankan | Tidak ada bukti apa pun | Tugas ini menelusuri Developer Mode di aplikasi Binance milik penguji manusia di HP-nya sendiri; tidak ada manusia luar dan tidak ada aplikasi Binance penguji di lingkungan ini |
| A8 | LULUS-PROKSI | tidak diukur | Audit teks halaman: unsur 1 (antrean dari pemegang nyata) ada di blok hero, unsur 2 (bakar sebagai alat memutuskan waktu) ada di langkah 3 dan panel, unsur 3 (sinyal bukan jaminan) ada di seksi makna | Proksi: yang diperiksa adalah teks halaman memuat tiga unsur yang harus bisa diucapkan balik penguji. Penjelasan balik oleh manusia tetap belum terjadi. Putaran audit pertama menandai unsur 1 absen karena hanya membaca lede; frasa "orang nyata" ada di judul hero, dan audit diulang dengan cakupan blok hero penuh |

### 6.4 Temuan dan perbaikannya

- F-01, keparahan SEDANG: pada keadaan dua sampel (satu interval), perkiraan habis tampil sebagai rentang merosot "sekitar 44 menit sampai 44 menit", dua ujung yang sama persis terbaca sebagai rentang padahal isinya satu titik; bentuk yang sama bisa terjadi pada laju bakar. Keputusan: DIPERBAIKI di giliran yang sama. Bila kedua ujung terformat sama, halaman kini menampilkan taksiran tunggal berpayung kata "sekitar" (kunci etaSingle, ID dan EN), untuk perkiraan habis maupun laju bakar. Tugas A3 dijalankan ulang sesudah perbaikan dan LULUS dengan bentuk "sekitar 50 menit".
- F-02, keparahan RENDAH: garis sumber counter tampil sebagai "Sumber: · totalMinted() · ..." dengan pemisah tepat sesudah label. Keputusan: DITERIMA. Alasannya: ini gaya daftar yang konsisten sejak Tahap 3 dan sudah dilihat pada matriks tahap itu; segmennya bukan kosong, melainkan label "Sumber:" yang diikuti pemisah daftar, dan tidak ada angka atau makna yang berubah karenanya.
- Bukan temuan halaman: kegagalan transport RPC langsung dari Chromium lingkungan ini (6.2) adalah batas lingkungan uji, dan halaman menjawabnya dengan keadaan galat yang jujur.

### 6.5 Yang tetap BELUM TERBUKTI (daftar terbuka)

1. Tugas A7 seluruhnya: apakah pemegang nyata bisa menyalakan Developer Mode dan mencapai titik panggil kontrak kustom di aplikasi Binance-nya sendiri tanpa pendampingan. Ini gesekan terbesar produk dan masih nol bukti manusia.
2. Pemahaman manusia atas pesan non-pemegang (A5), atas label TIDAK TERDATA (A4), dan atas perbedaan sinyal versus terminting (A2): operator skrip membacanya secara harfiah, manusia bisa salah membaca dengan cara yang tidak bisa diramalkan pembangun.
3. Kesan pertama lima detik pada manusia (cek 5 detik) dan penjelasan balik A8 oleh manusia.
4. Perilaku halaman di aplikasi wallet dan browser HP nyata, termasuk jalur sambung EIP-6963 di perangkat penguji; yang teruji di sini adalah Chromium desktop headless dan jembatan lokal.
5. Putaran 2 kit ini (penguji berbeda sesudah perbaikan) tidak terjadi; F-01 diperbaiki dan diuji ulang oleh pembangun yang sama, bukan oleh mata segar.

### 6.6 Fitur feedback, kompensasi parsial yang dibangun bersama penutupan ini

Atas perintah Leira di penutupan yang sama, halaman kini punya fitur feedback: seksi selalu terlihat di alur halaman dengan tombol "Tulis masukan", membuka dialog formulir pendek (kategori Bingung, Angka salah, Tombol tidak jalan, Saran, Lainnya; pilihan drop; isi bebas). Konteks otomatis (mode jaringan, drop yang dilaporkan, versi halaman 0.5.0, bahasa) ditampilkan terbuka di dialog sebelum apa pun dikirim, dan dialog menyatakan di muka bahwa masukan menjadi issue publik di repo GitHub. Kirim menyusun draf dan membuka halaman issue baru repo publik dengan judul, isi, dan label feedback terisi; tombol salin teks adalah cadangan. Tidak ada backend dan tidak ada data pribadi yang diminta. Templat issue yang cocok ada di `.github/ISSUE_TEMPLATE/feedback.md`. Bukti ujung ke ujung: `qa/feedback-e2e.js` 18 dari 18 lulus, termasuk verifikasi parameter URL issue persis (window.open dicegat dan dicatat; tidak ada issue sungguhan yang dibuat), teks salinan identik dengan isi issue selain cap waktunya, dan pemeriksaan visual dialog pada 390 dan 1280 di dua tema dengan gambar dilihat sendiri. Fitur ini ditambahkan ke `docs/SCOPE-FREEZE.md` lebih dulu mengikuti proses berkas itu sendiri.

### 6.7 Status Bagian B

Bagian B (sinyal sungguhan oleh penguji yang sama sesudah mainnet live) TIDAK berubah oleh pengecualian ini: ia tetap rencana yang tertulis di kit, belum terjadwal, dan menjadi jalur pertama untuk menutup daftar 6.5 bila Leira membuka rekrutmen di kemudian hari. Selama Bagian B belum berjalan, setiap klaim kesiapan Convoy wajib membawa catatan bahwa gesekan Developer Mode belum terbukti pada manusia.

## 6. Panduan moderator

### 6.1 Sikap wajib

- Netral penuh. Moderator adalah pengamat, bukan guru, bukan penjual, dan bukan pembangun yang membela karyanya.
- Dilarang membantu: tidak menunjuk layar, tidak menyebut nama menu atau tombol, tidak mengangguk pada jawaban benar dan tidak mengernyit pada jawaban salah, tidak menyelesaikan kalimat penguji.
- Dilarang menjelaskan istilah selama tugas berjalan, termasuk istilah sinyal, laju bakar, dan tidak terdata. Bila penguji bertanya artinya, jawab dengan pertanyaan susulan yang diizinkan.
- Bila penguji bertanya "sudah benar belum?", jawab selalu: "Tidak ada yang benar atau salah di sini, kami cuma mencatat cara halaman ini bekerja untukmu."
- Bila penguji frustrasi, ingatkan kalimat pembukaan: yang diuji halamannya, bukan orangnya. Bila frustrasi berlanjut, lewati tugas itu dan catat.
- Semua waktu diukur moderator dengan pengatur waktu yang tidak terlihat penguji. Batas menyerah ditegakkan tanpa negosiasi.

### 6.2 Pertanyaan susulan yang diizinkan, hanya ini

- "Apa yang sedang kamu pikirkan sekarang?"
- "Apa yang kamu harapkan terjadi waktu kamu menekan itu?"
- "Bagian mana yang membuatmu berhenti?"
- "Kalau kamu harus menebak, bagian itu artinya apa?"
- "Tunjukkan ke saya bagian yang sedang kamu baca."
- Di tanya jawab penutup saja: "Bagian mana yang paling membingungkan dari seluruh sesi?" dan "Apa satu hal yang akan kamu ubah kalau halaman ini milikmu?"

### 6.3 Yang dicatat moderator selama sesi

- Waktu mulai dan selesai tiap tugas, dari pengatur waktu.
- Berhasil, berhasil sebagian, atau gagal, mengikuti kriteria di seksi 5, diputuskan saat itu juga dan tidak diubah belakangan tanpa catatan alasan.
- Titik macet ditulis sebagai lokasi dan perilaku: halaman atau panel apa, elemen apa, dan apa yang penguji lakukan (menggulir naik turun, membuka menu yang salah, membaca ulang).
- Kutipan kata kata penguji ditulis APA ADANYA di dalam tanda kutip, termasuk kata yang salah atau kasar. Parafrase moderator tidak boleh menggantikan kutipan.
- Untuk A7, jalur menu ditulis sebagai daftar langkah persis seperti yang ditempuh penguji.

## 7. Lembar pengamatan per penguji

Satu lembar per penguji, disalin sebelum sesi dan diisi selama sesi. Kode penguji dipakai di semua berkas, bukan nama asli, kecuali penguji sendiri minta namanya ditulis untuk kredit penguji pendiri.

Kode penguji: ............ (contoh U1-01 untuk putaran 1 penguji 01)
Tanggal dan jam sesi: ............
Perangkat dan aplikasi Binance versi: ............
Rekaman disetujui: ya / tidak
Catatan latar (jawaban tiga pertanyaan pembuka, ringkas apa adanya):
1. ............
2. ............
3. ............

Hasil pemeriksaan lima detik:
- "Halaman ini tentang apa" menurut penguji: "............"
- Angka yang paling diingat: ............
- Disebut buat siapa: ............

| Tugas | Berhasil / Sebagian / Gagal | Waktu | Titik macet (lokasi dan perilaku) | Kutipan penguji apa adanya | Keparahan temuan (0 sampai 4) |
|---|---|---|---|---|---|
| A1 Temukan drop terdekat |  |  |  |  |  |
| A2 Sinyal vs terminting |  |  |  |  |  |
| A3 Laju bakar |  |  |  |  |  |
| A4 Tidak terdata |  |  |  |  |  |
| A5 Sambung dan non-pemegang |  |  |  |  |  |
| A6 Panel pribadi dan jatah |  |  |  |  |  |
| A7 Developer Mode |  |  |  |  |  |
| A8 Penjelasan balik |  |  |  |  |  |

Jalur menu A7, langkah persis:
1. ............
2. ............
3. ............

Catatan penutup (jawaban dua pertanyaan penutup, kutipan apa adanya):
- Paling membingungkan: "............"
- Satu hal yang akan diubah: "............"

### 7.1 Skala keparahan temuan

Mengikuti skala Nielsen, dinilai dari dampak pada tugas, frekuensi antar penguji, dan kegigihan masalahnya:

- 0: bukan masalah kegunaan, perbedaan selera saja.
- 1: kosmetik, terlihat tapi tidak mengganggu penyelesaian tugas.
- 2: ringan, memperlambat atau membuat ragu, tugas tetap selesai.
- 3: berat, tugas gagal atau selesai hanya dengan keberuntungan, atau kesalahpahaman bertahan sampai A8.
- 4: bencana, tugas inti mustahil diselesaikan, atau penguji menarik kesimpulan yang berbahaya dari halaman (misalnya membaca angka sinyal sebagai jaminan mint, atau mengira halaman rusak dan data palsu).

Keparahan awal ditulis moderator di lembar; keparahan akhir ditetapkan di analisis putaran (seksi 8) sesudah frekuensi antar penguji terlihat.

## 8. Metode analisis sesudah putaran

### 8.1 Pengelompokan temuan

1. Kumpulkan semua lembar satu putaran. Satu temuan adalah satu pola macet atau salah paham yang menunjuk ke satu penyebab di halaman, di teks, atau di jalur platform. Kutipan dari penguji berbeda yang menunjuk penyebab sama digabung jadi satu temuan dengan daftar penguji yang mengalaminya.
2. Tiap temuan ditulis dalam format tetap: judul penyebab, tugas asal, jumlah penguji yang mengalami dari total penguji putaran itu, kutipan terkuat apa adanya, dan elemen halaman yang diduga penyebabnya.
3. Tingkat keberhasilan per tugas dihitung apa adanya: jumlah berhasil dibagi jumlah penguji. Berhasil sebagian dihitung bukan berhasil.

### 8.2 Peringkat keparahan akhir

Keparahan akhir tiap temuan adalah gabungan: dampak (dari skala seksi 7.1), frekuensi (berapa penguji mengalaminya), dan kegigihan (apakah kesalahpahamannya masih ada di A8). Temuan yang dialami satu penguji dengan dampak 4 tetap berat; temuan dampak 2 yang dialami semua penguji naik kelasnya karena frekuensi.

### 8.3 Kriteria perbaikan wajib sebelum putaran 2

Perbaikan wajib dikerjakan dan diverifikasi sebelum putaran 2 dibuka bila salah satu terpenuhi:

- Ada temuan berkeparahan akhir 4.
- Ada temuan berkeparahan akhir 3 yang dialami 2 penguji atau lebih.
- Tugas inti A1, A2, A5, atau A7 berhasil di bawah 60 persen penguji putaran 1.
- Ada penguji yang membaca angka sinyal sebagai jaminan atau janji hasil di A2 atau A8, berapa pun jumlahnya. Ini garis merah produk, bukan statistik.

Perbaikan diverifikasi dengan menjalankan ulang tugas yang gagal itu pada minimal satu orang baru di luar daftar putaran 2, atau, untuk perbaikan teks murni, dengan pemeriksaan baca oleh orang yang belum pernah melihat halaman. Putaran 2 memakai daftar tugas yang sama persis supaya angka bisa dibandingkan.

### 8.4 Kriteria lulus tahap 4

Tahap 4 dinyatakan lulus bila semua berikut terpenuhi di putaran 2:

- Tugas inti A1, A2, A5, dan A7 masing masing berhasil pada 80 persen penguji putaran 2 atau lebih.
- Tidak ada temuan terbuka berkeparahan akhir 3 atau 4.
- Semua penguji putaran 2 menjelaskan beda sinyal dan terminting dengan benar di A2, tanpa kecuali.
- Sedikitnya 3 dari 5 penguji putaran 2 mencapai titik siap sambung di A7 tanpa bantuan, atau titik mustahilnya terbukti murni batas platform dan panduan penguji sudah diperbarui menuliskan jalur terjauh yang nyata itu.
- Seluruh temuan, perbaikan, dan hasil putaran 2 tercatat di BUILD-REPORT.md dengan bukti, bukan ringkasan kesan.

Bila kriteria tidak terpenuhi, tahap 4 tidak dinyatakan lulus dengan catatan. Yang dilakukan adalah putaran perbaikan lagi, atau keputusan tertulis Leira untuk menerima risiko tertentu dengan alasannya dicatat. Mainnet tidak menunggu tahap 4 sempurna, tetapi temuan A7 yang berat wajib masuk panduan penguji Bagian B sebelum ajakan Bagian B dikirim.

## 9. Rencana Bagian B: uji sinyal sungguhan sesudah mainnet live

### 9.1 Syarat mulai

- Kontrak ConvoySignal mainnet sudah deploy, sumbernya terverifikasi, dan alamatnya terpasang di halaman mode mainnet.
- Sedikitnya satu drop nyata terdaftar di papan mainnet.
- Panduan penguji sudah diperbarui dengan temuan A7 putaran terakhir, termasuk jalur menu yang terbukti dari HP penguji nyata.
- Undangan Bagian B dikirim hanya ke penguji putaran 1 dan 2 yang menyelesaikan Bagian A. Tidak ada rekrutmen massal dan tidak ada akun tambahan.

### 9.2 Tugas Bagian B, dibacakan dengan pola yang sama

- B1 Memberi sinyal: "Buka halaman Convoy versi asli, sambungkan wallet Agent ID kamu, dan beri sinyal pada drop yang akan kamu ikuti ini." Kriteria berhasil: transaksi sinyal terkonfirmasi di aplikasi penguji sendiri, dan bacaan on-chain sesudahnya menunjukkan hasSignaled atas alamat penguji bernilai benar dan hitungan sinyal drop naik tepat satu. Setiap transaksi tetap dikonfirmasi penguji di aplikasinya; tidak ada yang melewati konfirmasi itu.
- B2 Membaca status sendiri: "Tunjukkan di halaman bahwa sinyalmu sudah tercatat, dan di panel antreanmu." Kriteria: penguji menemukan statusnya sendiri di dua tempat itu tanpa diarahkan, dalam 3 menit.
- B3 Menarik sinyal: "Anggap rencanamu berubah. Tarik sinyal yang barusan kamu beri, lalu tunjukkan hitungannya kembali seperti semula." Kriteria: transaksi tarik terkonfirmasi, hasSignaled kembali salah, hitungan kembali ke angka sebelum B1.
- B4 Memberi sinyal lagi secara mandiri: tanpa dibacakan langkah apa pun selain "Silakan beri sinyal lagi seperti tadi, sendiri." Kriteria: selesai tanpa satu pun pertanyaan prosedural. Tugas ini mengukur apakah alurnya diingat sebagai kebiasaan, bukan sebagai pertunjukan pertama.

### 9.3 Kedudukan Bagian B terhadap lantai interaksi

Sinyal B1 dan B4 dari penguji adalah pemakaian produk yang nyata oleh pemegang Agent ID nyata atas kemauan sendiri, sesudah mereka mengenal produknya di Bagian A. Karena itu interaksi mereka sah sebagai interaksi organik pertama dan dihitung dari bacaan on-chain, sama seperti interaksi pengguna mana pun. Yang dilarang dan tidak akan dilakukan: membuat akun tambahan untuk menambah hitungan, meminta penguji memberi sinyal pada drop yang tidak mereka pedulikan berulang kali, atau transaksi kosong dalam bentuk apa pun. Bila seorang penguji tidak bisa menyelesaikan B1 karena gesekan Developer Mode, itu dicatat sebagai temuan platform dengan jalur persisnya, bukan ditutupi dan bukan digantikan orang lain demi angka.

### 9.4 Pencatatan Bagian B

Per penguji dicatat: kode penguji, hash transaksi B1, B3, dan B4, bacaan hitungan sebelum dan sesudah dari dua RPC, waktu tiap tugas, dan titik macet apa pun di jalur aplikasi. Hasilnya masuk BUILD-REPORT.md dan menjadi bahan angka interaksi awal yang dilaporkan apa adanya.
