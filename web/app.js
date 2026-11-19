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
 * TIDAK TERDATA (not recorded) in words and never shows a guessed
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

const STRINGS = {
  id: {
    connect: "Hubungkan Wallet", disconnect: "Putuskan", switchChain: "Pindah ke BNB Chain",
    headline: "Antrean drop, dihitung dari orang nyata.",
    lede: "Convoy menghitung siapa yang benar-benar berniat ikut drop bergate Agent ID. Sinyal hanya bisa diberikan pemegang Agent ID, satu nama satu sinyal, jadi angka antreannya tidak bisa digelembungkan wallet duplikat.",
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
    boardTitle: "Radar drop", refresh: "Segarkan",
    boardHint: "Angka sinyal adalah minat pemegang Agent ID. Angka terminting adalah kejadian nyata dari kontrak proyek. Keduanya selalu ditampilkan terpisah.",
    boardLoadingTitle: "Papan sedang dibaca.",
    boardLoading: "Membaca papan antrean dari kontrak...",
    boardErrorTitle: "Papan belum bisa dibaca.",
    boardErrorBody: "Bacaan dari kontrak gagal. Angka lama tidak ditampilkan sebagai data baru. Coba lagi sebentar lagi.",
    boardEmptyTitle: "Belum ada drop terdaftar.",
    boardEmptyBody: "Begitu proyek bergate Agent ID mendaftarkan dropnya di kontrak Convoy, antreannya tampil di sini.",
    notDeployedTitle: "Papan mainnet belum live.",
    notDeployedBody: "Kontrak ConvoySignal belum dideploy di BNB Chain mainnet, jadi belum ada antrean yang bisa ditampilkan. Mode testnet halaman ini menampilkan papan yang bekerja penuh.",
    chipAll: "Semua", chipOpen: "Sedang dibuka", chipUpcoming: "Belum dibuka", chipClosed: "Sudah tutup",
    showing: "Menampilkan {x} dari {y} drop",
    filterNoneTitle: "Tidak ada drop pada saringan ini.",
    filterNoneBody: "Longgarkan saringan untuk melihat drop lain di papan.",
    mineTitle: "Antrean saya",
    mineEmptyTitle: "Hubungkan wallet untuk melihat antreanmu.",
    mineEmptyBody: "Sesudah terhubung, panel ini menunjukkan drop mana yang sudah kamu beri sinyal dan sisa jatah gratis atas namamu bila kontrak proyeknya menyediakan bacaan itu.",
    mineNoneTitle: "Kamu belum memberi sinyal di drop mana pun.",
    mineNoneBody: "Tekan Ikut antre pada kartu drop untuk mencatat sinyal pertamamu. Sinyal selalu bisa ditarik lagi.",
    meaningTitle: "Apa arti angka di papan ini?",
    meaningBody: "Sinyal adalah pernyataan minat dari pemegang Agent ID, bukan jaminan ia akan mint dan bukan janji hasil apa pun. Angka terminting dibaca dari kontrak proyek itu sendiri; proyek yang counternya tidak bisa diverifikasi ditandai tidak terdata, bukan ditebak. Convoy bukan penilaian keamanan: antrean yang panjang tidak berarti kontrak dropnya aman.",
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
    notRecorded: "Tidak terdata",
    notRecordedWhy: "Kontrak proyek ini tidak menyediakan bacaan counter yang bisa diverifikasi, jadi Convoy tidak menebak angkanya.",
    quotaLeft: "Sisa jatah gratis kamu",
    quotaNotRecorded: "Jatah per alamat tidak terdata di kontrak proyek ini.",
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
    burnWarming: "Laju bakar mulai terbaca sesudah bacaan berikutnya; satu bacaan belum cukup untuk menghitung laju.",
    burnStill: "Belum ada mint baru selama halaman ini terbuka, jadi laju bakarnya nol untuk sekarang.",
    burnDone: "Kuota proyek ini sudah habis terbaca dari kontraknya.",
    eta: "Perkiraan habis",
    etaRange: "sekitar {a} sampai {b}",
    stOpen: "Sedang dibuka", stUpcoming: "Belum dibuka", stClosed: "Sudah tutup", stUnknown: "Waktu belum diumumkan",
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
  },
  en: {
    connect: "Connect Wallet", disconnect: "Disconnect", switchChain: "Switch to BNB Chain",
    headline: "Drop queues, counted in real people.",
    lede: "Convoy counts who actually intends to join Agent ID gated drops. Only Agent ID holders can signal, one name one signal, so the queue number cannot be inflated by duplicate wallets.",
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
    boardTitle: "Drop radar", refresh: "Refresh",
    boardHint: "The signal count is Agent ID holder intent. The minted count is what actually happened, read from the project contract. The two are always shown separately.",
    boardLoadingTitle: "The board is being read.",
    boardLoading: "Reading the queue board from the contract...",
    boardErrorTitle: "The board could not be read.",
    boardErrorBody: "The contract read failed. Old numbers are not shown as fresh data. Try again in a moment.",
    boardEmptyTitle: "No drops registered yet.",
    boardEmptyBody: "Once an Agent ID gated project registers its drop in the Convoy contract, its queue appears here.",
    notDeployedTitle: "The mainnet board is not live yet.",
    notDeployedBody: "The ConvoySignal contract is not deployed on BNB Chain mainnet yet, so there is no queue to show. This page's testnet mode shows the fully working board.",
    chipAll: "All", chipOpen: "Open now", chipUpcoming: "Not open yet", chipClosed: "Closed",
    showing: "Showing {x} of {y} drops",
    filterNoneTitle: "No drops under this filter.",
    filterNoneBody: "Loosen the filter to see other drops on the board.",
    mineTitle: "My queue",
    mineEmptyTitle: "Connect your wallet to see your queue.",
    mineEmptyBody: "After connecting, this panel shows which drops you have signaled and your remaining free quota by name, when the project contract offers that read.",
    mineNoneTitle: "You have not signaled any drop yet.",
    mineNoneBody: "Press Join the queue on a drop card to record your first signal. A signal can always be withdrawn.",
    meaningTitle: "What do the numbers on this board mean?",
    meaningBody: "A signal is a statement of intent from an Agent ID holder, not a guarantee that they will mint and not a promise of any result. The minted count is read from the project contract itself; a project whose counter cannot be verified is marked not recorded, never guessed. Convoy is not a safety rating: a long queue does not mean a drop contract is safe.",
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
    notRecorded: "Not recorded",
    notRecordedWhy: "This project contract offers no verifiable counter read, so Convoy does not guess the number.",
    quotaLeft: "Your remaining free quota",
    quotaNotRecorded: "Per-address quota is not recorded in this project contract.",
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
    burnWarming: "The burn rate starts after the next read; one read is not enough to compute a rate.",
    burnStill: "No new mints since this page opened, so the burn rate is zero for now.",
    burnDone: "This project quota reads as fully used from its contract.",
    eta: "Estimated to run out",
    etaRange: "about {a} to {b}",
    stOpen: "Open now", stUpcoming: "Not open yet", stClosed: "Closed", stUnknown: "Time not announced",
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
  },
};

