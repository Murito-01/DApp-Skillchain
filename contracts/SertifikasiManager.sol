// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./SertifikasiStorage.sol";

contract SertifikasiManager is SertifikasiStorage {

    uint256 private _sertifikasiIdCounter;
    
    mapping(uint256 => address) public sertifikasiById;

    function ajukanSertifikasi(SkemaSertifikasi skema) external onlyPeserta {
        Peserta storage peserta = pesertaList[msg.sender];
        
        require(peserta.sertifikasiAktif == address(0), "Masih ada sertifikasi aktif");

        _sertifikasiIdCounter++;
        uint256 counterId = _sertifikasiIdCounter;
        
        address sertifikasiID = address(uint160(uint256(keccak256(
            abi.encode("SERTIFIKASI_", counterId, msg.sender, block.timestamp, nonces[msg.sender]++)
        ))));

        sertifikasiById[counterId] = sertifikasiID;

        sertifikasiList[sertifikasiID] = Sertifikasi({
            peserta: msg.sender,
            skema: skema,
            sertifikatCID: "",
            lulus: false,
            aktif: true,
            tanggalPengajuan: block.timestamp,
            tanggalSelesai: 0,
            tanggalExpiry: block.timestamp + (3 * 365 * 24 * 60 * 60),
            lspPenilai: address(0),
            alasanGagal: ""
        });

        peserta.sertifikasiAktif = sertifikasiID;
        peserta.sertifikasiDiikuti.push(sertifikasiID);

        emit SertifikasiDiajukan(msg.sender, sertifikasiID, skema, block.timestamp);
    }

    function updateKelulusan(address sertifikasiID, string calldata sertifikatCID) 
        external 
        onlyLSP 
        validAddress(sertifikasiID)
        notEmpty(sertifikatCID)
    {
        Sertifikasi storage s = sertifikasiList[sertifikasiID];
        require(s.aktif, "Sertifikasi tidak aktif");
        require(s.peserta != address(0), "Sertifikasi tidak ditemukan");

        s.lulus = true;
        s.sertifikatCID = sertifikatCID;
        s.aktif = false;
        s.tanggalSelesai = block.timestamp;
        s.lspPenilai = msg.sender;

        pesertaList[s.peserta].sertifikasiAktif = address(0);

        emit KelulusanDiupdate(msg.sender, sertifikasiID, sertifikatCID, block.timestamp);
    }

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

        pesertaList[s.peserta].sertifikasiAktif = address(0);

        emit SertifikasiBatal(msg.sender, sertifikasiID, alasan, block.timestamp);
    }

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

    function getSertifikasi(address sertifikasiID) external view returns (Sertifikasi memory) {
        require(sertifikasiList[sertifikasiID].peserta != address(0), "Sertifikasi tidak ditemukan");
        return sertifikasiList[sertifikasiID];
    }

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

    function getTotalSertifikasi() external view returns (uint256) {
        return _sertifikasiIdCounter;
    }

    function getSertifikasiAddressById(uint256 id) external view returns (address) {
        require(id <= _sertifikasiIdCounter && id > 0, "ID tidak valid");
        return sertifikasiById[id];
    }
}