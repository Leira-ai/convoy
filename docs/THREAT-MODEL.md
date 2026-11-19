# Threat Model dan Invarian Convoy

Tanggal: 19 Nov 2026. Ruang lingkup: kontrak ConvoySignal dan halaman radar Convoy, pada skala produk saat ini (kontrak tidak memegang dana, tanpa owner, tanpa fungsi admin). Dokumen ini ditulis pada Tahap 1 memo pra-rilis (`docs/TAHAP-PRARILIS-RISET.md`) sebagai sasaran tertulis bagi gerbang keamanan Tahap 2: analisis statis ditriase terhadap permukaan di sini, dan fuzz menyerang daftar invarian di seksi 4.

## 1. Aset dan asumsi kepercayaan

Aset yang dilindungi, menurut urutan nilai:

1. Kejujuran hitungan sinyal. Satu angka antrean yang salah atau bisa digelembungkan menghancurkan seluruh janji produk.
2. Kedaulatan sinyal per pemilik: tidak ada pihak yang boleh membuat, mengubah, atau menghapus sinyal orang lain.
3. Kejujuran tampilan halaman: angka yang dibaca pengguna harus angka yang benar benar ada di chain, atau berlabel tidak terdata.
4. Bukan aset: dana. Kontrak tidak bisa menerima, menyimpan, atau memindahkan nilai apa pun, jadi tidak ada dana pengguna yang bisa hilang lewat kontrak ini.

Asumsi kepercayaan yang dinyatakan terbuka:

- Registry Agent ID (SPACE ID, `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` di BNB Chain) jujur dan benar: `balanceOf` mengembalikan kepemilikan yang sah dan satu orang satu ID ditegakkan di lapisan platform Binance. Convoy mewarisi kejujuran itu; ia tidak bisa memeriksanya dari dalam kontrak.
- Alamat registry yang dipasang di konstruktor adalah alamat yang dimaksud deployer. Ini diverifikasi lewat proses deploy (bacaan balik `agentID()` dibandingkan dengan alamat resmi), bukan oleh kode.
- RPC yang dipakai halaman bisa lambat atau sesekali salah; rekonsiliasi dua RPC untuk angka tampil adalah pekerjaan Tahap 3, dicatat sebagai celah yang diketahui di T-09.

## 2. Aktor

| Aktor | Kemampuan | Tujuan jahat yang mungkin |
|---|---|---|
| Pemegang Agent ID | Memberi dan menarik sinyalnya sendiri, mendaftarkan drop | Menggelembungkan antrean drop miliknya atau afiliasinya |
| Non-pemegang | Mendaftarkan drop, membaca semua bacaan publik | Mencoba ikut terhitung tanpa ID, membanjiri papan dengan drop sampah |
| Pendaftar drop jahat | Mendaftarkan drop dengan label dan alamat kontrak pilihannya | Memancing pengguna ke kontrak penipuan lewat label yang meyakinkan |
| Proyek drop jahat | Mengendalikan kontrak yang dilacak dan counter proyeknya | Menampilkan counter palsu (terminting karangan) supaya dropnya terlihat laris |
| Penyerang frontend | Mengendalikan jaringan pengguna, situs peniru, atau RPC jahat | Menampilkan angka palsu, memancing tanda tangan untuk kontrak lain, menyuntikkan skrip lewat teks dari chain |

## 3. Permukaan serangan dan ancaman

### 3.1 Kontrak ConvoySignal

