# KEAMANAN V2: Penyelaman Keamanan Mata Segar

Status: SELESAI dinilai, 19 Nov 2026. Penyelaman ulang dari nol atas perintah pemilik produk, melampaui gerbang Tahap 2 di SECURITY-GATE.md. Hasil Tahap 2 tetap berlaku dan tidak dibatalkan: Slither tepat 1 temuan yang dinilai positif palsu dengan empat alasan tertulis, peta OWASP SCSVS, dan fuzz 750 langkah dengan 10 invarian utuh. Dokumen ini menambahkan apa yang ditemukan mata segar, memisahkan yang diperbaiki di putaran ini dari syarat tertulis sebelum deploy mainnet. Acuan metode: skill arsenal-own-product-security dan arsenal-web3-audit milik sendiri, ditambah disiplin Tahap 2 yang sudah ada.

Tingkatan yang dipakai: Kritis, Tinggi, Sedang, Rendah, Info. Tidak ada temuan Kritis atau Tinggi di putaran ini.

## 1. Audit ulang kontrak dari nol

Kontrak yang diaudit: contracts/ConvoySignal.sol (sudah terpasang di testnet 0x8Ff3485841faBE8384dEec61BCb948c16766312d, terverifikasi Sourcify exact match). Dibaca ulang baris per baris terhadap kelas kerentanan terkini:

| Kelas | Hasil | Catatan |
| --- | --- | --- |
| Reentrancy | Aman | Satu satunya panggilan luar adalah balanceOf view ke registry immutable; keadaan ditulis sesudahnya; tidak ada panggilan ke alamat yang dipilih pengguna |
| Overflow dan underflow | Aman | Solidity 0.8 dengan cek bawaan; pengurangan signalCount dijaga cek _signaled sehingga tidak bisa negatif; ini juga invarian INV-01 dan INV-05 yang teruji fuzz |
| Kontrol akses | Sesuai desain | Tidak ada owner, admin, pause, atau fungsi ubah; bidang Drop ditulis sekali saat pendaftaran dan tidak pernah diubah kode mana pun |
| delegatecall, selfdestruct, assembly | Tidak ada | Diverifikasi dengan grep atas seluruh kontrak: 0 hasil |
| Fungsi payable dan dana | Tidak ada | Kontrak secara struktural tidak bisa menampung dana; saldo terbaca 0 pada verifikasi testnet |
| Front-running dan ordering | Tidak relevan | Sinyal adalah niat publik tanpa nilai ekonomi yang bisa diekstrak dari urutan |
| Ketergantungan oracle | Asumsi tercatat | Semantik registry (soulbound, balanceOf) adalah asumsi kepercayaan yang diwarisi; sudah tercatat sebagai risiko sisa Tahap 2 dan menjadi butir pemantauan K-09 |
| Integritas peristiwa | Aman | Peristiwa dipancarkan sesudah perubahan keadaan, berisi id dan akun yang bertindak |
| hasSignaled untuk drop tak dikenal | Perilaku tercatat | Mengembalikan false tanpa revert, tidak konsisten dengan signalCountOf dan getDrop yang revert; tidak berbahaya karena halaman hanya menanya drop yang ada, dicatat sebagai Info |

### Temuan kontrak

K-01 (Sedang, ketersediaan permukaan produk): pendaftaran drop terbuka tanpa batas jumlah dan tanpa batas panjang label. Biaya spam ditanggung pendaftar, tetapi biaya bacanya ditanggung halaman: setiap drop terdaftar menambah satu bacaan getDrop dan sampai delapan bacaan pengayaan. Seribu pendaftaran sampah di mainnet cukup untuk membuat papan lambat atau patah, dan label yang sangat panjang merusak tata letak kartu. Perbaikan putaran ini di sisi halaman: batas baca 200 drop terbaru dengan garis jujur jumlahnya (F-06 di FITUR-V2.md) dan label kartu dibatasi tampilannya dengan pemotongan visual yang tidak mengubah data. Keputusan kontraknya dicatat sebagai syarat mainnet K-08, bukan diubah diam diam, karena mengubah kontrak berarti mengulang seluruh siklus uji, deploy testnet, dan verifikasi.

