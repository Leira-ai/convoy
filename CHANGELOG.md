# Changelog

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
