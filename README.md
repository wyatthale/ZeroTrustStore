# ZeroTrustStore

ZeroTrustStore is a privacy-first file metadata registry that uses Zama FHE on EVM to store encrypted file pointers.
Users select a local file, simulate an IPFS upload to obtain a random IPFS hash, and then store only encrypted data on
chain. The decryption flow uses the Zama relayer to reveal an encrypted per-file address, which is then used to decrypt
the stored IPFS hash.

## Project Goals

- Let users keep file pointers off-chain but still queryable via a public registry.
- Keep decryption keys private and only reveal them with Zama FHE permissions.
- Deliver a simple, end-to-end flow using a real wallet connection and on-chain state.

## Problem Statement

Traditional file registries store plaintext pointers or depend on centralized access control. That leaks metadata,
creates lock-in, or forces users to trust an operator. ZeroTrustStore aims to make file pointer storage verifiable and
public while keeping access secrets private.

## Solution Summary

ZeroTrustStore stores only ciphertext on chain:

1. The user selects a local file and the app generates a random IPFS hash (pseudo upload).
2. The app generates a random EVM address A locally.
3. The app encrypts the IPFS hash using A as the secret and produces an encrypted hash.
4. The app encrypts address A with Zama FHE.
5. The app stores the file name, encrypted IPFS hash, and Zama-encrypted address A on chain.
6. When the user clicks decrypt, the app requests the Zama relayer to decrypt address A, then uses A to decrypt the IPFS
   hash.

No plaintext IPFS hash or encryption key is stored on chain.

## Key Advantages

- Privacy by default: encrypted pointers and encrypted per-file secrets on chain.
- Verifiable registry: all metadata writes are on-chain transactions.
- Minimal trust: Zama FHE protects the secret address used for pointer decryption.
- Simple UX: upload, list, decrypt, and copy the IPFS hash.

## Technology Stack

- Smart contracts: Solidity, Hardhat, Zama FHEVM
- Frontend: React + Vite + RainbowKit + wagmi
- Read calls: viem
- Write calls: ethers
- Relayer: @zama-fhe/relayer-sdk
- Package manager: npm

## Architecture Overview

Smart Contracts
- Persist file records with encrypted fields.
- Expose view methods for listing records.
- Accept encrypted inputs for storage.

Frontend
- File picker for local files (no file data is uploaded on chain).
- Pseudo IPFS uploader (generates random hash).
- Local encryption and decryption using the generated address A.
- Wallet connection, transaction signing, and chain queries.

Relayer and Encryption
- Zama FHE encrypts the address A for on-chain storage.
- The relayer performs authorized decryption of address A when the user requests it.
- Decryption of the IPFS hash happens locally using A.

## Data Model Stored On Chain

- fileName: string
- encryptedIpfsHash: bytes
- encryptedAddressA: bytes (Zama FHE ciphertext)
- owner or creator address (if included in the contract)

Only encrypted fields are stored for secrets. Filenames are stored in plaintext.

## Security and Privacy Considerations

- The IPFS hash is never stored on chain in plaintext.
- The per-file address A is stored only as a Zama FHE ciphertext.
- Decryption requires the relayer and user authorization.
- Filenames are public; do not store sensitive data in the file name.
- This project simulates IPFS uploads; it is not a file hosting service.

## Repository Layout

- contracts/: Solidity contracts for the registry and encryption flows.
- deploy/: Hardhat deploy scripts.
- tasks/: Hardhat tasks for convenience and verification.
- test/: Contract tests.
- src/: Frontend (React + Vite).
- deployments/sepolia/: Deployed addresses and generated ABIs.

## Setup and Configuration

### Prerequisites

- Node.js 20+
- npm 7+
- A wallet private key with Sepolia ETH
- An Infura API key

### Install Dependencies

Contract workspace:

```bash
npm install
```

Frontend workspace:

```bash
cd src
npm install
```

### Environment Variables

Create a `.env` file at the repository root with:

```
INFURA_API_KEY=your_infura_api_key
PRIVATE_KEY=your_deployer_private_key
```

`ETHERSCAN_API_KEY` is optional if you intend to verify contracts.

## Build, Test, and Deploy

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm run test
```

### Deploy to Sepolia

```bash
npm run deploy:sepolia
```

### Verify on Sepolia (optional)

```bash
npm run verify:sepolia -- <CONTRACT_ADDRESS>
```

## Frontend Development

From `src/`:

```bash
npm run dev
```

Open the local dev server URL shown by Vite and connect a wallet on Sepolia. The app reads from chain via viem and
performs contract writes via ethers.

## Using the App

1. Connect a wallet on Sepolia.
2. Select a local file.
3. Click upload to generate a random IPFS hash and store encrypted data on chain.
4. View your file list fetched from the contract.
5. Click decrypt on an entry to retrieve the IPFS hash.

## ABI Requirements

The frontend must use the ABI generated by the deployed contract. Copy the ABI from `deployments/sepolia/` into the
frontend codebase in a non-JSON format (for example, a TypeScript export).

## Limitations

- IPFS uploads are simulated with a random hash.
- Filenames are public.
- This is not a file storage service; it is a secure metadata registry.

## Future Roadmap

- Real IPFS uploads with content-addressed storage.
- Encrypted filename support.
- Delegated access and sharing workflows.
- Indexing for faster search and filtering.
- Audit and formal verification of contracts.
- Multi-chain deployments with consistent encryption semantics.

## License

BSD-3-Clause-Clear. See `LICENSE`.