let lang = "id";
let account = null;
let chainOk = false;
let provider = null;
let providerWired = false;

const $ = (id) => document.getElementById(id);

function t(key) {
  return STRINGS[lang][key] || STRINGS.id[key] || key;
}

function applyLang(next) {
  lang = next;
  document.documentElement.lang = next;
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

const board = {
  drops: [], // { id, drop, counter, samples: [{t, minted}], mySignal, quota }
  block: null,
  readAt: null,
  stale: false,
  loaded: false,
  failed: false,
  isHolder: null,
  filter: "all",
};

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
  if (!c || c.status !== "ok") return { kind: "missing" };
  if (c.cap !== null && c.minted >= c.cap) return { kind: "done" };
  const s = entry.samples;
  if (s.length < 2) return { kind: "warming" };
  const first = s[0];
  const last = s[s.length - 1];
  if (last.t - first.t < BURN_MIN_WINDOW_SEC) return { kind: "warming" };
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
    const ids = Array.from({ length: count }, (_, i) => i);
    const drops = await mapLimit(ids, 4, (id) => readDrop(id));
    const previous = new Map(board.drops.map((d) => [d.id, d]));
    const entries = drops.map((drop, id) => {
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
      };
    });
    board.drops = entries;
    board.block = Number(BigInt(await readRpc("eth_blockNumber", [])));
    board.readAt = new Date();
    board.stale = false;
    board.failed = false;
    board.loaded = true;
    renderFeatured();
    renderBoard();
    renderMine();
    // Counters, holder status and personal reads follow in the
    // background so the board paints its contract facts first.
    refreshEnrichment(entries);
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

