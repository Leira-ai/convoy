# FITUR V2: Audit Produk Menyeluruh Convoy

Status: SELESAI dinilai, 19 Nov 2026. Pendamping DESAIN-V2.md (tampilan) dan KEAMANAN-V2.md (keamanan). Ditulis atas perintah pemilik produk untuk menggali semua aspek dari expert, bukan cuma tampilan. Setiap kandidat dinilai dengan format yang sama: manfaat bagi tugas inti pemburu, bukti dari produk expert, beban bangun terhadap sisa waktu menuju tutup submisi 9 Des 2026 pukul 15.00 WIB, lalu dua saringan pemilik produk, dan vonisnya.

Dua saringan yang dipakai, dari riset ide produk sebelumnya:

1. UJI JALAN PINTAS: kandidat gugur bila cara langsung yang sudah ada lebih cepat dan cukup aman dibanding memakai fitur ini.
2. UJI PLATFORM: kandidat gugur bila platform induknya (Binance, Agentic Wallet) sudah menyediakan hal yang sama secara bawaan, karena membangun tiruannya di rumah platform sendiri tidak dinilai sebagai kedalaman Agent ID.

Tugas inti pemburu yang menjadi patokan manfaat: memutuskan dalam hitungan detik apakah sebuah drop layak diperjuangkan sekarang, disiapkan, atau dilewati, dari dua fakta yang bisa dipercaya: berapa orang nyata yang antre dan seberapa cepat kuotanya terbakar.

## 1. Bedah produk pembanding, layar per layar

Produk pembanding dipilih dari kategori yang sama atau berdekatan: terminal pemantauan token (GMGN, Axiom), papan data Web3 (DexScreener sebagai pola umum), dan produk data matang (Stripe, Linear, Vercel) untuk disiplin penyajian. Sumber: perbandingan terminal 2026 di era-shopping (Medium, diakses Okt 2026), ulasan Axiom 2026 di coinwy, tutorial GMGN, panduan desain fintech dan riset retensi aplikasi keuangan 2026, serta kompilasi prinsip Few, Knaflic, dan Tufte. Semua diakses 19 Nov 2026.

### 1.1 GMGN, layar utama pemantauan

Isi layar: umpan token baru yang bisa disaring lintas launchpad, papan tren yang dihitung ulang kira kira tiap menit dari jumlah beli dan jual, volume, perubahan harga, dan pertumbuhan pemegang. Pelajaran yang berlaku ke Convoy: permukaan pemantauan hidup dari kesegaran dan penyaringan, bukan dari kelengkapan arsip. Convoy sudah menyegarkan papan tiap 30 detik dan punya chip saring; yang belum ada adalah cara membaca arah gerak (riwayat), yang dijawab kandidat F-01.

### 1.2 Axiom, layar Pulse

Isi layar: umpan siklus hidup token dari lahir sampai lulus, tiap token satu kartu potret; desktop tiga panel (daftar pantau dan pelacak dompet, grafik, umpan Pulse), HP satu kolom dengan navigasi bawah. Pelajaran: kartu potret yang konsisten dan satu tugas per layar. Retensi Axiom ditopang daftar pantau, pelacak dompet, dan tingkatan hadiah. Yang bisa dipinjam tanpa melanggar saringan: daftar pantau lokal (F-04). Yang tidak bisa: hadiah dan cashback (bukan produk kami, dan menjanjikan imbal hasil dilarang aturan hackathon).

### 1.3 Kartu token terminal (Photon, BullX, Defined)

Isi kartu: rincian pemegang (porsi 10 terbesar, dompet dev, dompet seumber), bendera bundle dan sniper, riwayat dev, progres kurva, likuiditas, dan perdagangan terakhir, semuanya terlihat sebelum klik. Pelajaran: dua detik sebelum tindakan adalah tempat nilai terbesar; kartu Convoy harus menjawab antre berapa, bakar secepat apa, dan sumber angkanya apa, tanpa membuka apa pun. Rincian tambahan masuk ke perluasan kartu (F-03), bukan ke halaman baru.

### 1.4 Disiplin data Stripe, Linear, Vercel

Kartu KPI kanonis: label redup, angka besar, delta berwarna, garis percik, periode. Garis percik ala Tufte: tanpa sumbu, tanpa legenda, minimal 5 sampai 10 titik supaya bentuknya terbaca, titik ujung ditandai, skala dinyatakan, dan selalu ada alternatif teks. Angka memakai figur tabular. Pelajaran: riwayat di Convoy harus berbentuk garis percik jujur dari sampel nyata (F-01), bukan grafik besar yang menyembunyikan sedikitnya data.

