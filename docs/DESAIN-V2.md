# DESAIN V2: Arah Visual Baru Convoy

Status: DIPILIH, 19 Nov 2026. Menggantikan bahasa visual slice 2 (pelat petrol dan amber di atas latar arang, warisan bahasa desain produk sebelumnya). Ditulis sebelum membangun, mengikuti gerbang tampil di skill hackathon-playbook dan Gate 0 skill web-product-engineering. Penilaian fitur, UX, data, dan kinerja pendampingnya ada di FITUR-V2.md. Penilaian keamanan pendampingnya ada di KEAMANAN-V2.md.

## 1. Mengapa arah lama gugur

Vonis pemilik produk pada sesi uji P-01 dan sesudahnya: kesan lima detik gagal, halaman terasa satu halaman panjang yang tidak rapi dan bikin pusing, fondasi bahasanya sama dengan produk sebelumnya. Putaran perbaikan sebelumnya hanya menambal isi dan kejelasan, fondasi visualnya tidak berubah. Kesimpulan yang diterima: tambalan tidak cukup, identitas visual harus diganti penuh, struktur halaman harus menjawab kesan satu halaman panjang, dan gerak harus ditambah dengan tujuan, bukan dekorasi.

## 2. Sumber expert yang dipakai

Semua sumber diakses 19 Nov 2026 lewat pencarian web.

1. Perbandingan terminal perdagangan 2026 (Photon, BullX, GMGN, Axiom, Defined; era-shopping di Medium, diakses Okt 2026): terminal dibangun di sekitar satu tugas inti, dan dua detik sebelum klik membawa nilai terbesar, semua konteks penting terlihat tanpa klik tambahan. Pelajaran untuk Convoy: konteks drop (status, antrean, bakar) harus terbaca sekilas di kartu, bukan disembunyikan.
2. GMGN dan Axiom dari ulasan dan tutorial 2026: permukaan pemantauan berarti umpan yang bisa disaring, papan tren yang dihitung ulang berkala, dan halaman token yang memisahkan fakta mesin dari sinyal manusia. Pelajaran: papan Convoy adalah permukaan pemantauan, bukan brosur.
3. Pelajaran dashboard padat data (pixel-show, teardown BuiltUX atas Vercel dan Linear, tren UI SaaS 2026 di Qwikly): kepadatan yang disengaja, setiap elemen harus pantas ada; krom yang tenang; warna berarti makna; angka memakai figur tabular; mode gelap dirancang sebagai permukaan sendiri dengan hierarki lapis dan garis 1 piksel, bukan inversi dan bukan hitam murni.
4. Pola kartu KPI kanonis (Stripe, Linear, Vercel; dirangkum dari Few, Knaflic, Tufte): label redup, angka besar, garis percik (sparkline) tanpa sumbu, dan konteks waktu. Setiap grafik membawa kesimpulan sebagai teks.
5. Panduan animasi Nielsen Norman Group dan token durasi Material Design 3: setiap animasi melayani satu dari empat fungsi (umpan balik, kesinambungan, hierarki, kesenangan) atau dibuang; durasi sekitar 100 milidetik untuk umpan balik sederhana, 150 sampai 200 untuk dropdown, 200 sampai 300 untuk modal; jangan pernah linear; yang sering dilihat harus lebih pendek dan lebih halus; kerangka (skeleton) mengalahkan pemutar (spinner) untuk muatan konten.
6. Aturan gerak aman: blok prefers-reduced-motion bukan pilihan; ganti animasi berulang dengan penampung statis; durasi dikecilkan, bukan dimatikan ke nol bila mesin keadaan membutuhkannya; animasikan hanya transform dan opacity.
7. Anggaran kinerja: Core Web Vitals pada persentil 75 (LCP maksimal 2,5 detik, INP maksimal 200 milidetik, CLS maksimal 0,1); geometri skeleton harus cocok dengan isi asli dalam 5 sampai 10 persen; uji gerak dengan pelambatan CPU 4 kali.

