// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

abstract contract SertifikasiStorage {

    enum SkemaSertifikasi {
        Okupasi_PJOI_Pengendalian_Pencemaran_Udara,     // Penanggung Jawab Operasional Instalasi
        Okupasi_PJ_Pengendalian_Pencemaran_Udara,       // Penanggung Jawab
        Okupasi_PJO_Pengolahan_Air_Limbah,              // Penanggung Jawab Operasional
        Okupasi_PJ_Pengendalian_Pencemaran_Air          // Penanggung Jawab
    }

    struct Peserta {
        string metadataCID;
        bool terdaftar;
        bool aktif;
        address sertifikasiAktif;
        address[] sertifikasiDiikuti;
        uint256 tanggalDaftar;
    }

    struct Sertifikasi {
        address peserta;
        SkemaSertifikasi skema;
        string sertifikatCID;
        bool lulus;
        bool aktif;
        uint256 tanggalPengajuan;
        uint256 tanggalSelesai;
        uint256 tanggalExpiry;
        address lspPenilai;
        string alasanGagal;
    }

    address public bnsp;
    mapping(address => bool) public isLSP;
    mapping(address => Peserta) public pesertaList;
    mapping(address => Sertifikasi) public sertifikasiList;
    mapping(address => bool) public isPesertaTerdaftar;
    mapping(address => uint256) internal nonces;
    uint public pesertaCount;

    event PesertaTerdaftar(address indexed peserta, string metadataCID, uint256 tanggal);
    event MetadataDiupdate(address indexed peserta, string newCID);
    event SertifikasiDiajukan(address indexed peserta, address sertifikasiID, SkemaSertifikasi skema, uint256 tanggal);
    event KelulusanDiupdate(address indexed lsp, address sertifikasiID, string sertifikatCID, uint256 tanggal);
    event SertifikasiBatal(address indexed lsp, address sertifikasiID, string alasan, uint256 tanggal);
    event LSPDitambahkan(address indexed lsp, string metadataCID);
    event LSPDihapus(address indexed lsp);
    event LSPMetadataUpdated(address indexed lsp, string newMetadataCID);
    event PesertaDinonaktifkan(address indexed peserta);

    modifier onlyBNSP() {
        require(msg.sender == bnsp, "Hanya BNSP");
        _;
    }

    modifier onlyLSP() {
        require(isLSP[msg.sender], "Hanya LSP");
        _;
    }

    modifier onlyPeserta() {
        require(pesertaList[msg.sender].terdaftar && pesertaList[msg.sender].aktif, "Hanya peserta aktif");
        _;
    }

    modifier validAddress(address addr) {
        require(addr != address(0), "Alamat tidak valid");
        _;
    }

    modifier notEmpty(string memory str) {
        require(bytes(str).length != 0, "String tidak boleh kosong");
        _;
    }
}