// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./SertifikasiStorage.sol";

/// @title PesertaManager
/// @notice Kontrak ini menangani logika terkait pendaftaran, update metadata, dan manajemen status peserta.
/// Menggunakan inheritance dari SertifikasiStorage untuk menyimpan dan mengakses data peserta secara terpusat.

contract PesertaManager is SertifikasiStorage {

    /// @notice Fungsi untuk mendaftarkan peserta baru ke sistem
    /// @param metadataCID CID IPFS metadata peserta
    function daftarPeserta(string calldata metadataCID) external notEmpty(metadataCID) {
        require(!pesertaList[msg.sender].terdaftar, "Sudah terdaftar");

        // Menyimpan data peserta baru
        pesertaList[msg.sender] = Peserta({
            metadataCID: metadataCID,
            terdaftar: true,
            aktif: true,
            sertifikasiAktif: address(0),
            sertifikasiDiikuti: new address[](0) ,
            tanggalDaftar: block.timestamp
        });

        // Flag tambahan untuk cek status peserta
        isPesertaTerdaftar[msg.sender] = true;

        // Update total peserta
        pesertaCount++;

        // Emit event pendaftaran
        emit PesertaTerdaftar(msg.sender, metadataCID, block.timestamp);
    }

    /// @notice Fungsi untuk memperbarui metadata CID peserta
    /// @param newCID CID IPFS terbaru
    function updateMetadata(string calldata newCID) external onlyPeserta notEmpty(newCID) {
        pesertaList[msg.sender].metadataCID = newCID;

        // Emit event update metadata
        emit MetadataDiupdate(msg.sender, newCID);
    }

    /// @notice Melihat riwayat sertifikasi berdasarkan alamat peserta
    /// @param peserta Alamat peserta yang ingin dilihat riwayatnya
    /// @return Array alamat dari kontrak-kontrak sertifikasi yang pernah diikuti
    function lihatRiwayatSertifikasi(address peserta) external view returns (address[] memory) {
        return pesertaList[peserta].sertifikasiDiikuti;
    }

    /// @notice Mengambil metadata CID dari peserta
    /// @param peserta Alamat peserta
    /// @return CID metadata peserta
    function getMetadataCID(address peserta) external view returns (string memory) {
        require(pesertaList[peserta].terdaftar, "Peserta tidak terdaftar");
        return pesertaList[peserta].metadataCID;
    }

    /// @notice Mendapatkan informasi lengkap peserta
    /// @param peserta Alamat peserta
    /// @return metadataCID CID metadata
    /// @return terdaftar Status pendaftaran
    /// @return aktif Status aktif
    /// @return sertifikasiAktif Alamat sertifikasi aktif
    /// @return tanggalDaftar Timestamp pendaftaran
    /// @return totalSertifikasi Jumlah total sertifikasi yang pernah diikuti
    function getPesertaInfo(address peserta) external view returns (
        string memory metadataCID,
        bool terdaftar,
        bool aktif,
        address sertifikasiAktif,
        uint256 tanggalDaftar,
        uint256 totalSertifikasi
    ) {
        Peserta memory p = pesertaList[peserta];
        return (
            p.metadataCID,
            p.terdaftar,
            p.aktif,
            p.sertifikasiAktif,
            p.tanggalDaftar,
            p.sertifikasiDiikuti.length
        );
    }
}