## 3. Arah yang dipilih: Lembar Pantau Lapangan

Satu kalimat: Convoy tampil seperti lembar pantau petugas lapangan, kertas terang bergrid halus di tema terang dan tinta pekat di tema gelap, dengan dua warna makna yang berjauhan dan satu elemen tanda tangan baru bernama Strip Antrean.

Alasan arah ini menang atas kandidat lain:

1. Berbeda total dari bahasa lama. Lama: gelap arang, pelat petrol, amber. Baru: terang sebagai tema utama yang dirancang penuh (tema gelap tetap dirancang sebagai permukaan sendiri), oranye sinyal dan biru baja yang berjauhan, sudut lebih tegas, garis batas 1 piksel menggantikan bayangan.
2. Metafora produknya lahir dari bahan produk sendiri: menghitung orang yang antre. Elemen tanda tangannya adalah tanda turus (tally), cara tertua mencatat antrean di lapangan. Satu turus per orang nyata, dikelompokkan per lima. Ini bukan dekorasi, ini datanya sendiri digambar.
3. Warna tidak pernah menjadi satu-satunya saluran: sinyal selalu berpasangan dengan turus dan kata ANTRE, terminting selalu berpasangan dengan batang ukur dan kata TERMINTING. Aman untuk buta warna dan tetap terpisah secara bahasa seperti aturan produk.

### 3.1 Palet token

Tema terang (utama):

| Token | Nilai | Pakai |
| --- | --- | --- |
| --bg | #edf0e9 | latar halaman, kertas lapangan |
| --panel | #fbfcf8 | permukaan kartu |
| --panel-2 | #f0f3ea | permukaan sekunder, kepala seksi |
| --line | #d5dbcb | garis batas 1 piksel |
| --line-strong | #76855f | garis batas tegas |
| --ink | #1d2419 | teks utama |
| --muted | #55614e | teks sekunder |
| --faint | #5d6b55 | teks tersier |
| --signal | #a63e06 | teks dan angka sinyal (oranye bakar) |
| --signal-bright | #d9530a | turus dan isian grafis sinyal |
| --signal-tint | #fae7d3 | latar zona sinyal |
| --minted | #14598f | teks dan angka terminting (biru baja) |
| --minted-bright | #2273b8 | isian batang terminting |
| --minted-tint | #ddebf7 | latar zona terminting |
| --ok | #256b34 | keadaan berhasil |
| --err | #b3261e | keadaan gagal |
| --focus | #14598f | cincin fokus |

Tema gelap (permukaan sendiri, bukan inversi):

| Token | Nilai | Pakai |
| --- | --- | --- |
| --bg | #0f120d | latar halaman, tinta pekat kehijauan |
| --panel | #171b14 | permukaan kartu |
| --panel-2 | #1e241a | permukaan sekunder |
| --line | #2c3325 | garis batas |
| --line-strong | #71835a | garis batas tegas |
| --ink | #e9ede1 | teks utama |
| --muted | #a9b39c | teks sekunder |
| --faint | #828f74 | teks tersier |
| --signal | #f59e52 | teks dan angka sinyal |
| --signal-bright | #ffab63 | turus dan isian grafis |
| --signal-tint | #2b1f13 | latar zona sinyal |
| --minted | #7db8f0 | teks dan angka terminting |
| --minted-bright | #5ea2ec | isian batang terminting |
| --minted-tint | #16283d | latar zona terminting |
| --ok | #7bc98a | keadaan berhasil |
| --err | #f08a80 | keadaan gagal |
| --focus | #7db8f0 | cincin fokus |

Semua pasangan teks dan latar wajib lulus hitung kontras Gate 1 (WCAG 2.2 AA: teks normal 4,5 banding 1, teks besar dan komponen grafis 3 banding 1) lewat qa/check-contrast.js sebelum dianggap selesai. Nilai di atas adalah titik awal yang disesuaikan dari hasil hitung, dan nilai final yang terpasang di styles.css adalah yang berlaku.

