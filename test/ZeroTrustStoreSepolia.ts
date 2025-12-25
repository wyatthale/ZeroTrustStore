import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { expect } from "chai";

describe("ZeroTrustStoreSepolia", function () {
  let signer: HardhatEthersSigner;
  let contractAddress: string;

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const deployment = await deployments.get("ZeroTrustStore");
      contractAddress = deployment.address;
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signer = ethSigners[0];
  });

  it("stores and decrypts an access key on Sepolia", async function () {
    this.timeout(4 * 60000);

    await fhevm.initializeCLIApi();

    const randomWallet = ethers.Wallet.createRandom();
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signer.address)
      .addAddress(randomWallet.address)
      .encrypt();

    const contract = await ethers.getContractAt("ZeroTrustStore", contractAddress);
    const tx = await contract
      .connect(signer)
      .saveFile("sepolia.txt", "HASH_SEPOLIA", encryptedInput.handles[0], encryptedInput.inputProof);
    await tx.wait();

    const record = await contract.getFile(signer.address, 0);

    const decrypted = await fhevm.userDecryptEaddress(record.encryptedAccessKey, contractAddress, signer);
    expect(decrypted.toLowerCase()).to.eq(randomWallet.address.toLowerCase());
  });
});
