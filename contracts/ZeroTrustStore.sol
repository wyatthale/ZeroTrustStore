// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, eaddress, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ZeroTrustStore
/// @notice Stores encrypted IPFS references and encrypted access keys using Zama FHE
contract ZeroTrustStore is ZamaEthereumConfig {
    struct FileRecord {
        string fileName;
        string encryptedIpfsHash;
        eaddress encryptedAccessKey;
        address owner;
        uint256 createdAt;
    }

    mapping(address => FileRecord[]) private userFiles;

    event FileSaved(address indexed owner, uint256 indexed index, string fileName, string encryptedIpfsHash);
    event AccessGranted(address indexed owner, uint256 indexed index, address indexed grantee);

    /// @notice Save a new encrypted file reference on-chain
    /// @param fileName The name of the uploaded file
    /// @param encryptedIpfsHash The IPFS hash encrypted client-side with a random address
    /// @param encryptedAccessKey The encrypted random address used as the decryption key
    /// @param inputProof The ZK proof associated with the encrypted address input
    /// @return The index of the stored file for the sender
    function saveFile(
        string calldata fileName,
        string calldata encryptedIpfsHash,
        externalEaddress encryptedAccessKey,
        bytes calldata inputProof
    ) external returns (uint256) {
        require(bytes(fileName).length > 0, "File name required");
        require(bytes(encryptedIpfsHash).length > 0, "Encrypted hash required");

        eaddress validatedAccessKey = FHE.fromExternal(encryptedAccessKey, inputProof);

        FileRecord memory record = FileRecord({
            fileName: fileName,
            encryptedIpfsHash: encryptedIpfsHash,
            encryptedAccessKey: validatedAccessKey,
            owner: msg.sender,
            createdAt: block.timestamp
        });

        userFiles[msg.sender].push(record);

        FHE.allow(validatedAccessKey, msg.sender);
        FHE.allowThis(validatedAccessKey);

        uint256 index = userFiles[msg.sender].length - 1;
        emit FileSaved(msg.sender, index, fileName, encryptedIpfsHash);
        return index;
    }

    /// @notice Allow another address to decrypt a stored access key
    /// @param owner The owner address of the file
    /// @param index The file index owned by the owner
    /// @param grantee The address to grant decryption permission to
    function grantAccess(address owner, uint256 index, address grantee) external {
        require(index < userFiles[owner].length, "Invalid index");
        require(grantee != address(0), "Invalid grantee");

        FileRecord storage record = userFiles[owner][index];
        require(record.owner == msg.sender, "Not file owner");

        FHE.allow(record.encryptedAccessKey, grantee);
        emit AccessGranted(owner, index, grantee);
    }

    /// @notice Get a single stored file record for a user
    /// @param owner The user address owning the record
    /// @param index The index of the record
    /// @return The requested FileRecord
    function getFile(address owner, uint256 index) external view returns (FileRecord memory) {
        require(index < userFiles[owner].length, "Invalid index");
        return userFiles[owner][index];
    }

    /// @notice Get every stored file record for a user
    /// @param owner The user address owning the records
    /// @return All FileRecords for the requested owner
    function getFiles(address owner) external view returns (FileRecord[] memory) {
        return userFiles[owner];
    }

    /// @notice Get how many files a user has saved
    /// @param owner The user address owning the records
    /// @return The count of stored records
    function getFileCount(address owner) external view returns (uint256) {
        return userFiles[owner].length;
    }
}
