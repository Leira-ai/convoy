# Agent ID Registry: Verified ABI Notes (Sourcify, 19 Nov 2026)

Contract: `0x60b9262456de011f7d15a54cdd8c48baaa8b022f`, BNB Chain (chainId 56).
Source: Sourcify full match for the SPACE ID Agent ID contract, fetched 19 Nov 2026.
Verified contract name: SPACE ID Agent ID, symbol `AI`, ERC-721 soulbound (it throws a dedicated `Soulbound` error on transfer attempts).

## The one function Convoy uses

| Function | Signature | Mutability | Used for |
|---|---|---|---|
| `balanceOf` | `balanceOf(address) returns (uint256)` | view | The holder gate inside `ConvoySignal.signal`: the caller must hold an Agent ID (`balanceOf(msg.sender) > 0`) before a signal is recorded. Greater than 0 means the address holds an Agent ID; this is also the exact check the hackathon organiser prescribes for counting interacting Agent ID addresses. |

ConvoySignal never writes to the registry and never calls any other registry function. The interface in `contracts/IAgentID.sol` declares the registry's read surface for reference; only `balanceOf` is exercised by the production contract.

## Registry facts that shape the design

- One Agent ID per address in practice, and IDs are non-transferable (soulbound). That is what makes a Convoy queue count a count of people rather than a count of wallets: an address cannot multiply its ID, and an ID cannot be lent.
- Registration on the registry itself is gated by an official EIP-712 signer (`register(handle, deadline, sig)`); it is a platform flow, not something Convoy calls or replicates.
- The registry is not ERC-721Enumerable: there is no `totalSupply` or owner enumeration. Convoy therefore never tries to enumerate holders from the registry; it only checks the caller in front of it.
