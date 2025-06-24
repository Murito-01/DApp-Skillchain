// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./SertifikasiStorage.sol";

/// @title RegistrasiLSP
/// @notice Modul manajemen LSP oleh BNSP. Berfungsi untuk menambahkan, menghapus, dan mengakses metadata LSP.
/// @dev Menggunakan storage dan modifier dari SertifikasiStorage
contract RegistrasiLSP is SertifikasiStorage {
    
    /// @notice Menyimpan metadata CID dari tiap LSP berdasarkan address-nya
    /// @dev CID ini menunjuk ke file JSON berisi info profil LSP (nama institusi, alamat, dll) di IPFS
    mapping(address => string) public lspMetadata;

    /// @notice Menambahkan LSP baru yang sah ke dalam sistem
    /// @param lspAddress Alamat wallet dari institusi LSP
    /// @param metadataCID CID metadata LSP di IPFS
    /// @dev Hanya dapat diakses oleh BNSP
    function tambahLSP(address lspAddress, string memory metadataCID) external onlyBNSP {
        require(lspAddress != address(0), "Alamat LSP tidak valid");
        require(!isLSP[lspAddress], "LSP sudah terdaftar");

        // Tandai sebagai LSP yang aktif dan simpan metadata-nya
        isLSP[lspAddress] = true;
        lspMetadata[lspAddress] = metadataCID;

        // Emit event agar dapat dilacak di explorer
        emit LSPDitambahkan(lspAddress, metadataCID);
    }

    /// @notice Menghapus status aktif LSP dan metadata-nya
    /// @param lspAddress Alamat wallet dari LSP yang ingin dihapus
    /// @dev Hanya BNSP yang bisa menghapus LSP
    function hapusLSP(address lspAddress) external onlyBNSP {
        require(isLSP[lspAddress], "LSP tidak ditemukan");

        // Nonaktifkan LSP dan hapus metadata
        isLSP[lspAddress] = false;
        delete lspMetadata[lspAddress];

        emit LSPDihapus(lspAddress);
    }

    /// @notice Mengambil metadata CID milik LSP
    /// @param lspAddress Alamat wallet LSP
    /// @return metadataCID CID IPFS dari metadata JSON
    function getMetadataLSP(address lspAddress) external view returns (string memory) {
        require(isLSP[lspAddress], "LSP tidak aktif");
        return lspMetadata[lspAddress];
    }
}