import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:address", "Prints the ZeroTrustStore address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const deployment = await deployments.get("ZeroTrustStore");

  console.log("ZeroTrustStore address is " + deployment.address);
});

task("task:store-file", "Saves an encrypted file record on ZeroTrustStore")
  .addParam("filename", "File name to store")
  .addParam("hash", "Encrypted IPFS hash produced client-side")
  .addOptionalParam("target", "Plain address to encrypt into the record")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const signer = (await ethers.getSigners())[0];
    const deployment = await deployments.get("ZeroTrustStore");

    const keyOwner = (taskArguments.target as string) || signer.address;

    console.log(`Encrypting address ${keyOwner} for ZeroTrustStore ${deployment.address}`);
    const encryptedKey = await fhevm.createEncryptedInput(deployment.address, signer.address).addAddress(keyOwner).encrypt();

    const contract = await ethers.getContractAt("ZeroTrustStore", deployment.address);

    const tx = await contract
      .connect(signer)
      .saveFile(taskArguments.filename as string, taskArguments.hash as string, encryptedKey.handles[0], encryptedKey.inputProof);
    console.log(`Sent tx ${tx.hash}...`);
    await tx.wait();
    console.log("Record stored.");
  });

task("task:decrypt-key", "Decrypts a stored access key")
  .addParam("owner", "Owner address that saved the file")
  .addParam("index", "Index of the record for that owner")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const signer = (await ethers.getSigners())[0];
    const deployment = await deployments.get("ZeroTrustStore");
    const contract = await ethers.getContractAt("ZeroTrustStore", deployment.address);

    console.log(`Reading record ${taskArguments.index} for ${taskArguments.owner}...`);
    const record = await contract.getFile(taskArguments.owner as string, Number(taskArguments.index));
    console.log(`Encrypted hash: ${record.encryptedIpfsHash}`);

    const clearAddress = await fhevm.userDecryptEaddress(
      record.encryptedAccessKey,
      deployment.address,
      signer,
    );
    console.log(`Decrypted address: ${clearAddress}`);
  });
