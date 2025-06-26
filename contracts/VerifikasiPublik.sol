// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./SertifikasiStorage.sol";

contract VerifikasiPublik is SertifikasiStorage {
    
    function verifikasiKelulusan(address sertifikasiID) external view returns (bool valid) {
        if (sertifikasiList[sertifikasiID].peserta == address(0)) {
            return false;
        }
        
        Sertifikasi memory s = sertifikasiList[sertifikasiID];
        return s.lulus && !s.aktif;
    }

    function getSertifikatCID(address sertifikasiID) external view returns (string memory cid) {
        require(sertifikasiList[sertifikasiID].peserta != address(0), "Sertifikasi tidak ditemukan");
        return sertifikasiList[sertifikasiID].sertifikatCID;
    }

    function getPesertaMetadata(address peserta) external view returns (string memory cid) {
        require(pesertaList[peserta].terdaftar, "Peserta tidak terdaftar");
        return pesertaList[peserta].metadataCID;
    }

    function getDetailSertifikasi(address sertifikasiID) external view returns (Sertifikasi memory) {
        require(sertifikasiList[sertifikasiID].peserta != address(0), "Sertifikasi tidak ditemukan");
        return sertifikasiList[sertifikasiID];
    }

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