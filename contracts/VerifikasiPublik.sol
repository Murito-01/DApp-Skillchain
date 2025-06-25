// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./SertifikasiStorage.sol";

/// @title VerifikasiPublik
/// @notice Modul publik yang memungkinkan siapa saja untuk memverifikasi data sertifikasi peserta.
/// @dev Tidak membutuhkan autentikasi karena semua fungsi bersifat view/read-only.
contract VerifikasiPublik is SertifikasiStorage {
    
    /// @notice Memverifikasi apakah suatu sertifikasi valid dan peserta dinyatakan lulus.
    /// @param sertifikasiID ID unik sertifikasi (berbentuk address).
    /// @return valid True jika peserta lulus dan sertifikasi sudah tidak aktif (selesai).
    function verifikasiKelulusan(address sertifikasiID) external view returns (bool valid) {
        Sertifikasi memory s = sertifikasiList[sertifikasiID];
        return s.lulus && !s.aktif;
    }

    /// @notice Mengambil CID (IPFS hash) dari sertifikat berdasarkan ID sertifikasi.
    /// @param sertifikasiID Alamat sertifikasi.
    /// @return cid String CID dari sertifikat di IPFS.
    function getSertifikatCID(address sertifikasiID) external view returns (string memory cid) {
        return sertifikasiList[sertifikasiID].sertifikatCID;
    }

    /// @notice Mengambil CID metadata peserta (file biodata) berdasarkan alamat wallet peserta.
    /// @param peserta Alamat wallet peserta.
    /// @return cid String CID metadata peserta di IPFS.
    function getPesertaMetadata(address peserta) external view returns (string memory cid) {
        return pesertaList[peserta].metadataCID;
    }

    /// @notice Mengambil semua data lengkap sertifikasi berdasarkan ID-nya.
    /// @param sertifikasiID Alamat ID sertifikasi.
    /// @return Struct Sertifikasi yang berisi peserta, skema, CID sertifikat, status lulus, dan status aktif.
    function getDetailSertifikasi(address sertifikasiID) external view returns (Sertifikasi memory) {
        return sertifikasiList[sertifikasiID];
    }
}