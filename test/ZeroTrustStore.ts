import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { ZeroTrustStore, ZeroTrustStore__factory } from "../types";

type Signers = {
  owner: HardhatEthersSigner;
  grantee: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("ZeroTrustStore")) as ZeroTrustStore__factory;
  const contract = (await factory.deploy()) as ZeroTrustStore;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("ZeroTrustStore", function () {
  let signers: Signers;
  let contract: ZeroTrustStore;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], grantee: ethSigners[1] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  it("stores encrypted file metadata and decrypts the access key for the owner", async function () {
    const randomWallet = ethers.Wallet.createRandom();
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.owner.address)
      .addAddress(randomWallet.address)
      .encrypt();

    const tx = await contract
      .connect(signers.owner)
      .saveFile("passport.png", "ENCRYPTED_HASH", encryptedInput.handles[0], encryptedInput.inputProof);
    await tx.wait();

    const record = await contract.getFile(signers.owner.address, 0);
    expect(record.fileName).to.eq("passport.png");
    expect(record.encryptedIpfsHash).to.eq("ENCRYPTED_HASH");

    const decrypted = await fhevm.userDecryptEaddress(record.encryptedAccessKey, contractAddress, signers.owner);
    expect(decrypted.toLowerCase()).to.eq(randomWallet.address.toLowerCase());
  });

  it("grants access to another address for decryption", async function () {
    const randomWallet = ethers.Wallet.createRandom();
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.owner.address)
      .addAddress(randomWallet.address)
      .encrypt();

    await contract
      .connect(signers.owner)
      .saveFile("notes.txt", "HASH_DATA", encryptedInput.handles[0], encryptedInput.inputProof);

    await contract.connect(signers.owner).grantAccess(signers.owner.address, 0, signers.grantee.address);
    const record = await contract.getFile(signers.owner.address, 0);

    const decryptedByGrantee = await fhevm.userDecryptEaddress(
      record.encryptedAccessKey,
      contractAddress,
      signers.grantee,
    );
    expect(decryptedByGrantee.toLowerCase()).to.eq(randomWallet.address.toLowerCase());
  });

  it("tracks file count per owner", async function () {
    const randomWallet = ethers.Wallet.createRandom();
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.owner.address)
      .addAddress(randomWallet.address)
      .encrypt();

    await contract
      .connect(signers.owner)
      .saveFile("alpha.txt", "HASH_ONE", encryptedInput.handles[0], encryptedInput.inputProof);
    await contract
      .connect(signers.owner)
      .saveFile("beta.txt", "HASH_TWO", encryptedInput.handles[0], encryptedInput.inputProof);

    const count = await contract.getFileCount(signers.owner.address);
    expect(count).to.eq(2);
  });
});
