"use strict";
/*
 * Convoy frontend.
 *
 * Read layer: chain reads go through the connected wallet provider
 * when one exists, and through public JSON-RPC endpoints (bounded
 * concurrency, endpoint fallback, successes only) when no wallet is
 * connected, so the board is readable with zero setup.
 *
 * Wallet layer: EIP-6963 provider discovery with an injected EIP-1193
 * fallback, chain check, switch/add chain flow (EIP-3326 / EIP-3085),
 * live account and chain listeners, silent reconnect via eth_accounts.
 * No signature is ever requested for browsing or connecting.
 *
 * Transaction adapter (Gate 9): every state-changing action (signal,
 * withdrawSignal) is simulated with eth_call first and stops
 * fail-closed when the simulation fails; the confirmation sheet shows
 * the decoded effect plus the estimated network fee before any
 * signature is requested; then eth_sendTransaction, then receipt
 * polling with the final status and tx hash shown in place. Contract
 * errors are decoded to plain-words messages in both languages.
 *
 * Data honesty (blueprint): the signal count is holder intent, read
 * from ConvoySignal. The minted counter is read from each drop's own
 * contract through the Stage 3 adapter spec (docs/DATA-CALIBRATION.md):
 * the kuota pattern (quotaOf + mintedBy, the Agent ID gated mint
 * family), the suplai pattern (ERC-721 style totalSupply), or no
 * recognised read at all. When no pattern matches, the panel says
 * there is no public reading in words and never shows a guessed
 * number. The two numbers are rendered in separate zones and never
 * mixed.
 *
 * Data calibration rules (Stage 3, threat T-10): every counter and
 * quota number carries its source (the function that answered and
 * the contract read), the block it was read at, and its read time.
 * Without a wallet, each counter is read from two independent RPC
 * endpoints at one pinned block and shown only when both agree
 * exactly (tolerance zero: these are discrete counts and the chain
 * state at one block is unique); a disagreement renders as "not
 * verified" with no number at all. With a wallet, reads come from
 * the wallet's own provider and are labelled single-source. A number
 * older than FRESH_LIMIT_MS renders with a stale tag. The burn rate
 * comes from two time-separated samples, is shown as a range, and
 * its label states the sample window.
 *
 * Network modes:
 * - mainnet (default): BNB Chain (56) with the real Agent ID registry.
 *   The ConvoySignal mainnet address is EMPTY on purpose: the contract
 *   is not deployed there yet, so the page explains the product, shows
 *   no numbers as data, and the adapter refuses to broadcast anything.
 * - testnet (?network=testnet): BSC Testnet (97) wired to the Convoy
 *   testnet deployment and its MockAgentID registry, clearly labelled.
 *   Signal and withdraw broadcast real testnet transactions.
 *
 * The chain codec below (Keccak-256 + a minimal ABI coder) is
 * hand-rolled so the page keeps zero runtime dependencies; it is the
 * same codec proven in the Titip frontend, verified against js-sha3
 * and ethers, including the 135-mod-136 padding fix.
 */

const NETWORKS = {
  mainnet: {
    chainIdHex: "0x38", // BNB Chain, 56
    chainProfile: {
      chainId: "0x38",
      chainName: "BNB Smart Chain",
      nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
      rpcUrls: ["https://bsc-dataseed.binance.org"],
      blockExplorerUrls: ["https://bscscan.com"],
    },
    readRpcs: ["https://bsc-dataseed.binance.org", "https://bsc-dataseed1.defibit.io", "https://bsc-rpc.publicnode.com"],
    agentIdRegistry: "0x60b9262456de011f7d15a54cdd8c48baaa8b022f",
    // ConvoySignal is NOT deployed on mainnet yet. Empty on purpose:
    // the board and the adapter stay fail-closed in this mode.
    convoyAddress: null,
  },
  testnet: {
    chainIdHex: "0x61", // BSC Testnet, 97
    chainProfile: {
      chainId: "0x61",
      chainName: "BNB Smart Chain Testnet",
      nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
      rpcUrls: ["https://bsc-testnet-rpc.publicnode.com"],
      blockExplorerUrls: ["https://testnet.bscscan.com"],
    },
    readRpcs: ["https://bsc-testnet-rpc.publicnode.com", "https://bsc-testnet-dataseed.bnbchain.org"],
    // MockAgentID testnet deployment (deploy/testnet-state.json)
    agentIdRegistry: "0x9eB7a9063Ce499a619F142A3a344BfBb2D23De19",
    // ConvoySignal testnet deployment, Sourcify exact match on chain 97
    convoyAddress: "0x8Ff3485841faBE8384dEec61BCb948c16766312d",
  },
};

const NETWORK_MODE =
  new URLSearchParams(window.location.search).get("network") === "testnet" ? "testnet" : "mainnet";

const CONFIG = Object.assign({}, NETWORKS[NETWORK_MODE], {
  network: NETWORK_MODE,
  isTestnet: NETWORK_MODE === "testnet",
});

// Page release version, kept in step with CHANGELOG.md. It rides in
// the feedback context so a report names the exact page it came from.
const PAGE_VERSION = "0.7.0";