K-02 (Info): label drop adalah teks bebas dari pendaftar dan permukaan phishing yang sudah dikenal (T-04 di THREAT-MODEL.md). Mitigasi tetap: kurasi lapisan halaman dan alamat kontrak selalu ditampilkan. Tidak ada perubahan putaran ini.

## 2. Keamanan halaman

Metode: baca ulang app.js penuh (2.150 baris), index.html, CSP di meta dan di header Worker, dan rantai penerbitan pratinjau.

### Yang terkonfirmasi aman (bukti, bukan klaim)

1. Nol sink XSS: grep atas web/app.js dan web/index.html menemukan 0 innerHTML, outerHTML, insertAdjacentHTML, document.write, dan eval. Setiap nilai dari rantai (label, alamat, angka) masuk lewat textContent atau createTextNode. Label drop jahat tidak bisa menjadi skrip.
2. Umpan balik: judul dan isi issue GitHub disusun dengan encodeURIComponent; window.open memakai noopener; dialog memperingatkan bahwa issue bersifat publik sebelum pengguna bisa mengirim.
3. CSP lapis dua: meta di halaman dan header di Worker, termasuk frame-ancestors 'none', X-Frame-Options DENY, nosniff, dan referrer-policy. Skrip bootstrap sebaris dijepit hash sha256 di kedua tempat; mengubah skrip itu tanpa menghitung ulang hash akan mematahkan halaman dengan suara keras, bukan diam diam.
4. Alamat yang ditampilkan dipotong 6 tambah 4 karakter sesuai gerbang; hash transaksi di lembar konfirmasi dirender sebagai teks, dan tautan penjelajah dibangun dari basis penjelajah yang tetap di konfigurasi.
5. Lembar konfirmasi: simulasi eth_call dan estimasi gas mendahului tombol konfirmasi aktif; konfirmasi mengulang simulasi sebelum eth_sendTransaction; kegagalan simulasi menutup lembar secara fail-closed dengan pesan manusiawi. Ini pola yang sama yang lolos gerbang Tahap 2 dan tidak berubah.
6. Penyimpanan lokal hanya berisi tema (dan mulai putaran ini daftar pantau berisi id drop bilangan bulat yang divalidasi saat dibaca).
7. Halaman tidak memuat skrip, font, atau gambar pihak ketiga mana pun. Satu satunya permintaan keluar adalah ke titik akhir RPC yang dikonfigurasi dan, atas tindakan pengguna sendiri, ke GitHub.

### Temuan halaman

K-03 (Sedang, integritas data): angka utama produk, jumlah sinyal, bersumber tunggal saat tanpa dompet. readRpc mengambil jawaban sukses pertama dari daftar titik akhir, jadi satu RPC yang terganggu atau berbohong bisa mengarang jumlah antrean dan isi drop, sementara angka terminting sudah dilindungi rekonsiliasi dua RPC sejak Tahap 3. Perbaikan putaran ini: F-05 di FITUR-V2.md (verifikasi dua RPC pada blok tersemat untuk bacaan papan, keadaan konflik per drop menyembunyikan angka dengan label belum terverifikasi, garis sumber pada zona sinyal). Selesai di putaran ini dan dibuktikan ulang lewat regresi halaman.

K-04 (Rendah, kejelasan tanda tangan): lembar konfirmasi menampilkan drop, efek, dan perkiraan biaya, tetapi tidak menampilkan alamat kontrak tujuan. Target transaksi selalu alamat Convoy dari konfigurasi dan dompet pengguna menampilkannya lagi, jadi risikonya rendah; tetap diperbaiki putaran ini dengan baris Kontrak berisi alamat terpotong di lembar.

K-05 (Rendah, diterima): perkiraan biaya lembar memakai gas dikali harga gas warisan (eth_gasPrice), sementara dompet menetapkan biaya aktualnya sendiri. Nilainya hanya tampilan perkiraan dan sudah berlabel perkiraan; diterima tanpa perubahan.

