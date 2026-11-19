// Compile ConvoySignal + test doubles with solc-js and run the
// behavioural test suite against an in-process Ganache chain. Local
// only: no external network, no real funds, no deployment anywhere.
const fs = require("fs");
const path = require("path");
const solc = require("solc");
const ganache = require("ganache");
const { ethers } = require("ethers");

const ROOT = path.join(__dirname, "..");

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
  const warnings = (out.errors || []).filter((e) => e.severity === "warning");
  if (errors.length) {
    for (const e of errors) console.error(e.formattedMessage);
    throw new Error("compilation failed");
  }
  fs.mkdirSync(path.join(ROOT, "build"), { recursive: true });
  for (const name of ["ConvoySignal", "MockAgentID"]) {
    const file = name === "ConvoySignal" ? "ConvoySignal.sol" : "MockAgentID.sol";
    const c = out.contracts[file][name];
    fs.writeFileSync(
      path.join(ROOT, "build", `${name}.json`),
      JSON.stringify({ abi: c.abi, bytecode: "0x" + c.evm.bytecode.object }, null, 2)
    );
  }
  return { warnings: warnings.length, solcVersion: solc.version() };
}

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}`);
  }
}

// Assert a contract method reverts with a specific custom error.
// Uses staticCall: ethers v6 decodes custom errors from the ABI on
// that path (errorName), while the send path fails earlier inside
// estimateGas with an opaque "missing revert data" error that hides
// which custom error fired.
async function expectRevert(name, methodFn, args, needle) {
  try {
    await methodFn.staticCall(...args);
    check(`${name} (expected revert ${needle}, staticCall succeeded)`, false);
  } catch (e) {
    const ok = !needle || e.errorName === needle || (e.message || "").includes(needle);
    if (!ok) console.log(`    revert detail: errorName=${e.errorName} msg=${(e.message || "").slice(0, 200)}`);
    check(name, ok);
  }
}
function findEvent(receipt, iface, eventName) {
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === eventName) return parsed;
    } catch (_) {
      /* not this contract's log */
    }
  }
  return null;
}

async function main() {
  const { warnings, solcVersion } = compile();
  console.log(`Compiled OK with solc ${solcVersion}; warnings: ${warnings}`);

  const server = ganache.server({ logging: { quiet: true } });
  await server.listen(0);
  const port = server.address().port;
  const provider = new ethers.JsonRpcProvider(`http://127.0.0.1:${port}`);
  const [deployer, holderA, holderB, stranger, registrar] = await Promise.all(
    [0, 1, 2, 3, 4].map((i) => provider.getSigner(i))
  );
  const holderAAddr = await holderA.getAddress();
  const holderBAddr = await holderB.getAddress();
  const strangerAddr = await stranger.getAddress();
  const registrarAddr = await registrar.getAddress();

  const mockJson = JSON.parse(fs.readFileSync(path.join(ROOT, "build", "MockAgentID.json"), "utf8"));
  const sigJson = JSON.parse(fs.readFileSync(path.join(ROOT, "build", "ConvoySignal.json"), "utf8"));

  const mock = await new ethers.ContractFactory(mockJson.abi, mockJson.bytecode, deployer).deploy();
  await mock.waitForDeployment();
  const convoy = await new ethers.ContractFactory(sigJson.abi, sigJson.bytecode, deployer).deploy(
    await mock.getAddress()
  );
  await convoy.waitForDeployment();
  const convoyAddr = await convoy.getAddress();
  console.log(`MockAgentID: ${await mock.getAddress()}`);
  console.log(`ConvoySignal: ${convoyAddr}`);

  // Setup: holderA and holderB own Agent IDs; stranger and registrar do not.
  await (await mock.registerForTest("pemburua", holderAAddr)).wait();
  await (await mock.registerForTest("pemburub", holderBAddr)).wait();
  check("mock registry: holderA balanceOf is 1", (await mock.balanceOf(holderAAddr)) === 1n);
  check("mock registry: stranger balanceOf is 0", (await mock.balanceOf(strangerAddr)) === 0n);

  console.log("\n-- constructor gate --");
  {
    // Decode the constructor revert from a creation eth_call: the
    // send path hides custom errors the same way estimateGas does.
    const iface = new ethers.Interface(sigJson.abi);
    const initCode =
      sigJson.bytecode + iface.encodeDeploy([ethers.ZeroAddress]).slice(2);
    let errName = null;
    try {
      await provider.call({ from: await deployer.getAddress(), data: initCode });
    } catch (e) {
      const data = e.data || (e.info && e.info.error && e.info.error.data) || null;
      if (data) {
        try {
          errName = iface.parseError(data).name;
        } catch (_) {
          /* leave null */
        }
      }
      if (!errName && (e.message || "").includes("InvalidRegistry")) errName = "InvalidRegistry";
    }
    check("deploy with zero registry reverts InvalidRegistry", errName === "InvalidRegistry");
  }
  check("registry address is the mock", (await convoy.agentID()) === (await mock.getAddress()));

  console.log("\n-- registerDrop --");
  const OPEN = 1_800_000_000n;
  const CLOSE = 1_800_604_800n;
  const fakeDrop = "0x1111111111111111111111111111111111111111";
  await expectRevert(
    "registerDrop with zero contract reverts",
    convoy.connect(registrar).registerDrop,
    [ethers.ZeroAddress, OPEN, CLOSE, "Nol"],
    "InvalidDropContract"
  );
  await expectRevert(
    "registerDrop with closesAt <= opensAt reverts",
    convoy.connect(registrar).registerDrop,
    [fakeDrop, CLOSE, OPEN, "Kebalik"],
    "InvalidWindow"
  );
  // Registration is open: even a non-holder may register a drop.
  const regTx = await convoy
    .connect(registrar)
    .registerDrop(fakeDrop, OPEN, CLOSE, "Proyek Uji: fase publik");
  const regRcpt = await regTx.wait();
  check("registerDrop by non-holder registrar succeeds", (await convoy.dropCount()) === 1n);
  const regEv = findEvent(regRcpt, convoy.interface, "DropRegistered");
  check(
    "DropRegistered event carries id, contract, registrar",
    !!regEv && regEv.args.dropId === 0n && regEv.args.dropContract === fakeDrop && regEv.args.registrar === registrarAddr
  );
  const d0 = await convoy.getDrop(0);
  check(
    "drop stores contract, window, label, registrar",
    d0.dropContract === fakeDrop &&
      d0.opensAt === OPEN &&
      d0.closesAt === CLOSE &&
      d0.label === "Proyek Uji: fase publik" &&
      d0.registrar === registrarAddr &&
      d0.signalCount === 0n &&
      d0.exists === true
  );
  // closesAt = 0 (unknown close) is accepted.
  await (await convoy.connect(holderA).registerDrop(fakeDrop, OPEN, 0, "Proyek Uji: fase dua")).wait();
  check("registerDrop with unknown close time succeeds", (await convoy.dropCount()) === 2n);
  await expectRevert("getDrop on missing drop reverts", convoy.getDrop, [99], "DropNotFound");

  console.log("\n-- signal gates --");
  await expectRevert("signal by non-holder reverts", convoy.connect(stranger).signal, [0], "NotAgentIDHolder");
  check("failed signal leaves count at 0", (await convoy.signalCountOf(0)) === 0n);
  await expectRevert("signal on missing drop reverts", convoy.connect(holderA).signal, [99], "DropNotFound");
  const sigTx = await convoy.connect(holderA).signal(0);
  const sigRcpt = await sigTx.wait();
  const sigEv = findEvent(sigRcpt, convoy.interface, "Signaled");
  check("Signaled event names the caller", !!sigEv && sigEv.args.account === holderAAddr);
  check("holder signal succeeds, count 1", (await convoy.signalCountOf(0)) === 1n);
  check("hasSignaled true for holderA", (await convoy.hasSignaled(0, holderAAddr)) === true);
  await expectRevert(
    "second signal by same holder on same drop reverts",
    convoy.connect(holderA).signal,
    [0],
    "AlreadySignaled"
  );
  check("duplicate signal does not inflate the count", (await convoy.signalCountOf(0)) === 1n);
  await (await convoy.connect(holderB).signal(0)).wait();
  check("second holder raises count to 2", (await convoy.signalCountOf(0)) === 2n);

  console.log("\n-- no spoofing surface --");
  // signal() takes no address argument: a caller can only ever signal
  // for itself. A non-holder trying to act leaves every other
  // account's state untouched.
  check(
    "signal has no address parameter (spoofing is structural)",
    !sigJson.abi.some((x) => x.type === "function" && x.name === "signal" && x.inputs.length !== 1)
  );
  await expectRevert("non-holder still cannot signal", convoy.connect(stranger).signal, [1], "NotAgentIDHolder");
  check("holderB has not signaled drop 1", (await convoy.hasSignaled(1, holderBAddr)) === false);
  await (await convoy.connect(holderA).signal(1)).wait();
  check("holderA signal on drop 1 counts only there", (await convoy.signalCountOf(1)) === 1n && (await convoy.signalCountOf(0)) === 2n);

  console.log("\n-- withdrawSignal --");
  await expectRevert(
    "withdraw by account without a signal reverts",
    convoy.connect(stranger).withdrawSignal,
    [0],
    "NotSignaled"
  );
  check("other accounts' withdraw attempt leaves count at 2", (await convoy.signalCountOf(0)) === 2n);
  await expectRevert("withdraw on missing drop reverts", convoy.connect(holderA).withdrawSignal, [99], "DropNotFound");
  const wdTx = await convoy.connect(holderB).withdrawSignal(0);
  const wdRcpt = await wdTx.wait();
  const wdEv = findEvent(wdRcpt, convoy.interface, "SignalWithdrawn");
  check("SignalWithdrawn event names the caller", !!wdEv && wdEv.args.account === holderBAddr);
  check("withdraw reduces count to 1", (await convoy.signalCountOf(0)) === 1n);
  check("hasSignaled false after withdraw", (await convoy.hasSignaled(0, holderBAddr)) === false);
  await expectRevert(
    "double withdraw reverts",
    convoy.connect(holderB).withdrawSignal,
    [0],
    "NotSignaled"
  );
  await (await convoy.connect(holderB).signal(0)).wait();
  check("holder can signal again after withdrawing", (await convoy.signalCountOf(0)) === 2n);

  console.log("\n-- no funds, no owner, no admin surface --");
  const fnNames = sigJson.abi.filter((x) => x.type === "function").map((x) => x.name);
  check(
    "contract exposes no withdraw/sweep/pause/owner/setRegistry functions",
    !fnNames.some((n) => ["withdraw", "sweep", "pause", "owner", "setRegistry", "transferOwnership"].includes(n))
  );
  check(
    "no payable functions exist (contract cannot receive funds)",
    !sigJson.abi.some((x) => x.type === "function" && x.stateMutability === "payable") &&
      !sigJson.abi.some((x) => x.type === "receive")
  );
  check("contract balance is zero", (await provider.getBalance(convoyAddr)) === 0n);

  await server.close();
  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