const STRINGS = {
  id: {
    connect: "Hubungkan Wallet", disconnect: "Putuskan", switchChain: "Pindah ke BNB Chain",
    headline: "Antrean drop, dihitung dari orang nyata.",
    lede: "Convoy menghitung siapa yang benar-benar berniat ikut drop bergate Agent ID. Sinyal hanya bisa diberikan pemegang Agent ID, satu nama satu sinyal, jadi angka antreannya hitungan orang nyata yang tidak bisa digelembungkan wallet duplikat.",
    deployNote: "Status: kontrak ConvoySignal belum dideploy di BNB Chain mainnet. Halaman ini menampilkan penjelasan produk; belum ada sinyal yang bisa diberikan di mainnet dan tidak ada angka yang ditampilkan sebagai data.",
    testnetNote: "Testnet: halaman ini memakai deployment uji di BSC Testnet (chain 97) dengan registry Agent ID tiruan. Angka antrean dan sinyal di mode ini nyata di testnet, dan tombol sinyal mengirim transaksi testnet beneran dari wallet kamu.",
    ctaBoard: "Lihat radar drop", ctaMine: "Antrean saya",
    step1T: "Drop terdaftar di papan",
    step1B: "Proyek bergate Agent ID mendaftarkan kontrak dropnya, atau pemburu yang menemukannya lebih dulu.",
    step2T: "Pemegang memberi sinyal",
    step2B: "Satu panggilan ringan tanpa dana dan tanpa approval. Kontrak menolak siapa pun yang tidak memegang Agent ID.",
    step3T: "Antrean dan bakar terbaca",
    step3B: "Semua orang melihat berapa orang nyata yang antre dan berapa cepat kuota proyek terbakar, dari kontrak langsung.",
    switchChainTn: "Pindah ke BSC Testnet", onChainTn: "BSC Testnet", onChain: "BNB Chain",
    boardTitle: "Radar drop", refresh: "Segarkan", hideTestData: "Sembunyikan data uji",
    themeDark: "Gelap", themeLight: "Terang", themeCurrent: "Tema saat ini: {mode}. Ganti tema",
    testDataBadge: "DATA UJI KALIBRASI", nextUp: "Berikutnya",
    boardHint: "Angka sinyal adalah minat pemegang Agent ID. Angka terminting adalah kejadian nyata dari kontrak proyek. Keduanya selalu ditampilkan terpisah.",
    boardLoadingTitle: "Papan sedang dibaca.",
    boardLoading: "Membaca papan antrean dari kontrak...",
    boardErrorTitle: "Papan belum bisa dibaca.",
    boardErrorBody: "Bacaan dari kontrak gagal. Angka lama tidak ditampilkan sebagai data baru. Coba lagi sebentar lagi.",
    boardEmptyTitle: "Belum ada drop terdaftar.",
    boardEmptyBody: "Begitu proyek bergate Agent ID mendaftarkan dropnya di kontrak Convoy, antreannya tampil di sini.",
    notDeployedTitle: "Papan mainnet belum live.",
    notDeployedBody: "Kontrak ConvoySignal belum dideploy di BNB Chain mainnet, jadi belum ada antrean yang bisa ditampilkan. Mode testnet halaman ini menampilkan papan yang bekerja penuh.",
    chipAll: "Semua", chipOpen: "Buka", chipUpcoming: "Belum dibuka", chipClosed: "Tutup",
    showing: "Menampilkan {x} dari {y} drop",
    filterNoneTitle: "Tidak ada drop pada saringan ini.",
    filterNoneBody: "Longgarkan saringan untuk melihat drop lain di papan.",
    mineTitle: "Antrean saya",
    mineEmptyTitle: "Hubungkan wallet untuk melihat antreanmu.",
    mineEmptyBody: "Sesudah terhubung, panel ini menunjukkan drop mana yang sudah kamu beri sinyal dan sisa jatah gratis atas namamu bila kontrak proyeknya menyediakan bacaan itu.",
    mineNoneTitle: "Kamu belum memberi sinyal di drop mana pun.",
    mineNoneBody: "Tekan Ikut antre pada kartu drop untuk mencatat sinyal pertamamu. Sinyal selalu bisa ditarik lagi.",
    meaningTitle: "Apa arti angka di papan ini?",
    meaningBody: "Sinyal adalah pernyataan minat dari pemegang Agent ID, bukan jaminan ia akan mint dan bukan janji hasil apa pun. Angka terminting dibaca dari kontrak proyek itu sendiri; proyek yang counternya tidak bisa diverifikasi ditandai tidak ada bacaan publik, bukan ditebak. Convoy bukan penilaian keamanan: antrean yang panjang tidak berarti kontrak dropnya aman.",
    footContract: "Kontrak sinyal:", footRegistry: "Registry Agent ID:",
    footPrivacy: "Convoy tidak mencatat alamat wallet untuk analitik.",
    notDeployedFooter: "belum dideploy di mainnet",
    testnetFooterSuffix: " (BSC Testnet, registry tiruan ",
    sheetTitle: "Periksa dulu sebelum tanda tangan",
    sheetNote: "Sinyal tidak memindahkan dana apa pun. Yang kamu bayar hanya biaya jaringan untuk mencatat sinyalmu.",
    cancel: "Batal", confirmSignal: "Kirim lewat wallet", confirmWithdraw: "Tarik lewat wallet",
    notDeployed: "Kontrak Convoy belum dideploy di jaringan ini. Ringkasan ini contoh tampilan; belum ada transaksi yang dikirim.",
    needWallet: "Hubungkan wallet dulu untuk melanjutkan.",
    noProvider: "Tidak ada wallet yang terdeteksi di browser ini. Buka halaman ini di browser wallet atau pasang wallet EIP-1193.",
    wrongNetwork: "Wallet kamu di jaringan lain. Convoy hanya berjalan di rantai yang sedang ditampilkan halaman ini.",
    connectedAs: "Terhubung:",
    zoneSignal: "Sinyal antre", zoneSignalNote: "pemegang Agent ID yang menyatakan minat",
    zoneMinted: "Sudah terminting", zoneMintedNote: "kejadian nyata dari kontrak proyek",
    notRecorded: "Tidak ada bacaan publik",
    notRecordedWhy: "Kontrak ini tidak menerbitkan angka terminting, jadi Convoy tidak menampilkannya. Ini bukan angka nol.",
    quotaLeft: "Sisa jatah gratis kamu",
    quotaNotRecorded: "Tidak ada bacaan publik untuk jatah per alamat. Kontrak ini tidak menerbitkan sisa jatah per alamat, jadi Convoy tidak menampilkannya.",
    quotaOf: "dari total jatah",
    srcLabel: "Sumber:",
    srcDual: "dua RPC cocok",
    srcConflict: "dua RPC berselisih",
    srcSingle: "satu sumber",
    srcWallet: "lewat wallet",
    staleTag: "Basi",
    unverified: "Belum terverifikasi",
    unverifiedWhy: "Dua bacaan independen pada blok yang sama memberi angka berbeda, jadi angka ini disembunyikan sampai bacaannya cocok.",
    burnWindow: "Jendela sampel: {n} bacaan selama {w}",
    quotaSrc: "Sumber: {fns} · dibaca {when}",
    burnRate: "Laju bakar",
    burnPerMin: "mint per menit",
    burnLoading: "Belum bisa dihitung: bacaan counter pertama belum selesai.",
    burnNoPublic: "Belum bisa dihitung: tidak ada bacaan publik untuk angka terminting.",
    burnUnverified: "Belum bisa dihitung: dua bacaan independen berselisih, jadi angkanya disembunyikan.",
    burnNoSample: "Belum bisa dihitung: belum ada bacaan terminting yang tercatat.",
    burnOneSample: "Belum bisa dihitung: baru satu bacaan tercatat, menunggu bacaan kedua.",
    burnShortWindow: "Belum bisa dihitung: dua bacaan tercatat terlalu berdekatan, menunggu jendela sampel minimal 15 detik.",
    burnWarming: "Belum bisa dihitung: sampelnya belum cukup.",
    burnStill: "Laju bakar 0 mint per menit pada jendela sampel ini. Perkiraan habis belum bisa dihitung karena belum ada mint baru yang tercatat.",
    burnDone: "Kuota proyek ini sudah habis terbaca dari kontraknya, jadi tidak ada perkiraan habis yang perlu dihitung.",
    eta: "Perkiraan habis",
    etaRange: "sekitar {a} sampai {b}",
    etaSingle: "sekitar {a}",
    stOpen: "Buka", stUpcoming: "Belum buka", stClosed: "Tutup", stUnknown: "Waktu belum diumumkan",
    opensAt: "Buka", closesAt: "Tutup",
    dropContract: "Kontrak drop",
    registrar: "Didaftarkan oleh",
    signalBtn: "Ikut antre", withdrawBtn: "Tarik sinyal",
    youSignaled: "Kamu sudah antre di drop ini.",
    notQueued: "Belum antre",
    holderOnly: "Hanya pemegang Agent ID yang bisa memberi sinyal. Wallet kamu tidak memegang Agent ID di registry ini.",
    connectFirst: "Hubungkan wallet untuk memberi sinyal.",
    wrongChainWhy: "Pindah jaringan dulu supaya sinyalmu tercatat di rantai yang benar.",
    copied: "Alamat lengkap disalin.", copy: "Salin",
    rowDrop: "Drop", rowEffect: "Yang terjadi",
    signalEffect: "Sinyal antre atas namamu tercatat di kontrak Convoy untuk drop ini. Sinyal adalah pernyataan minat, bukan jaminan dapat mint, dan bisa kamu tarik kapan saja.",
    withdrawEffect: "Sinyal antre atas namamu di drop ini dihapus dari kontrak Convoy. Kamu bisa memberi sinyal lagi nanti.",
    gasFee: "Perkiraan biaya jaringan",
    checking: "Memeriksa transaksi ini di kontrak dulu...",
    waitSign: "Menunggu tanda tangan di wallet kamu...",
    processing: "Transaksi terkirim. Menunggu konfirmasi jaringan...",
    viewTx: "Lihat di penjelajah",
    successSignal: "Sinyalmu tercatat. Kamu resmi antre di drop ini.",
    successWithdraw: "Sinyalmu sudah ditarik dari drop ini.",
    errRejected: "Kamu membatalkan tanda tangan di wallet. Tidak ada transaksi yang dikirim.",
    errFunds: "Saldo wallet kamu tidak cukup untuk biaya jaringan transaksi ini.",
    errSimGeneric: "Kontrak menolak transaksi ini pada pemeriksaan awal, jadi tidak dikirim. Tidak ada dana yang bergerak.",
    errNotHolder: "Wallet kamu tidak memegang Agent ID, jadi tidak bisa memberi sinyal. Sinyal hanya terbuka untuk pemegang Agent ID.",
    errAlreadySignaled: "Kamu sudah memberi sinyal di drop ini. Satu pemegang hanya punya satu sinyal aktif per drop.",
    errNotSignaled: "Kamu belum punya sinyal aktif di drop ini, jadi tidak ada yang bisa ditarik.",
    errDropNotFound: "Drop ini tidak ditemukan di kontrak Convoy.",
    errTxFailed: "Transaksi gagal di jaringan. Cek tx di penjelajah untuk rinciannya.",
    errSlow: "Transaksi belum terkonfirmasi sesudah 90 detik. Cek statusnya di penjelajah sebelum mencoba lagi.",
    asOf: "Data per blok {block} · dibaca {when}",
    asOfStale: "Bacaan baru gagal; yang tampil data per blok {block} · dibaca {when}",
    featuredCaption: "Drop dengan antrean terpanjang saat ini, dibaca langsung dari kontrak ConvoySignal testnet.",
    queuePeople: "orang nyata antre",
    relIn: "lagi", relAgo: "yang lalu",
    fbTitle: "Beri masukan",
    fbBody: "Ada yang membingungkan, angka yang terasa salah, atau tombol yang tidak jalan? Ceritakan di sini. Masukanmu membantu Convoy diperbaiki untuk semua pemburu.",
    fbOpen: "Tulis masukan",
    fbPublic: "Masukan dikirim sebagai issue publik di repo GitHub Convoy: siapa pun bisa membacanya. Jangan tulis kunci privat, frasa pemulihan, kata sandi, atau data pribadi apa pun di masukanmu.",
    fbCategory: "Kategori",
    fbCatConfusing: "Bingung", fbCatWrongNumber: "Angka salah", fbCatButton: "Tombol tidak jalan", fbCatSuggestion: "Saran", fbCatOther: "Lainnya",
    fbDrop: "Tentang drop", fbDropGeneral: "Umum, bukan tentang drop tertentu",
    fbMessage: "Isi masukan",
    fbMessagePh: "Ceritakan apa yang kamu lihat, apa yang kamu harapkan, dan di bagian mana itu terjadi.",
    fbContextTitle: "Konteks yang ikut terkirim, terbuka untuk kamu periksa",
    fbContextLine: "Jaringan: {net} · Versi halaman: {ver} · Bahasa: {lang}",
    fbContextDrop: "Drop: {label} ({addr})",
    fbContextNoDrop: "Drop: umum",
    fbCopy: "Salin teks masukan",
    fbSend: "Buka issue di GitHub",
    fbNeedMessage: "Tulis isi masukannya dulu, satu kalimat pun cukup.",
    fbCopied: "Teks masukan disalin. Tempel di mana pun kamu mau, misalnya issue GitHub Convoy.",
    fbOpened: "Draf issue dibuka di tab baru. Periksa isinya di GitHub, lalu tekan tombol kirim di sana untuk menerbitkannya.",
    fbIssueCat: "Kategori", fbIssueTime: "Waktu", fbIssuePrefix: "Masukan",
    fbNetTestnet: "BSC Testnet (97)", fbNetMainnet: "BNB Chain mainnet (56)",
    navRadar: "Radar", navQueue: "Antrean", navHow: "Cara kerja", navFeedback: "Masukan",
    howTitle: "Cara kerja",
    chipWatched: "Dipantau",
    watchBtn: "Pantau", watchedBtn: "Dipantau",
    watchNote: "Kamu memantau drop ini. Pantauan tersimpan di perangkat ini saja, bukan pemberitahuan.",
    copyLink: "Salin tautan", linkCopied: "Tautan drop disalin.",
    detailBtn: "Rincian", detailHide: "Tutup rincian",
    detailContract: "Alamat kontrak drop", detailConvoy: "Kontrak Convoy tujuan sinyal",
    detailWindow: "Jendela drop", detailSamples: "Bacaan terminting sesi ini",
    detailExplorer: "Lihat di penjelajah blok",
    sparkCap: "Riwayat terminting selama halaman ini terbuka",
    sparkAria: "Riwayat terminting: dari {a} menjadi {b} selama halaman ini terbuka",
    sparkScale: "Garis digambar dari bacaan sesi ini saja. Skalanya menyesuaikan nilai terkecil dan terbesar pada sesi ini, jadi bacalah arahnya, bukan kemiringannya.",
    boardLimitNote: "Menampilkan {n} drop terbaru dari {total} drop terdaftar.",
    testHiddenNote: "{n} data uji kalibrasi disembunyikan oleh sakelar di atas.",
    cdOpens: "Buka dalam {t}", cdCloses: "Tutup dalam {t}",
    notOpenWhy: "Drop ini belum buka. Kamu tetap bisa antre dari sekarang: sinyalmu tercatat sebagai niat sebelum jendelanya terbuka.",
    rowContract: "Kontrak tujuan",
  },
  en: {
    connect: "Connect Wallet", disconnect: "Disconnect", switchChain: "Switch to BNB Chain",
    headline: "Drop queues, counted in real people.",
    lede: "Convoy counts who actually intends to join Agent ID gated drops. Only Agent ID holders can signal, one name one signal, so the queue number is a count of real people that cannot be inflated by duplicate wallets.",
    deployNote: "Status: the ConvoySignal contract is not deployed on BNB Chain mainnet yet. This page explains the product; no signal can be given on mainnet and no number is shown as data.",
    testnetNote: "Testnet: this page uses the Convoy test deployment on BSC Testnet (chain 97) with a mock Agent ID registry. Queue numbers and signals in this mode are real on testnet, and the signal buttons send real testnet transactions from your wallet.",
    ctaBoard: "See the drop radar", ctaMine: "My queue",
    step1T: "A drop is listed on the board",
    step1B: "An Agent ID gated project registers its drop contract, or a hunter who found it first does.",
    step2T: "Holders signal",
    step2B: "One light call with no funds and no approval. The contract rejects anyone who does not hold an Agent ID.",
    step3T: "Queue and burn become readable",
    step3B: "Everyone sees how many real people are queueing and how fast the project quota burns, straight from the contracts.",
    switchChainTn: "Switch to BSC Testnet", onChainTn: "BSC Testnet", onChain: "BNB Chain",
    boardTitle: "Drop radar", refresh: "Refresh", hideTestData: "Hide test data",
    themeDark: "Dark", themeLight: "Light", themeCurrent: "Current theme: {mode}. Switch theme",
    testDataBadge: "CALIBRATION TEST DATA", nextUp: "Next up",
    boardHint: "The signal count is Agent ID holder intent. The minted count is what actually happened, read from the project contract. The two are always shown separately.",
    boardLoadingTitle: "The board is being read.",
    boardLoading: "Reading the queue board from the contract...",
    boardErrorTitle: "The board could not be read.",
    boardErrorBody: "The contract read failed. Old numbers are not shown as fresh data. Try again in a moment.",
    boardEmptyTitle: "No drops registered yet.",
    boardEmptyBody: "Once an Agent ID gated project registers its drop in the Convoy contract, its queue appears here.",
    notDeployedTitle: "The mainnet board is not live yet.",
    notDeployedBody: "The ConvoySignal contract is not deployed on BNB Chain mainnet yet, so there is no queue to show. This page's testnet mode shows the fully working board.",
    chipAll: "All", chipOpen: "Open", chipUpcoming: "Not open yet", chipClosed: "Closed",
    showing: "Showing {x} of {y} drops",
    filterNoneTitle: "No drops under this filter.",
    filterNoneBody: "Loosen the filter to see other drops on the board.",
    mineTitle: "My queue",
    mineEmptyTitle: "Connect your wallet to see your queue.",
    mineEmptyBody: "After connecting, this panel shows which drops you have signaled and your remaining free quota by name, when the project contract offers that read.",
    mineNoneTitle: "You have not signaled any drop yet.",
    mineNoneBody: "Press Join the queue on a drop card to record your first signal. A signal can always be withdrawn.",
    meaningTitle: "What do the numbers on this board mean?",
    meaningBody: "A signal is a statement of intent from an Agent ID holder, not a guarantee that they will mint and not a promise of any result. The minted count is read from the project contract itself; a project whose counter cannot be verified is marked no public reading, never guessed. Convoy is not a safety rating: a long queue does not mean a drop contract is safe.",
    footContract: "Signal contract:", footRegistry: "Agent ID registry:",
    footPrivacy: "Convoy does not record wallet addresses for analytics.",
    notDeployedFooter: "not deployed on mainnet yet",
    testnetFooterSuffix: " (BSC Testnet, mock registry ",
    sheetTitle: "Check before you sign",
    sheetNote: "A signal moves no funds at all. You only pay the network fee to record your signal.",
    cancel: "Cancel", confirmSignal: "Send via wallet", confirmWithdraw: "Withdraw via wallet",
    notDeployed: "The Convoy contract is not deployed on this network. This summary is a preview; no transaction was sent.",
    needWallet: "Connect your wallet first to continue.",
    noProvider: "No wallet was detected in this browser. Open this page in a wallet browser or install an EIP-1193 wallet.",
    wrongNetwork: "Your wallet is on another network. Convoy only runs on the chain this page is showing.",
    connectedAs: "Connected:",
    zoneSignal: "Queue signals", zoneSignalNote: "Agent ID holders stating intent",
    zoneMinted: "Already minted", zoneMintedNote: "what actually happened, from the project contract",
    notRecorded: "No public reading",
    notRecordedWhy: "This contract does not publish a minted count, so Convoy does not display one. This is not a zero.",
    quotaLeft: "Your remaining free quota",
    quotaNotRecorded: "No public reading for per-address quota. This contract does not publish a remaining per-address quota, so Convoy does not display one.",
    quotaOf: "of the total quota",
    srcLabel: "Source:",
    srcDual: "two RPCs agree",
    srcConflict: "two RPCs disagree",
    srcSingle: "single source",
    srcWallet: "via wallet",
    staleTag: "Stale",
    unverified: "Not verified",
    unverifiedWhy: "Two independent reads at the same block returned different numbers, so this number is hidden until the reads agree.",
    burnWindow: "Sample window: {n} reads over {w}",
    quotaSrc: "Source: {fns} · read {when}",
    burnRate: "Burn rate",
    burnPerMin: "mints per minute",
    burnLoading: "Cannot be calculated yet: the first counter reading has not finished.",
    burnNoPublic: "Cannot be calculated: there is no public reading for the minted count.",
    burnUnverified: "Cannot be calculated: two independent readings disagree, so the number is hidden.",
    burnNoSample: "Cannot be calculated yet: no minted reading has been recorded.",
    burnOneSample: "Cannot be calculated yet: only one reading is recorded, waiting for a second reading.",
    burnShortWindow: "Cannot be calculated yet: the two readings are too close together, waiting for a minimum 15 second sample window.",
    burnWarming: "Cannot be calculated yet: the samples are not sufficient.",
    burnStill: "Burn rate 0 mints per minute in this sample window. A run-out estimate cannot be calculated because no new mint has been recorded.",
    burnDone: "This project quota reads as fully used from its contract, so no run-out estimate needs to be calculated.",
    eta: "Estimated to run out",
    etaRange: "about {a} to {b}",
    etaSingle: "about {a}",
    stOpen: "Open", stUpcoming: "Not open yet", stClosed: "Closed", stUnknown: "Time not announced",
    opensAt: "Opens", closesAt: "Closes",
    dropContract: "Drop contract",
    registrar: "Registered by",
    signalBtn: "Join the queue", withdrawBtn: "Withdraw signal",
    youSignaled: "You are already queueing for this drop.",
    notQueued: "Not queueing",
    holderOnly: "Only Agent ID holders can signal. Your wallet does not hold an Agent ID in this registry.",
    connectFirst: "Connect your wallet to signal.",
    wrongChainWhy: "Switch networks first so your signal lands on the right chain.",
    copied: "Full address copied.", copy: "Copy",
    rowDrop: "Drop", rowEffect: "What happens",
    signalEffect: "A queue signal in your name is recorded in the Convoy contract for this drop. A signal is a statement of intent, not a guarantee of a mint, and you can withdraw it at any time.",
    withdrawEffect: "Your queue signal on this drop is removed from the Convoy contract. You can signal again later.",
    gasFee: "Estimated network fee",
    checking: "Checking this transaction against the contract first...",
    waitSign: "Waiting for your signature in your wallet...",
    processing: "Transaction sent. Waiting for network confirmation...",
    viewTx: "View in explorer",
    successSignal: "Your signal is recorded. You are officially queueing for this drop.",
    successWithdraw: "Your signal has been withdrawn from this drop.",
    errRejected: "You cancelled the signature in your wallet. No transaction was sent.",
    errFunds: "Your wallet balance is not enough for this transaction's network fee.",
    errSimGeneric: "The contract rejected this transaction in the pre-check, so it was not sent. No funds moved.",
    errNotHolder: "Your wallet does not hold an Agent ID, so it cannot signal. Signals are only open to Agent ID holders.",
    errAlreadySignaled: "You already signaled this drop. One holder has only one active signal per drop.",
    errNotSignaled: "You have no active signal on this drop, so there is nothing to withdraw.",
    errDropNotFound: "This drop was not found in the Convoy contract.",
    errTxFailed: "The transaction failed on-chain. Check the tx in the explorer for details.",
    errSlow: "The transaction is not confirmed after 90 seconds. Check it in the explorer before trying again.",
    asOf: "Data as of block {block} · read {when}",
    asOfStale: "The fresh read failed; showing data as of block {block} · read {when}",
    featuredCaption: "The drop with the longest queue right now, read directly from the ConvoySignal testnet contract.",
    queuePeople: "real people queueing",
    relIn: "in", relAgo: "ago",
    fbTitle: "Send feedback",
    fbBody: "Something confusing, a number that looks wrong, or a button that does nothing? Tell us here. Your feedback helps fix Convoy for every hunter.",
    fbOpen: "Write feedback",
    fbPublic: "Feedback is sent as a public issue in the Convoy GitHub repo: anyone can read it. Never write a private key, recovery phrase, password, or any personal data in your feedback.",
    fbCategory: "Category",
    fbCatConfusing: "Confusing", fbCatWrongNumber: "Wrong number", fbCatButton: "Button does not work", fbCatSuggestion: "Suggestion", fbCatOther: "Other",
    fbDrop: "About which drop", fbDropGeneral: "General, not about a specific drop",
    fbMessage: "Your feedback",
    fbMessagePh: "Tell us what you saw, what you expected, and where it happened.",
    fbContextTitle: "Context sent along, open for you to check",
    fbContextLine: "Network: {net} · Page version: {ver} · Language: {lang}",
    fbContextDrop: "Drop: {label} ({addr})",
    fbContextNoDrop: "Drop: general",
    fbCopy: "Copy feedback text",
    fbSend: "Open issue on GitHub",
    fbNeedMessage: "Write your feedback first, one sentence is enough.",
    fbCopied: "Feedback text copied. Paste it anywhere you like, for example a Convoy GitHub issue.",
    fbOpened: "The issue draft opened in a new tab. Check its content on GitHub, then press the submit button there to publish it.",
    fbIssueCat: "Category", fbIssueTime: "Time", fbIssuePrefix: "Feedback",
    fbNetTestnet: "BSC Testnet (97)", fbNetMainnet: "BNB Chain mainnet (56)",
    navRadar: "Radar", navQueue: "Queue", navHow: "How it works", navFeedback: "Feedback",
    howTitle: "How it works",
    chipWatched: "Watched",
    watchBtn: "Watch", watchedBtn: "Watched",
    watchNote: "You are watching this drop. The watchlist is stored on this device only; it is not a notification.",
    copyLink: "Copy link", linkCopied: "Drop link copied.",
    detailBtn: "Details", detailHide: "Hide details",
    detailContract: "Drop contract address", detailConvoy: "Convoy contract, the signal target",
    detailWindow: "Drop window", detailSamples: "Minted readings this session",
    detailExplorer: "View in block explorer",
    sparkCap: "Minted history while this page is open",
    sparkAria: "Minted history: from {a} to {b} while this page is open",
    sparkScale: "The line is drawn from this session's readings only. Its scale fits the smallest and largest values of this session, so read its direction, not its steepness.",
    boardLimitNote: "Showing the {n} most recent drops of {total} registered drops.",
    testHiddenNote: "{n} calibration test drops are hidden by the switch above.",
    cdOpens: "Opens in {t}", cdCloses: "Closes in {t}",
    notOpenWhy: "This drop has not opened yet. You can still queue from now: your signal is recorded as intent before its window opens.",
    rowContract: "Target contract",
  },
};