### 3.2 Tipografi

Tumpukan sistem tetap (tanpa unduhan font, demi kinerja dan CSP): -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial. Yang berubah adalah hierarkinya:

1. Angka adalah raja: angka sinyal dan terminting memakai bobot 700, ukuran 30 sampai 40 piksel di strip unggulan dan 24 sampai 28 di kartu, dengan font-variant-numeric: tabular-nums di semua angka, waktu, dan hitung mundur.
2. Label zona memakai kalimat biasa (bukan huruf kapital semua, sesuai lantai anti-generik), bobot 600, ukuran 13 piksel, warna makna zonanya.
3. Judul halaman 26 piksel bobot 750, lede satu baris 15 piksel. Judul seksi 18 piksel. Isi 14 sampai 15 piksel. Garis sumber 12 piksel warna redup.
4. Jarak huruf nol di semua teks. Tidak ada huruf kapital berjarang untuk label di atas judul.

### 3.3 Bentuk kartu dan struktur halaman

1. Sudut 8 piksel (lebih tegas dari 14 piksel lama), bayangan nol di tema terang, garis 1 piksel di kedua tema. Tidak ada kartu di dalam kartu: zona sinyal dan terminting adalah bidang bertinta di dalam kartu, bukan kartu bersarang.
2. Struktur halaman baru menjawab vonis satu halaman panjang:
   - Bilah atas ramping: merek, lencana jaringan, tombol sambungkan. Itu saja.
   - Bilah navigasi seksi yang melekat (sticky) di bawah bilah atas: Radar, Antrean, Cara kerja, Masukan, dengan penanda seksi aktif yang bergerak mengikuti gulir (scrollspy), plus segmen bahasa dan tombol tema di sisi kanan. Di 390 piksel bilah atas tidak lagi memuat enam kontrol sekaligus.
   - Hero dipadatkan: judul, satu baris lede, lalu Strip Antrean unggulan. Papan mulai terlihat tanpa menggulir jauh di HP.
   - Seksi Cara kerja dipindah ke bawah papan dan panel Antrean saya (pemburu datang untuk papan, bukan untuk penjelasan), tetap dapat dicapai dari navigasi.
3. Kartu drop: kepala (label, lencana status, lencana data uji), baris alamat kontrak dengan salin, baris jendela, lalu dua zona berdampingan (menumpuk di layar sempit), panel bakar menempel tepat di bawah zona terminting karena ia menjelaskan angka itu, lalu baris aksi (Ikut antre atau Tarik sinyal, Pantau, Salin tautan, Rincian).

### 3.4 Elemen tanda tangan: Strip Antrean

Pelat Antrean lama berevolusi menjadi Strip Antrean:

1. Bentuk: pita instrumen selebar kartu unggulan, terbagi dua bidang bertinta yang bersebelahan, kiri tinta sinyal dan kanan tinta terminting, dipisah garis vertikal tegas. Bukan pelat gelap melayang.
2. Bidang sinyal: angka besar jumlah antrean, kata ANTRE, dan strip turus. Satu turus per pemegang yang memberi sinyal, dikelompokkan per lima dengan turus kelima miring, maksimal 60 turus lalu teks tambahan (+N). Turus digambar dengan elemen div tipis, bukan karakter teks, supaya tajam di semua ukuran.
3. Bidang terminting: angka besar terminting dari cap bila cap dikenal, batang ukur horizontal dengan isian sebanding, dan garis sumber. Bila tidak ada bacaan publik, bidang menampilkan redaksi wajib "Tidak ada bacaan publik" tanpa angka dan tanpa batang.
4. Di kartu drop, versi mini strip yang sama: strip turus pendek (maksimal 24) di zona sinyal dan batang ukur di zona terminting. Bahasa bentuknya konsisten dari unggulan sampai kartu terkecil.
5. Aturan keras yang tidak berubah: kedua bidang tidak pernah bertukar warna, kata, atau bentuk. Turus hanya untuk manusia yang antre. Batang hanya untuk fakta mesin.

