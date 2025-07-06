// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./SertifikasiStorage.sol";

/// @title SertifikasiManager
/// @notice Mengelola proses pengajuan, evaluasi, dan pembatalan sertifikasi peserta.
/// Berbasis pada data yang disimpan di SertifikasiStorage.
contract SertifikasiManager is SertifikasiStorage {

    // Counter ID sertifikasi berbasis urutan
    uint256 private _sertifikasiIdCounter;

    // Mapping dari ID ke alamat pseudo untuk sertifikasi
    mapping(uint256 => address) public sertifikasiById;

    /// @notice Peserta mengajukan sertifikasi dengan skema tertentu
    /// @param skema Jenis skema sertifikasi yang dipilih
    function ajukanSertifikasi(SkemaSertifikasi skema) external onlyPeserta {
        Peserta storage peserta = pesertaList[msg.sender];
        require(peserta.sertifikasiAktif == address(0), "Masih ada sertifikasi aktif");

        // Menambah counter sertifikasi
        _sertifikasiIdCounter++;
        uint256 counterId = _sertifikasiIdCounter;

        // Menghasilkan ID unik berbasis hash (pseudo address)
        address sertifikasiID = address(uint160(uint256(keccak256(
            abi.encode("SERTIFIKASI_", counterId, msg.sender, block.timestamp, nonces[msg.sender]++)
        ))));

        // Simpan referensi sertifikasi berdasarkan ID
        sertifikasiById[counterId] = sertifikasiID;

        // Buat entri sertifikasi baru
        sertifikasiList[sertifikasiID] = Sertifikasi({
            peserta: msg.sender,
            skema: skema,
            sertifikatCID: "",
            lulus: false,
            aktif: true,
            tanggalPengajuan: block.timestamp,
            tanggalSelesai: 0,
            tanggalExpiry: block.timestamp + (3 * 365 * 24 * 60 * 60), // 3 tahun
            lspPenilai: address(0),
            alasanGagal: ""
        });

        // Tandai sebagai sertifikasi aktif peserta
        peserta.sertifikasiAktif = sertifikasiID;
        peserta.sertifikasiDiikuti.push(sertifikasiID);

        emit SertifikasiDiajukan(msg.sender, sertifikasiID, skema, block.timestamp);
    }

    /// @notice LSP mengupdate status kelulusan peserta
    /// @param sertifikasiID Alamat sertifikasi
    /// @param sertifikatCID CID IPFS sertifikat yang diberikan
    function updateKelulusan(address sertifikasiID, string calldata sertifikatCID) 
        external 
        onlyLSP 
        validAddress(sertifikasiID)
        notEmpty(sertifikatCID)
    {
        Sertifikasi storage s = sertifikasiList[sertifikasiID];
        require(s.aktif, "Sertifikasi tidak aktif");
        require(s.peserta != address(0), "Sertifikasi tidak ditemukan");

        // Update status kelulusan
        s.lulus = true;
        s.sertifikatCID = sertifikatCID;
        s.aktif = false;
        s.tanggalSelesai = block.timestamp;
        s.lspPenilai = msg.sender;

        // Simpan mapping CID ke sertifikasiID untuk optimasi pencarian
        sertifikasiByCID[sertifikatCID] = sertifikasiID;

        // Reset sertifikasi aktif peserta
        pesertaList[s.peserta].sertifikasiAktif = address(0);

        emit KelulusanDiupdate(msg.sender, sertifikasiID, sertifikatCID, block.timestamp);
    }

    /// @notice LSP mengupdate kegagalan sertifikasi beserta alasan
    /// @param sertifikasiID Alamat sertifikasi
    /// @param alasan Alasan peserta gagal
    function updateKegagalan(address sertifikasiID, string calldata alasan) 
        external 
        onlyLSP 
        validAddress(sertifikasiID)
        notEmpty(alasan)
    {
        Sertifikasi storage s = sertifikasiList[sertifikasiID];
        require(s.aktif, "Sertifikasi tidak aktif");
        require(s.peserta != address(0), "Sertifikasi tidak ditemukan");

        s.lulus = false;
        s.aktif = false;
        s.tanggalSelesai = block.timestamp;
        s.lspPenilai = msg.sender;
        s.alasanGagal = alasan;

        // Reset sertifikasi aktif peserta
        pesertaList[s.peserta].sertifikasiAktif = address(0);

        emit SertifikasiBatal(msg.sender, sertifikasiID, alasan, block.timestamp);
    }

    /// @notice Peserta membatalkan sertifikasinya sendiri
    function batalkanSertifikasi() external onlyPeserta {
        address sertifikasiID = pesertaList[msg.sender].sertifikasiAktif;
        require(sertifikasiID != address(0), "Tidak ada sertifikasi aktif");

        Sertifikasi storage s = sertifikasiList[sertifikasiID];
        require(s.aktif, "Sertifikasi sudah tidak aktif");

        s.aktif = false;
        s.tanggalSelesai = block.timestamp;
        s.alasanGagal = "Dibatalkan oleh peserta";

        pesertaList[msg.sender].sertifikasiAktif = address(0);

        emit SertifikasiBatal(address(0), sertifikasiID, "Dibatalkan oleh peserta", block.timestamp);
    }

    /// @notice Mengambil data lengkap sertifikasi
    /// @param sertifikasiID Alamat sertifikasi
    /// @return Objek struct Sertifikasi
    function getSertifikasi(address sertifikasiID) external view returns (Sertifikasi memory) {
        require(sertifikasiList[sertifikasiID].peserta != address(0), "Sertifikasi tidak ditemukan");
        return sertifikasiList[sertifikasiID];
    }

    /// @notice Mendapatkan detail sertifikasi dalam bentuk variabel terpisah
    /// @param sertifikasiID Alamat sertifikasi
    function getSertifikasiDetail(address sertifikasiID) external view returns (
        address peserta,
        SkemaSertifikasi skema,
        string memory sertifikatCID,
        bool lulus,
        bool aktif,
        uint256 tanggalPengajuan,
        uint256 tanggalSelesai,
        address lspPenilai,
        string memory alasanGagal
    ) {
        require(sertifikasiList[sertifikasiID].peserta != address(0), "Sertifikasi tidak ditemukan");
        Sertifikasi memory s = sertifikasiList[sertifikasiID];
        return (
            s.peserta,
            s.skema,
            s.sertifikatCID,
            s.lulus,
            s.aktif,
            s.tanggalPengajuan,
            s.tanggalSelesai,
            s.lspPenilai,
            s.alasanGagal
        );
    }

    /// @notice Mendapatkan total jumlah sertifikasi yang pernah diajukan
    /// @return Jumlah total ID yang telah digunakan
    function getTotalSertifikasi() external view returns (uint256) {
        return _sertifikasiIdCounter;
    }

    /// @notice Mendapatkan alamat pseudo dari ID sertifikasi
    /// @param id ID numerik dari sertifikasi
    /// @return Alamat yang merepresentasikan sertifikasi tersebut
    function getSertifikasiAddressById(uint256 id) external view returns (address) {
        require(id <= _sertifikasiIdCounter && id > 0, "ID tidak valid");
        return sertifikasiById[id];
    }

    /// @notice LSP menginput nilai peserta (sekali saja)
    /// @param sertifikasiID Alamat sertifikasi
    /// @param tulis Nilai ujian tulis (0-100)
    /// @param praktek Nilai ujian praktek (0-100)
    /// @param wawancara Nilai ujian wawancara (0-100)
    function inputNilaiPeserta(
        address sertifikasiID,
        uint8 tulis,
        uint8 praktek,
        uint8 wawancara
    ) external onlyLSP validAddress(sertifikasiID) {
        require(!nilaiPeserta[sertifikasiID].sudahInput, "Nilai sudah diinput");
        require(tulis <= 100 && praktek <= 100 && wawancara <= 100, "Nilai maksimal 100");
        nilaiPeserta[sertifikasiID] = Nilai({
            tulis: tulis,
            praktek: praktek,
            wawancara: wawancara,
            sudahInput: true
        });
    }

    /// @notice Mengambil nilai peserta berdasarkan sertifikasiID
    /// @param sertifikasiID Alamat sertifikasi
    /// @return tulis, praktek, wawancara, sudahInput
    function getNilaiPeserta(address sertifikasiID) external view returns (uint8, uint8, uint8, bool) {
        Nilai memory n = nilaiPeserta[sertifikasiID];
        return (n.tulis, n.praktek, n.wawancara, n.sudahInput);
    }
}