/* Zone builders share one shape in two skins: the plate uses .zone
 * classes, the drop cards use .dzone classes. Signal (intent) and
 * minted (fact) are always separate zones. */
function zoneSignal(count, p) {
  const z = el("div", p + " " + p + "-signal");
  z.appendChild(el("p", p + "-key", t("zoneSignal")));
  z.appendChild(el("p", p + "-big", String(count)));
  z.appendChild(el("p", p + "-note", t("zoneSignalNote")));
  return z;
}

function zoneMinted(entry, p) {
  const z = el("div", p + " " + p + "-minted");
  z.appendChild(el("p", p + "-key", t("zoneMinted")));
  const c = entry.counter;
  if (!c || c.status === "missing") {
    z.appendChild(el("p", p + "-missing", t("notRecorded")));
    z.appendChild(el("p", p + "-note", t("zoneMintedNote")));
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
  z.appendChild(counterSrcLine(entry, c, p));
  return z;
}

/* Burn lines as plain paragraphs; the caller wraps them in
 * .plate-burn (plate) or appends them as .drop-burn (card). */
function burnParas(entry, cls) {
  const info = burnInfo(entry);
  const out = [];
  const rateRow = el("p", cls);
  rateRow.appendChild(el("strong", null, t("burnRate") + ": "));
  if (info.kind === "missing") {
    rateRow.appendChild(document.createTextNode(t("notRecordedWhy")));
  } else if (info.kind === "warming") {
    rateRow.appendChild(document.createTextNode(t("burnWarming")));
  } else if (info.kind === "still") {
    rateRow.appendChild(document.createTextNode(t("burnStill")));
  } else if (info.kind === "done") {
    rateRow.appendChild(document.createTextNode(t("burnDone")));
  } else {
    const rate = info.rateMin === info.rateMax
      ? info.rateMin.toFixed(2)
      : info.rateMin.toFixed(2) + " – " + info.rateMax.toFixed(2);
    rateRow.appendChild(document.createTextNode(rate + " " + t("burnPerMin")));
  }
  out.push(rateRow);
  if (info.kind === "live" && info.etaMin !== undefined) {
    const etaRow = el("p", cls);
    etaRow.appendChild(el("strong", null, t("eta") + ": "));
    etaRow.appendChild(document.createTextNode(
      t("etaRange").replace("{a}", formatDuration(info.etaMin)).replace("{b}", formatDuration(info.etaMax))
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

function queueDots(entry, max) {
  const count = Number(entry.drop.signalCount);
  const wrap = el("div", "queue-dots");
  wrap.setAttribute("role", "img");
  wrap.setAttribute("aria-label", count + " " + t("queuePeople"));
  const shown = Math.min(count, max);
  for (let i = 0; i < shown; i++) {
    const d = el("span", "qdot");
    if (i === 0 && entry.mySignal === true) d.classList.add("is-me");
    wrap.appendChild(d);
  }
  if (count > max) wrap.appendChild(el("span", "qdot-more", "+" + (count - max)));
  return wrap;
}

function statusClass(key) {
  return { open: "st-open", upcoming: "st-soon", unknown: "st-soon", closed: "st-closed" }[key];
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
    const plate = el("article", "plate");
    plate.appendChild(el("p", "plate-status", t("boardErrorTitle")));
    slot.appendChild(plate);
    caption.hidden = true;
    return;
  }
  if (!board.loaded || board.drops.length === 0) {
    caption.hidden = true;
    return; // keep the loading plate from the static HTML
  }
  slot.textContent = "";
  const entry = board.drops.reduce((a, b) => (b.drop.signalCount > a.drop.signalCount ? b : a), board.drops[0]);
  const plate = el("article", "plate");
  const st = windowStatus(entry.drop);
  plate.appendChild(el("p", "plate-status", statusText(st)));
  plate.appendChild(el("h3", "plate-label", entry.drop.label));
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
  plate.appendChild(win);
  plate.appendChild(queueDots(entry, 24));
  const zones = el("div", "plate-zones");
  zones.appendChild(zoneSignal(entry.drop.signalCount, "zone"));
  zones.appendChild(zoneMinted(entry, "zone"));
  plate.appendChild(zones);
  const burn = el("div", "plate-burn");
  for (const p of burnParas(entry, "")) burn.appendChild(p);
  plate.appendChild(burn);
  slot.appendChild(plate);
  caption.hidden = false;
  caption.textContent = t("featuredCaption");
}

function dropCard(entry) {
  const card = el("article", "drop-card");
  const top = el("div", "drop-top");
  top.appendChild(el("span", "drop-label", entry.drop.label));
  const st = windowStatus(entry.drop);
  top.appendChild(el("span", "drop-status " + statusClass(st), statusText(st)));
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
  const rRow = el("p", "drop-window");
  rRow.appendChild(document.createTextNode(t("registrar") + ": "));
  rRow.appendChild(monoAddr(entry.drop.registrar));
  card.appendChild(rRow);

  const zones = el("div", "drop-zones");
  zones.appendChild(zoneSignal(entry.drop.signalCount, "dzone"));
  zones.appendChild(zoneMinted(entry, "dzone"));
  card.appendChild(zones);
  for (const p of burnParas(entry, "drop-burn")) card.appendChild(p);

  const actions = el("div", "drop-actions");
  if (entry.mySignal === true) {
    actions.appendChild(el("span", "sig-status sig-on", t("youSignaled")));
  }
  let btn = null;
  let whyText = "";
  if (!account) {
    btn = el("button", "btn btn-primary", t("signalBtn"));
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
    btn = el("button", "btn btn-primary", t("signalBtn"));
    btn.type = "button";
    if (board.isHolder === null || entry.mySignal === null) btn.disabled = true;
    btn.addEventListener("click", () => openSheet("signal", entry));
  }
  if (btn) actions.appendChild(btn);
  card.appendChild(actions);
  if (whyText) card.appendChild(el("p", "why", whyText));

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
  const counts = { all: board.drops.length, open: 0, upcoming: 0, closed: 0 };
  for (const e of board.drops) {
    const st = windowStatus(e.drop);
    if (st === "open" || st === "unknown") counts.open++;
    else if (st === "upcoming") counts.upcoming++;
    else counts.closed++;
  }
  const defs = [
    ["all", t("chipAll")],
    ["open", t("chipOpen")],
    ["upcoming", t("chipUpcoming")],
    ["closed", t("chipClosed")],
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
  line.textContent = t("showing").replace("{x}", String(visible)).replace("{y}", String(board.drops.length));
}

function filteredDrops() {
  if (board.filter === "all") return board.drops;
  return board.drops.filter((e) => {
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

function renderBoard() {
  const list = $("drop-list");
  const asof = $("board-asof");
  list.textContent = "";
  if (!CONFIG.convoyAddress) {
    renderChipsHidden();
    list.appendChild(stateBlock("notDeployedTitle", "notDeployedBody"));
    asof.textContent = "";
    return;
  }
  $("filter-chips").hidden = false;
  if (!board.loaded && !board.failed) {
    list.appendChild(stateBlock("boardLoadingTitle", "boardLoading"));
    return;
  }
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
      for (const entry of visible) list.appendChild(dropCard(entry));
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
}

function renderChipsHidden() {
  $("filter-chips").hidden = true;
  $("count-line").textContent = "";
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
    const top = el("div", "row-top");
    top.appendChild(el("span", "drop-label", entry.drop.label));
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

(async function init() {
  applyLang("id");
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
