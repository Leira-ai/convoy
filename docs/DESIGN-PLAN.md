# Rencana Desain Frontend Convoy (Gate 0)

Tanggal: 19 Nov 2026. Irisan 2. Pasangan: BLUEPRINT.md (aturan data dan kejujuran angka) dan BUILD-REPORT.md.

## Subjek, audiens, satu pekerjaan

Subjek: papan antrean drop bergate Agent ID. Audiens: pemegang Agent ID yang berburu mint bergate dan harus memutuskan drop mana yang diserbu sebelum kuota terbakar. Satu pekerjaan halaman: menunjukkan drop mana yang antreannya paling nyata dan paling cepat terbakar, lalu membiarkan pemegang memberi atau menarik sinyal dalam satu ketukan dari kartu yang sama.

Mode permukaan (impeccable): Operate (alat kerja) dengan hero Persuade singkat. Papan adalah alat yang dibuka berulang kali dalam sehari, jadi kepadatan dan kejujuran angka mengalahkan dekorasi.

## Elemen signature (satu, memorable)

KARTU ANTREAN UTAMA: kartu drop unggulan ditampilkan sebagai pelat papan antrean fisik. Angka sinyal besar dalam tinta amber di atas pelat petrol gelap yang sama di kedua tema, di bawahnya SATU BARIS TITIK ANTREAN, satu titik per pemegang yang memberi sinyal, dibaca langsung dari kontrak. Titik adalah hitungan orang yang bisa dilihat, bukan ikon dekorasi. Di kartu yang sama, dua zona angka dipisahkan tegas oleh garis dan label kata: zona SINYAL (minat, amber) dan zona TERMINTING (kejadian, teal). Bila bacaan terminting tidak tersedia, zona kedua memuat label TIDAK TERDATA dengan kalimat alasannya, tidak pernah angka tebakan.

Data hero adalah data testnet nyata: drop id 0 (kontrak TitipEscrow testnet sebagai alamat yang dilacak), 1 sinyal aktif dari pemegang convoyuji, jendela 19 sampai 26 Nov 2026. Tidak ada angka karangan di mana pun di halaman.

## Palet (dari bahan subjek: papan antrean malam, lampu amber konvoi, petrol)

Bukan kertas krem Titip (identitas produk berbeda), bukan hitam pekat plus satu aksen asam, tanpa gradasi apa pun, tanpa eyebrow kapital.

- Gelap (default): latar petrol arang #12181d, permukaan #1a2229 dan #232e37, teks #edf2ef, aksen utama amber lampu #d98a2b dengan tinta gelap, aksen kejadian teal #45b8a6, pelat papan #14313a.
- Terang: latar abu kertas sejuk #e8ecea, permukaan #f8faf9, teks #1e2422, aksen amber tua #a35c07, teal #0f766e, pelat papan tetap petrol gelap (papan fisik tidak berubah warna karena tema halaman).
- Semua pasangan token dihitung skrip (Gate 1): teks tubuh >= 4.5:1, teks besar dan batas UI >= 3:1, kedua tema, termasuk isi pelat.

## Tipografi

Satu keluarga sans sistem berkarakter (Avenir Next, Segoe UI, system-ui), bobot 800 dengan letter-spacing negatif untuk judul dan angka besar. Skala satu rasio 1.25: 12.8 / 16 / 20 / 25 / 31 / 39. Mono HANYA untuk alamat kontrak, hash transaksi, dan baris status wallet, sesuai aturan produk sebelumnya.

## Struktur halaman

1. Kepala: marka C, nama Convoy, lencana TESTNET di mode testnet, seg bahasa ID/EN, tombol tema, tombol hubungkan wallet. Bilah wallet di bawahnya saat terhubung.
2. Hero: judul dua baris, lede dua kalimat, kartu antrean utama (signature), keterangan data per blok, dua tombol (Lihat radar, Antrean saya), catatan mode (testnet atau mainnet belum deploy).
3. Radar drop: chip saring berhitung (Semua, Sedang dibuka, Belum dibuka, Sudah tutup) dan kalimat jumlah hasil, lalu kartu tiap drop: label, alamat kontrak mono dengan salin, jendela waktu relatif, zona sinyal dan zona terminting yang terpisah, laju bakar dan perkiraan habis sebagai rentang atau label tidak terdata, tombol Ikut antre atau Tarik sinyal dengan alasan tertulis bila tombol mati.
4. Antrean saya (panel Quota): status sinyal per drop untuk wallet terhubung, sisa jatah gratis per alamat bila bacaan kuota proyek tersedia, selain itu label tidak terdata.
5. Pengungkapan: apa arti sinyal (minat, bukan jaminan mint), apa arti terminting, Convoy bukan penilaian keamanan kontrak drop, dan catatan risiko.
6. Kaki: alamat kontrak ConvoySignal dan registry, kalimat privasi.

## Keadaan yang dirancang (Gate 7)

Papan: memuat (kalimat plus kerangka), kosong (belum ada drop terdaftar), galat (bacaan gagal plus tombol coba lagi), basi (umur data sebagai kalimat plus tombol segarkan), sebagian (kartu dengan panel counter tidak terdata tetap tampil). Lembar konfirmasi: memeriksa (simulasi), menunggu tanda tangan, memproses, berhasil dengan hash, gagal dengan alasan polos.

## Pekerjaan inti dan anggarannya (Gate 13)

1. Melihat drop dengan antrean terpanjang: 0 ketukan, kartu utama di layar pertama.
2. Memberi sinyal: hubungkan (1) lalu Ikut antre (1) lalu periksa lembar (0) lalu Kirim lewat wallet (1).
3. Memeriksa antrean dan jatah sendiri: gulir ke panel Antrean saya (0 ketukan sesudah terhubung).

## Yang sengaja ditahan

Tidak ada skor keamanan, tidak ada peringkat proyek, tidak ada janji hasil mint. Angka sinyal dan angka terminting tidak pernah dicampur dalam satu baris atau satu warna.
