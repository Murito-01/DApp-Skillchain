// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./SertifikasiStorage.sol";

/// @title PesertaManager
/// @notice Modul yang menangani pendaftaran akun peserta dan manajemen metadata peserta
/// @dev Semua data peserta disimpan secara terpusat di kontrak `SertifikasiStorage` melalui inheritance
contract PesertaManager is SertifikasiStorage {

    /// @notice Mendaftarkan peserta baru menggunakan alamat wallet mereka (1x seumur hidup)
    /// @param metadataCID CID dari file JSON metadata peserta yang disimpan di IPFS
    function daftarPeserta(string calldata metadataCID) external {
        // Pastikan address belum pernah mendaftar sebelumnya
        require(!pesertaList[msg.sender].terdaftar, "Sudah terdaftar");

        // Buat entri baru untuk peserta
        pesertaList[msg.sender] = Peserta({
            metadataCID: metadataCID,                  // CID metadata IPFS
            terdaftar: true,                           // Tandai sebagai telah terdaftar
            sertifikasiAktif: address(0),              // Belum ada sertifikasi aktif
            sertifikasiDiikuti: new address[](0)        // Riwayat kosong
        });

        // Tambahkan peserta ke index array
        pesertaIndex.push(msg.sender);
        pesertaCount++;

        // Emit event untuk keperluan tracking di explorer
        emit PesertaTerdaftar(msg.sender, metadataCID);
    }

    /// @notice Memperbarui CID metadata peserta di IPFS (jika terjadi perubahan biodata)
    /// @param newCID CID baru dari metadata IPFS
    /// @dev Hanya bisa dilakukan oleh peserta yang sudah terdaftar
    function updateMetadata(string calldata newCID) external onlyPeserta {
        pesertaList[msg.sender].metadataCID = newCID;
        emit MetadataDiupdate(msg.sender, newCID);
    }

    /// @notice Mengambil riwayat seluruh sertifikasi yang pernah diikuti oleh peserta
    /// @param peserta Alamat wallet peserta
    /// @return Array berisi ID dari sertifikasi (alamat)
    function lihatRiwayatSertifikasi(address peserta) external view returns (address[] memory) {
        return pesertaList[peserta].sertifikasiDiikuti;
    }

    /// @notice Mengambil CID metadata peserta
    /// @param peserta Alamat wallet peserta
    /// @return CID IPFS dari metadata peserta
    function getMetadataCID(address peserta) external view returns (string memory) {
        return pesertaList[peserta].metadataCID;
    }
}