let lang = "id";
let account = null;
let chainOk = false;
let provider = null;
let providerWired = false;
const fbState = { open: false };

const $ = (id) => document.getElementById(id);

function t(key) {
  return STRINGS[lang][key] || STRINGS.id[key] || key;
}

function updateThemeButton() {
  const cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  const icon = $("theme-icon");
  const label = $("theme-label");
  const btn = $("theme-toggle");
  if (icon) icon.textContent = cur === "dark" ? "☾" : "☀";
  if (label) label.textContent = cur === "dark" ? t("themeDark") : t("themeLight");
  if (btn) btn.setAttribute("aria-label", t("themeCurrent").replace("{mode}", cur === "dark" ? t("themeDark") : t("themeLight")));
}

function applyLang(next) {
  lang = next;
  document.documentElement.lang = next;
  updateThemeButton();
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.getAttribute("data-i18n"));
  }
  $("lang-id").classList.toggle("is-on", next === "id");
  $("lang-en").classList.toggle("is-on", next === "en");
  if (CONFIG.isTestnet) {
    $("deploy-note").textContent = t("testnetNote");
    const badge = $("network-badge");
    if (badge) badge.hidden = false;
  }
  renderWalletBar();
  renderFeatured();
  renderBoard();
  renderMine();
  updateFooter();
  const fbTa = $("fb-message");
  if (fbTa) fbTa.placeholder = t("fbMessagePh");
  if (fbState.open) {
    buildFeedbackDropOptions(true);
    updateFeedbackContext();
  }
}

/* ------------------------------------------------------------------ */
/* Keccak-256 (pure JS, BigInt lanes) + minimal ABI codec.            */
/* Verified against reference vectors and the deployed contract ABI   */
/* in the QA harness; the page itself keeps zero runtime dependencies. */
/* ------------------------------------------------------------------ */

const MASK64 = (1n << 64n) - 1n;
const KECCAK_RC = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];
// Rotation offsets indexed [x][y] for the lane at (x, y).
const KECCAK_ROT = [
  [0, 36, 3, 41, 18],
  [1, 44, 10, 45, 2],
  [62, 6, 43, 15, 61],
  [28, 55, 25, 21, 56],
  [27, 20, 39, 8, 14],
];

function rotl64(v, n) {
  if (n === 0) return v;
  const b = BigInt(n);
  return ((v << b) | (v >> (64n - b))) & MASK64;
}

function keccakF1600(s) {
  const C = new Array(5);
  const D = new Array(5);
  const B = new Array(25);
  for (let round = 0; round < 24; round++) {
    for (let x = 0; x < 5; x++) C[x] = s[x] ^ s[x + 5] ^ s[x + 10] ^ s[x + 15] ^ s[x + 20];
    for (let x = 0; x < 5; x++) D[x] = C[(x + 4) % 5] ^ rotl64(C[(x + 1) % 5], 1);
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) s[x + 5 * y] ^= D[x];
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        B[y + 5 * ((2 * x + 3 * y) % 5)] = rotl64(s[x + 5 * y], KECCAK_ROT[x][y]);
      }
    }
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        s[x + 5 * y] = B[x + 5 * y] ^ (~B[((x + 1) % 5) + 5 * y] & B[((x + 2) % 5) + 5 * y]);
      }
    }
    s[0] ^= KECCAK_RC[round];
  }
}

function keccak256(bytes) {
  const RATE = 136; // Keccak-256: rate 1088 bits, capacity 512 bits
  const s = new Array(25).fill(0n);
  const padded = Array.from(bytes);
  padded.push(0x01); // original Keccak pad10*1 domain byte (not SHA3's 0x06)
  while (padded.length % RATE !== 0) padded.push(0);
  // pad10*1: the last byte of the final block carries the 0x80 bit. When
  // the domain byte itself lands on that last byte (input length one
  // short of a rate multiple) the two merge into 0x81 in the same block;
  // an earlier version of this code wrongly opened a new block there and
  // hashed every input of length 135 mod 136 incorrectly.
  padded[padded.length - 1] |= 0x80;
  for (let off = 0; off < padded.length; off += RATE) {
    for (let i = 0; i < RATE; i++) {
      const lane = Math.floor(i / 8);
      s[lane] ^= BigInt(padded[off + i]) << BigInt(8 * (i % 8));
    }
    keccakF1600(s);
  }
  const out = [];
  for (let i = 0; i < 32; i++) {
    out.push(Number((s[Math.floor(i / 8)] >> BigInt(8 * (i % 8))) & 0xffn));
  }
  return out;
}

function utf8Bytes(str) {
  return Array.from(new TextEncoder().encode(str));
}

function bytesToHex(bytes) {
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function keccak256Hex(str) {
  return bytesToHex(keccak256(utf8Bytes(str)));
}

function selectorOf(sig) {
  return "0x" + keccak256Hex(sig).slice(0, 8);
}

/* --- ABI encoding: uint256/uint64, address, bool, string --- */

function wordHex(v) {
  return BigInt(v).toString(16).padStart(64, "0");
}

function encValue(type, value) {
  if (type === "uint256" || type === "uint64") return { dyn: false, hex: wordHex(value) };
  if (type === "address") return { dyn: false, hex: "0".repeat(24) + String(value).slice(2).toLowerCase() };
  if (type === "bool") return { dyn: false, hex: wordHex(value ? 1n : 0n) };
  if (type === "string") {
    const b = utf8Bytes(value);
    const data = bytesToHex(b).padEnd(Math.ceil(b.length / 32) * 64, "0");
    return { dyn: true, hex: wordHex(BigInt(b.length)) + data };
  }
  throw new Error("unsupported ABI type " + type);
}

function encodeCall(sig, types, values) {
  const parts = types.map((ty, i) => encValue(ty, values[i]));
  let head = "";
  let tail = "";
  let offset = types.length * 32;
  for (const p of parts) {
    if (p.dyn) {
      head += wordHex(BigInt(offset));
      tail += p.hex;
      offset += p.hex.length / 2;
    } else {
      head += p.hex;
    }
  }
  return selectorOf(sig) + head + tail;
}

/* --- ABI decoding helpers --- */

function hexToBytes(hex) {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = [];
  for (let i = 0; i < h.length; i += 2) out.push(parseInt(h.slice(i, i + 2), 16));
  return out;
}

function wordAt(hex, idx) {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  return h.slice(idx * 64, idx * 64 + 64);
}

function decUintWord(w) {
  return BigInt("0x" + w);
}

function decAddrWord(w) {
  return "0x" + w.slice(24).toLowerCase();
}

function decStringAt(hex, byteOffset) {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const len = Number(decUintWord(h.slice(byteOffset * 2, byteOffset * 2 + 64)));
  const dataHex = h.slice(byteOffset * 2 + 64, byteOffset * 2 + 64 + len * 2);
  return new TextDecoder().decode(Uint8Array.from(hexToBytes(dataHex)));
}

/* getDrop returns seven values at the top level (not a wrapped tuple):
 * dropContract, opensAt, closesAt, label (offset), registrar,
 * signalCount, exists. The string offset is relative to the start of
 * the return data. */
function decodeDrop(hex) {
  return {
    dropContract: decAddrWord(wordAt(hex, 0)),
    opensAt: Number(decUintWord(wordAt(hex, 1))),
    closesAt: Number(decUintWord(wordAt(hex, 2))),
    label: decStringAt(hex, Number(decUintWord(wordAt(hex, 3)))),
    registrar: decAddrWord(wordAt(hex, 4)),
    signalCount: decUintWord(wordAt(hex, 5)),
    exists: decUintWord(wordAt(hex, 6)) !== 0n,
  };
}

/* Contract error signatures -> plain-words dictionary keys. */
const ERROR_KEYS = {};
for (const [sig, key] of [
  ["NotAgentIDHolder(address)", "errNotHolder"],
  ["AlreadySignaled(uint256,address)", "errAlreadySignaled"],
  ["NotSignaled(uint256,address)", "errNotSignaled"],
  ["DropNotFound(uint256)", "errDropNotFound"],
  ["InvalidRegistry()", "errSimGeneric"],
  ["InvalidDropContract()", "errSimGeneric"],
  ["InvalidWindow()", "errSimGeneric"],
]) {
  ERROR_KEYS[selectorOf(sig)] = key;
}

function extractRevertHex(e) {
  const seen = [e && e.data, e && e.error && e.error.data, e && e.info && e.info.error && e.info.error.data];
  for (const v of seen) {
    if (typeof v === "string" && v.startsWith("0x") && v.length >= 10) return v;
    if (v && typeof v === "object" && typeof v.originalError === "object") {
      const inner = v.originalError && v.originalError.data;
      if (typeof inner === "string" && inner.startsWith("0x")) return inner;
    }
  }
  return null;
}

function plainError(e, fallbackKey) {
  if (e && e.code === 4001) return t("errRejected");
  const msg = (e && e.message) || "";
  if (/insufficient funds/i.test(msg)) return t("errFunds");
  const hex = extractRevertHex(e);
  if (hex) {
    const sel = hex.slice(0, 10).toLowerCase();
    if (ERROR_KEYS[sel]) return t(ERROR_KEYS[sel]);
    if (sel === "0x08c379a0") {
      return t(fallbackKey || "errSimGeneric");
    }
  }
  return t(fallbackKey || "errSimGeneric");
}

/* ------------------------------------------------------------------ */
/* Provider layer: EIP-6963 discovery, injected fallback (Gate 8).    */
/* ------------------------------------------------------------------ */

const announcedProviders = [];
window.addEventListener("eip6963:announceProvider", (ev) => {
  if (ev.detail && ev.detail.provider) {
    announcedProviders.push(ev.detail);
    pickProvider();
  }
});

function pickProvider() {
  if (provider) return provider;
  if (announcedProviders.length > 0) provider = announcedProviders[0].provider;
  else if (window.ethereum) provider = window.ethereum;
  if (provider && !providerWired) {
    providerWired = true;
    provider.on("accountsChanged", (accs) => {
      account = accs && accs[0] ? accs[0] : null;
      // An open confirmation sheet was simulated and worded for the
      // previous account; never let it be signed by a different one.
      closeSheet();
      renderWalletBar();
      refreshBoard();
    });
    provider.on("chainChanged", () => {
      closeSheet();
      refreshChain();
      refreshBoard();
    });
  }
  return provider;
}

async function ensureProvider() {
  pickProvider();
  if (provider) return provider;
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise((r) => setTimeout(r, 300));
  return pickProvider();
}

async function rpc(method, params) {
  const p = await ensureProvider();
  if (!p) throw new Error("no provider");
  return p.request({ method, params });
}

function truncateAddress(addr) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function renderWalletBar() {
  const bar = $("wallet-bar");
  const btn = $("connect-btn");
  if (!account) {
    bar.hidden = true;
    btn.textContent = t("connect");
    btn.disabled = false;
    return;
  }
  bar.hidden = false;
  btn.textContent = truncateAddress(account);
  const state = $("wallet-state");
  const chainName = CONFIG.isTestnet ? t("onChainTn") : t("onChain");
  state.textContent =
    t("connectedAs") + " " + truncateAddress(account) + " · " + (chainOk ? chainName : t("wrongNetwork"));
  state.title = account;
  const switchBtn = $("switch-chain-btn");
  switchBtn.textContent = CONFIG.isTestnet ? t("switchChainTn") : t("switchChain");
  switchBtn.hidden = chainOk;
}

async function refreshChain() {
  try {
    const id = await rpc("eth_chainId");
    chainOk = id === CONFIG.chainIdHex;
  } catch (e) {
    chainOk = false;
  }
  renderWalletBar();
}

async function connect() {
  const p = await ensureProvider();
  if (!p) {
    const msg = $("board-msg");
    msg.textContent = t("noProvider");
    msg.classList.add("is-error");
    return;
  }
  const btn = $("connect-btn");
  btn.disabled = true;
  try {
    const accounts = await p.request({ method: "eth_requestAccounts" });
    account = accounts && accounts[0] ? accounts[0] : null;
    await refreshChain();
    refreshBoard();
  } catch (e) {
    btn.disabled = false;
  }
  renderWalletBar();
}

async function switchChain() {
  try {
    await rpc("wallet_switchEthereumChain", [{ chainId: CONFIG.chainIdHex }]);
  } catch (e) {
    if (e && e.code === 4902) {
      await rpc("wallet_addEthereumChain", [CONFIG.chainProfile]);
      await rpc("wallet_switchEthereumChain", [{ chainId: CONFIG.chainIdHex }]);
    }
  }
  await refreshChain();
}

function disconnect() {
  account = null;
  renderWalletBar();
  renderMine();
  renderBoard();
}

/* ------------------------------------------------------------------ */
/* Amounts, dates.                                                    */
/* ------------------------------------------------------------------ */

function formatBnb(wei) {
  const s = wei.toString().padStart(19, "0");
  const whole = s.slice(0, -18);
  const frac = s.slice(-18).replace(/0+$/, "");
  return frac ? whole + "." + frac : whole;
}

/* Display-only rounding for estimated fees: rounds half-up to 6
 * decimals so an estimate never renders as a 12+ decimal string. The
 * signed value is never touched by this formatter. */
function formatBnbRounded(wei) {
  const STEP = 10n ** 12n;
  const rounded = ((wei + STEP / 2n) / STEP) * STEP;
  if (rounded === 0n && wei > 0n) return "<0.000001";
  return formatBnb(rounded);
}

function currencyUnit() {
  return CONFIG.isTestnet ? "tBNB" : "BNB";
}

function formatDateTime(unixSeconds) {
  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(Number(unixSeconds) * 1000));
}

