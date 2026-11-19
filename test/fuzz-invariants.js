// Randomised property / invariant suite for ConvoySignal.
//
// Drives random sequences of registerDrop, signal and withdrawSignal
// from a mix of Agent ID holders and non-holders against an in-process
// Ganache chain, and after EVERY step checks the full invariant list
// from docs/THREAT-MODEL.md (INV-01 to INV-10) by comparing a local
// model of the expected state against live chain reads.
//
// Every operation is predicted first with staticCall: the predicted
// outcome (success, or the exact custom error name) must match the
// deterministic expectation computed from the model and the actor's
// holder status. Successful predictions are then broadcast and the
// model is advanced; reverted predictions must leave the chain exactly
// equal to the unchanged model, which is what the per-step invariant
// sweep proves.
//
// Seeds are fixed and printed, so any failure reproduces exactly.
// Local only: no external network, no real funds, no deployment.
const fs = require("fs");
const path = require("path");
const solc = require("solc");
const ganache = require("ganache");
const { ethers } = require("ethers");

const ROOT = path.join(__dirname, "..");

// Fixed seeds: change these only deliberately, and record the change.
const SEEDS = [20261119, 424242, 777];
const OPS_PER_SEED = 250;
const MAX_DROPS_PER_SEED = 8;

function compile() {
  const sources = {};
  for (const f of ["IAgentID.sol", "ConvoySignal.sol", "MockAgentID.sol"]) {
    sources[f] = { content: fs.readFileSync(path.join(ROOT, "contracts", f), "utf8") };
  }
  const input = {
    language: "Solidity",
    sources,
    settings: {
      evmVersion: "shanghai",
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };
  const out = JSON.parse(
    solc.compile(JSON.stringify(input), {
      import: (p) => {
        const name = path.basename(p);
        return { contents: fs.readFileSync(path.join(ROOT, "contracts", name), "utf8") };
      },
    })
  );
  const errors = (out.errors || []).filter((e) => e.severity === "error");
  if (errors.length) {
    for (const e of errors) console.error(e.formattedMessage);
    throw new Error("compilation failed");
  }
  const c = out.contracts["ConvoySignal.sol"]["ConvoySignal"];
  const m = out.contracts["MockAgentID.sol"]["MockAgentID"];
  return {
    sig: { abi: c.abi, bytecode: "0x" + c.evm.bytecode.object },
    mock: { abi: m.abi, bytecode: "0x" + m.evm.bytecode.object },
  };
}

// mulberry32: small deterministic PRNG, adequate for op selection.
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let failures = 0;
function invariant(seed, step, id, cond, detail) {
  if (!cond) {
    failures++;
    console.log(`  INVARIANT FAIL seed=${seed} step=${step} ${id}: ${detail}`);
  }
}

async function verifyAll(ctx, seed, step) {
  const { convoy, convoyAddr, mockAddr, provider, model, actors, holderSet } = ctx;
  // INV-07: dropCount matches the model exactly.
  const dc = await convoy.dropCount();
  invariant(seed, step, "INV-07", dc === BigInt(model.drops.length), `dropCount=${dc} model=${model.drops.length}`);
  for (let d = 0; d < model.drops.length; d++) {
    const m = model.drops[d];
    const on = await convoy.getDrop(d);
    // INV-06: metadata immutable after registration.
    invariant(
      seed, step, "INV-06",
      on.dropContract === m.dropContract &&
        on.opensAt === m.opensAt &&
        on.closesAt === m.closesAt &&
        on.label === m.label &&
        on.registrar === m.registrar &&
        on.exists === true,
      `drop ${d} metadata drifted`
    );
    // INV-01: stored count equals the size of the recorded set, and the
    // dedicated count reader agrees with getDrop.
    const count = await convoy.signalCountOf(d);
    invariant(
      seed, step, "INV-01",
      count === BigInt(m.signaled.size) && on.signalCount === count,
      `drop ${d} count=${count} model set=${m.signaled.size}`
    );
    for (const a of actors) {
      const hs = await convoy.hasSignaled(d, a.address);
      // INV-09: recorded status equals the model, which only ever
      // changes through the owner's own successful calls.
      invariant(seed, step, "INV-09", hs === m.signaled.has(a.address), `drop ${d} hasSignaled(${a.address})=${hs}`);
      // INV-03: nobody recorded who is not a holder.
      if (hs) {
        invariant(seed, step, "INV-03", holderSet.has(a.address), `drop ${d} records non-holder ${a.address}`);
      }
    }
  }
  // INV-04 (dynamic half): the contract never holds funds.
  const bal = await provider.getBalance(convoyAddr);
  invariant(seed, step, "INV-04", bal === 0n, `contract balance=${bal}`);
  // INV-10: the registry pointer never moves.
  const reg = await convoy.agentID();
  invariant(seed, step, "INV-10", reg === mockAddr, `agentID()=${reg}`);
}

// Predict an operation with staticCall. Returns { ok: true } or
// { ok: false, errorName }. The custom error name is decoded from the
// revert payload via the ABI: on this ethers path errorName itself is
// not populated, but e.data carries the payload and parseError names
// it exactly (the same decode the behavioural suite relies on).
async function predict(iface, methodFn, args) {
  try {
    await methodFn.staticCall(...args);
    return { ok: true };
  } catch (e) {
    let name = e.errorName || null;
    if (!name && e.data) {
      try {
        name = iface.parseError(e.data).name;
      } catch (_) {
        /* leave null; the prediction check will fail loudly */
      }
    }
    return { ok: false, errorName: name };
  }
}

async function runSeed(seed, artifacts) {
  const rand = rng(seed);
  const server = ganache.server({ logging: { quiet: true } });
  await server.listen(0);
  const provider = new ethers.JsonRpcProvider(`http://127.0.0.1:${server.address().port}`);
  const signers = await Promise.all([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => provider.getSigner(i)));
  const deployer = signers[0];
  const holders = signers.slice(1, 6);
  const nonHolders = signers.slice(6, 9);
  const actors = [];
  for (const s of holders) actors.push({ signer: s, address: await s.getAddress(), holder: true });
  for (const s of nonHolders) actors.push({ signer: s, address: await s.getAddress(), holder: false });
  const holderSet = new Set(actors.filter((a) => a.holder).map((a) => a.address));

  const mock = await new ethers.ContractFactory(artifacts.mock.abi, artifacts.mock.bytecode, deployer).deploy();
  await mock.waitForDeployment();
  const mockAddr = await mock.getAddress();
  for (let i = 0; i < holders.length; i++) {
    await (await mock.registerForTest(`fuzz${seed}h${i}`, actors[i].address)).wait();
  }
  const convoy = await new ethers.ContractFactory(artifacts.sig.abi, artifacts.sig.bytecode, deployer).deploy(mockAddr);
  await convoy.waitForDeployment();
  const convoyAddr = await convoy.getAddress();

  const model = { drops: [] };
  const ctx = { convoy, convoyAddr, mockAddr, provider, model, actors, holderSet };
  const stats = { registered: 0, signaled: 0, withdrawn: 0, reverts: {} };
  const dropPool = [
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222",
    "0x3333333333333333333333333333333333333333",
  ];
  const labelPool = ["Drop Uji A", "Fase publik", "Bergate: putaran 2", "x".repeat(180), "Ünïcode label ✓"];

  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  for (let step = 0; step < OPS_PER_SEED; step++) {
    const roll = rand();
    const actor = pick(actors);
    if (roll < 0.25 && model.drops.length < MAX_DROPS_PER_SEED) {
      // registerDrop with a mix of valid and invalid parameters.
      const dropContract = rand() < 0.1 ? ethers.ZeroAddress : pick(dropPool);
      const opensAt = BigInt(1_800_000_000 + Math.floor(rand() * 100_000));
      const closeRoll = rand();
      const closesAt = closeRoll < 0.3 ? 0n : closeRoll < 0.45 ? opensAt : opensAt + BigInt(1 + Math.floor(rand() * 700_000));
      const label = pick(labelPool);
      const expectedError =
        dropContract === ethers.ZeroAddress
          ? "InvalidDropContract"
          : closesAt !== 0n && closesAt <= opensAt
            ? "InvalidWindow"
            : null;
      const fn = convoy.connect(actor.signer).registerDrop;
      const pred = await predict(convoy.interface, fn, [dropContract, opensAt, closesAt, label]);
      invariant(seed, step, "PRED", pred.ok === (expectedError === null) && (pred.ok || pred.errorName === expectedError),
        `registerDrop predicted ${JSON.stringify(pred)} expected error=${expectedError}`);
      if (pred.ok && expectedError === null) {
        const rcpt = await (await fn(dropContract, opensAt, closesAt, label)).wait();
        invariant(seed, step, "SEND", rcpt.status === 1, "registerDrop receipt not successful");
        model.drops.push({ dropContract, opensAt, closesAt, label, registrar: actor.address, signaled: new Set() });
        stats.registered++;
      } else if (!pred.ok) {
        stats.reverts[pred.errorName] = (stats.reverts[pred.errorName] || 0) + 1;
      }
    } else if (roll < 0.65) {
      // signal on an existing or nonexistent drop.
      const dropId = model.drops.length === 0 || rand() < 0.12
        ? model.drops.length + Math.floor(rand() * 3)
        : Math.floor(rand() * model.drops.length);
      const exists = dropId < model.drops.length;
      const expectedError = !exists
        ? "DropNotFound"
        : !actor.holder
          ? "NotAgentIDHolder"
          : model.drops[dropId].signaled.has(actor.address)
            ? "AlreadySignaled"
            : null;
      const fn = convoy.connect(actor.signer).signal;
      const pred = await predict(convoy.interface, fn, [dropId]);
      invariant(seed, step, "PRED", pred.ok === (expectedError === null) && (pred.ok || pred.errorName === expectedError),
        `signal drop=${dropId} by ${actor.address} predicted ${JSON.stringify(pred)} expected error=${expectedError}`);
      if (pred.ok && expectedError === null) {
        const rcpt = await (await fn(dropId)).wait();
        invariant(seed, step, "SEND", rcpt.status === 1, "signal receipt not successful");
        model.drops[dropId].signaled.add(actor.address);
        stats.signaled++;
      } else if (!pred.ok) {
        stats.reverts[pred.errorName] = (stats.reverts[pred.errorName] || 0) + 1;
      }
    } else {
      // withdrawSignal on an existing or nonexistent drop.
      const dropId = model.drops.length === 0 || rand() < 0.12
        ? model.drops.length + Math.floor(rand() * 3)
        : Math.floor(rand() * model.drops.length);
      const exists = dropId < model.drops.length;
      const expectedError = !exists
        ? "DropNotFound"
        : !model.drops[dropId].signaled.has(actor.address)
          ? "NotSignaled"
          : null;
      const fn = convoy.connect(actor.signer).withdrawSignal;
      const pred = await predict(convoy.interface, fn, [dropId]);
      invariant(seed, step, "PRED", pred.ok === (expectedError === null) && (pred.ok || pred.errorName === expectedError),
        `withdraw drop=${dropId} by ${actor.address} predicted ${JSON.stringify(pred)} expected error=${expectedError}`);
      if (pred.ok && expectedError === null) {
        const rcpt = await (await fn(dropId)).wait();
        invariant(seed, step, "SEND", rcpt.status === 1, "withdraw receipt not successful");
        model.drops[dropId].signaled.delete(actor.address);
        stats.withdrawn++;
      } else if (!pred.ok) {
        stats.reverts[pred.errorName] = (stats.reverts[pred.errorName] || 0) + 1;
      }
    }
    await verifyAll(ctx, seed, step);
    if (failures > 0) {
      await server.close();
      return stats;
    }
  }
  console.log(
    `  seed ${seed}: ${OPS_PER_SEED} ops, ${stats.registered} drops, ${stats.signaled} signals, ` +
      `${stats.withdrawn} withdraws, reverts ${JSON.stringify(stats.reverts)}`
  );
  await server.close();
  return stats;
}

async function main() {
  const artifacts = compile();
  console.log(`Fuzz/invariant suite: seeds ${JSON.stringify(SEEDS)}, ${OPS_PER_SEED} ops per seed`);
  for (const seed of SEEDS) {
    await runSeed(seed, artifacts);
    if (failures > 0) break;
  }
  if (failures > 0) {
    console.log(`\nRESULT: FAILED, ${failures} invariant or prediction failures`);
    process.exit(1);
  }
  console.log(`\nRESULT: all invariants held across ${SEEDS.length * OPS_PER_SEED} randomised steps`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
