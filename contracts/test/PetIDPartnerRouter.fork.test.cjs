// Mainnet-fork test for PetIDPartnerRouter against the LIVE v3 registrar.
// Run: FORK=1 npx hardhat test test/PetIDPartnerRouter.fork.test.cjs
const { expect } = require("chai");
const { ethers, network } = require("hardhat");

const REGISTRAR = "0xfd428E9188c9D858D48Ca2fEE9199Cc2d66D61C1";
const NAME_WRAPPER = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401";
const DOGID_NODE = ethers.namehash("dogid.eth");

// sample IPFS contenthash (0xe301 + CIDv1 bytes) — value doesn't matter for the test
const CONTENTHASH =
  "0xe30101701220aa3b9d6e8f2c4a1b0d5e7f8a9c0b1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c";

// salted, non-famous keys — bare makeAddr-style names carry real mainnet state (EIP-7702 delegations)
const key = (label) => ethers.keccak256(ethers.toUtf8Bytes(`petid.router.fork.2026.${label}`));

describe("PetIDPartnerRouter (mainnet fork)", function () {
  this.timeout(300000);

  let router, registrar, wrapper, deployer, partner, buyer, baseFee;
  const label = `router-test-${Date.now()}`;

  before(async () => {
    if (!process.env.FORK) this.ctx.skip?.();

    deployer = new ethers.Wallet(key("deployer"), ethers.provider);
    partner = new ethers.Wallet(key("partner"), ethers.provider);
    buyer = new ethers.Wallet(key("buyer"), ethers.provider);
    for (const w of [deployer, partner, buyer]) {
      await network.provider.send("hardhat_setBalance", [
        w.address,
        "0x21E19E0C9BAB2400000", // 10,000 ETH
      ]);
    }

    const F = await ethers.getContractFactory("PetIDPartnerRouter", deployer);
    router = await F.deploy(REGISTRAR, NAME_WRAPPER);
    await router.waitForDeployment();

    registrar = new ethers.Contract(
      REGISTRAR,
      [
        "function registrationFee() view returns (uint256)",
        "function isAvailable(bytes32,string) view returns (bool)",
        "function resolver() view returns (address)",
      ],
      ethers.provider
    );
    wrapper = new ethers.Contract(
      NAME_WRAPPER,
      ["function ownerOf(uint256) view returns (address)"],
      ethers.provider
    );
    baseFee = await registrar.registrationFee();
  });

  it("reads the live base fee (0.00825 ETH)", async () => {
    expect(baseFee).to.equal(ethers.parseEther("0.00825"));
  });

  it("rejects a partner price below the base fee", async () => {
    await expect(
      router.connect(partner).setPartner(baseFee - 1n, "Cheap Shop")
    ).to.be.revertedWith("Price below base fee");
  });

  it("lets a partner set price and name", async () => {
    const price = ethers.parseEther("0.02");
    await router.connect(partner).setPartner(price, "Happy Paws Clinic");
    const info = await router.partnerInfo(partner.address);
    expect(info.price).to.equal(price);
    expect(info.name).to.equal("Happy Paws Clinic");
    expect(info.baseFee).to.equal(baseFee);
  });

  it("rejects registration via unknown partner", async () => {
    await expect(
      router
        .connect(buyer)
        .registerViaPartner(DOGID_NODE, label, CONTENTHASH, buyer.address, {
          value: ethers.parseEther("0.02"),
        })
    ).to.be.revertedWith("Unknown or inactive partner");
  });

  it("rejects underpayment", async () => {
    await expect(
      router
        .connect(buyer)
        .registerViaPartner(DOGID_NODE, label, CONTENTHASH, partner.address, {
          value: ethers.parseEther("0.019"),
        })
    ).to.be.revertedWith("Insufficient payment");
  });

  it("registers via partner: name to buyer, contenthash set, margin credited, excess refunded", async () => {
    const price = ethers.parseEther("0.02");
    const sent = ethers.parseEther("0.025"); // 0.005 excess → refund
    expect(await registrar.isAvailable(DOGID_NODE, label)).to.equal(true);

    const balBefore = await ethers.provider.getBalance(buyer.address);
    const tx = await router
      .connect(buyer)
      .registerViaPartner(DOGID_NODE, label, CONTENTHASH, partner.address, { value: sent });
    const rcpt = await tx.wait();
    const gas = rcpt.gasUsed * rcpt.gasPrice;
    const balAfter = await ethers.provider.getBalance(buyer.address);

    // buyer paid exactly the partner price + gas (excess refunded)
    expect(balBefore - balAfter).to.equal(price + gas);

    // wrapped subname owned by the buyer, not the router
    const node = ethers.keccak256(
      ethers.solidityPacked(["bytes32", "bytes32"], [DOGID_NODE, ethers.keccak256(ethers.toUtf8Bytes(label))])
    );
    expect(await wrapper.ownerOf(BigInt(node))).to.equal(buyer.address);

    // contenthash live on the resolver
    const resolverAddr = await registrar.resolver();
    const resolver = new ethers.Contract(
      resolverAddr,
      ["function contenthash(bytes32) view returns (bytes)"],
      ethers.provider
    );
    expect(await resolver.contenthash(node)).to.equal(CONTENTHASH);

    // margin credited to partner (platform fee is 0)
    const margin = price - baseFee;
    expect(await router.earnings(partner.address)).to.equal(margin);
    expect(await router.totalOwed()).to.equal(margin);

    // router holds exactly the owed margin (fold in any pre-existing fork dust = 0 for fresh salted deployer)
    expect(await ethers.provider.getBalance(await router.getAddress())).to.equal(margin);
  });

  it("partner withdraws earnings", async () => {
    const owed = await router.earnings(partner.address);
    const before = await ethers.provider.getBalance(partner.address);
    const tx = await router.connect(partner).withdraw();
    const rcpt = await tx.wait();
    const gas = rcpt.gasUsed * rcpt.gasPrice;
    const after = await ethers.provider.getBalance(partner.address);
    expect(after - before).to.equal(owed - gas);
    expect(await router.earnings(partner.address)).to.equal(0n);
    expect(await router.totalOwed()).to.equal(0n);
  });

  it("splits margin with platform fee when set", async () => {
    await router.connect(deployer).setPlatformFee(1000); // 10% of margin
    const price = ethers.parseEther("0.02");
    const label2 = `${label}-b`;
    await router
      .connect(buyer)
      .registerViaPartner(DOGID_NODE, label2, CONTENTHASH, partner.address, { value: price });

    const margin = price - baseFee;
    const cut = (margin * 1000n) / 10000n;
    expect(await router.earnings(partner.address)).to.equal(margin - cut);
    expect(await router.earnings(deployer.address)).to.equal(cut); // deployer = platformTreasury
  });

  it("caps the platform fee", async () => {
    await expect(router.connect(deployer).setPlatformFee(3001)).to.be.revertedWith("Fee too high");
  });
});
