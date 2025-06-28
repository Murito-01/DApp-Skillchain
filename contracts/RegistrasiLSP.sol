// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./SertifikasiStorage.sol";

/// @title RegistrasiLSP
/// @notice Kontrak ini menangani registrasi, penghapusan, dan update metadata LSP (Lembaga Sertifikasi Profesi).
/// Inherit dari SertifikasiStorage untuk akses data LSP yang terpusat.
contract RegistrasiLSP is SertifikasiStorage {
    
    /// @notice Menyimpan CID metadata IPFS untuk setiap LSP
    mapping(address => string) public lspMetadata;

    /// @notice Menambahkan LSP baru oleh BNSP
    /// @param lspAddress Alamat Ethereum LSP
    /// @param metadataCID CID IPFS metadata LSP
    function tambahLSP(address lspAddress, string calldata metadataCID) 
        external 
        onlyBNSP 
        validAddress(lspAddress)
        notEmpty(metadataCID)
    {
        require(!isLSP[lspAddress], "LSP sudah terdaftar");
        require(lspAddress != bnsp, "BNSP tidak bisa jadi LSP");

        isLSP[lspAddress] = true;
        lspMetadata[lspAddress] = metadataCID;

        emit LSPDitambahkan(lspAddress, metadataCID);
    }

    /// @notice Menambahkan banyak LSP sekaligus dalam satu transaksi
    /// @param lspAddresses Array alamat LSP
    /// @param metadataCIDs Array CID metadata masing-masing LSP
    function tambahMultipleLSP(
        address[] calldata lspAddresses, 
        string[] calldata metadataCIDs
    ) external onlyBNSP {
        require(lspAddresses.length == metadataCIDs.length, "Array length mismatch");
        require(lspAddresses.length > 0, "Array kosong");

        // Cache alamat BNSP untuk efisiensi
        address bnspCache = bnsp;

        // Loop untuk menambahkan setiap LSP
        for (uint i = 0; i < lspAddresses.length; i++) {
            address currentLSP = lspAddresses[i];
            string calldata currentCID = metadataCIDs[i];

            require(currentLSP != address(0), "Alamat tidak valid");
            require(currentLSP != bnspCache, "BNSP tidak bisa jadi LSP");
            require(!isLSP[currentLSP], "LSP sudah terdaftar");
            require(bytes(currentCID).length != 0, "CID kosong");

            isLSP[currentLSP] = true;
            lspMetadata[currentLSP] = currentCID;

            emit LSPDitambahkan(currentLSP, currentCID);
        }
    }

    /// @notice Menghapus LSP dari sistem
    /// @param lspAddress Alamat LSP yang ingin dihapus
    function hapusLSP(address lspAddress) external onlyBNSP validAddress(lspAddress) {
        require(isLSP[lspAddress], "LSP tidak ditemukan");

        isLSP[lspAddress] = false;
        delete lspMetadata[lspAddress];

        emit LSPDihapus(lspAddress);
    }

    /// @notice LSP dapat memperbarui metadata-nya secara mandiri
    /// @param newMetadataCID CID IPFS terbaru
    function updateMetadataLSP(string calldata newMetadataCID) external onlyLSP notEmpty(newMetadataCID) {
        lspMetadata[msg.sender] = newMetadataCID;
        emit LSPMetadataUpdated(msg.sender, newMetadataCID);
    }

    /// @notice Mengambil metadata dari LSP tertentu
    /// @param lspAddress Alamat LSP
    /// @return CID metadata IPFS milik LSP
    function getMetadataLSP(address lspAddress) external view returns (string memory) {
        require(isLSP[lspAddress], "LSP tidak aktif");
        return lspMetadata[lspAddress];
    }

    /// @notice Mengecek status dan metadata dari LSP tertentu
    /// @param lspAddress Alamat LSP
    /// @return aktif Status aktif LSP
    /// @return metadata Metadata CID IPFS
    function cekStatusLSP(address lspAddress) external view returns (bool aktif, string memory metadata) {
        return (isLSP[lspAddress], lspMetadata[lspAddress]);
    }
}