# Gerbang Keamanan Convoy (Tahap 2)

Tanggal: 19 Nov 2026. Ruang lingkup: kontrak ConvoySignal (`contracts/ConvoySignal.sol`), dinilai terhadap `docs/THREAT-MODEL.md`. Gerbang ini proporsional terhadap permukaan kontraknya: tidak memegang dana, tanpa owner, tanpa fungsi admin, satu panggilan eksternal baca ke registry immutable. Yang dituntut memo pra-rilis pada skala ini bukan label firma, melainkan urutan dan bukti: analisis statis yang ditriase tertulis, peta kontrol OWASP SCSVS, dan fuzz yang menyerang daftar invarian tertulis.

## 1. Analisis statis: Slither

- Alat: Slither 0.11.6 (slither-analyzer), dipasang di venv proyek `.venv/`, bukan global. Kompiler: solc 0.8.30 lewat solc-select, sama dengan versi yang dipakai pipeline kompilasi proyek (solc-js 0.8.30, EVM shanghai, optimizer 200).
- Perintah: `slither contracts/ConvoySignal.sol` dari akar proyek. Slither menganalisis 2 kontrak (ConvoySignal dan antarmuka IAgentID) dengan 102 detektor aktif.
- Keluaran mentah tersimpan lokal di `deploy/slither-convoysignal-2026-11-19.json` (folder deploy memang tidak diterbitkan).
- Hasil: **1 temuan**. Triase satu per satu di bawah ini.

### Temuan 1: incorrect-equality (dampak Medium, keyakinan High) — DITOLAK dengan alasan teknis

Isi temuan: `ConvoySignal.signal` memakai kesetaraan ketat yang dianggap berbahaya pada baris pemeriksaan gerbang:

```solidity
if (agentID.balanceOf(msg.sender) == 0) revert NotAgentIDHolder(msg.sender);
```

Alasan penolakan, butir demi butir:

1. Premis detektor tidak terpenuhi. Detektor `incorrect-equality` ada untuk nilai yang bisa digeser pihak lain ke angka persis yang dibandingkan, contoh klasiknya saldo ETH kontrak atau saldo token yang bisa ditambah 1 wei oleh penyerang untuk membalik cabang. Nilai yang dibandingkan di sini adalah `balanceOf` registry Agent ID untuk alamat pemanggil sendiri. Tidak ada pihak ketiga yang bisa menambah atau mengurangi saldo Agent ID alamat mana pun: ID itu soulbound, tidak bisa ditransfer, dan penerbitannya dikendalikan platform lewat tanda tangan resmi registry (lihat `docs/AGENTID-ABI.md`). Nilai ini tidak bisa "diselipkan" ke 0 atau ke 1 oleh penyerang.
2. Kesetaraan terhadap nol adalah predikat yang memang dimaksud. Gerbangnya adalah "memegang atau tidak memegang", dan untuk uint256, `== 0` adalah bentuk paling langsung dan paling mudah diaudit dari predikat itu. Registry mengembalikan 0 atau 1 untuk tiap alamat pada praktiknya; bahkan bila suatu hari ia mengembalikan lebih dari 1, `== 0` tetap benar sebagai uji "tidak memegang apa pun".
3. Penulisan ulang kosmetik tidak mengubah keamanan. Mengganti `== 0` menjadi `< 1` identik secara semantik untuk uint256 dan hanya akan membungkam detektor, sambil mengubah bytecode dan memaksa deploy ulang testnet tanpa satu pun perubahan perilaku. Gerbang ini menolak membayar biaya itu untuk penampilan; yang dicatat di sini adalah alasannya, bukan penghindarannya.
4. Skenario gagal yang tersisa adalah registry itu sendiri berbohong, dan itu sudah dinyatakan terbuka sebagai asumsi kepercayaan di `docs/THREAT-MODEL.md` seksi 1 (T-05), dengan kontrol proses bacaan balik alamat registry pada setiap deploy.

Keputusan: temuan ditolak sebagai positif palsu untuk konteks ini. Kontrak tidak diubah.

### Detektor yang berjalan tanpa temuan, dicatat karena relevan