function formatRelative(unixSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(unixSeconds) - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(lang === "id" ? "id-ID" : "en-GB", { numeric: "auto" });
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

function formatDuration(minutes) {
  if (!isFinite(minutes)) return "∞";
  if (minutes < 1) return "<1 " + (lang === "id" ? "menit" : "min");
  if (minutes < 60) return Math.round(minutes) + " " + (lang === "id" ? "menit" : "min");
  if (minutes < 1440) return (Math.round(minutes / 6) / 10) + " " + (lang === "id" ? "jam" : "h");
  return (Math.round(minutes / 144) / 10) + " " + (lang === "id" ? "hari" : "d");
}

/* ------------------------------------------------------------------ */
/* Read layer (Gate 9 transport): through the wallet provider when    */
/* one is connected, else public JSON-RPC with endpoint fallback.     */
/* Bounded concurrency, successes only, raw errors never rendered.    */
/* ------------------------------------------------------------------ */

/* One JSON-RPC call against one specific endpoint. Throws on
 * transport failure and on a JSON-RPC error answer alike; callers
 * that treat reverts as data use tryCallWith, which catches. */
async function fetchRpcAt(url, method, params) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await res.json();
  if (body && body.error) {
    const e = new Error(body.error.message || "rpc error");
    e.data = body.error.data;
    e.code = body.error.code;
    throw e;
  }
  return body.result;
}