| ID | Ancaman | Mitigasi yang sudah ada | Status |
|---|---|---|---|
| T-01 | Gelembung antrean Sybil: banyak wallet dibuat untuk menaikkan hitungan satu drop | Gerbang `balanceOf` registry di dalam `signal`; Agent ID soulbound satu per orang di lapisan platform | Ada. Sisa risiko diterima dan dinyatakan: satu orang dengan banyak akun Binance adalah masalah platform, di luar jangkauan kontrak |
| T-02 | Pemalsuan sinyal atas nama orang lain | `signal` tidak menerima parameter alamat; sinyal selalu `msg.sender` | Ada, struktural, dibuktikan tes perilaku dan fuzz |
| T-03 | Spam pendaftaran drop membanjiri papan | Pendaftaran tidak membawa satu pun sinyal; drop sampah tampil sebagai antrean kosong; kurasi tampil di lapisan halaman | Ada sebagian. Kurasi tampil manual adalah pekerjaan berjalan, bukan kontrol kontrak |
| T-04 | Label drop dipakai memancing (teks janji palsu, nama proyek ditiru) | Halaman selalu menampilkan alamat kontrak yang dilacak di samping label, jadi yang diperiksa pengguna adalah alamat, bukan teks; label dirender sebagai teks polos (lihat T-08) | Ada sebagian. Peniruan nama antar proyek tidak bisa dicegah kontrak; mitigasinya kurasi dan alamat yang selalu tampil |
| T-05 | Registry palsu dipasang saat deploy sehingga gerbang tidak berarti | Registry immutable; prosedur deploy mewajibkan bacaan balik `agentID()` dibandingkan alamat resmi sebelum alamat kontrak diumumkan | Ada sebagai kontrol proses, dijalankan pada deploy testnet (mock memang disengaja di sana) dan wajib diulang di mainnet |
| T-06 | Reentrancy lewat panggilan `balanceOf` ke registry di tengah `signal` | Registry adalah kontrak tetap yang dikenal (registry resmi atau mock uji), bukan alamat pilihan pemanggil; tidak ada nilai yang bergerak; panggilan balik ke `signal` dari registry akan tercatat atas nama registry itu sendiri dan tetap tunduk pada gerbang yang sama | Diterima dengan alasan tertulis ini; ditinjau ulang di triase analisis statis `docs/SECURITY-GATE.md` |
| T-07 | Underflow hitungan saat menarik sinyal | Solidity 0.8 aritmetika tercek; jalur kurangi hanya tercapai bila pemanggil punya sinyal aktif, yang oleh INV-01 berarti hitungan minimal 1 | Ada, dibuktikan fuzz |
| T-08 | Label sangat panjang sebagai beban baca atau DoS papan | Biaya penyimpanan label ditanggung pendaftar lewat gasnya sendiri; tidak ada loop atas label di kontrak; halaman membaca per drop | Diterima. Tidak ada jalur yang membuat panjang label menjadi biaya pihak lain selain pembaca per drop |
| T-09 | Front-running atau perebutan urutan sinyal | Sinyal adalah pernyataan minat publik tanpa nilai ekonomi dan tanpa hak atas apa pun | Tidak berlaku menurut desain; tidak ada yang bisa dimenangkan dari urutan |

### 3.2 Halaman dan adapter

| ID | Ancaman | Mitigasi yang sudah ada | Status |
|---|---|---|---|
| T-10 | RPC jahat atau salah mengembalikan hitungan dan counter palsu | Halaman membaca dari RPC yang dikonfigurasi produk, bukan dari parameter URL; angka counter proyek yang gagal dibaca tampil TIDAK TERDATA, bukan angka cadangan | Ada sebagian. Rekonsiliasi dua RPC untuk angka yang sama adalah Tahap 3 dan belum ada; dicatat sebagai celah terbuka yang diketahui |
| T-11 | XSS lewat label drop atau teks lain dari chain | Semua nilai turunan chain masuk halaman lewat `textContent`; tidak ada satu pun `innerHTML` di `web/app.js` (diperiksa pada sumber, 19 Nov 2026) | Ada, terverifikasi dari kode |
| T-12 | Situs peniru atau lembar konfirmasi menyesatkan membuat pengguna menandatangani kontrak lain | Lembar konfirmasi halaman menampilkan efek dalam bahasa polos dan alamat kontrak tujuan; simulasi `eth_call` fail-closed sebelum tanda tangan; alamat kontrak per jaringan tertanam di konfigurasi halaman, bukan dari tautan | Ada. Sisa risiko phishing di luar halaman resmi tidak bisa dikendalikan produk |
| T-13 | Rantai pasok terbitan: berkas halaman diganti di jalur terbit | Worker terbit mengirim CSP dengan hash skrip inline yang cocok dengan skrip tersaji, X-Frame-Options DENY; berkas terbit diverifikasi identik byte dengan lokal sesudah terbit (irisan 2) | Ada untuk kanal terbit saat ini |

