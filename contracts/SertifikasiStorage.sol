// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title SertifikasiStorage
/// @notice Kontrak abstract yang menjadi penyimpanan data global untuk semua modul dalam sistem.
/// @dev Kontrak ini bersifat abstract dan akan di-*inherit* oleh kontrak-kontrak modular lainnya.
abstract contract SertifikasiStorage {

    // =========================
    // ENUM
    // =========================

    /// @notice Enum yang mendefinisikan berbagai jenis skema sertifikasi
    enum SkemaSertifikasi {
        Okupasi_Penanggung_Jawab_Operasional_Instalasi_Pengendalian_Pencemaran_Udara,
        Okupasi_Penanggung_Jawab_Pengendalian_Pencemaran_Udara,
        Okupasi_Penanggung_Jawab_Operasional_Pengolahan_Air_Limbah,
        Okupasi_Penanggung_Jawab_Pengendalian_Pencemaran_Air
    }

    // =========================
    // STRUCT
    // =========================

    /// @notice Struktur data untuk menyimpan informasi peserta
    struct Peserta {
        string metadataCID;           // CID IPFS dari metadata peserta (biodata lengkap)
        bool terdaftar;               // Status apakah peserta telah mendaftar
        address sertifikasiAktif;     // Alamat ID sertifikasi yang sedang diikuti (maks satu aktif)
        address[] sertifikasiDiikuti; // Riwayat alamat ID semua sertifikasi yang pernah diikuti
    }

    /// @notice Struktur data untuk menyimpan informasi sertifikasi yang diajukan oleh peserta
    struct Sertifikasi {
        address peserta;              // Alamat peserta yang mengajukan sertifikasi
        SkemaSertifikasi skema;       // Jenis skema sertifikasi yang diambil
        string sertifikatCID;         // CID IPFS dari file sertifikat (jika lulus)
        bool lulus;                   // Status apakah peserta lulus atau tidak
        bool aktif;                   // Status aktif jika sertifikasi masih berjalan
    }

    // =========================
    // STATE VARIABLES
    // =========================

    address public bnsp;                                    // Alamat wallet resmi milik BNSP (otoritas pusat)
    mapping(address => bool) public isLSP;                  // Daftar alamat wallet LSP yang telah disetujui oleh BNSP
    mapping(address => Peserta) public pesertaList;         // Mapping dari address peserta ke data lengkapnya
    mapping(address => Sertifikasi) public sertifikasiList; // Mapping dari ID unik sertifikasi ke data lengkapnya
    address[] public pesertaIndex;                          // Array untuk menyimpan semua peserta (jika perlu iterasi)
    uint public pesertaCount;                               // Total jumlah peserta yang telah mendaftar

    // =========================
    // EVENTS
    // =========================

    event PesertaTerdaftar(address indexed peserta, string metadataCID);                // Saat peserta baru mendaftar
    event MetadataDiupdate(address indexed peserta, string newCID);                     // Saat peserta mengupdate data IPFS
    event SertifikasiDiajukan(address indexed peserta, address sertifikasiID, SkemaSertifikasi skema); // Saat peserta mengajukan sertifikasi
    event KelulusanDiupdate(address indexed lsp, address sertifikasiID, string sertifikatCID);         // Saat LSP menetapkan kelulusan peserta
    event LSPDitambahkan(address indexed lsp, string metadataCID);                      // Saat BNSP menambahkan LSP baru
    event LSPDihapus(address indexed lsp);                                              // Saat BNSP menghapus LSP

    // =========================
    // MODIFIERS
    // =========================

    /// @notice Membatasi akses hanya untuk BNSP
    modifier onlyBNSP() {
        require(msg.sender == bnsp, "Hanya BNSP");
        _;
    }

    /// @notice Membatasi akses hanya untuk LSP yang telah disetujui
    modifier onlyLSP() {
        require(isLSP[msg.sender], "Hanya LSP");
        _;
    }

    /// @notice Membatasi akses hanya untuk peserta yang sudah mendaftar
    modifier onlyPeserta() {
        require(pesertaList[msg.sender].terdaftar, "Hanya peserta terdaftar");
        _;
    }
} 