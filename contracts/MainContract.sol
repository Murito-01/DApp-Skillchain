// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PesertaManager.sol";
import "./SertifikasiManager.sol";
import "./RegistrasiLSP.sol";
import "./VerifikasiPublik.sol";

/// @title MainContract
/// @notice Kontrak utama sistem sertifikasi profesi berbasis blockchain.
/// @dev Menggabungkan seluruh modul fungsional menjadi satu entry point melalui inheritance.
contract MainContract is
    PesertaManager,         // Modul manajemen peserta (pendaftaran & metadata)
    SertifikasiManager,     // Modul pengelolaan sertifikasi (pengajuan & kelulusan)
    RegistrasiLSP,          // Modul untuk registrasi dan manajemen LSP oleh BNSP
    VerifikasiPublik        // Modul untuk verifikasi sertifikasi oleh publik
{
    /// @notice Konstruktor utama. Saat dideploy, address pengirim menjadi BNSP.
    /// @dev BNSP adalah otoritas utama yang dapat menambahkan LSP.
    constructor() {
        bnsp = msg.sender;
    }
}