K-06 (Info, rantai pasok): halaman yang diterbitkan tidak mengandung kode pihak ketiga sama sekali; codec Keccak dan ABI ditulis tangan dan sudah diverifikasi byte per byte terhadap ethers dan js-sha3 di QA tahap sebelumnya. Dependensi npm (ethers 6.15.0, ganache 7.9.2, solc 0.8.30) terkunci versi persis dan hanya dipakai untuk uji, kalibrasi, dan deploy, tidak pernah diterbitkan ke halaman. npm audit di lingkungan ini tidak mengembalikan data (registry tidak menjawab), jadi tidak ada klaim nol kerentanan dependensi yang dibuat; yang diklaim hanyalah bahwa dependensi itu tidak mencapai halaman produksi.

K-07 (Info, alat QA): qa/adapter_bridge.py memegang kunci uji turunan pola load_account dan hanya mengikat 127.0.0.1; ia tidak pernah masuk muatan pratinjau karena pembangun muatan hanya menyematkan berkas dari web/. Diverifikasi dari isi deploy/build_preview_payload.py.

## 3. Keamanan operasional menuju mainnet: syarat tertulis

Butir berikut adalah SYARAT sebelum deploy mainnet, bukan catatan kaki. Deploy mainnet tidak boleh mulai sebelum tiap butir berstatus jelas di dokumen ini atau di BUILD-REPORT.md.

K-08 Keputusan batas label kontrak: pemilik produk memutuskan satu dari dua: (a) deploy mainnet memakai kontrak apa adanya dan menerima mitigasi sisi halaman K-01 sebagai jawaban permanen, atau (b) menambah batas panjang label pada registerDrop, yang berarti mengulang siklus penuh: uji perilaku dan fuzz, deploy testnet baru, verifikasi Sourcify, dan pembaruan alamat di semua tempat. Rekomendasi penulis dokumen ini: (a), karena batas baca halaman sudah menutup dampaknya dan mengganti kontrak membuang bukti testnet yang terverifikasi.

K-09 Pemantauan pasca rilis: (1) bacaan berkala jumlah sinyal dan dropCount dari dua RPC independen dan dibandingkan, selisih apa pun diselidiki sebelum dilaporkan; (2) pemantauan semantik registry, khususnya bila Agent ID suatu hari menjadi bisa dipindahtangankan, karena gerbang kontrak akan berubah makna tanpa satu baris kode Convoy berubah; (3) sakelar fail-closed halaman teruji: mengosongkan alamat Convoy di konfigurasi dan menerbitkan ulang Worker mengembalikan papan ke keadaan belum live tanpa tombol apa pun.

K-10 Runbook insiden minimum tertulis sebelum mainnet: langkah menghentikan tampilan (sakelar K-09), langkah memeriksa keadaan rantai dari dua RPC, siapa yang memutuskan (pemilik produk), dan larangan menyiarkan transaksi perbaikan sebelum simulasi lolos. Runbook hidup di dokumen operasional proyek, bukan di dokumen ini.

K-11 Kunci deployer: deploy mainnet hanya dari dompet reguler pemilik produk lewat jalur tanda tangan lokal yang sudah terbukti (pola load_account), tidak pernah lewat koneksi dompet di peramban cloud (pelajaran AGENTS.md 18 Nov 2026). Kunci tidak pernah dicetak, disimpan di repo, atau masuk berkas deploy; pindai rahasia atas pohon repo yang terkomit tetap menjadi bagian gerbang rilis, seperti yang lolos di Tahap 1.

K-12 Verifikasi sumber mainnet: Sourcify exact match adalah syarat; tampilan BscScan memerlukan kunci API yang hari ini belum terkonfigurasi di lingkungan ini, jadi statusnya dilaporkan apa adanya (terkirim atau belum terkonfirmasi tampil) dan tidak pernah diklaim tampil sebelum terbaca dari BscScan sendiri.

## 4. Ringkasan

Temuan putaran ini: 0 Kritis, 0 Tinggi, 2 Sedang (K-01 sisi kontrak dengan mitigasi halaman, K-03 integritas angka sinyal), 2 Rendah (K-04 diperbaiki, K-05 diterima), sisanya Info dan syarat operasional. Yang diperbaiki dan dibuktikan ulang di putaran yang sama: K-01 mitigasi halaman (F-06), K-03 (F-05), K-04 (baris kontrak di lembar). Yang menjadi syarat tertulis mainnet: K-08 sampai K-12. Hasil Tahap 2 tidak berubah: kontrak tidak disentuh putaran ini, sehingga alamat testnet dan verifikasi Sourcify-nya tetap sah.
