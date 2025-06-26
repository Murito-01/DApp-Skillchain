// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./SertifikasiStorage.sol";

contract PesertaManager is SertifikasiStorage {

    function daftarPeserta(string calldata metadataCID) external notEmpty(metadataCID) {
        require(!pesertaList[msg.sender].terdaftar, "Sudah terdaftar");

        pesertaList[msg.sender] = Peserta({
            metadataCID: metadataCID,
            terdaftar: true,
            aktif: true,
            sertifikasiAktif: address(0),
            sertifikasiDiikuti: new address[](0),
            tanggalDaftar: block.timestamp
        });

        isPesertaTerdaftar[msg.sender] = true;
        pesertaCount++;

        emit PesertaTerdaftar(msg.sender, metadataCID, block.timestamp);
    }

    function updateMetadata(string calldata newCID) external onlyPeserta notEmpty(newCID) {
        pesertaList[msg.sender].metadataCID = newCID;
        emit MetadataDiupdate(msg.sender, newCID);
    }

    function nonaktifkanPeserta(address peserta) external onlyBNSP validAddress(peserta) {
        require(pesertaList[peserta].terdaftar, "Peserta tidak terdaftar");
        require(pesertaList[peserta].aktif, "Peserta sudah nonaktif");
        
        pesertaList[peserta].aktif = false;
        
        if (pesertaList[peserta].sertifikasiAktif != address(0)) {
            address sertifikasiID = pesertaList[peserta].sertifikasiAktif;
            sertifikasiList[sertifikasiID].aktif = false;
            pesertaList[peserta].sertifikasiAktif = address(0);
        }
        
        emit PesertaDinonaktifkan(peserta);
    }

    function lihatRiwayatSertifikasi(address peserta) external view returns (address[] memory) {
        return pesertaList[peserta].sertifikasiDiikuti;
    }

    function getMetadataCID(address peserta) external view returns (string memory) {
        require(pesertaList[peserta].terdaftar, "Peserta tidak terdaftar");
        return pesertaList[peserta].metadataCID;
    }

    function getPesertaInfo(address peserta) external view returns (

        string memory metadataCID,
        bool terdaftar,
        bool aktif,
        address sertifikasiAktif,
        uint256 tanggalDaftar,
        uint256 totalSertifikasi
    ) {
        Peserta memory p = pesertaList[peserta];
        return (
            p.metadataCID,
            p.terdaftar,
            p.aktif,
            p.sertifikasiAktif,
            p.tanggalDaftar,
            p.sertifikasiDiikuti.length
        );
    }
}