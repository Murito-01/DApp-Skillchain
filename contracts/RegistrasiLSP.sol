// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./SertifikasiStorage.sol";

contract RegistrasiLSP is SertifikasiStorage {
    
    mapping(address => string) public lspMetadata;

    function tambahLSP(address lspAddress, string calldata metadataCID) 
        external 
        onlyBNSP 
        validAddress(lspAddress)
        notEmpty(metadataCID)
    {
        require(!isLSP[lspAddress], "LSP sudah terdaftar");
        require(lspAddress != bnsp, "BNSP tidak bisa jadi LSP");

        isLSP[lspAddress] = true;
        lspMetadata[lspAddress] = metadataCID;

        emit LSPDitambahkan(lspAddress, metadataCID);
    }

    function tambahMultipleLSP(
        address[] calldata lspAddresses, 
        string[] calldata metadataCIDs
    ) external onlyBNSP {
        require(lspAddresses.length == metadataCIDs.length, "Array length mismatch");
        require(lspAddresses.length > 0, "Array kosong");
    
        address bnspCache = bnsp;
    
        for (uint i = 0; i < lspAddresses.length; i++) {
            address currentLSP = lspAddresses[i];
            string calldata currentCID = metadataCIDs[i];
        
            require(currentLSP != address(0), "Alamat tidak valid");
            require(currentLSP != bnspCache, "BNSP tidak bisa jadi LSP");
            require(!isLSP[currentLSP], "LSP sudah terdaftar");
        
            require(bytes(currentCID).length != 0, "CID kosong");
        
            isLSP[currentLSP] = true;
            lspMetadata[currentLSP] = currentCID;
        
            emit LSPDitambahkan(currentLSP, currentCID);
        }
    }

    function hapusLSP(address lspAddress) external onlyBNSP validAddress(lspAddress) {
        require(isLSP[lspAddress], "LSP tidak ditemukan");

        isLSP[lspAddress] = false;
        delete lspMetadata[lspAddress];

        emit LSPDihapus(lspAddress);
    }

    function updateMetadataLSP(string calldata newMetadataCID) external onlyLSP notEmpty(newMetadataCID) {
        lspMetadata[msg.sender] = newMetadataCID;
        emit LSPMetadataUpdated(msg.sender, newMetadataCID);
    }

    function getMetadataLSP(address lspAddress) external view returns (string memory) {
        require(isLSP[lspAddress], "LSP tidak aktif");
        return lspMetadata[lspAddress];
    }

    function cekStatusLSP(address lspAddress) external view returns (bool aktif, string memory metadata) {
        return (isLSP[lspAddress], lspMetadata[lspAddress]);
    }
}