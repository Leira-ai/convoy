# Panduan Penguji Convoy / Convoy Tester Guide

Satu halaman untuk penguji. Baca sebelum sesi. / One page for testers. Read before your session.

---

## Bahasa Indonesia

### Apa yang kamu uji

Convoy adalah radar antrean drop bergate Agent ID yang angka antreannya dihitung dari pemegang Agent ID nyata, satu nama satu sinyal. Kamu menguji halamannya supaya orang nyata, bukan cuma pembuatnya, yang membuktikan halaman ini bisa dipakai.

### Langkah membuka halaman uji

1. Buka tautan ini di HP kamu: https://convoy.utterhq.workers.dev/?network=testnet
2. Halaman yang terbuka adalah versi uji di jaringan tes (testnet), ditandai lencana TESTNET. Ini bukan versi asli dan tidak menyentuh dana apa pun.
3. Di sesi, moderator akan membacakan tugas satu per satu. Kerjakan dengan kecepatanmu sendiri sambil mengucapkan apa yang sedang kamu pikirkan.
4. Salah satu tugas memintamu menyambungkan wallet ke halaman. Sambungan itu hanya membaca alamatmu. Tombol sinyalmu akan tampil nonaktif sebagai non-pemegang, dan itu memang disengaja: nama Agent ID aslimu tercatat di jaringan utama, sedangkan versi uji ini membaca daftar tiruan di jaringan tes. Pesan penjelas di halaman itu termasuk yang sedang diuji kejelasannya.
5. Tugas terakhir membawamu ke aplikasi Binance untuk menelusuri Developer Mode sampai titik siap menyambung. Berhenti sebelum transaksi apa pun. Moderator akan menghentikanmu bila layar tanda tangan muncul.

### Apa yang diamati

Cara kamu menemukan sesuatu, bagian mana yang membuatmu berhenti, dan kata katamu sendiri tentang halamannya. Tidak ada jawaban salah dan tidak ada nilai. Kalau kamu macet, itu temuan berharga, bukan kegagalanmu. Sesi direkam hanya bila kamu menyetujui.

### Jaminan untuk kamu

- Di sesi ini tidak ada transaksi, tidak ada tanda tangan, dan tidak ada biaya, dalam bentuk apa pun.
- Kami tidak pernah meminta kunci privat, frasa pemulihan, kata sandi, atau kode verifikasi. Siapa pun yang memintanya atas nama uji ini bukan kami.
- Data yang dicatat hanya catatan tugas dan kutipan kata katamu tentang halaman. Kamu boleh memakai nama samaran selama sesi; namamu hanya dicantumkan sebagai penguji pendiri bila kamu sendiri yang memintanya.
- Kamu boleh berhenti kapan saja tanpa alasan.

### Nanti, sesudah versi asli live (Bagian B)

Kamu akan diundang kembali untuk mencoba fitur sinyal beneran. Ringkasannya dari jalur yang sudah terbukti di aplikasi Binance:

1. Buka aplikasi Binance dan masuk ke Agentic Wallet kamu.
2. Buka pengaturan wallet dan aktifkan Developer Mode. Mode ini yang membuka akses ke kontrak kustom di luar daftar bawaan aplikasi. Nama menu persisnya bisa berbeda antar versi aplikasi; panduan ini akan diperbarui dari jalur nyata yang ditemukan para penguji di sesi Bagian A.
3. Dari Developer Mode, kontrak Convoy bisa dipanggil. Setiap transaksi tetap muncul sebagai permintaan konfirmasi di aplikasimu dan hanya berjalan bila kamu sendiri yang menyetujuinya. Tidak ada jalan pintas dan tidak ada yang bisa memberi sinyal atas namamu.
4. Di halaman Convoy versi asli, sambungkan wallet, pilih drop, tekan sinyal, lalu konfirmasi di aplikasi. Untuk menarik sinyal, tekan tarik sinyal pada drop yang sama dan konfirmasi lagi.
5. Biaya di Bagian B hanya gas jaringan yang kecil untuk transaksimu sendiri, ditampilkan aplikasimu sebelum kamu menyetujui. Tidak ada biaya lain dan tidak ada dana yang dikunci Convoy, karena kontraknya memang tidak bisa memegang dana.

---

## English

### What you are testing

Convoy is a queue radar for Agent ID gated drops whose queue counts come from real Agent ID holders, one name one signal. You are testing its page so that real people, not only its builder, prove the page works.

### Opening the test page

1. Open this link on your phone: https://convoy.utterhq.workers.dev/?network=testnet
2. The page that opens is the test version on a test network (testnet), marked with a TESTNET badge. It is not the live version and it never touches any funds.
3. During the session, the moderator reads tasks one by one. Work at your own pace and say out loud what you are thinking.
4. One task asks you to connect your wallet to the page. Connecting only reads your address. Your signal button will show as inactive for a non-holder, and that is deliberate: your real Agent ID name is registered on the main network, while this test version reads a mock registry on the test network. The explanation message on the page is itself part of what is being tested.
5. The last task takes you into your Binance app to walk the Developer Mode path up to the point of connecting. Stop before any transaction. The moderator will stop you if a signing screen appears.

### What is observed

How you find things, where you get stuck, and your own words about the page. There are no wrong answers and no scores. Getting stuck is a valuable finding, not your failure. The session is recorded only with your consent.

### Your guarantees

- This session involves no transactions, no signatures, and no costs of any kind.
- We never ask for your private key, recovery phrase, password, or verification codes. Anyone asking for those in the name of this test is not us.
- The only data recorded is task notes and your quoted words about the page. You may use a nickname during the session; your name is listed as a founding tester only if you ask for it.
- You may stop at any time, for any reason.

### Later, once the live version is up (Part B)

You will be invited back to try the real signal feature. The summary below follows the path already proven in the Binance app:

1. Open the Binance app and go to your Agentic Wallet.
2. Open the wallet settings and enable Developer Mode. This mode is what unlocks access to custom contracts beyond the app's built-in list. Exact menu names can differ between app versions; this guide will be updated with the real paths found by testers during Part A sessions.
3. From Developer Mode, the Convoy contract can be called. Every transaction still appears as a confirmation request in your app and only proceeds when you approve it yourself. There is no shortcut and nobody can signal on your behalf.
4. On the live Convoy page, connect your wallet, pick a drop, press signal, then confirm in the app. To withdraw a signal, press withdraw on the same drop and confirm again.
5. The only cost in Part B is the small network gas for your own transactions, shown by your app before you approve. There are no other fees and Convoy locks no funds, because its contract cannot hold funds at all.
