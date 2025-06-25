// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./SertifikasiStorage.sol";

/// @title SertifikasiManager
/// @notice Modul untuk mengelola proses pengajuan dan penyelesaian sertifikasi.
/// @dev Menggunakan storage bersama dari SertifikasiStorage, hanya dapat diakses oleh peserta dan LSP yang valid.
contract SertifikasiManager is SertifikasiStorage {
    
    /// @notice Fungsi bagi peserta untuk mengajukan sertifikasi baru.
    /// @param skema Skema sertifikasi yang ingin diambil (berdasarkan enum).
    /// @dev Setiap peserta hanya dapat memiliki satu sertifikasi aktif pada satu waktu.
    function ajukanSertifikasi(SkemaSertifikasi skema) external onlyPeserta {
        Peserta storage peserta = pesertaList[msg.sender];
        
        // Peserta tidak boleh sedang mengikuti sertifikasi lain
        require(peserta.sertifikasiAktif == address(0), "Masih ada sertifikasi aktif");

        // Membuat ID unik berbasis hash dari address peserta dan waktu saat ini
        address sertifikasiID = address(uint160(uint256(keccak256(abi.encodePacked(msg.sender, block.timestamp)))));

        // Simpan data sertifikasi baru ke mapping
        sertifikasiList[sertifikasiID] = Sertifikasi({
            peserta: msg.sender,
            skema: skema,
            sertifikatCID: "",
            lulus: false,
            aktif: true
        });

        // Update referensi peserta ke sertifikasi yang sedang berjalan
        peserta.sertifikasiAktif = sertifikasiID;

        // Simpan ke dalam riwayat sertifikasi peserta
        peserta.sertifikasiDiikuti.push(sertifikasiID);

        // Emit event agar dapat ditelusuri di blockchain explorer
        emit SertifikasiDiajukan(msg.sender, sertifikasiID, skema);
    }

    /// @notice Fungsi yang digunakan oleh LSP untuk menginput hasil kelulusan peserta.
    /// @param sertifikasiID Alamat unik sertifikasi yang ingin diperbarui.
    /// @param sertifikatCID CID file sertifikat kelulusan yang telah diunggah ke IPFS.
    /// @dev Setelah update, sertifikasi dinyatakan selesai (tidak aktif).
    function updateKelulusan(address sertifikasiID, string calldata sertifikatCID) external onlyLSP {
        Sertifikasi storage s = sertifikasiList[sertifikasiID];

        // Pastikan sertifikasi masih aktif dan belum pernah dinilai
        require(s.aktif, "Sertifikasi tidak aktif");

        // Update status kelulusan dan sertifikat
        s.lulus = true;
        s.sertifikatCID = sertifikatCID;
        s.aktif = false;

        // Hapus status sertifikasi aktif dari peserta
        pesertaList[s.peserta].sertifikasiAktif = address(0);

        // Emit event agar dapat diverifikasi publik
        emit KelulusanDiupdate(msg.sender, sertifikasiID, sertifikatCID);
    }

    /// @notice Mengambil detail sertifikasi berdasarkan ID.
    /// @param sertifikasiID ID unik sertifikasi (berbentuk address).
    /// @return Struct data lengkap sertifikasi (peserta, skema, CID, status).
    function getSertifikasi(address sertifikasiID) external view returns (Sertifikasi memory) {
        return sertifikasiList[sertifikasiID];
    }
}