async function fetchRpc(method, params) {
  let lastErr = null;
  for (const url of CONFIG.readRpcs) {
    try {
      return await fetchRpcAt(url, method, params);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("rpc failed");
}

async function readRpc(method, params) {
  if (provider) {
    try {
      return await provider.request({ method, params });
    } catch (e) {
      // A connected-but-broken provider must not blank the board when
      // public reads can still answer.
      if (method === "eth_sendTransaction") throw e;
      return fetchRpc(method, params);
    }
  }
  return fetchRpc(method, params);
}

async function callView(to, sig, types, values) {
  const data = encodeCall(sig, types, values);
  return readRpc("eth_call", [{ to, data }, "latest"]);
}

/* A counter read that treats reverts and empty answers as "the
 * contract does not offer this read", never as zero. */
async function tryCallUint(to, sig, types, values) {
  try {
    const hex = await callView(to, sig, types, values);
    if (!hex || hex === "0x" || hex.length < 66) return null;
    return decUintWord(wordAt(hex, 0));
  } catch (e) {
    return null;
  }
}

/* The same read against an explicit transport: callFn(to, data)
 * resolves to the eth_call result hex or throws. Used by the Stage 3
 * adapter probe so the exact same probe can run against two RPC
 * endpoints at one pinned block, or against the wallet provider. */
async function tryCallWith(callFn, to, sig, types, values) {
  try {
    const hex = await callFn(to, encodeCall(sig, types, values));
    if (!hex || hex === "0x" || hex.length < 66) return null;
    return decUintWord(wordAt(hex, 0));
  } catch (e) {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Convoy reads: drops, counters, quota, my status.                   */
/* ------------------------------------------------------------------ */

async function readDropCount() {
  const hex = await callView(CONFIG.convoyAddress, "dropCount()", [], []);
  return Number(decUintWord(wordAt(hex, 0)));
}

async function readDrop(id) {
  const hex = await callView(CONFIG.convoyAddress, "getDrop(uint256)", ["uint256"], [BigInt(id)]);
  return decodeDrop(hex);
}

async function readHasSignaled(id, addr) {
  const hex = await callView(CONFIG.convoyAddress, "hasSignaled(uint256,address)", ["uint256", "address"], [BigInt(id), addr]);
  return decUintWord(wordAt(hex, 0)) !== 0n;
}

async function readIsHolder(addr) {
  const v = await tryCallUint(CONFIG.agentIdRegistry, "balanceOf(address)", ["address"], [addr]);
  return v !== null && v > 0n;
}

/* ------------------------------------------------------------------ */
/* Stage 3 counter adapters (docs/DATA-CALIBRATION.md). The probe    */
/* below is the canonical spec, mirrored by the calibration harness  */
/* that proved it against mock contracts with known ground truth:    */
/*                                                                   */
/* 1. Kuota pattern: quotaOf(address) AND mintedBy(address) both     */
/*    answer. Global minted from totalMinted(), else totalSupply();  */
/*    cap from maxSupply(), else MAX_SUPPLY(), else cap().           */
/* 2. Suplai pattern: totalSupply() answers and the kuota branch     */
/*    did not. Cap from the same candidate list.                     */
/* 3. None: neither branch answers; the number is not recorded.      */
/*                                                                   */
/* A probe where no candidate answers is the genuine "none" pattern, */
/* not a transport failure: callers establish transport health       */
/* separately (a block-number read per endpoint, a provider health   */
/* check), so a silent contract can be told apart from a dead RPC.   */
/* ------------------------------------------------------------------ */

const CAP_SIGS = ["maxSupply()", "MAX_SUPPLY()", "cap()"];

async function probeCounter(callFn, dropContract, probeAddr) {
  const call = (sig, types, values) => tryCallWith(callFn, dropContract, sig, types, values);
  const quota = await call("quotaOf(address)", ["address"], [probeAddr]);
  const used = quota !== null ? await call("mintedBy(address)", ["address"], [probeAddr]) : null;
  if (quota !== null && used !== null) {
    let minted = await call("totalMinted()", [], []);
    let mintedFn = "totalMinted()";
    if (minted === null) {
      minted = await call("totalSupply()", [], []);
      mintedFn = "totalSupply()";
    }
    let cap = null;
    let capFn = null;
    for (const sig of CAP_SIGS) {
      cap = await call(sig, [], []);
      if (cap !== null) { capFn = sig; break; }
    }
    return { pattern: "kuota", minted, mintedFn: minted !== null ? mintedFn : null, cap, capFn };
  }
  const ts = await call("totalSupply()", [], []);
  if (ts !== null) {
    let cap = null;
    let capFn = null;
    for (const sig of CAP_SIGS) {
      cap = await call(sig, [], []);
      if (cap !== null) { capFn = sig; break; }
    }
    return { pattern: "suplai", minted: ts, mintedFn: "totalSupply()", cap, capFn };
  }
  return { pattern: "none", minted: null, mintedFn: null, cap: null, capFn: null };
}

function finishCounter(res, meta) {
  const base = {
    pattern: res.pattern,
    mintedFn: res.mintedFn,
    capFn: res.capFn,
    block: meta.block,
    readAt: Date.now(),
    source: meta.source,
    verified: meta.verified,
  };
  if (res.pattern === "none" || res.minted === null) {
    return Object.assign(base, { status: "missing", minted: null, cap: null });
  }
  return Object.assign(base, { status: "ok", minted: res.minted, cap: res.cap });
}

function sameCounter(a, b) {
  return a.pattern === b.pattern && a.minted === b.minted && a.cap === b.cap;
}

/* Read one drop contract's counter under the Stage 3 rules.
 * Returns a counter object, or null when every transport failed, in
 * which case the caller keeps the previous reading (which then ages
 * into its stale label instead of being replaced by a guess). */
async function readCounter(dropContract) {
  const probeAddr = account || CONFIG.convoyAddress;
  if (provider) {
    const callFn = async (to, data) => provider.request({ method: "eth_call", params: [{ to, data }, "latest"] });
    const res = await probeCounter(callFn, dropContract, probeAddr);
    if (res.pattern === "none") {
      // A silent contract and a dead provider look alike from here;
      // one health read tells them apart.
      try {
        await provider.request({ method: "eth_blockNumber", params: [] });
      } catch (e) {
        return null;
      }
    }
    let block = null;
    try {
      block = Number(BigInt(await provider.request({ method: "eth_blockNumber", params: [] })));
    } catch (e) { /* the label simply omits the block */ }
    return finishCounter(res, { source: "wallet", verified: false, block });
  }
  const urlA = CONFIG.readRpcs[0];
  const urlB = CONFIG.readRpcs[1];
  let blockA = null;
  let blockB = null;
  try { blockA = Number(BigInt(await fetchRpcAt(urlA, "eth_blockNumber", []))); } catch (e) { /* endpoint down */ }
  try { blockB = Number(BigInt(await fetchRpcAt(urlB, "eth_blockNumber", []))); } catch (e) { /* endpoint down */ }
  if (blockA === null && blockB === null) return null;
  const pin = Math.min(blockA === null ? Infinity : blockA, blockB === null ? Infinity : blockB);
  const pinHex = "0x" + pin.toString(16);
  const mkCall = (url) => async (to, data) => fetchRpcAt(url, "eth_call", [{ to, data }, pinHex]);
  let resA = null;
  let resB = null;
  if (blockA !== null) resA = await probeCounter(mkCall(urlA), dropContract, probeAddr);
  if (blockB !== null) resB = await probeCounter(mkCall(urlB), dropContract, probeAddr);
  if (resA && resB) {
    if (sameCounter(resA, resB)) {
      return finishCounter(resA, { source: "dual", verified: true, block: pin });
    }
    return {
      status: "unverified", pattern: resA.pattern, mintedFn: resA.mintedFn, capFn: resA.capFn,
      minted: null, cap: null, block: pin, readAt: Date.now(), source: "dual", verified: false,
    };
  }
  const single = resA || resB;
  if (!single) return null;
  return finishCounter(single, { source: "single", verified: false, block: pin });
}

/* Per-address free quota, pattern-aware (Stage 3): on a kuota
 * pattern contract the quota is quotaOf minus mintedBy (freeMinted
 * as the usage fallback); elsewhere a direct remaining read is tried
 * (freeRemaining, remainingFree, freeQuotaLeft). Anything else stays
 * not recorded. The result carries its source functions and read
 * time so the panel can label them like the counters. */
async function readQuota(dropContract, addr, pattern) {
  const readAt = Date.now();
  const source = provider ? "wallet" : "single";
  if (pattern === "kuota") {
    const total = await tryCallUint(dropContract, "quotaOf(address)", ["address"], [addr]);
    if (total !== null) {
      let used = await tryCallUint(dropContract, "mintedBy(address)", ["address"], [addr]);
      let usedFn = "mintedBy()";
      if (used === null) {
        used = await tryCallUint(dropContract, "freeMinted(address)", ["address"], [addr]);
        usedFn = "freeMinted()";
      }
      if (used !== null) {
        const remaining = total > used ? total - used : 0n;
        return { status: "ok", remaining, total, fns: "quotaOf() − " + usedFn, readAt, source };
      }
    }
  }
  const directSigs = ["freeRemaining(address)", "remainingFree(address)", "freeQuotaLeft(address)"];
  for (const sig of directSigs) {
    const v = await tryCallUint(dropContract, sig, ["address"], [addr]);
    if (v !== null) {
      return { status: "ok", remaining: v, total: null, fns: sig.split("(")[0] + "()", readAt, source };
    }
  }
  return { status: "missing", readAt, source };
}

/* ------------------------------------------------------------------ */
/* Board state and refresh.                                           */
/* ------------------------------------------------------------------ */

/* Stage 3 freshness rule: the board refreshes every 30 seconds, so
 * a counter reading older than 90 seconds has survived three missed
 * refresh cycles; beyond that it is labelled stale rather than
 * silently presented as current (docs/DATA-CALIBRATION.md). */
const FRESH_LIMIT_MS = 90000;
/* The burn rate needs two samples separated in time; under 15
 * seconds apart the window is too short to mean anything and the
 * panel keeps saying the rate is still warming up. */
const BURN_MIN_WINDOW_SEC = 15;

/* Page-layer curation for the Stage 3 calibration drops. The mock
 * contracts stay alive on testnet as calibration evidence; this list
 * only controls how their board cards are labelled and whether the
 * default board view hides them. It is not a contract power. */
const CALIBRATION_CONTRACTS = new Set([
  "0x3b55c0206bfaa200099f5ded31c714f538f19f92", // MockDropQuota Q1, drop 1
  "0xf85840609888c82eb4a6540eefd19d8dd79fe050", // MockDropSupply S1, drop 2
  "0x56bcb584034f0d15f32072434d3a9f3632786f52", // MockDropQuota Q2, drop 3
  "0x2331c588d6c1396c79e66786feac16a834f405f4", // MockDropQuota Q3, drop 4
  "0xf4ecb0d24e11218bF86deB2ceF2730696613159e".toLowerCase(), // MockDropSupply S2, calibration proof only
]);

function isCalibration(entry) {
  return !!entry && !!entry.drop && CALIBRATION_CONTRACTS.has(entry.drop.dropContract.toLowerCase());
}

/* Design v2 read bound (docs/FITUR-V2.md F-06, docs/KEAMANAN-V2.md
 * K-01): drop registration is open to anyone, so the board reads at
 * most this many most recent drops; the count line states the bound
 * honestly whenever it bites. */
const BOARD_READ_LIMIT = 200;

const board = {
  drops: [], // { id, drop, counter, samples: [{t, minted}], mySignal, quota, sig }
  block: null,
  readAt: null,
  stale: false,
  loaded: false,
  failed: false,
  isHolder: null,
  filter: "all",
  hideTestData: true,
  totalDrops: null,
};

/* Local watchlist (docs/FITUR-V2.md F-04): drop ids only, stored on
 * this device, validated back to non-negative integers on read. It
 * is a viewing aid, never a notification, and the card says so. */
const WATCH_KEY = "convoy-watch";
function loadWatch() {
  try {
    const raw = JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw.filter((x) => Number.isInteger(x) && x >= 0) : []);
  } catch (e) {
    return new Set();
  }
}
const watchSet = loadWatch();
function saveWatch() {
  try {
    localStorage.setItem(WATCH_KEY, JSON.stringify([...watchSet]));
  } catch (e) {
    /* storage unavailable: the watchlist lives for this view only */
  }
}
function toggleWatch(id) {
  if (watchSet.has(id)) watchSet.delete(id);
  else watchSet.add(id);
  saveWatch();
  renderBoard();
}

/* Expanded per-drop detail sections survive board re-renders. */
const openDetails = new Set();
/* The ?drop= deep link is honoured once per page load. */
let deepLinkDone = false;
/* Last rendered signal and minted values per drop, so a zone can
 * pulse once when its number actually changes (docs/DESAIN-V2.md). */
const prevNums = new Map();

let refreshInFlight = false;

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

function windowStatus(drop) {
  const now = Math.floor(Date.now() / 1000);
  if (drop.opensAt > 0 && now < drop.opensAt) return "upcoming";
  if (drop.closesAt > 0 && now > drop.closesAt) return "closed";
  if (drop.opensAt === 0 && drop.closesAt === 0) return "unknown";
  return "open";
}

function statusText(key) {
  return { open: t("stOpen"), upcoming: t("stUpcoming"), closed: t("stClosed"), unknown: t("stUnknown") }[key];
}

function visibleBoardDrops() {
  return board.drops.filter((entry) => !board.hideTestData || !isCalibration(entry));
}

function sortedBoardDrops(entries) {
  const rank = { upcoming: 0, open: 1, unknown: 2, closed: 3 };
  return [...entries].sort((a, b) => {
    const sa = windowStatus(a.drop);
    const sb = windowStatus(b.drop);
    if (rank[sa] !== rank[sb]) return rank[sa] - rank[sb];
    if (sa === "upcoming") return a.drop.opensAt - b.drop.opensAt;
    if (sa === "open") {
      const ca = a.drop.closesAt || Number.MAX_SAFE_INTEGER;
      const cb = b.drop.closesAt || Number.MAX_SAFE_INTEGER;
      if (ca !== cb) return ca - cb;
      return a.drop.opensAt - b.drop.opensAt;
    }
    if (sa === "closed") return b.drop.closesAt - a.drop.closesAt;
    return a.id - b.id;
  });
}

function nextUpcomingId(entries) {
  const upcoming = entries
    .filter((entry) => windowStatus(entry.drop) === "upcoming")
    .sort((a, b) => a.drop.opensAt - b.drop.opensAt);
  return upcoming.length ? upcoming[0].id : null;
}

function pushSample(entry) {
  if (!entry.counter || entry.counter.status !== "ok") return;
  const nowSec = Math.floor(Date.now() / 1000);
  const last = entry.samples[entry.samples.length - 1];
  if (last && last.minted === entry.counter.minted && nowSec - last.t < 25) return;
  entry.samples.push({ t: nowSec, minted: entry.counter.minted });
  if (entry.samples.length > 40) entry.samples.shift();
}

/* Burn math: rates from the samples collected while the page is open.
 * The ETA is a range between the fastest and slowest observed rate,
 * never a single invented instant. */
function burnInfo(entry) {
  const c = entry.counter;
  if (!c) return { kind: "loading" };
  if (c.status === "missing") return { kind: "nopublic" };
  if (c.status === "unverified") return { kind: "unverified" };
  if (c.status !== "ok") return { kind: "loading" };
  if (c.cap !== null && c.minted >= c.cap) return { kind: "done" };
  const s = entry.samples;
  if (s.length === 0) return { kind: "nosample" };
  if (s.length === 1) return { kind: "onesample" };
  const first = s[0];
  const last = s[s.length - 1];
  if (last.t - first.t < BURN_MIN_WINDOW_SEC) return { kind: "shortwindow" };
  const dtMin = (last.t - first.t) / 60;
  const dMint = Number(last.minted - first.minted);
  if (dtMin <= 0 || dMint <= 0) return { kind: "still" };
  const rateAll = dMint / dtMin;
  let rateShort = rateAll;
  if (s.length >= 3) {
    const prev = s[s.length - 2];
    const d2 = Number(last.minted - prev.minted);
    const dt2 = (last.t - prev.t) / 60;
    if (dt2 > 0 && d2 > 0) rateShort = d2 / dt2;
  }
  const rateMin = Math.min(rateAll, rateShort);
  const rateMax = Math.max(rateAll, rateShort);
  const out = { kind: "live", rateMin, rateMax, sampleCount: s.length, windowSec: last.t - first.t };
  if (c.cap !== null) {
    const remaining = Number(c.cap - c.minted);
    out.etaMin = remaining / rateMax;
    out.etaMax = remaining / rateMin;
  }
  return out;
}

async function refreshBoard() {
  if (refreshInFlight) return;
  if (!CONFIG.convoyAddress) {
    board.loaded = true;
    renderBoard();
    renderFeatured();
    renderMine();
    return;
  }
  refreshInFlight = true;
  try {
    const count = await readDropCount();
    board.totalDrops = count;
    const startId = Math.max(0, count - BOARD_READ_LIMIT);
    const ids = Array.from({ length: count - startId }, (_, i) => startId + i);
    const drops = await mapLimit(ids, 4, (id) => readDrop(id));
    const previous = new Map(board.drops.map((d) => [d.id, d]));
    const entries = drops.map((drop, i) => {
      const id = ids[i];
      const old = previous.get(id);
      return {
        id,
        drop,
        counter: old ? old.counter : null,
        samples: old ? old.samples : [],
        // Personal reads carry over like the counter does: on a slow
        // transport a finished read must persist (and age under its
        // stale label) instead of vanishing when the board rebuilds.
        mySignal: old ? old.mySignal : null,
        quota: old ? old.quota : null,
        sig: old ? old.sig : null,
      };
    });
    board.drops = entries;
    board.block = Number(BigInt(await readRpc("eth_blockNumber", [])));
    board.readAt = new Date();
    board.stale = false;
    board.failed = false;
    board.loaded = true;
    // Signal provenance for the source line under every queue number:
    // the base read is labelled by its transport, then the dual-RPC
    // pass below upgrades or disputes it (docs/KEAMANAN-V2.md K-03).
    for (const entry of entries) {
      if (!entry.sig) {
        entry.sig = { block: board.block, readAt: Date.now(), source: provider ? "wallet" : "single", verified: false, conflict: false };
      } else {
        entry.sig.block = board.block;
        entry.sig.readAt = Date.now();
        if (provider) {
          entry.sig.source = "wallet";
          entry.sig.verified = false;
          entry.sig.conflict = false;
        }
      }
    }
    renderFeatured();
    renderBoard();
    renderMine();
    // Counters, holder status and personal reads follow in the
    // background so the board paints its contract facts first.
    refreshEnrichment(entries);
    verifyBoardDual(entries);
  } catch (e) {
    if (board.loaded) board.stale = true;
    board.failed = !board.loaded;
    renderBoard();
    renderFeatured();
  } finally {
    refreshInFlight = false;
  }
}

/* Enrichment is fire-and-forget and can outlive the refresh cycle
 * that started it: the next cycle replaces board.drops with fresh
 * entry objects. Results must therefore be written to the LIVE
 * entry with the same id, resolved at write time; writing to the
 * captured object would land on a detached entry that no render
 * ever reads, and on a slow transport the later drops' reads would
 * never become visible at all (found in Stage 3 QA: the counter and
 * quota reads answered correctly on-chain while the panel kept
 * showing the previous cycle's empty state). */
function liveEntry(entry) {
  return board.drops.find((d) => d.id === entry.id) || entry;
}

async function refreshEnrichment(entries) {
  await mapLimit(entries, 3, async (entry) => {
    const counter = await readCounter(entry.drop.dropContract);
    const live = liveEntry(entry);
    // null means every transport failed: keep the previous reading
    // so it can age into its stale label instead of vanishing or
    // being replaced by a guess.
    if (counter !== null) live.counter = counter;
    pushSample(live);
    renderFeatured();
    renderBoard();
  });
  if (!account) {
    board.isHolder = null;
    renderBoard();
    renderMine();
    return;
  }
  board.isHolder = await readIsHolder(account);
  await mapLimit(entries, 3, async (entry) => {
    const live = liveEntry(entry);
    live.mySignal = await readHasSignaled(entry.id, account).catch(() => null);
    live.quota = await readQuota(entry.drop.dropContract, account, live.counter ? live.counter.pattern : null);
    renderBoard();
    renderMine();
  });
}

/* Dual-RPC verification of the board reads themselves (design v2,
 * docs/KEAMANAN-V2.md finding K-03, docs/FITUR-V2.md F-05). The
 * minted counters have had this protection since Stage 3, but the
 * product's headline number, the signal count, travelled on a single
 * first-success RPC. Without a wallet, every drop record is now read
 * again from both configured endpoints at one pinned block and
 * compared field by field: agreement upgrades the source line to
 * "two RPCs agree", disagreement hides the signal number behind the
 * not-verified state, and a single surviving endpoint stays labelled
 * single source. With a wallet connected the reads already travel
 * the user's own provider and are labelled via wallet. */
async function verifyBoardDual(entries) {
  if (provider || !CONFIG.convoyAddress) return;
  const urlA = CONFIG.readRpcs[0];
  const urlB = CONFIG.readRpcs[1];
  if (!urlA || !urlB || urlA === urlB) return;
  let blockA = null;
  let blockB = null;
  try { blockA = Number(BigInt(await fetchRpcAt(urlA, "eth_blockNumber", []))); } catch (e) { /* endpoint down */ }
  try { blockB = Number(BigInt(await fetchRpcAt(urlB, "eth_blockNumber", []))); } catch (e) { /* endpoint down */ }
  if (blockA === null && blockB === null) return;
  const pin = Math.min(blockA === null ? Infinity : blockA, blockB === null ? Infinity : blockB);
  const pinHex = "0x" + pin.toString(16);
  const readAt = Date.now();
  const getDropAt = async (url, id) => {
    const hex = await fetchRpcAt(url, "eth_call", [
      { to: CONFIG.convoyAddress, data: encodeCall("getDrop(uint256)", ["uint256"], [BigInt(id)]) },
      pinHex,
    ]);
    return decodeDrop(hex);
  };
  await mapLimit(entries, 3, async (entry) => {
    const live = liveEntry(entry);
    let dA = null;
    let dB = null;
    if (blockA !== null) dA = await getDropAt(urlA, entry.id).catch(() => null);
    if (blockB !== null) dB = await getDropAt(urlB, entry.id).catch(() => null);
    if (dA && dB) {
      const same =
        dA.dropContract === dB.dropContract &&
        dA.opensAt === dB.opensAt &&
        dA.closesAt === dB.closesAt &&
        dA.label === dB.label &&
        dA.registrar === dB.registrar &&
        dA.signalCount === dB.signalCount;
      live.sig = { block: pin, readAt, source: "dual", verified: same, conflict: !same };
      if (same) live.drop = dA;
    } else if (dA || dB) {
      live.sig = { block: pin, readAt, source: "single", verified: false, conflict: false };
      live.drop = dA || dB;
    }
  });
  renderFeatured();
  renderBoard();
}

/* ------------------------------------------------------------------ */
/* Rendering. Every chain-derived value enters via textContent.       */
/* ------------------------------------------------------------------ */

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}

function monoAddr(addr) {
  const s = el("span", "addr-mono", truncateAddress(addr));
  s.title = addr;
  return s;
}

function formatTimeOnly(ms) {
  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(new Date(ms));
}

function isStale(readAt) {
  return !!readAt && Date.now() - readAt > FRESH_LIMIT_MS;
}

function sourceTag(c) {
  if (c.status === "unverified") return t("srcConflict");
  if (c.source === "dual") return t("srcDual");
  if (c.source === "wallet") return t("srcWallet");
  return t("srcSingle");
}

/* The Stage 3 source line under a counter number: which function
 * answered, on which contract, at which block, read when, and how
 * the read was corroborated; prefixed with the stale tag when the
 * reading is older than the freshness limit. */
function counterSrcLine(entry, c, p) {
  const parts = [t("srcLabel")];
  if (c.mintedFn) parts.push(c.mintedFn);
  parts.push(truncateAddress(entry.drop.dropContract));
  if (c.block !== null && c.block !== undefined) {
    parts.push((lang === "id" ? "blok " : "block ") + Number(c.block).toLocaleString("id-ID"));
  }
  if (c.readAt) parts.push((lang === "id" ? "dibaca " : "read ") + formatTimeOnly(c.readAt));
  parts.push(sourceTag(c));
  const line = (isStale(c.readAt) ? t("staleTag") + " · " : "") + parts.join(" · ");
  return el("p", p + "-note", line);
}

/* The source line under a signal number, mirroring counterSrcLine:
 * the function that answered, the Convoy contract read, the block,
 * the read time, and how the read was corroborated (design v2,
 * K-03). Null while no provenance exists yet. */
function sigSrcLine(entry, p) {
  const sig = entry.sig;
  if (!sig) return null;
  const shim = { status: sig.conflict ? "unverified" : "ok", source: sig.source };
  const parts = [t("srcLabel"), "getDrop()", truncateAddress(CONFIG.convoyAddress)];
  if (sig.block !== null && sig.block !== undefined) {
    parts.push((lang === "id" ? "blok " : "block ") + Number(sig.block).toLocaleString("id-ID"));
  }
  if (sig.readAt) parts.push((lang === "id" ? "dibaca " : "read ") + formatTimeOnly(sig.readAt));
  parts.push(sourceTag(shim));
  const line = (isStale(sig.readAt) ? t("staleTag") + " · " : "") + parts.join(" · ");
  return el("p", p + "-note", line);
}

/* Tally marks, the Strip Antrean signature in miniature: one mark
 * per real person queueing, grouped in fives with a diagonal fifth,
 * exactly like a field watch sheet. Marks beyond prevCount enter
 * with the tick-in transition; the count itself is never animated. */
function tickEl(entry, idx, prevCount) {
  const d = el("span", "tick");
  if (idx === 0 && entry.mySignal === true) d.classList.add("is-me");
  if (idx >= prevCount) d.classList.add("tick-in");
  return d;
}

function tallyTicks(entry, max, prevCount) {
  const count = Number(entry.drop.signalCount);
  const wrap = el("div", "ticks");
  wrap.setAttribute("role", "img");
  wrap.setAttribute("aria-label", count + " " + t("queuePeople"));
  const shown = Math.min(count, max);
  let i = 0;
  while (i + 5 <= shown) {
    const g = el("span", "tick-group");
    for (let k = 0; k < 4; k++) g.appendChild(tickEl(entry, i + k, prevCount));
    const diag = el("span", "tick-diag");
    if (i + 4 >= prevCount && prevCount < count) diag.classList.add("tick-in");
    g.appendChild(diag);
    wrap.appendChild(g);
    i += 5;
  }
  while (i < shown) {
    wrap.appendChild(tickEl(entry, i, prevCount));
    i++;
  }
  if (count > max) wrap.appendChild(el("span", "ticks-more", "+" + (count - max)));
  return wrap;
}

/* Session minted history as a word-sized sparkline (design v2,
 * F-01): no axes, no legend, endpoints anchored, the takeaway as
 * text. Shown only from at least five verified samples, and the
 * caption states the session scope, because the page holds no
 * cross-session history and must not pretend to. */
function sparkline(entry, w, h) {
  const s = entry.samples;
  if (!s || s.length < 5 || !entry.counter || entry.counter.status !== "ok") return null;
  const vals = s.map((x) => Number(x.minted));
  const min = Math.min.apply(null, vals);
  const max = Math.max.apply(null, vals);
  const range = max - min;
  const NS = "http://www.w3.org/2000/svg";
  const wrap = el("div", "spark");
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.setAttribute("viewBox", "0 0 " + w + " " + h);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", t("sparkAria").replace("{a}", String(vals[0])).replace("{b}", String(vals[vals.length - 1])));
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * (w - 6) + 3;
    const y = range === 0 ? h / 2 : h - 3 - ((v - min) / range) * (h - 6);
    return x.toFixed(1) + "," + y.toFixed(1);
  });
  const line = document.createElementNS(NS, "polyline");
  line.setAttribute("points", pts.join(" "));
  line.setAttribute("class", "spark-line");
  svg.appendChild(line);
  const lastPt = pts[pts.length - 1].split(",");
  const dot = document.createElementNS(NS, "circle");
  dot.setAttribute("cx", lastPt[0]);
  dot.setAttribute("cy", lastPt[1]);
  dot.setAttribute("r", "2.6");
  dot.setAttribute("class", "spark-dot");
  svg.appendChild(dot);
  wrap.appendChild(svg);
  wrap.appendChild(el("p", "spark-cap", t("sparkCap")));
  return wrap;
}