### 1.5 Retensi aplikasi keuangan

Bukti riset 2026: pendorong retensi terkuat adalah nilai pertama yang cepat, alur HP yang cepat dan stabil, personalisasi di sekitar daftar pantau dan posisi pengguna sendiri, dan jawaban berulang atas pertanyaan "apa yang penting untuk saya sekarang", dengan kepercayaan sebagai sistem retensinya. Notifikasi yang bekerja bersifat terpicu peristiwa dari data pengguna sendiri, relevan, dan terkendali; program notifikasi yang baik menggandakan retensi dibanding tanpa notifikasi, tetapi ketergantungan ekstrinsik runtuh saat notifikasi berhenti dan kelebihan peringatan melelahkan. Pelajaran: personalisasi murah dan jujur (pantau lokal, panel Antrean saya) dibangun sekarang; notifikasi luar halaman tidak bisa dibangun jujur tanpa backend dan tetap di antrean (F-09).

## 2. Kandidat fitur dan optimasi

### F-01 Garis percik riwayat terminting per kartu

Isi: garis percik kecil di zona terminting dari sampel yang sudah dikumpulkan halaman selama sesi (maksimal 40 sampel per drop), lengkap dengan label teks arah geraknya.

1. Manfaat: pemburu membedakan drop yang mempercepat dari yang melambat, bukan cuma laju sesaat. Ini jawaban langsung atas pelajaran GMGN (arah gerak) dan kartu KPI kanonis.
2. Bukti expert: pola garis percik Tufte dan kartu KPI Stripe; syarat minimal 5 titik supaya bentuk terbaca.
3. Beban: kecil. Data sudah ada di memori halaman (entry.samples), tinggal menggambar SVG dan memberi label. Setengah hari termasuk uji.
4. UJI JALAN PINTAS: lolos. Tidak ada cara lain melihat riwayat sesi selain mengingat angka sendiri.
5. UJI PLATFORM: lolos. Binance tidak menyajikan riwayat bakar per drop.
6. Vonis: DIBANGUN putaran ini, dengan pagar kejujuran: hanya tampil bila sampel berstatus terverifikasi minimal 5 titik, diberi label "selama halaman ini terbuka", dan membawa alternatif teks berisi arah dan angka ujungnya. Riwayat lintas sesi tidak dijanjikan.

### F-02 Tautan dalam per drop dan tombol salin tautan

Isi: parameter ?drop=<id> menggulir ke kartu itu dan menyorotnya sebentar; tiap kartu punya tombol Salin tautan.

1. Manfaat: antrean adalah informasi sosial; pemburu membagikan satu drop spesifik ke grupnya, dan penerima mendarat tepat di kartunya. Ini juga bahan bakar jaringan atomik produk (satu komunitas sempit dulu, sesuai memo riset pra-rilis).
2. Bukti expert: tautan dalam adalah pola standar produk data; riset cold start menekankan membagikan unit terkecil yang bernilai, bukan halaman depan.
3. Beban: kecil. Parameter URL, gulir, sorot, dan clipboard. Setengah hari.
4. UJI JALAN PINTAS: lolos. Menyalin tautan halaman depan lalu menyuruh teman mencari sendiri kalah jauh.
5. UJI PLATFORM: lolos.
6. Vonis: DIBANGUN putaran ini. Meta OG per drop tidak ikut (lihat F-10).

### F-03 Rincian drop yang bisa diperluas di kartu

Isi: tombol Rincian membuka bagian tambahan di kartu yang sama: garis percik lebih besar, provenance lengkap (alamat kontrak dengan tautan penjelajah blok, pendaftar, jendela, fungsi sumber tiap angka), dan riwayat bacaan sesi.

1. Manfaat: kepercayaan bisa diperiksa tanpa meninggalkan papan; menjawab pelajaran kartu terminal bahwa konteks harus dekat dengan tindakan.
2. Bukti expert: pola perluasan progresif (progressive disclosure) dan kartu token terminal; halaman detail terpisah ditolak karena menduplikasi papan dan memecah satu tugas per layar.
3. Beban: sedang. Satu sampai dua hari termasuk penataan ulang kartu.
4. UJI JALAN PINTAS: lolos sebagai perluasan; bentuk halaman terpisah GUGUR oleh saringan ini karena papan sudah memuat semua angka inti.
5. UJI PLATFORM: lolos.
6. Vonis: DIBANGUN putaran ini dalam bentuk perluasan di kartu. Halaman detail terpisah dicatat gugur dengan alasan duplikasi.

