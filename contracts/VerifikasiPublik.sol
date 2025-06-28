// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./SertifikasiStorage.sol";

/// @title VerifikasiPublik
/// @notice Kontrak ini menyediakan fungsi-fungsi publik untuk memverifikasi status kelulusan,
/// metadata peserta, dan detail sertifikasi secara read-only (tanpa memodifikasi state).
contract VerifikasiPublik is SertifikasiStorage {
    
    /// @notice Verifikasi apakah sertifikasi sudah lulus dan tidak aktif lagi
    /// @param sertifikasiID Alamat sertifikasi yang ingin diverifikasi
    /// @return valid True jika sertifikasi valid dan sudah lulus
    function verifikasiKelulusan(address sertifikasiID) external view returns (bool valid) {
        if (sertifikasiList[sertifikasiID].peserta == address(0)) {
            return false;
        }

        Sertifikasi memory s = sertifikasiList[sertifikasiID];
        return s.lulus && !s.aktif;
    }

    /// @notice Mendapatkan CID IPFS dari sertifikat peserta
    /// @param sertifikasiID Alamat sertifikasi
    /// @return cid CID IPFS sertifikat
    function getSertifikatCID(address sertifikasiID) external view returns (string memory cid) {
        require(sertifikasiList[sertifikasiID].peserta != address(0), "Sertifikasi tidak ditemukan");
        return sertifikasiList[sertifikasiID].sertifikatCID;
    }

    /// @notice Mengambil CID metadata IPFS milik peserta
    /// @param peserta Alamat peserta
    /// @return cid CID metadata peserta
    function getPesertaMetadata(address peserta) external view returns (string memory cid) {
        require(pesertaList[peserta].terdaftar, "Peserta tidak terdaftar");
        return pesertaList[peserta].metadataCID;
    }

    /// @notice Mengambil semua detail sertifikasi berdasarkan ID-nya
    /// @param sertifikasiID Alamat sertifikasi
    /// @return Objek struct Sertifikasi
    function getDetailSertifikasi(address sertifikasiID) external view returns (Sertifikasi memory) {
        require(sertifikasiList[sertifikasiID].peserta != address(0), "Sertifikasi tidak ditemukan");
        return sertifikasiList[sertifikasiID];
    }

    /// @notice Verifikasi sertifikasi secara lengkap (status, data, kelulusan, dsb)
    /// @param sertifikasiID Alamat sertifikasi
    /// @return exists Apakah sertifikasi ditemukan
    /// @return lulus Status kelulusan
    /// @return aktif Status aktif/tidak aktif
    /// @return peserta Alamat peserta
    /// @return skema Skema sertifikasi
    /// @return sertifikatCID CID sertifikat
    /// @return tanggalSelesai Timestamp kelulusan/gagal
    /// @return lspPenilai Alamat LSP yang menilai
    function verifikasiSertifikasiLengkap(address sertifikasiID) external view returns (
        bool exists,
        bool lulus,
        bool aktif,
        address peserta,
        SkemaSertifikasi skema,
        string memory sertifikatCID,
        uint256 tanggalSelesai,
        address lspPenilai
    ) {
        Sertifikasi memory s = sertifikasiList[sertifikasiID];

        exists = s.peserta != address(0);
        if (!exists) {
            // Default value jika tidak ditemukan
            return (false, false, false, address(0), SkemaSertifikasi.Okupasi_PJOI_Pengendalian_Pencemaran_Udara, "", 0, address(0));
        }

        return (
            true,
            s.lulus,
            s.aktif,
            s.peserta,
            s.skema,
            s.sertifikatCID,
            s.tanggalSelesai,
            s.lspPenilai
        );
    }

    /// @notice Mengecek status dasar dari peserta
    /// @param peserta Alamat peserta
    /// @return terdaftar Apakah peserta pernah terdaftar
    /// @return aktif Apakah akun peserta aktif
    /// @return adaSertifikasiAktif Apakah sedang memiliki sertifikasi yang aktif
    /// @return totalSertifikasi Jumlah total sertifikasi yang pernah diajukan
    function cekStatusPeserta(address peserta) external view returns (
        bool terdaftar,
        bool aktif,
        bool adaSertifikasiAktif,
        uint256 totalSertifikasi
    ) {
        Peserta memory p = pesertaList[peserta];
        return (
            p.terdaftar,
            p.aktif,
            p.sertifikasiAktif != address(0),
            p.sertifikasiDiikuti.length
        );
    }

    /// @notice Mengembalikan nama lengkap dari enum skema sertifikasi
    /// @param skema Enum skema sertifikasi
    /// @return Nama lengkap skema sertifikasi dalam bentuk string
    function getSkemaNama(SkemaSertifikasi skema) external pure returns (string memory) {
        if (skema == SkemaSertifikasi.Okupasi_PJOI_Pengendalian_Pencemaran_Udara) {
            return "Okupasi Penanggung Jawab Operasional Instalasi Pengendalian Pencemaran Udara";
        } else if (skema == SkemaSertifikasi.Okupasi_PJ_Pengendalian_Pencemaran_Udara) {
            return "Okupasi Penanggung Jawab Pengendalian Pencemaran Udara";
        } else if (skema == SkemaSertifikasi.Okupasi_PJO_Pengolahan_Air_Limbah) {
            return "Okupasi Penanggung Jawab Operasional Pengolahan Air Limbah";
        } else {
            return "Okupasi Penanggung Jawab Pengendalian Pencemaran Air";
        }
    }
}