/* Zone builders share one shape in two skins: the strip uses .zone
 * classes, the drop cards use .dzone classes. Signal (intent) and
 * minted (fact) are always separate zones, in separate colors, with
 * separate shapes: tally marks for people, a measuring bar for the
 * machine fact. */
function zoneSignal(entry, p, maxTicks) {
  const z = el("div", p + " " + p + "-signal");
  z.appendChild(el("p", p + "-key", t("zoneSignal")));
  if (entry.sig && entry.sig.conflict) {
    // Two independent board reads at one pinned block disagreed on
    // this drop: the queue number is hidden, never resolved by
    // picking a side (K-03, same rule as the counters).
    z.appendChild(el("p", p + "-missing", t("unverified")));
    z.appendChild(el("p", p + "-note", t("unverifiedWhy")));
    const sl = sigSrcLine(entry, p);
    if (sl) z.appendChild(sl);
    return z;
  }
  const count = Number(entry.drop.signalCount);
  const prev = prevNums.get("sig-" + entry.id);
  z.appendChild(el("p", p + "-big", String(count)));
  z.appendChild(el("p", p + "-note", t("zoneSignalNote")));
  z.appendChild(tallyTicks(entry, maxTicks, prev === undefined ? count : prev));
  const sl = sigSrcLine(entry, p);
  if (sl) z.appendChild(sl);
  if (prev !== undefined && prev !== count) z.classList.add("just-changed");
  prevNums.set("sig-" + entry.id, count);
  return z;
}

function zoneMinted(entry, p) {
  const z = el("div", p + " " + p + "-minted");
  z.appendChild(el("p", p + "-key", t("zoneMinted")));
  const c = entry.counter;
  if (!c || c.status === "missing") {
    z.appendChild(el("p", p + "-missing", t("notRecorded")));
    z.appendChild(el("p", p + "-note", t("notRecordedWhy")));
    return z;
  }
  if (c.status === "unverified") {
    // Two independent reads at one pinned block disagreed: the
    // number is hidden, never resolved by picking a side.
    z.appendChild(el("p", p + "-missing", t("unverified")));
    z.appendChild(el("p", p + "-note", t("unverifiedWhy")));
    z.appendChild(counterSrcLine(entry, c, p));
    return z;
  }
  const big = c.cap !== null ? String(c.minted) + " / " + String(c.cap) : String(c.minted);
  z.appendChild(el("p", p + "-big", big));
  z.appendChild(el("p", p + "-note", t("zoneMintedNote")));
  if (c.cap !== null && c.cap > 0n) {
    // The measuring bar: minted share of the cap, drawn by scaling
    // a full-width fill so no layout property is ever animated.
    const bar = el("div", "mintbar");
    const fill = el("div", "mintbar-fill");
    const pct = Math.min(1, Number(c.minted) / Number(c.cap));
    fill.style.transform = "scaleX(" + pct.toFixed(4) + ")";
    bar.appendChild(fill);
    z.appendChild(bar);
  }
  const spark = sparkline(entry, p === "zone" ? 264 : 168, p === "zone" ? 36 : 26);
  if (spark) z.appendChild(spark);
  z.appendChild(counterSrcLine(entry, c, p));
  const prevM = prevNums.get("mint-" + entry.id);
  if (prevM !== undefined && prevM !== String(c.minted)) z.classList.add("just-changed");
  prevNums.set("mint-" + entry.id, String(c.minted));
  return z;
}

/* Burn lines as plain paragraphs; the caller wraps them in
 * .plate-burn (plate) or appends them as .drop-burn (card). */
function burnParas(entry, cls) {
  const info = burnInfo(entry);
  const out = [];
  const rateRow = el("p", cls);
  rateRow.appendChild(el("strong", null, t("burnRate") + ": "));
  if (info.kind === "loading") {
    rateRow.appendChild(document.createTextNode(t("burnLoading")));
  } else if (info.kind === "nopublic") {
    rateRow.appendChild(document.createTextNode(t("burnNoPublic")));
  } else if (info.kind === "unverified") {
    rateRow.appendChild(document.createTextNode(t("burnUnverified")));
  } else if (info.kind === "nosample") {
    rateRow.appendChild(document.createTextNode(t("burnNoSample")));
  } else if (info.kind === "onesample") {
    rateRow.appendChild(document.createTextNode(t("burnOneSample")));
  } else if (info.kind === "shortwindow") {
    rateRow.appendChild(document.createTextNode(t("burnShortWindow")));
  } else if (info.kind === "warming") {
    rateRow.appendChild(document.createTextNode(t("burnWarming")));
  } else if (info.kind === "still") {
    rateRow.appendChild(document.createTextNode(t("burnStill")));
  } else if (info.kind === "done") {
    rateRow.appendChild(document.createTextNode(t("burnDone")));
  } else {
    // A range is shown only when its two ends actually differ once
    // formatted. With a single sample interval the honest shape is
    // one hedged figure, not a range whose ends are the same point
    // (Stage 4 self-test finding F-01).
    const rMin = info.rateMin.toFixed(2);
    const rMax = info.rateMax.toFixed(2);
    const rate = rMin === rMax ? rMin : rMin + " – " + rMax;
    rateRow.appendChild(document.createTextNode(rate + " " + t("burnPerMin")));
  }
  out.push(rateRow);
  if (info.kind === "live" && info.etaMin !== undefined) {
    const etaRow = el("p", cls);
    etaRow.appendChild(el("strong", null, t("eta") + ": "));
    const fEtaMin = formatDuration(info.etaMin);
    const fEtaMax = formatDuration(info.etaMax);
    etaRow.appendChild(document.createTextNode(
      fEtaMin === fEtaMax
        ? t("etaSingle").replace("{a}", fEtaMin)
        : t("etaRange").replace("{a}", fEtaMin).replace("{b}", fEtaMax)
    ));
    out.push(etaRow);
  }
  if (info.kind === "live") {
    const winRow = el("p", cls);
    winRow.appendChild(document.createTextNode(
      t("burnWindow")
        .replace("{n}", String(info.sampleCount))
        .replace("{w}", formatDuration(info.windowSec / 60))
    ));
    out.push(winRow);
  }
  return out;
}

function statusClass(key) {
  return { open: "st-open", upcoming: "st-soon", unknown: "st-soon", closed: "st-closed" }[key];
}

/* Countdown text for a window edge (design v2, F-07): the only
 * text on the page that ticks every second, updated by the light
 * interval at the bottom of this file, which touches nothing but
 * these text nodes and pauses while the tab is hidden. It describes
 * the window state, never a data number. */
function fmtCd(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (d > 0) return d + "d " + h + "h";
  if (h > 0) return h + "h " + m + "m";
  return m + ":" + String(ss).padStart(2, "0");
}

function cdText(kind, ts) {
  const diff = Number(ts) - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "";
  return t(kind === "opens" ? "cdOpens" : "cdCloses").replace("{t}", fmtCd(diff));
}

function cdElement(kind, ts, cls) {
  const s = el("p", cls);
  s.dataset.cdKind = kind;
  s.dataset.cdTs = String(ts);
  s.textContent = cdText(kind, ts);
  return s;
}

function renderFeatured() {
  const slot = $("featured-slot");
  const caption = $("featured-caption");
  if (!CONFIG.convoyAddress) {
    slot.hidden = true;
    caption.hidden = true;
    return;
  }
  slot.hidden = false;
  if (board.failed) {
    slot.textContent = "";
    const strip = el("article", "strip");
    const head = el("div", "strip-head");
    head.appendChild(el("p", "plate-status", t("boardErrorTitle")));
    strip.appendChild(head);
    slot.appendChild(strip);
    caption.hidden = true;
    return;
  }
  if (!board.loaded || board.drops.length === 0) {
    caption.hidden = true;
    return; // keep the skeleton strip from the static HTML
  }
  slot.textContent = "";
  const featuredPool = visibleBoardDrops().length ? visibleBoardDrops() : board.drops;
  const entry = featuredPool.reduce((a, b) => (b.drop.signalCount > a.drop.signalCount ? b : a), featuredPool[0]);
  const strip = el("article", "strip");
  strip.dataset.dropId = String(entry.id);
  const st = windowStatus(entry.drop);
  const head = el("div", "strip-head");
  head.appendChild(el("p", "plate-status", statusText(st) + (isCalibration(entry) ? " · " + t("testDataBadge") : "")));
  head.appendChild(el("h3", "plate-label", entry.drop.label));
  const win = el("p", "plate-window");
  if (entry.drop.opensAt > 0) {
    win.appendChild(document.createTextNode(t("opensAt") + " " + formatDateTime(entry.drop.opensAt) + " · "));
  }
  if (entry.drop.closesAt > 0) {
    win.appendChild(document.createTextNode(t("closesAt") + " " + formatDateTime(entry.drop.closesAt)));
  }
  if (entry.drop.opensAt === 0 && entry.drop.closesAt === 0) {
    win.appendChild(document.createTextNode(t("stUnknown")));
  }
  head.appendChild(win);
  if (st === "upcoming" && entry.drop.opensAt > 0) {
    head.appendChild(cdElement("opens", entry.drop.opensAt, "plate-cd"));
  } else if (st === "open" && entry.drop.closesAt > 0) {
    head.appendChild(cdElement("closes", entry.drop.closesAt, "plate-cd"));
  }
  strip.appendChild(head);
  const zones = el("div", "strip-zones");
  zones.appendChild(zoneSignal(entry, "zone", 60));
  zones.appendChild(zoneMinted(entry, "zone"));
  const burn = el("div", "plate-burn");
  for (const p of burnParas(entry, "")) burn.appendChild(p);
  zones.appendChild(burn);
  strip.appendChild(zones);
  slot.appendChild(strip);
  caption.hidden = false;
  caption.textContent = t("featuredCaption");
}

/* Shareable deep link to one drop (F-02): keeps the network mode,
 * adds the drop id; the receiving page scrolls to the card and
 * highlights it once. */
function dropLink(id) {
  const u = new URL(window.location.href);
  u.searchParams.set("drop", String(id));
  u.hash = "";
  return u.toString();
}

/* The expandable per-drop detail (F-03): full provenance without
 * leaving the board. Everything shown here is already read by the
 * page; nothing new is fetched and nothing is inferred. */
function detailSection(entry) {
  const sec = el("section", "drop-detail");
  const dl = el("dl", "detail-grid");
  const add = (key, value) => {
    const cell = el("div");
    cell.appendChild(el("dt", null, key));
    const dd = el("dd");
    if (typeof value === "string") dd.textContent = value;
    else dd.appendChild(value);
    cell.appendChild(dd);
    dl.appendChild(cell);
  };
  add(t("detailContract"), entry.drop.dropContract);
  add(t("detailConvoy"), CONFIG.convoyAddress || "");
  add(t("registrar"), entry.drop.registrar);
  const winParts = [];
  if (entry.drop.opensAt > 0) winParts.push(t("opensAt") + " " + formatDateTime(entry.drop.opensAt));
  if (entry.drop.closesAt > 0) winParts.push(t("closesAt") + " " + formatDateTime(entry.drop.closesAt));
  add(t("detailWindow"), winParts.length ? winParts.join(" · ") : t("stUnknown"));
  add(t("detailSamples"), String(entry.samples.length));
  const link = el("a", null, t("detailExplorer"));
  link.href = CONFIG.chainProfile.blockExplorerUrls[0] + "/address/" + entry.drop.dropContract;
  link.target = "_blank";
  link.rel = "noopener";
  add(t("detailExplorer"), link);
  sec.appendChild(dl);
  const big = sparkline(entry, 320, 44);
  if (big) {
    sec.appendChild(big);
    sec.appendChild(el("p", "detail-note", t("sparkScale")));
  }
  return sec;
}