### F-04 Daftar pantau lokal (Pantau)

Isi: tombol Pantau per kartu menyimpan id drop di localStorage; chip saring "Dipantau" menampilkan hanya drop yang dipantau; keadaan tersimpan antar kunjungan di perangkat yang sama.

1. Manfaat: personalisasi termurah yang terbukti mendorong kunjungan ulang; pemburu memantau dua atau tiga drop incarannya tanpa menyaring papan penuh tiap kali.
2. Bukti expert: daftar pantau adalah tulang punggung retensi Axiom dan aplikasi keuangan pada riset 2026; aktivasi ke daftar pantau adalah metrik bintang utara kategori ini.
3. Beban: kecil. Penyimpanan lokal berisi bilangan bulat yang divalidasi, satu chip saring, satu tombol per kartu. Setengah hari.
4. UJI JALAN PINTAS: lolos. Mengingat sendiri atau menandai di aplikasi lain kalah dan tidak terhubung ke angka papan.
5. UJI PLATFORM: lolos. Binance tidak memantau drop di papan Convoy.
6. Vonis: DIBANGUN putaran ini. Batas jujur ditulis di halaman: pantauan tersimpan di perangkat ini saja, bukan pemberitahuan.

### F-05 Verifikasi dua RPC untuk angka sinyal papan

Isi: bacaan papan (jumlah drop, isi drop, jumlah sinyal) diverifikasi dua RPC pada satu blok tersemat saat tanpa dompet, meniru aturan rekonsiliasi penyeimbang Tahap 3. Angka yang berbeda antar RPC disembunyikan dan diberi label belum terverifikasi; satu RPC mati berarti bacaan sumber tunggal yang berlabel.

1. Manfaat: jumlah sinyal adalah angka utama produk; hari ini ia bersumber tunggal saat tanpa dompet, sementara angka terminting sudah terverifikasi ganda sejak Tahap 3. Menutup asimetri ini adalah perbaikan kepercayaan terbesar yang tersedia.
2. Bukti expert: kerangka kualitas data DAMA (akurasi dibuktikan ke sumber pembanding) dari memo riset pra-rilis, dan pola yang sama yang sudah terbukti di Tahap 3 produk ini.
3. Beban: sedang. Satu sampai dua hari termasuk keadaan konflik per drop dan garis sumber zona sinyal.
4. UJI JALAN PINTAS: lolos. Tidak ada jalan pintas; angka utama tidak boleh bersumber tunggal tanpa label.
5. UJI PLATFORM: lolos.
6. Vonis: DIBANGUN putaran ini. Penilaian keamanannya tercatat sebagai temuan K-03 di KEAMANAN-V2.md.

### F-06 Batas baca papan dan garis jujur jumlah drop

Isi: halaman membaca maksimal 200 drop terbaru; bila jumlah drop terdaftar melebihi itu, garis papan menyatakan berapa yang ditampilkan dari berapa totalnya.

1. Manfaat: pendaftaran drop terbuka untuk siapa pun, jadi spam pendaftaran bisa menenggelamkan papan dalam ribuan bacaan dan memperlambat atau mematahkan permukaan utama. Batas ini menjaga papan tetap hidup dan jujur tentang apa yang tidak ditampilkan.
2. Bukti expert: pola batas jendela baca pada umpan produk data; penilaian keamanan K-02 di KEAMANAN-V2.md.
3. Beban: kecil. Setengah hari.
4. UJI JALAN PINTAS: lolos.
5. UJI PLATFORM: lolos.
6. Vonis: DIBANGUN putaran ini.

### F-07 Hitung mundur berdetak per detik

Isi: teks sisa waktu pada lencana status drop yang belum buka dan yang sedang buka diperbarui tiap detik oleh satu pewaktu ringan yang hanya menyentuh simpul teks, tanpa menggambar ulang papan.