- Keluarga reentrancy (reentrancy-eth, reentrancy-no-eth, reentrancy-benign, reentrancy-events): tanpa temuan. Ini konsisten dengan penilaian T-06 di threat model: satu satunya panggilan eksternal adalah `balanceOf` yang bersifat view ke registry immutable yang alamatnya tidak dipilih pemanggil, dan tidak ada nilai yang bergerak.
- Keluarga panggilan arbitrer dan delegatecall: tanpa temuan. Kontrak tidak punya `call`, `delegatecall`, atau target panggilan dari masukan pengguna.
- Keluarga kontrol akses (arbitrary-send, controlled-delegatecall, dan sejenisnya): tanpa temuan, konsisten dengan tidak adanya owner dan fungsi admin.

## 2. Peta kontrol OWASP SCSVS

Kelompok kontrol diambil dari halaman resmi SCSVS di scs.owasp.org (diakses 19 Nov 2026): ARCH, CODE, GOV, AUTH, COMM, CRYPTO, ORACLE, BLOCK, BRIDGE, DEFI, COMP. Untuk tiap kelompok dinyatakan berlaku atau tidak untuk kontrak sekecil ini, beserta buktinya. "Bukti" berarti artefak yang bisa ditunjuk, bukan klaim.

| Kelompok | Berlaku? | Penilaian dan bukti |
|---|---|---|
| SCSVS-ARCH (arsitektur, desain, threat modeling) | Berlaku | Arsitektur kuasa minimal: tanpa owner, tanpa admin, tanpa jalur upgrade, registry immutable. Threat model tertulis sebelum penilaian (`docs/THREAT-MODEL.md`), daftar invarian bernomor menjadi sasaran tes. Cakupan dibekukan di `docs/SCOPE-FREEZE.md`. |
| SCSVS-CODE (pengembangan, pengujian, deployment aman) | Berlaku | Kompiler terpaku di pipeline (solc 0.8.30, optimizer 200, EVM shanghai) dan input kompilasi yang sama dipakai tes, deploy, dan verifikasi sumber. 35 tes perilaku plus fuzz invarian (seksi 3). Analisis statis ditriase tertulis (seksi 1). Sumber testnet terverifikasi Sourcify exact match. CI menjalankan seluruh rangkaian pada tiap push. |
| SCSVS-GOV (logika bisnis dan mekanisme ekonomi) | Berlaku sebagian | Tidak ada mekanisme ekonomi dan tidak ada nilai; manipulasi logika bisnis yang mungkin adalah penggelembungan antrean, dan itu ditutup gerbang pemegang plus aturan satu sinyal per pemegang per drop. Buktinya INV-01, INV-02, INV-03 yang diuji fuzz dan tes perilaku. Pendaftaran drop yang terbuka adalah keputusan logika bisnis yang didokumentasikan alasannya di blueprint dan threat model (T-03). |
| SCSVS-AUTH (kontrol akses dan autentikasi) | Berlaku, inti kontrak | Otorisasi per fungsi dinyatakan eksplisit: `signal` hanya pemegang (diperiksa on-chain ke registry), `withdrawSignal` hanya pemilik sinyal oleh konstruksi (status dibaca per `msg.sender`, tidak ada parameter alamat), `registerDrop` sengaja terbuka. Tidak ada peran istimewa apa pun. Bukti: tes gerbang sinyal dan anti pemalsuan di rangkaian perilaku, INV-03, INV-05, INV-09 di fuzz. |
| SCSVS-COMM (komunikasi antar kontrak) | Berlaku | Satu satunya interaksi keluar adalah panggilan view `balanceOf` ke alamat registry immutable lewat antarmuka baca minimal (`contracts/IAgentID.sol`). Tidak ada panggilan ke alamat dari masukan pengguna, tidak ada `call` atau `delegatecall`, tidak ada penanganan nilai balik selain perbandingan nol. Bukti: sumber kontrak, triase Slither tanpa temuan panggilan arbitrer. |
| SCSVS-CRYPTO (kriptografi) | Tidak berlaku | Kontrak tidak memakai kriptografi, tanda tangan, keacakan, atau hash apa pun. Tidak ada permukaan untuk dinilai. |
| SCSVS-ORACLE (operasi aritmetika dan logika; umpan data luar) | Berlaku untuk aritmetika, tidak berlaku untuk umpan data | Aritmetika hanya penambahan dan pengurangan penghitung di Solidity 0.8 yang tercek; pengurangan hanya tercapai pada keadaan yang oleh INV-01 menjamin hitungan minimal 1. Fuzz memeriksa tidak ada underflow dan tidak ada penyimpangan hitungan pada urutan acak. Kontrak tidak mengonsumsi umpan harga atau data luar apa pun; satu satunya bacaan luar adalah `balanceOf` registry yang dinilai di COMM. |
| SCSVS-BLOCK (penolakan layanan dan kehabisan sumber daya) | Berlaku | Setiap panggilan berbiaya O(1): tidak ada loop, tidak ada iterasi atas array atau mapping, tidak ada pembayaran dorong. Satu satunya masukan berukuran bebas adalah string label drop, yang biaya simpannya ditanggung pendaftar sendiri lewat gas (T-08). Fuzz memasukkan label 180 karakter dan label unicode tanpa kegagalan. |
| SCSVS-BRIDGE (lintas chain) | Tidak berlaku | Tidak ada pesan lintas chain, tidak ada bridge, tidak ada komponen relay. Integritas state yang menjadi urusan kelompok ini pada kontrak satu chain dibuktikan lewat daftar invarian di fuzz. |
| SCSVS-DEFI (mekanisme DeFi dan gas) | Tidak berlaku | Tidak ada token, pool, swap, pinjam meminjam, atau nilai apa pun di kontrak. Profil gasnya panggilan berukuran tetap; tidak ada risiko optimasi gas yang bisa dinilai. |
| SCSVS-COMP (komponen spesifik) | Berlaku sebagian | Satu satunya komponen luar adalah registry Agent ID (registry soulbound bergaya ERC-721). Asumsi integrasinya didokumentasikan: semantik `balanceOf`, satu ID per alamat, tidak bisa ditransfer, dan permukaan lengkap registry dari ABI terverifikasi dicatat di `docs/AGENTID-ABI.md`. Antarmuka yang dipakai bersifat baca saja dan minimal. |

