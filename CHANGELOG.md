# Changelog

## 0.6.0, Fix round after the first human test session (19 Nov 2026)

- The first human test session (tester P-01, the product owner and
  an Agent ID holder, on an Android phone; observation sheet in
  `docs/USER-TEST-KIT.md` section 6.8) failed the five-second check,
  partially passed A1, passed A2 with a finding, and failed A3. This
  release is the page-layer fix round for those findings. No
  contract changed and the Queue Plate element is untouched.
- Theme toggle: the bare icon button is now an icon plus a text
  label that names the current theme (moon plus Gelap in dark mode,
  sun plus Terang in light mode), with a matching aria-label.
- Board order and open status: the board is sorted with not yet open
  drops first by nearest opening, then open, then unknown, then
  closed. Every card carries a plain status badge (Belum buka,
  Buka, Tutup) with its relevant times, and the nearest upcoming
  card is marked Berikutnya with an outline. One new testnet example
  drop with a future opening time was registered (drop 5, pointing
  at the existing MockAgentID testnet contract) so the not yet open
  state is really visible and tested.
- No public reading wording: the old not recorded presentation is
  replaced everywhere it appears, in both languages, with "Tidak
  ada bacaan publik" plus the explanation that the contract does
  not publish a minted count, Convoy does not display one, and it
  is not a zero.
- Burn panel: every card always shows its burn panel state
  explicitly, either an ETA range with its sample window when the
  data is sufficient, or one plain line stating the burn rate
  cannot be calculated yet and why (no reading yet, only one
  reading recorded waiting for a second, sample window under 15
  seconds, no public reading, disagreeing readings, or quota
  finished).
- Calibration cleanup: the Stage 3 calibration drops carry a DATA
  UJI KALIBRASI badge via a page-layer curation list keyed by
  contract address, and the board has a "Sembunyikan data uji"
  toggle, on by default, so the default board shows only the main
  example drops. The mock contracts stay alive on testnet as
  calibration evidence; mainnet starts from an empty board and the
  contract deliberately has no delete function.

## 0.5.0, Stage 4 closed by exception plus the feedback feature (19 Nov 2026)

- Stage 4 (real-user task testing) was closed by an explicit
  exception from Leira: recruiting 3 to 5 real Agent ID holders was
  too hard for her right now, so the stage ran as a structured
  self-test by the builder against the kit's own Part A tasks, plus
  this feedback feature so real users can report problems once they
  use the product. The self-test is NOT equivalent to real-user
  testing and the docs say so plainly: the Developer Mode walk in a
  tester's own Binance app (task A7) remains unproven on humans
  until Part B runs after mainnet. Full record in
  `docs/USER-TEST-KIT.md`.
- Feedback feature on the page: an always-visible in-flow section
  with a button opening a dialog with a short form (category:
  confusing, wrong number, button does not work, suggestion, other;
  free text; a drop picker). The automatic context (network mode,
  the drop the report is about, page version, language) is rendered
  in the dialog before anything is sent, and the dialog states up
  front that the feedback becomes a public GitHub issue. Sending
  composes a draft and opens the prefilled new-issue page of this
  repo; a copy-text button is the fallback. No backend, and no
  personal data is requested. A matching issue template lives in
  `.github/ISSUE_TEMPLATE/feedback.md`. The feature was added to
  `docs/SCOPE-FREEZE.md` before it was built, per that file's own
  change process.

## 0.4.0, Stage 3: data layer calibration (19 Nov 2026)

- Counter adapters for exactly three proven drop patterns
  (per-address quota, ERC-721 supply, no public reading),
  specified once and implemented identically by the calibration
  harness and the page. Full evidence in
  `docs/DATA-CALIBRATION.md`.
- Two purpose-built mock drop contracts deployed on BSC testnet
  with script-recorded ground truth; adapter readings matched
  ground truth exactly from two independent RPCs at one pinned
  block, including exhausted-quota and not-started edge cases.
  The disagreement branch was proven with real chain data (a
  counter read across a mint block boundary), and four mocks are
  registered as live drops so the board shows calibrated data.
- Number honesty rules on the page: every minted and quota
  figure carries a source line (function, contract, block, read
  time, corroboration), a 90-second freshness threshold with a
  visible stale label, zero-tolerance dual-RPC reconciliation
  that hides disputed numbers instead of picking a side, and a
  burn rate computed only from verified samples with its sample
  window stated on the label.
- Fixed a real defect found by tapping the page's own RPC calls:
  enrichment results were written to entry objects captured at
  cycle start and were lost when the next refresh replaced them,
  so later drops' readings never rendered on a slow transport.
  Results now land on the live entry by id and persist across
  cycles. Regression: full test suite green and the page signal
  flow re-proven end to end on testnet with on-chain
  reconciliation. The ConvoySignal contract is unchanged.

## 0.3.0, Stage 1 and Stage 2: scope freeze and security gate (19 Nov 2026)

- Scope frozen in `docs/SCOPE-FREEZE.md`: what runs, what is
  deferred, and what is discarded, each with a one-line reason.
  No feature enters after this file without amending it first.
- Threat model and a numbered, machine-testable invariant list
  (INV-01 to INV-10) written in `docs/THREAT-MODEL.md`.
- Randomised invariant fuzz added (`test/fuzz-invariants.js`):
  fixed seeds, 250 operations per seed across holders and
  non-holders, with the full invariant list checked after every
  step. `npm test` now runs the behaviour suite and the fuzz.
- Static analysis: Slither 0.11.6 run against ConvoySignal; its
  single finding triaged in writing, and an OWASP SCSVS control
  map for this contract's surface completed, both in
  `docs/SECURITY-GATE.md`.
- Public repository opened with README, agent.md, MIT licence,
  docs, and CI running both test suites on every push.

## 0.2.0, frontend slice (19 Nov 2026)

- Drop board live on the testnet preview: queue counts and minted
  counters in strictly separate zones, burn rate and an honest
  time-to-sold-out range, NOT AVAILABLE instead of guessed numbers
  when a drop's counter cannot be read.
- Signal and withdraw driven from the page through the product's
  own transaction adapter: hand-rolled Keccak/ABI codec verified
  against ethers, EIP-6963 provider discovery, fail-closed
  simulation before every signature, plain-words confirmation
  sheets, contract errors mapped to human sentences in ID and EN.
- Personal queue panel (my signals per drop, per-address free
  quota where the drop's contract exposes a recognised read).
- Queue Plate hero built from real testnet data; Gate 2 screenshot
  matrix (320 to 1920, both themes) inspected one by one, zero
  horizontal overflow, computed contrast 66 of 66 pairs passing.
- Mainnet mode present but fail-closed: no mainnet contract exists
  yet, so the board shows the not-live state and refuses to send.

## 0.1.0, testnet proof (19 Nov 2026)

- ConvoySignal deployed on BSC Testnet against a mock Agent ID
  registry; the live flow proven on the public chain: drop
  registered, holder signal counted, duplicate and non-holder
  signals shown to revert by decoded simulation (never broadcast),
  second holder signal counted, withdraw restoring the count, and
  the final state read back consistently from a second RPC.
- Behaviour suite: 35 checks passing twice with identical results
  (holder gate, one signal per holder per drop, spoof-proof by
  construction, withdraw rules, no funds and no admin surface).
- Source verified as a Sourcify exact match on chain 97.