1. Manfaat: keputusan FCFS hidup di detik; sisa waktu yang membeku sampai segar 30 detik berikutnya terasa mati tepat di momen terpentingnya.
2. Bukti expert: pelajaran terminal bahwa dua detik sebelum tindakan membawa nilai terbesar; umpan balik waktu nyata adalah fungsi gerak yang sah menurut NNGroup selama tidak menggerakkan angka data.
3. Beban: kecil. Setengah hari, dengan pagar: pewaktu berhenti saat tab tidak terlihat.
4. UJI JALAN PINTAS: lolos.
5. UJI PLATFORM: lolos.
6. Vonis: DIBANGUN putaran ini, terbatas pada teks hitung mundur status, bukan pada angka sinyal atau terminting.

### F-08 Umpan aktivitas sinyal dari log peristiwa

Isi yang dinilai: daftar peristiwa Signaled dan SignalWithdrawn terakhir per drop atau global, dibaca lewat eth_getLogs.

1. Manfaat: bukti hidup bahwa antrean bergerak, memperkuat kepercayaan dan kesan hidup papan.
2. Bukti expert: umpan aktivitas adalah pola Pulse di Axiom.
3. Beban: sedang sampai besar, plus risiko nyata: penyedia RPC publik membatasi eth_getLogs (tercatat di pelajaran AGENTS.md untuk publicnode), dan bacaan log butuh penanganan jendela blok yang rapi supaya tidak diam diam bolong.
4. UJI JALAN PINTAS: lolos.
5. UJI PLATFORM: lolos.
6. Vonis: ANTREAN sesudah mainnet. Nilainya nyata tapi risiko keandalan bacaannya bisa merusak janji kejujuran data bila dikerjakan terburu buru; garis percik F-01 sudah memberi rasa gerak yang jujur di putaran ini.

### F-09 Pengingat luar halaman (Telegram atau push)

1. Manfaat: pengingat drop mau buka adalah pendorong retensi yang terbukti pada riset notifikasi 2026.
2. Bukti expert: program notifikasi terpicu peristiwa menggandakan retensi; tetapi ketergantungan ekstrinsik runtuh saat berhenti.
3. Beban: besar. Butuh backend atau bot yang beroperasi terus, di luar cakupan beku (SCOPE-FREEZE.md sudah menundanya dengan alasan permukaan operasional yang tidak bisa dipantau operator solo di jendela ini). Pengingat di dalam halaman saja kalah makna karena halaman harus tetap terbuka.
4. UJI JALAN PINTAS: gugur untuk bentuk di dalam halaman.
5. UJI PLATFORM: lolos secara konsep.
6. Vonis: tetap ANTREAN sesudah mainnet, konsisten dengan SCOPE-FREEZE.md. Yang dibangun sekarang hanyalah pantau lokal F-04 dengan label jujur bahwa ia bukan pemberitahuan.

### F-10 Meta OG per drop

1. Manfaat: tautan bersama tampil kaya di aplikasi pesan.
2. Beban: sedang, tetapi Worker statis hari ini tidak membaca rantai; memberi meta per drop berarti Worker harus membaca kontrak per permintaan, mengubah model kepercayaan dan kegagalan pratinjau.
3. UJI JALAN PINTAS: lolos sebagian (tautan dalam F-02 sudah memberi nilai utamanya).
4. Vonis: ANTREAN sesudah mainnet.

### F-11 Riwayat akurasi perkiraan habis

1. Manfaat: membuktikan perkiraan Convoy bisa dipercaya dari catatan masa lalunya.
2. Beban: besar dan terhalang fakta: halaman tidak punya persistensi lintas sesi, dan SCOPE-FREEZE.md menunda backend serta penyimpan indeks privat. Tanpa persistensi, riwayat akurasi akan menjadi angka yang tidak bisa dibuktikan, melanggar aturan kejujuran data.
3. Vonis: ANTREAN sesudah mainnet, dengan syarat tertulis: hanya dibangun di atas catatan yang bisa diverifikasi ulang dari rantai.

### F-12 Urutan papan "paling panas" sebagai urutan utama

1. Manfaat yang diklaim: drop yang terbakar tercepat naik ke atas.
2. Penilaian: mengganti urutan utama merusak tugas A1 yang sudah terbukti (menemukan drop yang paling dekat membuka) dan mengubur drop berikutnya di bawah drop yang sedang ramai. Laju bakar sudah terlihat per kartu dan kini ditambah garis percik.
3. Vonis: GUGUR sebagai urutan utama. Tidak dibangun dalam bentuk apa pun di putaran ini.