## 4. Daftar invarian (sasaran fuzz dan tes)

Setiap invarian di bawah ini bisa diuji mesin dan benar benar diuji: INV-01 sampai INV-10 diperiksa oleh rangkaian fuzz `test/fuzz-invariants.js` sesudah setiap langkah acak, dan sebagian tumpang tindih dengan 35 tes perilaku `test/run-tests.js` yang memeriksanya pada contoh tetap. Tidak ada invarian di daftar ini yang hanya berupa harapan.

- INV-01 Kesetaraan hitungan dan himpunan. Untuk setiap drop terdaftar d, `signalCountOf(d)` sama dengan jumlah alamat berbeda a yang memenuhi `hasSignaled(d, a)` benar.
- INV-02 Keunikan sinyal. Panggilan `signal(d)` kedua oleh alamat yang sama pada drop yang sama selalu revert `AlreadySignaled` dan tidak mengubah keadaan apa pun.
- INV-03 Hanya pemegang yang tercatat. Setiap alamat yang tercatat memberi sinyal adalah pemegang Agent ID pada saat memberi sinyal; panggilan `signal` oleh non-pemegang selalu revert `NotAgentIDHolder` dan tidak mengubah keadaan apa pun.
- INV-04 Kontrak tidak pernah memegang dana. Saldo kontrak adalah 0 sesudah setiap operasi, dan ABI tidak memuat fungsi payable atau `receive` (paruh statis invarian ini diperiksa rangkaian perilaku; paruh dinamisnya, saldo nol, diperiksa fuzz sesudah setiap langkah).
- INV-05 Tarik sinyal hanya oleh pemiliknya. `withdrawSignal(d)` oleh akun tanpa sinyal aktif pada d selalu revert `NotSignaled` dan tidak mengubah keadaan; penarikan yang berhasil menurunkan hitungan tepat satu dan membalik status tepat milik pemanggil, bukan milik akun lain.
- INV-06 Metadata drop tidak berubah. Sesudah `registerDrop`, kolom dropContract, opensAt, closesAt, label, dan registrar sebuah drop tidak pernah berubah; satu satunya kolom yang bergerak adalah signalCount, dan ia hanya bergerak mengikuti INV-01.
- INV-07 Penomoran drop rapat. `dropCount` naik tepat satu per `registerDrop` yang berhasil, id berurutan mulai dari 0, dan pendaftaran yang revert tidak mengubah keadaan apa pun.
- INV-08 Drop yang tidak ada selalu menolak. `signal`, `withdrawSignal`, `signalCountOf`, dan `getDrop` pada id drop yang belum terdaftar selalu revert `DropNotFound` dan tidak mengubah keadaan apa pun.
- INV-09 Transisi status hanya lewat tangan pemiliknya. `hasSignaled(d, a)` berubah dari salah ke benar hanya oleh panggilan `signal(d)` yang berhasil dari a sendiri, dan dari benar ke salah hanya oleh panggilan `withdrawSignal(d)` yang berhasil dari a sendiri. Fuzz memeriksanya sebagai kesetaraan penuh antara model yang diharapkan dan keadaan chain sesudah setiap langkah.
- INV-10 Registry tidak bergerak. `agentID()` selalu mengembalikan alamat registry yang dipasang di konstruktor, sesudah operasi apa pun.

## 5. Yang secara sadar di luar model

- Kejujuran counter proyek yang dilacak (terminting versi proyek) bukan invarian kontrak ini; itu risiko lapisan data T-04 dan ditangani aturan tampil tidak terdata serta kalibrasi Tahap 3, bukan oleh ConvoySignal.
- Ketersediaan RPC dan kebenaran waktu blok berada di luar kendali kontrak.
- Keamanan wallet pengguna dan aplikasi Binance berada di luar produk; halaman hanya berkewajiban tidak menyesatkan pada lembar konfirmasi (T-12).