## 3. Fuzz dan tes invarian

Rangkaian: `test/fuzz-invariants.js`, dijalankan sebagai bagian dari `npm test`. Cara kerjanya: urutan acak `registerDrop`, `signal`, dan `withdrawSignal` dari campuran 5 pemegang dan 3 non-pemegang terhadap Ganache in-process; setiap operasi diramal dulu lewat `staticCall` dan nama error kustomnya harus sama dengan harapan deterministik dari model; operasi yang berhasil disiarkan dan model dimajukan; sesudah SETIAP langkah, seluruh daftar invarian INV-01 sampai INV-10 dari `docs/THREAT-MODEL.md` diperiksa dengan membandingkan model terhadap bacaan chain langsung.

Parameter putaran: benih tetap [20261119, 424242, 777], 250 operasi per benih, total 750 langkah teracak, maksimum 8 drop per benih. Hasil dan pengulangan dicatat di BUILD-REPORT.md seksi tahap 2; rangkaian ini lulus penuh dan 35 tes perilaku lama tetap lulus, dijalankan dua kali dengan hasil sama.

## 4. Keputusan perubahan kontrak

Triase seksi 1 menghasilkan nol perbaikan yang diterima: satu satunya temuan ditolak dengan alasan teknis tertulis. Karena itu **bytecode ConvoySignal tidak berubah** pada tahap ini. Konsekuensinya menurut aturan tahap: tidak ada deploy testnet ulang; deploy testnet irisan 1 di `0x8Ff3485841faBE8384dEec61BCb948c16766312d` tetap sah dan tetap menjadi kontrak yang dinilai gerbang ini, dengan sumber yang sudah terverifikasi Sourcify exact match.

## 5. Sisa risiko keamanan yang jujur

- Kejujuran registry adalah asumsi, bukan bukti: bila registry Agent ID suatu hari berubah semantik (misalnya ID menjadi bisa ditransfer), gerbang Convoy mewarisi perubahan itu tanpa satu pun baris kode berubah. Pemantauan perubahan registry adalah pekerjaan operasional mainnet, belum ada.
- Label drop adalah teks bebas dari pendaftar dan tetap menjadi permukaan phishing di lapisan tampil (T-04); mitigasi kontrak tidak ada dan memang tidak bisa ada, mitigasinya kurasi tampil dan alamat kontrak yang selalu ditampilkan.
- Rekonsiliasi dua RPC untuk angka tampil (T-10) belum ada; itu Tahap 3 dan di luar gerbang ini.
- Fuzz di sini adalah fuzz urutan panggilan terhadap model, bukan fuzz berbasis properti di dalam kontrak (misalnya Foundry invariant): cakupannya kuat untuk kontrak sekecil ini, tetapi perbedaan alatnya dicatat apa adanya.