### 3.5 Animasi yang diizinkan, masing masing dengan tujuan

Semua animasi hanya memakai transform dan opacity, berdurasi maksimal 400 milidetik, dan dimatikan atau diganti statis saat prefers-reduced-motion.

| Animasi | Spesifikasi | Tujuan |
| --- | --- | --- |
| Denyut angka berubah | Latar zona berkedip halus satu kali (opacity latar tint, 240 milidetik) saat nilai sinyal atau terminting berubah antar segar | Kesinambungan: menunjukkan apa yang baru berubah, tanpa menggerakkan atau menween angka itu sendiri |
| Turus masuk | Turus baru muncul dengan opacity 0 ke 1 dan scale 0,6 ke 1, 200 milidetik ease-out | Umpan balik: orang baru masuk antrean terlihat sebagai peristiwa |
| Transisi status | Lencana status dan teks hitung mundur berganti warna dengan transisi 240 milidetik saat keadaan buka berubah | Hierarki: perubahan keadaan tertangkap mata tanpa gerakan |
| Kerangka memuat | Penampung berbentuk strip dan kartu dengan satu lapisan kilau bersama, siklus 1,4 detik ease-in-out; statis tanpa kilau saat reduced motion | Kinerja yang terasa: struktur yang akan datang terlihat, halaman tidak pernah kosong |
| Lembar dan dialog masuk | translateY 10 piksel ke 0 plus fade, 200 milidetik ease-out | Kesinambungan ruang: lembar datang dari bawah, sesuai asalnya |
| Penanda navigasi aktif | Garis bawah penanda bergeser dengan transform, 160 milidetik | Kesadaran lokasi di halaman panjang |
| Titik hidup | Satu titik di garis waktu baca berdenyut opacity 2 detik | Satu satunya animasi berulang yang diizinkan: menandakan data hidup; statis saat reduced motion |
| Sorot kartu tautan dalam | Kartu yang dituju tautan ?drop= mendapat garis tepi makna 1,6 detik lalu memudar | Kesinambungan: pengguna yang datang dari tautan bersama langsung tahu kartunya |

### 3.6 Yang dilarang

1. Animasi yang mengubah nilai angka (counter tween), menggerakkan angka, atau menyembunyikan status di balik gerakan.
2. Parallax, gulir yang dibajak, korsel otomatis, gradien bergerak, teks berjalan.
3. Animasi berulang selain titik hidup.
4. Animasi properti tata letak (width, height, top, left). Hanya transform dan opacity.
5. Kartu terangkat saat hover, bayangan dekoratif, kaca buram (glassmorphism), gradien ungu biru.
6. Huruf kapital berjarang di atas judul, angka raksasa plus label kecil plus gradien sebagai hero generik, kit kartu SaaS seragam tanpa elemen tanda tangan.
7. Skeleton yang geometrinya tidak cocok dengan isi asli.
8. Warna ketiga untuk makna data baru tanpa aturan tertulis. Status jendela memakai tinta sinyal (belum buka, manusia bersiap) dan tinta terminting (buka, fakta waktu mesin) dan redup (tutup), konsisten di semua tempat.

## 4. Uji lima detik yang dituju

Dalam lima detik di HP 390 piksel, pengguna harus bisa menjawab: ini papan antrean drop untuk pemegang Agent ID (judul dan lede), drop unggulan punya berapa orang antre dan berapa yang sudah terminting (Strip Antrean), dan papan drop mulai terlihat di bawahnya. Uji ini dijalankan tertulis di fase gerbang dari tangkapan layar final.
