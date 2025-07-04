// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./SertifikasiStorage.sol";

/// @title RegistrasiLSP
/// @notice Kontrak ini menangani pendaftaran mandiri LSP, verifikasi/penolakan oleh BNSP, dan update metadata LSP.
contract RegistrasiLSP is SertifikasiStorage {
    enum StatusLSP { Menunggu, Aktif, Ditolak }

    struct LSP {
        string metadataCID;
        StatusLSP status;
        string suratIzinCID; // Kosong jika belum diverifikasi
        string alasanTolak;  // Kosong jika tidak ditolak
    }

    mapping(address => LSP) public lspList;
    mapping(address => bool) public isLSPTerdaftar;

    event LSPDidaftarkan(address indexed lsp, string metadataCID);
    event LSPDiverifikasi(address indexed lsp, string suratIzinCID);
    event LSPDitolak(address indexed lsp, string alasan);

    /// @notice LSP melakukan pendaftaran mandiri
    /// @param metadataCID CID IPFS metadata LSP
    function daftarLSP(string calldata metadataCID) external notEmpty(metadataCID) {
        require(lspList[msg.sender].status == StatusLSP(uint8(0)), "Sudah pernah daftar atau status bukan Menunggu");
        require(bytes(lspList[msg.sender].metadataCID).length == 0, "Sudah pernah daftar");
        require(msg.sender != bnsp, "BNSP tidak bisa daftar sebagai LSP");
        lspList[msg.sender] = LSP({
            metadataCID: metadataCID,
            status: StatusLSP.Menunggu,
            suratIzinCID: "",
            alasanTolak: ""
        });
        isLSPTerdaftar[msg.sender] = true;
        emit LSPDidaftarkan(msg.sender, metadataCID);
    }

    /// @notice BNSP memverifikasi dan mengaktifkan LSP, serta menerbitkan surat izin
    /// @param lspAddress Alamat LSP
    /// @param suratIzinCID CID IPFS surat izin operasi
    function verifikasiLSP(address lspAddress, string calldata suratIzinCID) external onlyBNSP validAddress(lspAddress) notEmpty(suratIzinCID) {
        LSP storage lsp = lspList[lspAddress];
        require(lsp.status == StatusLSP.Menunggu, "LSP tidak dalam status menunggu");
        lsp.status = StatusLSP.Aktif;
        lsp.suratIzinCID = suratIzinCID;
        lsp.alasanTolak = "";
        emit LSPDiverifikasi(lspAddress, suratIzinCID);
    }

    /// @notice BNSP menolak pendaftaran LSP
    /// @param lspAddress Alamat LSP
    /// @param alasan Alasan penolakan
    function tolakLSP(address lspAddress, string calldata alasan) external onlyBNSP validAddress(lspAddress) notEmpty(alasan) {
        LSP storage lsp = lspList[lspAddress];
        require(lsp.status == StatusLSP.Menunggu, "LSP tidak dalam status menunggu");
        lsp.status = StatusLSP.Ditolak;
        lsp.alasanTolak = alasan;
        lsp.suratIzinCID = "";
        emit LSPDitolak(lspAddress, alasan);
    }

    /// @notice LSP dapat memperbarui metadata-nya jika sudah terdaftar
    /// @param newMetadataCID CID IPFS terbaru
    function updateMetadataLSP(string calldata newMetadataCID) external notEmpty(newMetadataCID) {
        require(lspList[msg.sender].status != StatusLSP(uint8(0)), "Belum pernah daftar");
        lspList[msg.sender].metadataCID = newMetadataCID;
        emit LSPMetadataUpdated(msg.sender, newMetadataCID);
    }

    /// @notice Mengambil data lengkap LSP
    /// @param lspAddress Alamat LSP
    function getLSP(address lspAddress) external view returns (
        string memory metadataCID,
        StatusLSP status,
        string memory suratIzinCID,
        string memory alasanTolak
    ) {
        LSP storage lsp = lspList[lspAddress];
        return (lsp.metadataCID, lsp.status, lsp.suratIzinCID, lsp.alasanTolak);
    }

    /// @notice Mengambil status LSP
    function getStatusLSP(address lspAddress) external view returns (int8) {
        if (!isLSPTerdaftar[lspAddress]) {
            return -1;
        }
        uint8 status = uint8(lspList[lspAddress].status);
        return int8(status);
    }

    function hapusLSP(address lspAddress) external onlyBNSP {
        // ...hapus data LSP...
        isLSPTerdaftar[lspAddress] = false;
    }
}