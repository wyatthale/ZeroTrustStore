const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const randomBase58 = (length: number) => {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
};

export const mockIPFSUpload = async (file: File) => {
  // Simulate network latency for a friendlier UX
  await new Promise((resolve) => setTimeout(resolve, 650));
  const hash = `Qm${randomBase58(44)}`;

  return {
    success: true,
    hash,
    size: file.size,
    name: file.name,
  };
};