function dropCard(entry, nextId) {
  const card = el("article", "drop-card");
  card.dataset.dropId = String(entry.id);
  card.id = "drop-" + entry.id;
  if (entry.id === nextId) card.classList.add("is-next");
  const top = el("div", "drop-top");
  top.appendChild(el("span", "drop-label", entry.drop.label));
  if (isCalibration(entry)) top.appendChild(el("span", "test-badge", t("testDataBadge")));
  const st = windowStatus(entry.drop);
  const statusLabel = entry.id === nextId ? t("nextUp") + " · " + statusText(st) : statusText(st);
  top.appendChild(el("span", "drop-status " + statusClass(st), statusLabel));
  card.appendChild(top);

  const addrRow = el("div", "drop-addr");
  addrRow.appendChild(el("span", null, t("dropContract") + ":"));
  addrRow.appendChild(monoAddr(entry.drop.dropContract));
  const copyBtn = el("button", "copy-btn", t("copy"));
  copyBtn.type = "button";
  copyBtn.addEventListener("click", async () => {
    const msg = $("card-msg-" + entry.id);
    try {
      await navigator.clipboard.writeText(entry.drop.dropContract);
      if (msg) {
        msg.textContent = t("copied");
        msg.className = "form-msg is-ok";
      }
    } catch (e) {
      if (msg) msg.textContent = entry.drop.dropContract;
    }
  });
  addrRow.appendChild(copyBtn);
  card.appendChild(addrRow);

  const wRow = el("p", "drop-window");
  if (entry.drop.opensAt > 0) {
    wRow.appendChild(document.createTextNode(t("opensAt") + " " + formatDateTime(entry.drop.opensAt) + " (" + formatRelative(entry.drop.opensAt) + ")"));
  }
  if (entry.drop.closesAt > 0) {
    if (wRow.childNodes.length) wRow.appendChild(document.createTextNode(" · "));
    wRow.appendChild(document.createTextNode(t("closesAt") + " " + formatDateTime(entry.drop.closesAt) + " (" + formatRelative(entry.drop.closesAt) + ")"));
  }
  if (entry.drop.opensAt === 0 && entry.drop.closesAt === 0) {
    wRow.appendChild(document.createTextNode(t("stUnknown")));
  }
  card.appendChild(wRow);
  if (st === "upcoming" && entry.drop.opensAt > 0) {
    card.appendChild(cdElement("opens", entry.drop.opensAt, "drop-cd"));
  } else if (st === "open" && entry.drop.closesAt > 0) {
    card.appendChild(cdElement("closes", entry.drop.closesAt, "drop-cd"));
  }
  const rRow = el("p", "drop-window");
  rRow.appendChild(document.createTextNode(t("registrar") + ": "));
  rRow.appendChild(monoAddr(entry.drop.registrar));
  card.appendChild(rRow);

  const zones = el("div", "drop-zones");
  zones.appendChild(zoneSignal(entry, "dzone", 24));
  zones.appendChild(zoneMinted(entry, "dzone"));
  // The burn panel sits in the grid cell directly under the minted
  // zone: the explanation lives beside the number it explains.
  const burnPanel = el("section", "burn-panel");
  burnPanel.setAttribute("aria-label", t("burnRate"));
  for (const p of burnParas(entry, "drop-burn")) burnPanel.appendChild(p);
  zones.appendChild(burnPanel);
  card.appendChild(zones);

  const actions = el("div", "drop-actions");
  if (entry.mySignal === true) {
    actions.appendChild(el("span", "sig-status sig-on", t("youSignaled")));
  }
  let btn = null;
  let whyText = "";
  if (!account) {
    // Same state honesty before connection: a not yet open drop
    // shows the dashed queue button in every branch, never the
    // solid open-drop primary.
    btn = el("button", st === "upcoming" ? "btn btn-queue" : "btn btn-primary", t("signalBtn"));
    btn.type = "button";
    whyText = t("connectFirst");
    btn.addEventListener("click", () => connect());
  } else if (!chainOk) {
    btn = el("button", "btn btn-primary", t("signalBtn"));
    btn.type = "button";
    btn.disabled = true;
    whyText = t("wrongChainWhy");
  } else if (board.isHolder === false) {
    btn = el("button", "btn btn-primary", t("signalBtn"));
    btn.type = "button";
    btn.disabled = true;
    whyText = t("holderOnly");
  } else if (entry.mySignal === true) {
    btn = el("button", "btn btn-ghost", t("withdrawBtn"));
    btn.type = "button";
    btn.addEventListener("click", () => openSheet("withdraw", entry));
  } else if (CONFIG.convoyAddress) {
    // A not-yet-open drop shows its state on the button itself: a
    // dashed queue button, not the solid open-drop primary, with the
    // explanation on the card. Queueing early stays possible,
    // because recording intent before the window opens is the
    // product's core; what changes is that the state is no longer
    // dressed as if the drop were already open.
    btn = el("button", st === "upcoming" ? "btn btn-queue" : "btn btn-primary", t("signalBtn"));
    btn.type = "button";
    if (board.isHolder === null || entry.mySignal === null) btn.disabled = true;
    if (st === "upcoming") whyText = t("notOpenWhy");
    btn.addEventListener("click", () => openSheet("signal", entry));
  }
  if (btn) actions.appendChild(btn);
  card.appendChild(actions);
  if (whyText) card.appendChild(el("p", "why", whyText));

  const tools = el("div", "drop-tools");
  const watching = watchSet.has(entry.id);
  const watchBtn = el("button", "btn-mini" + (watching ? " is-on" : ""), watching ? t("watchedBtn") : t("watchBtn"));
  watchBtn.type = "button";
  watchBtn.setAttribute("aria-pressed", watching ? "true" : "false");
  watchBtn.addEventListener("click", () => toggleWatch(entry.id));
  tools.appendChild(watchBtn);
  const linkBtn = el("button", "btn-mini", t("copyLink"));
  linkBtn.type = "button";
  linkBtn.addEventListener("click", async () => {
    const msg = $("card-msg-" + entry.id);
    try {
      await navigator.clipboard.writeText(dropLink(entry.id));
      if (msg) {
        msg.textContent = t("linkCopied");
        msg.className = "form-msg is-ok";
      }
    } catch (e) {
      if (msg) msg.textContent = dropLink(entry.id);
    }
  });
  tools.appendChild(linkBtn);
  const detBtn = el("button", "btn-mini", openDetails.has(entry.id) ? t("detailHide") : t("detailBtn"));
  detBtn.type = "button";
  detBtn.setAttribute("aria-expanded", openDetails.has(entry.id) ? "true" : "false");
  detBtn.addEventListener("click", () => {
    if (openDetails.has(entry.id)) openDetails.delete(entry.id);
    else openDetails.add(entry.id);
    renderBoard();
  });
  tools.appendChild(detBtn);
  card.appendChild(tools);
  if (watching) card.appendChild(el("p", "why", t("watchNote")));
  if (openDetails.has(entry.id)) card.appendChild(detailSection(entry));

  const msg = el("p", "form-msg");
  msg.id = "card-msg-" + entry.id;
  msg.setAttribute("role", "status");
  msg.setAttribute("aria-live", "polite");
  card.appendChild(msg);
  return card;
}

function renderChips() {
  const wrap = $("filter-chips");
  wrap.textContent = "";
  const base = visibleBoardDrops();
  const counts = { all: base.length, open: 0, upcoming: 0, closed: 0, watched: 0 };
  for (const e of base) {
    const st = windowStatus(e.drop);
    if (st === "open" || st === "unknown") counts.open++;
    else if (st === "upcoming") counts.upcoming++;
    else counts.closed++;
    if (watchSet.has(e.id)) counts.watched++;
  }
  const defs = [
    ["all", t("chipAll")],
    ["open", t("chipOpen")],
    ["upcoming", t("chipUpcoming")],
    ["closed", t("chipClosed")],
    ["watched", t("chipWatched")],
  ];
  for (const [key, label] of defs) {
    const b = el("button", "chip" + (board.filter === key ? " is-on" : ""), label + " (" + counts[key] + ")");
    b.type = "button";
    b.addEventListener("click", () => {
      board.filter = key;
      renderBoard();
    });
    wrap.appendChild(b);
  }
  const line = $("count-line");
  const visible = filteredDrops().length;
  let text = t("showing").replace("{x}", String(visible)).replace("{y}", String(base.length));
  if (board.totalDrops !== null && board.totalDrops > board.drops.length) {
    text += " " + t("boardLimitNote")
      .replace("{n}", String(board.drops.length))
      .replace("{total}", String(board.totalDrops));
  }
  line.textContent = text;
  const tn = $("testdata-note");
  if (tn) {
    const hiddenCount = board.drops.filter(isCalibration).length;
    tn.textContent =
      board.hideTestData && hiddenCount > 0
        ? t("testHiddenNote").replace("{n}", String(hiddenCount))
        : "";
  }
}

function filteredDrops() {
  const base = sortedBoardDrops(visibleBoardDrops());
  if (board.filter === "all") return base;
  if (board.filter === "watched") return base.filter((e) => watchSet.has(e.id));
  return base.filter((e) => {
    const st = windowStatus(e.drop);
    if (board.filter === "open") return st === "open" || st === "unknown";
    return st === board.filter;
  });
}

function stateBlock(titleKey, bodyKey) {
  const d = el("div", "state");
  d.appendChild(el("p", "state-title", t(titleKey)));
  d.appendChild(el("p", "state-body", t(bodyKey)));
  return d;
}

function skeletonCard() {
  const d = el("div", "skl-card");
  d.setAttribute("aria-hidden", "true");
  d.appendChild(el("div", "skl skl-line skl-w50"));
  d.appendChild(el("div", "skl skl-line skl-w80"));
  d.appendChild(el("div", "skl skl-strip"));
  return d;
}

/* The ?drop= deep link (F-02), honoured once: scroll to the card
 * and ring it briefly so a shared link lands on its drop. */
function maybeDeepLink() {
  if (deepLinkDone || !board.loaded) return;
  const raw = new URLSearchParams(window.location.search).get("drop");
  if (raw === null) {
    deepLinkDone = true;
    return;
  }
  const id = Number(raw);
  const cardEl = Number.isInteger(id)
    ? document.querySelector('.drop-card[data-drop-id="' + id + '"]')
    : null;
  // Board is loaded; a missing card means the drop is filtered or
  // hidden, and retrying on every render would never land.
  deepLinkDone = true;
  if (!cardEl) return;
  cardEl.scrollIntoView({ block: "center" });
  cardEl.classList.add("is-targeted");
  setTimeout(() => cardEl.classList.remove("is-targeted"), 1700);
}

function renderBoard() {
  const list = $("drop-list");
  const asof = $("board-asof");
  const dot = $("asof-dot");
  const testToggle = document.querySelector(".testdata-toggle");
  if (testToggle) testToggle.hidden = !CONFIG.convoyAddress;
  list.textContent = "";
  if (!CONFIG.convoyAddress) {
    renderChipsHidden();
    list.appendChild(stateBlock("notDeployedTitle", "notDeployedBody"));
    asof.textContent = "";
    if (dot) dot.hidden = true;
    return;
  }
  $("filter-chips").hidden = false;
  if (!board.loaded && !board.failed) {
    for (let i = 0; i < 3; i++) list.appendChild(skeletonCard());
    if (dot) dot.hidden = true;
    return;
  }
  if (dot) dot.hidden = board.failed;
  if (board.failed) {
    list.appendChild(stateBlock("boardErrorTitle", "boardErrorBody"));
    asof.textContent = "";
    return;
  }
  renderChips();
  if (board.drops.length === 0) {
    list.appendChild(stateBlock("boardEmptyTitle", "boardEmptyBody"));
  } else {
    const visible = filteredDrops();
    if (visible.length === 0) {
      list.appendChild(stateBlock("filterNoneTitle", "filterNoneBody"));
    } else {
      const nextId = nextUpcomingId(visible);
      for (const entry of visible) list.appendChild(dropCard(entry, nextId));
    }
  }
  if (board.block !== null && board.readAt) {
    const when = new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {
      dateStyle: "medium", timeStyle: "medium",
    }).format(board.readAt);
    asof.textContent = t(board.stale ? "asOfStale" : "asOf")
      .replace("{block}", board.block.toLocaleString("id-ID"))
      .replace("{when}", when);
  }
  maybeDeepLink();
}

function renderChipsHidden() {
  $("filter-chips").hidden = true;
  $("count-line").textContent = "";
  const tn = $("testdata-note");
  if (tn) tn.textContent = "";
}

function renderMine() {
  const list = $("mine-list");
  list.textContent = "";
  if (!account) {
    list.appendChild(stateBlock("mineEmptyTitle", "mineEmptyBody"));
    return;
  }
  if (!CONFIG.convoyAddress || board.drops.length === 0) {
    list.appendChild(stateBlock("mineNoneTitle", "mineNoneBody"));
    return;
  }
  for (const entry of board.drops) {
    const row = el("div", "mine-row");
    row.dataset.dropId = String(entry.id);
    const top = el("div", "row-top");
    top.appendChild(el("span", "drop-label", entry.drop.label));
    if (isCalibration(entry)) top.appendChild(el("span", "test-badge", t("testDataBadge")));
    const on = entry.mySignal === true;
    top.appendChild(el("span", "sig-status " + (on ? "sig-on" : "sig-off"),
      on ? t("youSignaled") : t("notQueued")));
    row.appendChild(top);
    const q = entry.quota;
    const meta = el("p", "meta");
    if (q && q.status === "ok") {
      meta.appendChild(el("strong", null, t("quotaLeft") + ": "));
      meta.appendChild(document.createTextNode(String(q.remaining) + (q.total !== null ? " / " + String(q.total) : "")));
    } else {
      meta.textContent = t("quotaNotRecorded");
    }
    row.appendChild(meta);
    if (q && q.status === "ok" && q.fns) {
      const src = el("p", "meta");
      src.textContent =
        (isStale(q.readAt) ? t("staleTag") + " · " : "") +
        t("quotaSrc").replace("{fns}", q.fns).replace("{when}", formatTimeOnly(q.readAt)) +
        " · " + (q.source === "wallet" ? t("srcWallet") : t("srcSingle"));
      row.appendChild(src);
    }
    if (on) {
      const btn = el("button", "btn btn-ghost btn-small", t("withdrawBtn"));
      btn.type = "button";
      btn.addEventListener("click", () => openSheet("withdraw", entry));
      row.appendChild(btn);
    }
    list.appendChild(row);
  }
}

