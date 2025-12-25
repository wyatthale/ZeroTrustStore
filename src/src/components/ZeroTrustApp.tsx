import { useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { Contract, Wallet, getAddress } from "ethers";
import { useEthersSigner } from "../hooks/useEthersSigner";
import { useZamaInstance } from "../hooks/useZamaInstance";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../config/contracts";
import { decryptHashWithAddress, encryptHashWithAddress, formatDateTime, shorten } from "../utils/crypto";
import { mockIPFSUpload } from "../utils/ipfs";
import "../styles/Vault.css";

type StoredRecord = {
  fileName: string;
  encryptedIpfsHash: string;
  encryptedAccessKey: string;
  owner: string;
  createdAt: bigint;
};

export function ZeroTrustApp() {
  const { address, isConnected } = useAccount();
  const signer = useEthersSigner();
  const { instance, isLoading: zamaLoading } = useZamaInstance();
  const contractReady = true;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [ipfsHash, setIpfsHash] = useState("");
  const [encryptedHash, setEncryptedHash] = useState("");
  const [generatedWallet, setGeneratedWallet] = useState<ReturnType<typeof Wallet.createRandom> | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [txHash, setTxHash] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [decryptingKey, setDecryptingKey] = useState<string | null>(null);
  const [decryptedInfo, setDecryptedInfo] = useState<
    Record<string, { accessKey: string; ipfsHash: string }>
  >({});

  const filesQuery = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getFiles",
    args: address && contractReady ? [address] : undefined,
    query: { enabled: !!address && contractReady, refetchInterval: 12000 },
  });

  const records: StoredRecord[] = useMemo(() => {
    if (!filesQuery.data) return [];
    const payload = filesQuery.data as any[];
    return payload.map((item: any) => ({
      fileName: item.fileName || item[0],
      encryptedIpfsHash: item.encryptedIpfsHash || item[1],
      encryptedAccessKey: item.encryptedAccessKey || item[2],
      owner: item.owner || item[3],
      createdAt: item.createdAt || item[4],
    }));
  }, [filesQuery.data]);

  const resetFlow = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setIpfsHash("");
    setEncryptedHash("");
    setGeneratedWallet(null);
    setUploadMessage("");
  };

  const handleFileChange = (file?: File) => {
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadMessage("");
    setIpfsHash("");
    setEncryptedHash("");
    setGeneratedWallet(null);
    setStatusNote("File staged locally. Upload to IPFS next.");
  };

  const handleMockUpload = async () => {
    if (!selectedFile) {
      setStatusNote("Select a file before uploading.");
      return;
    }
    setIsUploading(true);
    setStatusNote("Preparing pseudo IPFS upload...");

    try {
      const result = await mockIPFSUpload(selectedFile);
      setIpfsHash(result.hash);
      setUploadMessage(`Pinned to simulated IPFS as ${result.hash}`);
      setStatusNote("IPFS hash ready. Encrypt it with a fresh address.");
    } catch (error) {
      console.error("IPFS upload failed", error);
      setStatusNote("Upload failed. Please retry.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEncrypt = () => {
    if (!ipfsHash) {
      setStatusNote("Upload to IPFS first so we have a hash to encrypt.");
      return;
    }
    setIsEncrypting(true);
    const wallet = Wallet.createRandom();
    const cipher = encryptHashWithAddress(ipfsHash, wallet.address);
    setGeneratedWallet(wallet);
    setEncryptedHash(cipher);
    setStatusNote(`Encrypted with random address ${shorten(wallet.address)}`);
    setIsEncrypting(false);
  };

  const handleSaveOnChain = async () => {
    if (!contractReady) {
      setStatusNote("Deploy to Sepolia and update the contract address before saving.");
      return;
    }

    if (!instance || !signer || !generatedWallet || !encryptedHash || !selectedFile || !address) {
      setStatusNote("Missing prerequisites: connect wallet, upload, encrypt, then save.");
      return;
    }

    try {
      setIsSaving(true);
      setStatusNote("Encrypting access key with Zama and building transaction...");

      const buffer = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      buffer.addAddress(generatedWallet.address);
      const encryptedInput = await buffer.encrypt();

      const resolvedSigner = await signer;
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, resolvedSigner);
      const tx = await contract.saveFile(
        selectedFile.name,
        encryptedHash,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      setStatusNote("Waiting for confirmation on Sepolia...");
      const receipt = await tx.wait();
      setTxHash(tx.hash);
      resetFlow();
      setStatusNote("Stored on-chain. You can decrypt it from the list.");
      filesQuery.refetch?.();
      console.log("tx receipt", receipt);
    } catch (error) {
      console.error("Failed to store record", error);
      setStatusNote("Transaction failed. Check your wallet and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDecryptRecord = async (record: StoredRecord, index: number) => {
    if (!instance || !address || !signer) {
      setStatusNote("Connect your wallet to decrypt your files.");
      return;
    }

    const cacheKey = `${record.owner}-${index}`;
    setDecryptingKey(cacheKey);

    try {
      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        {
          handle: record.encryptedAccessKey as string,
          contractAddress: CONTRACT_ADDRESS,
        },
      ];

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "7";
      const contractAddresses = [CONTRACT_ADDRESS];

      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const resolvedSigner = await signer;
      const signature = await resolvedSigner.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays
      );

      const raw = result[record.encryptedAccessKey as string];
      if (!raw) {
        throw new Error("Missing decrypted access key");
      }
      const decryptedAddress =
        typeof raw === "string" && raw.startsWith("0x")
          ? getAddress(raw)
          : getAddress(`0x${BigInt(raw).toString(16).padStart(40, "0")}`);

      const clearHash = decryptHashWithAddress(record.encryptedIpfsHash, decryptedAddress);

      setDecryptedInfo((prev) => ({
        ...prev,
        [cacheKey]: {
          accessKey: decryptedAddress,
          ipfsHash: clearHash,
        },
      }));
      setStatusNote("Decryption complete. Hash restored below.");
    } catch (error) {
      console.error("User decryption failed", error);
      setStatusNote("Unable to decrypt this record. Check permissions or retry.");
    } finally {
      setDecryptingKey(null);
    }
  };

  const readyToSave = Boolean(
    contractReady &&
      selectedFile &&
      ipfsHash &&
      encryptedHash &&
      generatedWallet &&
      signer &&
      instance &&
      isConnected
  );

  return (
    <div className="vault-layout">
      <section className="vault-hero">
        <div>
          <p className="pill">Encrypted IPFS workflow</p>
          <h2>Store files without exposing the destination hash</h2>
          <p className="muted">
            Upload locally, generate a random EVM address to encrypt the IPFS hash, and let Zama keep the key private.
            Decrypt later from the chain when you need the original hash back.
          </p>
          <div className="hero-stats">
            <div>
              <span className="stat-label">Your records</span>
              <strong className="stat-value">{records.length}</strong>
            </div>
            <div>
              <span className="stat-label">Latest tx</span>
              <strong className="stat-value">{txHash ? shorten(txHash, 6) : "—"}</strong>
            </div>
            <div>
              <span className="stat-label">Zama relayer</span>
              <strong className="stat-value">{zamaLoading ? "Loading..." : "Ready"}</strong>
            </div>
            <div>
              <span className="stat-label">Contract</span>
              <strong className="stat-value">{contractReady ? shorten(CONTRACT_ADDRESS, 6) : "Set address"}</strong>
            </div>
          </div>
        </div>
        <div className="status-board">
          <p className="status-title">Flow status</p>
          <ul>
            <li className={selectedFile ? "done" : ""}>File staged</li>
            <li className={ipfsHash ? "done" : ""}>Pseudo IPFS hash: {ipfsHash ? shorten(ipfsHash, 8) : "—"}</li>
            <li className={encryptedHash ? "done" : ""}>Encrypted hash ready</li>
            <li className={readyToSave ? "done" : ""}>Ready to write on-chain</li>
          </ul>
          {statusNote && <p className="status-note">{statusNote}</p>}
        </div>
      </section>

      <section className="vault-grid">
        <div className="vault-card">
          <div className="card-head">
            <div>
              <p className="pill">Step 1 · Prepare</p>
              <h3>Upload & encrypt</h3>
            </div>
            {generatedWallet && (
              <div className="key-chip">
                Key address: <span>{shorten(generatedWallet.address, 6)}</span>
              </div>
            )}
          </div>

          <div className="upload-area">
            <label className="upload-box">
              <input
                type="file"
                accept="image/*,.pdf,.txt"
                onChange={(e) => handleFileChange(e.target.files?.[0] || undefined)}
              />
              <div className="upload-copy">
                <p className="upload-title">Drop a file or click to browse</p>
                <p className="muted">We keep it in-memory, never touching local storage.</p>
              </div>
            </label>
            {previewUrl ? (
              <img src={previewUrl} alt="preview" className="file-preview" />
            ) : (
              <div className="placeholder-box">Preview appears here once a file is chosen</div>
            )}
          </div>

          <div className="action-row">
            <button onClick={handleMockUpload} disabled={!selectedFile || isUploading} className="ghost-btn">
              {isUploading ? "Uploading..." : "Pseudo upload to IPFS"}
            </button>
            <button onClick={handleEncrypt} disabled={!ipfsHash || isEncrypting} className="ghost-btn">
              {isEncrypting ? "Encrypting..." : "Encrypt hash with random address"}
            </button>
          </div>

          <div className="meta-grid">
            <div>
              <p className="meta-label">IPFS hash</p>
              <p className="meta-value">{ipfsHash || "Not generated yet"}</p>
            </div>
            <div>
              <p className="meta-label">Encrypted hash</p>
              <p className="meta-value">{encryptedHash ? shorten(encryptedHash, 10) : "Waiting..."}</p>
            </div>
            <div>
              <p className="meta-label">Key address</p>
              <p className="meta-value">
                {generatedWallet ? generatedWallet.address : "Key generated after encryption"}
              </p>
            </div>
          </div>

          <div className="cta-row">
            <button
              className="primary-btn"
              onClick={handleSaveOnChain}
              disabled={!readyToSave || isSaving || zamaLoading}
            >
              {isSaving
                ? "Saving on-chain..."
                : zamaLoading
                  ? "Loading Zama relayer..."
                  : "Store encrypted record"}
            </button>
            <div className="tx-hint">
              <p className="muted">Writes use ethers.js · reads via viem · no localhost usage.</p>
              {txHash && (
                <p className="tx-hash">
                  Last tx: <span>{txHash}</span>
                </p>
              )}
            </div>
          </div>
          {uploadMessage && <p className="success-msg">{uploadMessage}</p>}
        </div>

        <div className="vault-card">
          <div className="card-head">
            <div>
              <p className="pill">Step 2 · Recover</p>
              <h3>Decrypt from chain</h3>
              <p className="muted">Pull your stored records, re-encrypt the access key with Zama, and recover the hash.</p>
            </div>
          </div>

          {!contractReady ? (
            <div className="placeholder-box">Deploy to Sepolia and set the contract address to view records.</div>
          ) : !isConnected ? (
            <div className="placeholder-box">Connect your wallet to load your encrypted files.</div>
          ) : filesQuery.isLoading ? (
            <div className="placeholder-box">Loading your records...</div>
          ) : records.length === 0 ? (
            <div className="placeholder-box">No files stored yet. Add one on the left.</div>
          ) : (
            <div className="records-list">
              {records.map((record, idx) => {
                const cacheKey = `${record.owner}-${idx}`;
                const decrypted = decryptedInfo[cacheKey];
                return (
                  <div className="record-card" key={`${record.fileName}-${idx}`}>
                    <div className="record-top">
                      <div>
                        <p className="record-title">{record.fileName}</p>
                        <p className="muted">
                          Saved on {formatDateTime(record.createdAt)} · owner {shorten(record.owner, 6)}
                        </p>
                      </div>
                      <span className="tag">Encrypted</span>
                    </div>
                    <div className="record-meta">
                      <p>
                        <span>Encrypted hash:</span> {shorten(record.encryptedIpfsHash, 12)}
                      </p>
                      <p>
                        <span>Access key (cipher):</span> {shorten(record.encryptedAccessKey, 8)}
                      </p>
                    </div>
                    {decrypted ? (
                      <div className="decrypt-result">
                        <p>
                          <span>Decrypted key:</span> {decrypted.accessKey}
                        </p>
                        <p>
                          <span>IPFS hash:</span> {decrypted.ipfsHash}
                        </p>
                      </div>
                    ) : (
                      <button
                        className="secondary-btn"
                        onClick={() => handleDecryptRecord(record, idx)}
                        disabled={decryptingKey === cacheKey}
                      >
                        {decryptingKey === cacheKey ? "Decrypting..." : "Decrypt access key"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
