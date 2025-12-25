import { getAddress, getBytes, hexlify, keccak256, toUtf8Bytes, toUtf8String } from "ethers";

const deriveKey = (address: string) => {
  const normalized = getAddress(address);
  return getBytes(keccak256(toUtf8Bytes(normalized.toLowerCase())));
};

const xorBytes = (data: Uint8Array, key: Uint8Array) =>
  Uint8Array.from(data, (value, index) => value ^ key[index % key.length]);

export const encryptHashWithAddress = (ipfsHash: string, address: string) => {
  const bytes = toUtf8Bytes(ipfsHash);
  const key = deriveKey(address);
  const cipher = xorBytes(bytes, key);
  return hexlify(cipher);
};

export const decryptHashWithAddress = (encryptedHash: string, address: string) => {
  const cipher = getBytes(encryptedHash);
  const key = deriveKey(address);
  const clear = xorBytes(cipher, key);
  return toUtf8String(clear);
};

export const shorten = (value: string, size = 4) => {
  if (!value) return "";
  return `${value.slice(0, size + 2)}...${value.slice(value.length - size)}`;
};

export const formatDateTime = (timestamp: bigint) => {
  const numeric = Number(timestamp);
  if (!Number.isFinite(numeric)) return "Unknown";
  return new Date(numeric * 1000).toLocaleString();
};
