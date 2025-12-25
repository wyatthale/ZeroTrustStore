// ZeroTrustStore contract placeholder address - update after Sepolia deployment
export const CONTRACT_ADDRESS = '0x303Ce929aF930C7448Ddf501cE081AEA66E4b07a';

export const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "ZamaProtocolUnsupported",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "grantee",
        "type": "address"
      }
    ],
    "name": "AccessGranted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "fileName",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "encryptedIpfsHash",
        "type": "string"
      }
    ],
    "name": "FileSaved",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "confidentialProtocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "getFile",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "fileName",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "encryptedIpfsHash",
            "type": "string"
          },
          {
            "internalType": "eaddress",
            "name": "encryptedAccessKey",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          }
        ],
        "internalType": "struct ZeroTrustStore.FileRecord",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "getFileCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "getFiles",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "fileName",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "encryptedIpfsHash",
            "type": "string"
          },
          {
            "internalType": "eaddress",
            "name": "encryptedAccessKey",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          }
        ],
        "internalType": "struct ZeroTrustStore.FileRecord[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "grantee",
        "type": "address"
      }
    ],
    "name": "grantAccess",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "fileName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "encryptedIpfsHash",
        "type": "string"
      },
      {
        "internalType": "externalEaddress",
        "name": "encryptedAccessKey",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      }
    ],
    "name": "saveFile",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
