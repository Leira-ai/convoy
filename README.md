# Convoy

**See the real queue before the drop opens.** Convoy is a live demand
radar for Agent ID gated drops on BNB Chain. Holders of an Agent ID
(`.ai`) signal "I am queueing for this drop" to the ConvoySignal
contract; because an Agent ID is soulbound and one per person, the
queue length is a count of real people, not a count of wallets that
anyone can multiply for free. The board pairs that queue with each
drop's own minted counter, burn rate, and an honest time-to-sold-out
range read straight from the drop's contract.

Built for the Binance Wallet x BNB Chain Agent ID Hackathon
(submission period 18 Nov to 9 Dec 2026).

## Live status (honest, dated 19 Nov 2026)

- **Testnet: live and proven end to end.** ConvoySignal is deployed
  on BSC Testnet (chain 97) against a mock Agent ID registry. The
  full signal flow was executed on the public chain (register a drop,
  holder signals, duplicate signal reverts, non-holder signal
  reverts, second holder signals, withdraw) and read back
  consistently from two independent RPCs. The product page drives
  the same flow through its own transaction adapter.
- **Mainnet: NOT deployed yet.** The contract has not been deployed
  to BNB Chain, and the web app's mainnet mode is deliberately
  fail-closed (it shows a not-live board and refuses to send). Any
  address claiming to be ConvoySignal on mainnet before an update
  to this file is not this project.
- Product preview (testnet mode):
  https://convoy.utterhq.workers.dev/?network=testnet

## Contracts

| Network | Contract | Address |
|---|---|---|
| BSC Testnet (97) | ConvoySignal | `0x8Ff3485841faBE8384dEec61BCb948c16766312d` |
| BSC Testnet (97) | MockAgentID (test registry) | `0x9eB7a9063Ce499a619F142A3a344BfBb2D23De19` |
| BNB Chain (56) | Agent ID registry (SPACE ID, the gate target for a future mainnet deploy) | `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` |

Testnet source verification: Sourcify **exact match** (creation and
runtime) for ConvoySignal on chain 97, verified 2026-11-19,
matchId 59511523:
https://repo.sourcify.dev/contracts/full_match/97/0x8Ff3485841faBE8384dEec61BCb948c16766312d/

## How it works

1. **Register a drop.** Anyone, including the project itself, calls
   `registerDrop(dropContract, opensAt, closesAt, label)`.
   Registration alone carries no demand; a junk registration simply
   shows up as a drop with an empty queue.
2. **Signal.** An Agent ID holder calls `signal(dropId)`. The
   contract checks `balanceOf` on the Agent ID registry in the same
   transaction; non-holders revert. One active signal per holder per
   drop, enforced on-chain. A signal is always recorded for
   `msg.sender`; the function takes no address argument, so
   signalling for someone else is impossible by construction.
3. **Withdraw.** `withdrawSignal(dropId)` removes the caller's own
   signal. It is not gated on current holder status, so a signal can
   always be cancelled by its owner.
4. **Read the board.** The page reads the queue from ConvoySignal
   and the minted counter from each drop's own contract (only via
   counter reads the blueprint recognises). Burn rate is the change
   in minted over time between reads; time-to-sold-out is shown as a
   range, never a single invented point. When a drop's counter
   cannot be read, the panel says NOT AVAILABLE instead of guessing.

A signal is a statement of intent, not a mint guarantee, and the
board always presents the queue (intent) separately from minted
figures (events that already happened).

## Who can do what (security model)

- **Holders** can signal and withdraw their own signal. Nobody else
  can create, edit, or remove it.
- **Anyone** can register a drop to be tracked. Registration cannot
  inflate any queue: only holder signals count.
- **Nobody** can move funds through ConvoySignal. The contract has
  no payable function, no withdraw, sweep, or pause, **no owner and
  no admin functions at all**, and its registry address is immutable
  after deployment.

The full threat model and the machine-tested invariant list live in
`docs/THREAT-MODEL.md`; the Stage 2 security gate (static analysis
triage and the OWASP SCSVS control map) lives in
`docs/SECURITY-GATE.md`.

## Repository layout

- `contracts/` ConvoySignal, the read-only IAgentID interface, and
  the test-only MockAgentID registry double.
- `test/` Ganache behaviour suite (`run-tests.js`, 35 checks) and
  the randomised invariant fuzz (`fuzz-invariants.js`, fixed seeds,
  every step checked against the invariant list).
- `web/` The product: a single dependency-free page (HTML, CSS, JS)
  with a hand-rolled EIP-1193/EIP-6963 wallet adapter, simulation
  before every signature, and plain-words confirmation sheets in
  ID and EN.
- `docs/` The product blueprint, scope freeze, threat model and
  invariants, security gate, verified Agent ID ABI notes, and the
  design plan.
- `agent.md` A machine-readable product description for agents.

## Run the tests

```bash
npm ci
npm test   # behaviour suite (35 checks) + invariant fuzz (750 randomised steps)
node --check web/app.js
```

CI (GitHub Actions) runs both suites and the syntax check on every
push.

## Licence

MIT. See `LICENSE`.