### F-13 Mode rapat (density toggle)

1. Manfaat: pengguna terminal menyukai kepadatan.
2. Penilaian: menambah permukaan QA dan risiko kejelasan untuk manfaat sedang; kartu hasil rombakan sudah padat informasi dengan hierarki baru.
3. Vonis: ANTREAN prioritas rendah sesudah mainnet.

## 3. Aspek UX: temuan dan perbaikan yang dibangun

1. Navigasi seksi dengan penanda aktif (scrollspy) dan jangkar: menjawab vonis satu halaman panjang. Dibangun.
2. Hero dipadatkan, Cara kerja pindah ke bawah papan: nilai pertama (papan) tiba lebih cepat, sesuai bukti retensi tentang nilai pertama yang cepat. Dibangun.
3. Kerangka memuat berbentuk strip dan kartu: halaman tidak pernah kosong saat memuat. Dibangun (lihat DESAIN-V2.md).
4. Garis hitungan data uji yang disembunyikan: saat sakelar data uji aktif, papan menyatakan berapa drop uji disembunyikan dan mengapa, bukan sekadar menghilangkan. Dibangun sebagai teks kecil di bawah sakelar.
5. Tombol Ikut antre pada kartu belum buka: tampil sebagai keadaan belum aktif dengan penjelasan di kartunya langsung (utang tampilan tercatat). Dibangun.
6. Panel bakar menempel di zona terminting: penjelasan duduk di samping angka yang dijelaskan. Dibangun.
7. Bilah atas 390 piksel tidak padat: kontrol bahasa dan tema pindah ke bilah navigasi. Dibangun.
8. Keadaan kosong, gagal, dan basi yang sudah ada dipertahankan persis; tidak ada keadaan yang hilang dalam rombakan.

## 4. Aspek data: temuan

1. Angka sinyal bersumber tunggal saat tanpa dompet adalah asimetri kepercayaan terbesar; ditutup F-05.
2. Sampel riwayat hanya hidup selama sesi. Garis percik F-01 mewarisi batas ini dan wajib berlabel sesi; menjanjikan riwayat lintas sesi tanpa backend akan melanggar aturan kejujuran.
3. Aturan yang tidak berubah: ambang basi 90 detik, toleransi rekonsiliasi nol pada blok yang sama, label sumber pada setiap angka, redaksi "Tidak ada bacaan publik", dan perkiraan habis selalu rentang dengan jendela sampelnya.
4. Kuota per alamat tetap bersumber tunggal atau lewat dompet dan sudah berlabel jujur sejak Tahap 3; tidak ada perubahan.

## 5. Aspek kinerja: anggaran dan temuan

Anggaran putaran ini, diukur pada berkas yang diterbitkan:

1. Total muatan awal (HTML, CSS, JS) di bawah 160 KB sebelum gzip; halaman hari ini sekitar 121 KB mentah (app.js 90,9 KB, styles.css 18,3 KB, index.html 12 KB) dan rombakan tidak boleh menumbuhkannya lebih dari sepertiga.
2. Nol font web, nol pustaka pihak ketiga di halaman (codec tangan yang sudah terverifikasi), nol gambar selain favicon dan og.
3. Animasi hanya transform dan opacity; kilau skeleton adalah satu lapisan bersama, bukan animasi per elemen.
4. Batas baca papan F-06 sekaligus membatasi jumlah simpul DOM dan bacaan pengayaan; pengayaan tetap berkonkurensi 4.
5. Pewaktu hitung mundur F-07 berhenti saat tab tidak terlihat dan hanya menyentuh simpul teks.
6. Uji matriks Gate 2 tetap menjadi bukti visual; pengukuran overflow per lebar dipertahankan.

## 6. Ringkasan vonis

Dibangun putaran ini: F-01, F-02, F-03, F-04, F-05, F-06, F-07, plus perbaikan UX nomor 1 sampai 7 di seksi 3. Antrean sesudah mainnet: F-08, F-09, F-10, F-11, F-13. Gugur dengan alasan: halaman detail terpisah (di dalam F-03), urutan paling panas sebagai urutan utama (F-12), pengingat di dalam halaman (di dalam F-09). Semua yang dibangun dicatat lebih dulu sebagai amendemen SCOPE-FREEZE.md sebelum kode ditulis, sesuai proses berkas itu.