/* ------------------------------------------------------------------ */
/* Confirmation sheet (Gate 9): simulate, show the real fee, then     */
/* sign once. Fail-closed everywhere.                                 */
/* ------------------------------------------------------------------ */

const sheetState = { open: false, plan: null, busy: false };

function setSheetMsg(kind, text, txHash) {
  const box = $("sheet-msg");
  box.className = "form-msg" + (kind === "error" ? " is-error" : kind === "ok" ? " is-ok" : "");
  box.textContent = text || "";
  const tx = $("sheet-tx");
  if (txHash) {
    tx.hidden = false;
    tx.textContent = "";
    tx.appendChild(document.createTextNode(txHash + " "));
    const a = el("a", null, t("viewTx"));
    a.href = CONFIG.chainProfile.blockExplorerUrls[0] + "/tx/" + txHash;
    a.target = "_blank";
    a.rel = "noopener";
    tx.appendChild(a);
  } else {
    tx.hidden = true;
    tx.textContent = "";
  }
}

function closeSheet() {
  sheetState.open = false;
  sheetState.plan = null;
  sheetState.busy = false;
  $("confirm-sheet").hidden = true;
  $("sheet-backdrop").hidden = true;
}

async function simulateAndEstimate(plan) {
  const simParams = { from: account, to: CONFIG.convoyAddress, data: plan.data };
  await rpc("eth_call", [simParams, "latest"]);
  const gas = BigInt(await rpc("eth_estimateGas", [simParams]));
  const gasPrice = BigInt(await rpc("eth_gasPrice", []));
  return gas * gasPrice;
}

async function openSheet(kind, entry) {
  if (!account) {
    connect();
    return;
  }
  if (!chainOk) {
    const msg = $("card-msg-" + entry.id);
    if (msg) {
      msg.textContent = t("wrongNetwork");
      msg.classList.add("is-error");
    }
    return;
  }
  const plan = {
    kind,
    entryId: entry.id,
    sig: kind === "signal" ? "signal(uint256)" : "withdrawSignal(uint256)",
    label: entry.drop.label,
  };
  plan.data = encodeCall(plan.sig, ["uint256"], [BigInt(entry.id)]);
  sheetState.open = true;
  sheetState.plan = plan;
  sheetState.busy = true;
  $("confirm-sheet").hidden = false;
  $("sheet-backdrop").hidden = false;
  $("sheet-rows").textContent = "";
  const confirmBtn = $("sheet-confirm");
  confirmBtn.textContent = kind === "signal" ? t("confirmSignal") : t("confirmWithdraw");
  confirmBtn.disabled = true;
  setSheetMsg("info", t("checking"));
  const rows = $("sheet-rows");
  const dropRow = el("div", "row");
  dropRow.appendChild(el("dt", null, t("rowDrop")));
  dropRow.appendChild(el("dd", null, plan.label));
  rows.appendChild(dropRow);
  const fxRow = el("div", "row");
  fxRow.appendChild(el("dt", null, t("rowEffect")));
  fxRow.appendChild(el("dd", null, kind === "signal" ? t("signalEffect") : t("withdrawEffect")));
  rows.appendChild(fxRow);
  if (CONFIG.convoyAddress) {
    // The destination belongs on the sheet itself, not only inside
    // the wallet's own prompt (docs/KEAMANAN-V2.md K-04).
    const cRow = el("div", "row");
    cRow.appendChild(el("dt", null, t("rowContract")));
    const cDd = el("dd", null, truncateAddress(CONFIG.convoyAddress));
    cDd.title = CONFIG.convoyAddress;
    cRow.appendChild(cDd);
    rows.appendChild(cRow);
  }
  try {
    if (!CONFIG.convoyAddress) throw new Error("not deployed");
    const feeWei = await simulateAndEstimate(plan);
    const feeRow = el("div", "row");
    feeRow.appendChild(el("dt", null, t("gasFee")));
    feeRow.appendChild(el("dd", null, formatBnbRounded(feeWei) + " " + currencyUnit()));
    rows.appendChild(feeRow);
    setSheetMsg("info", "");
    confirmBtn.disabled = false;
    sheetState.busy = false;
  } catch (e) {
    setSheetMsg("error", CONFIG.convoyAddress ? plainError(e) : t("notDeployed"));
    sheetState.busy = false;
  }
  $("sheet-h").focus();
}

async function confirmSheet() {
  const plan = sheetState.plan;
  if (!plan || sheetState.busy) return;
  if (!CONFIG.convoyAddress) {
    setSheetMsg("error", t("notDeployed"));
    return;
  }
  sheetState.busy = true;
  const confirmBtn = $("sheet-confirm");
  confirmBtn.disabled = true;
  try {
    setSheetMsg("info", t("checking"));
    await simulateAndEstimate(plan);
    setSheetMsg("info", t("waitSign"));
    const txHash = await rpc("eth_sendTransaction", [
      { from: account, to: CONFIG.convoyAddress, data: plan.data },
    ]);
    setSheetMsg("info", t("processing"), txHash);
    const deadline = Date.now() + 90000;
    let receipt = null;
    while (Date.now() < deadline) {
      receipt = await rpc("eth_getTransactionReceipt", [txHash]).catch(() => null);
      if (receipt) break;
      await new Promise((r) => setTimeout(r, 3000));
    }
    if (!receipt) {
      setSheetMsg("error", t("errSlow"), txHash);
      return;
    }
    if (receipt.status !== "0x1") {
      setSheetMsg("error", t("errTxFailed"), txHash);
      return;
    }
    setSheetMsg("ok", plan.kind === "signal" ? t("successSignal") : t("successWithdraw"), txHash);
    refreshBoard();
  } catch (e) {
    setSheetMsg("error", plainError(e));
  } finally {
    sheetState.busy = false;
    confirmBtn.disabled = false;
  }
}

/* ------------------------------------------------------------------ */
/* Feedback (Stage 4 exception addition, ordered by Leira 19 Nov      */
/* 2026): the form composes a public GitHub issue draft in the        */
/* convoy repo. There is no backend and nothing is sent from this     */
/* page: the send button opens the prefilled new-issue page and the   */
/* user presses submit on GitHub itself. The automatic context        */
/* (network mode, the drop the report is about, page version,         */
/* language) is rendered in the dialog before anything is opened,     */
/* and the exact same context text goes into the issue body. No       */
/* personal data is requested; the dialog warns that the issue is     */
/* public before the user can send.                                   */
/* ------------------------------------------------------------------ */

const FEEDBACK_REPO = "https://github.com/Leira-ai/convoy";

function feedbackCategoryLabel() {
  const map = {
    confusing: "fbCatConfusing",
    "wrong-number": "fbCatWrongNumber",
    "button-broken": "fbCatButton",
    suggestion: "fbCatSuggestion",
    other: "fbCatOther",
  };
  return t(map[$("fb-category").value] || "fbCatOther");
}

function feedbackDropEntry() {
  const v = $("fb-drop").value;
  if (v === "" || !board || !board.drops) return null;
  return board.drops.find((e) => String(e.id) === v) || null;
}

function buildFeedbackDropOptions(keepValue) {
  const sel = $("fb-drop");
  const prev = keepValue ? sel.value : null;
  sel.textContent = "";
  const gen = document.createElement("option");
  gen.value = "";
  gen.textContent = t("fbDropGeneral");
  sel.appendChild(gen);
  if (board && board.drops) {
    for (const entry of board.drops) {
      const opt = document.createElement("option");
      opt.value = String(entry.id);
      opt.textContent = entry.drop.label;
      sel.appendChild(opt);
    }
  }
  if (prev !== null && [...sel.options].some((o) => o.value === prev)) {
    sel.value = prev;
  } else if (board && board.drops && board.drops.length > 0) {
    // Default: the featured drop, the longest queue, the same drop
    // the hero plate shows, so a report names what the user saw first.
    const feat = board.drops.reduce(
      (a, b) => (b.drop.signalCount > a.drop.signalCount ? b : a),
      board.drops[0]
    );
    sel.value = String(feat.id);
  }
}

function updateFeedbackContext() {
  const entry = feedbackDropEntry();
  let line = t("fbContextLine")
    .replace("{net}", CONFIG.isTestnet ? t("fbNetTestnet") : t("fbNetMainnet"))
    .replace("{ver}", PAGE_VERSION)
    .replace("{lang}", lang.toUpperCase());
  line +=
    " · " +
    (entry
      ? t("fbContextDrop")
          .replace("{label}", entry.drop.label)
          .replace("{addr}", entry.drop.dropContract)
      : t("fbContextNoDrop"));
  $("fb-context").textContent = line;
}

function composeFeedback() {
  const cat = feedbackCategoryLabel();
  const entry = feedbackDropEntry();
  const msg = $("fb-message").value.trim();
  let title = t("fbIssuePrefix") + ": " + cat + (entry ? " · " + entry.drop.label : "");
  if (title.length > 140) title = title.slice(0, 137) + "...";
  const body = [
    "**" + t("fbIssueCat") + ":** " + cat,
    "",
    "**" + t("fbContextTitle") + ":** " + $("fb-context").textContent,
    "",
    "**" + t("fbIssueTime") + ":** " + new Date().toISOString(),
    "",
    "---",
    "",
    msg,
  ].join("\n");
  return { title, body };
}

function feedbackMsg(text, cls) {
  const box = $("fb-msg");
  box.textContent = text;
  box.className = "form-msg" + (cls ? " " + cls : "");
}

function openFeedback() {
  buildFeedbackDropOptions(false);
  updateFeedbackContext();
  feedbackMsg("", "");
  fbState.open = true;
  $("feedback-dialog").hidden = false;
  $("fb-backdrop").hidden = false;
  $("fb-dialog-h").focus();
}

function closeFeedback() {
  fbState.open = false;
  $("feedback-dialog").hidden = true;
  $("fb-backdrop").hidden = true;
}

function feedbackNeedsMessage() {
  feedbackMsg(t("fbNeedMessage"), "is-error");
  $("fb-message").focus();
  return false;
}

function sendFeedback() {
  if (!$("fb-message").value.trim()) return feedbackNeedsMessage();
  updateFeedbackContext();
  const { title, body } = composeFeedback();
  const url =
    FEEDBACK_REPO +
    "/issues/new?title=" +
    encodeURIComponent(title) +
    "&body=" +
    encodeURIComponent(body) +
    "&labels=feedback";
  window.open(url, "_blank", "noopener");
  feedbackMsg(t("fbOpened"), "is-ok");
}

async function copyFeedback() {
  if (!$("fb-message").value.trim()) return feedbackNeedsMessage();
  updateFeedbackContext();
  const { title, body } = composeFeedback();
  const text = title + "\n\n" + body;
  try {
    await navigator.clipboard.writeText(text);
    feedbackMsg(t("fbCopied"), "is-ok");
  } catch (e) {
    feedbackMsg(text, "");
  }
}

/* ------------------------------------------------------------------ */
/* Wiring and init.                                                   */
/* ------------------------------------------------------------------ */

$("connect-btn").addEventListener("click", () => {
  if (account) disconnect();
  else connect();
});
$("disconnect-btn").addEventListener("click", disconnect);
$("switch-chain-btn").addEventListener("click", switchChain);
$("refresh-btn").addEventListener("click", refreshBoard);
$("sheet-cancel").addEventListener("click", closeSheet);
$("sheet-confirm").addEventListener("click", confirmSheet);
$("sheet-backdrop").addEventListener("click", closeSheet);
$("feedback-btn").addEventListener("click", openFeedback);
$("fb-cancel").addEventListener("click", closeFeedback);
$("fb-backdrop").addEventListener("click", closeFeedback);
$("fb-send").addEventListener("click", sendFeedback);
$("fb-copy").addEventListener("click", copyFeedback);
$("fb-drop").addEventListener("change", updateFeedbackContext);
$("fb-category").addEventListener("change", () => feedbackMsg("", ""));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && fbState.open) closeFeedback();
});
$("lang-id").addEventListener("click", () => applyLang("id"));
$("lang-en").addEventListener("click", () => applyLang("en"));
$("theme-toggle").addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem("convoy-theme", next);
  } catch (e) {
    /* storage unavailable: theme applies to this view only */
  }
  updateThemeButton();
});
$("hide-testdata").addEventListener("change", (e) => {
  board.hideTestData = !!e.target.checked;
  renderBoard();
});

function updateFooter() {
  const cl = $("contract-line");
  const rl = $("registry-line");
  if (CONFIG.convoyAddress) {
    cl.textContent = CONFIG.convoyAddress;
  } else {
    cl.textContent = t("notDeployedFooter");
  }
  rl.textContent = CONFIG.agentIdRegistry;
}

/* Section navigation marker (design v2): the nav link for the
 * section currently in view is marked, so the long page always
 * says where the reader is. */
function initScrollSpy() {
  const links = document.querySelectorAll(".secnav-links a[data-sec]");
  if (!("IntersectionObserver" in window) || links.length === 0) return;
  const spy = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => a.classList.toggle("is-active", a.dataset.sec === e.target.id));
      }
    },
    { rootMargin: "-25% 0px -65% 0px" }
  );
  for (const id of ["board-panel", "mine-panel", "how-panel", "feedback-panel"]) {
    const s = $(id);
    if (s) spy.observe(s);
  }
}

/* The one-second countdown ticker (F-07): touches only countdown
 * text nodes, pauses while the tab is hidden, and asks for a board
 * refresh when a window edge passes so the status itself updates. */
function initCountdownTicker() {
  setInterval(() => {
    if (document.hidden) return;
    let expired = false;
    document.querySelectorAll("[data-cd-ts]").forEach((n) => {
      const txt = cdText(n.dataset.cdKind, Number(n.dataset.cdTs));
      if (txt === "") expired = true;
      else if (n.textContent !== txt) n.textContent = txt;
    });
    if (expired) refreshBoard();
  }, 1000);
}

(async function init() {
  applyLang("id");
  initScrollSpy();
  initCountdownTicker();
  const p = await ensureProvider();
  if (p) {
    try {
      const accounts = await p.request({ method: "eth_accounts" });
      if (accounts && accounts[0]) {
        account = accounts[0];
        await refreshChain();
      }
    } catch (e) {
      /* silent reconnect is best-effort */
    }
  }
  renderWalletBar();
  refreshBoard();
  setInterval(refreshBoard, 30000);
})();
