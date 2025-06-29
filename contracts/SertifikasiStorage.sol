// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title SertifikasiStorage
/// @notice Kontrak abstrak ini berfungsi sebagai pusat penyimpanan data untuk sistem sertifikasi berbasis blockchain.
/// Digunakan oleh modul smart contract lainnya untuk membaca dan menulis data yang konsisten.

abstract contract SertifikasiStorage {

    // ---------------------------- //
    //              ENUM            //
    // ---------------------------- //

    /// @notice Enum skema sertifikasi yang tersedia sesuai jenis okupasi profesi.
    enum SkemaSertifikasi {
        Okupasi_PJOI_Pengendalian_Pencemaran_Udara,     // Penanggung Jawab Operasional Instalasi
        Okupasi_PJ_Pengendalian_Pencemaran_Udara,       // Penanggung Jawab
        Okupasi_PJO_Pengolahan_Air_Limbah,              // Penanggung Jawab Operasional
        Okupasi_PJ_Pengendalian_Pencemaran_Air          // Penanggung Jawab
    }

    // ---------------------------- //
    //             STRUCT           //
    // ---------------------------- //

    /// @notice Struktur data peserta sertifikasi.
    struct Peserta {
        string metadataCID;           // CID IPFS metadata peserta
        bool terdaftar;               // Status apakah peserta telah mendaftar
        bool aktif;                   // Status aktif atau non-aktif
        address sertifikasiAktif;     // Alamat kontrak sertifikasi yang sedang aktif
        address[] sertifikasiDiikuti; // Daftar alamat kontrak sertifikasi yang pernah diikuti
        uint256 tanggalDaftar;        // Timestamp pendaftaran peserta
    }

    /// @notice Struktur data sertifikasi.
    struct Sertifikasi {
        address peserta;              // Alamat peserta yang mengikuti sertifikasi
        SkemaSertifikasi skema;       // Jenis skema sertifikasi
        string sertifikatCID;         // CID IPFS file sertifikat
        bool lulus;                   // Status kelulusan peserta
        bool aktif;                   // Status aktif/tidaknya sertifikasi
        uint256 tanggalPengajuan;     // Timestamp saat pengajuan
        uint256 tanggalSelesai;       // Timestamp selesai asesmen
        uint256 tanggalExpiry;        // Masa berlaku sertifikat
        address lspPenilai;           // LSP yang memberikan penilaian
        string alasanGagal;           // Alasan jika tidak lulus sertifikasi
    }

    // Alamat entitas pusat (BNSP)
    address public bnsp;

    // Daftar alamat yang ditandai sebagai LSP terdaftar
    mapping(address => bool) public isLSP;

    // Daftar peserta yang telah terdaftar dan informasinya
    mapping(address => Peserta) public pesertaList;

    // Daftar sertifikasi berdasarkan ID (alamat kontrak sertifikasi)
    mapping(address => Sertifikasi) public sertifikasiList;

    // Flag tambahan untuk mengecek status pendaftaran peserta
    mapping(address => bool) public isPesertaTerdaftar;

    // Nonce unik untuk setiap peserta, bisa digunakan untuk signature atau identifikasi transaksi
    mapping(address => uint256) internal nonces;

    // Jumlah total peserta yang terdaftar
    uint public pesertaCount;

    // ---------------------------- //
    //        EVENT DEFINISI        //
    // ---------------------------- //

    event PesertaTerdaftar(address indexed peserta, string metadataCID, uint256 tanggal);
    event MetadataDiupdate(address indexed peserta, string newCID);
    event SertifikasiDiajukan(address indexed peserta, address sertifikasiID, SkemaSertifikasi skema, uint256 tanggal);
    event KelulusanDiupdate(address indexed lsp, address sertifikasiID, string sertifikatCID, uint256 tanggal);
    event SertifikasiBatal(address indexed lsp, address sertifikasiID, string alasan, uint256 tanggal);
    event LSPDitambahkan(address indexed lsp, string metadataCID);
    event LSPDihapus(address indexed lsp);
    event LSPMetadataUpdated(address indexed lsp, string newMetadataCID);
    event PesertaDinonaktifkan(address indexed peserta);

    // ---------------------------- //
    //          MODIFIER            //
    // ---------------------------- //

    /// @dev Membatasi akses hanya untuk BNSP
    modifier onlyBNSP() {
        require(msg.sender == bnsp, "Hanya BNSP");
        _;
    }

    /// @dev Membatasi akses hanya untuk LSP terdaftar
    modifier onlyLSP() {
        require(isLSP[msg.sender], "Hanya LSP");
        _;
    }

    /// @dev Membatasi akses hanya untuk peserta yang terdaftar dan aktif
    modifier onlyPeserta() {
        require(pesertaList[msg.sender].terdaftar && pesertaList[msg.sender].aktif, "Hanya peserta aktif");
        _;
    }

    /// @dev Validasi bahwa alamat tidak kosong (zero address)
    modifier validAddress(address addr) {
        require(addr != address(0), "Alamat tidak valid");
        _;
    }

    /// @dev Validasi bahwa string input tidak kosong
    modifier notEmpty(string memory str) {
        require(bytes(str).length != 0, "String tidak boleh kosong");
        _;
    }
}
