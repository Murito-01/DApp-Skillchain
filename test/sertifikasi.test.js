
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DApp Sertifikasi Testing Suite", function () {
    let mainContract;
    let bnsp, lsp1, lsp2, peserta1, peserta2, peserta3, publicUser;
    let deployer;

    // Enums untuk SkemaSertifikasi
    const SkemaSertifikasi = {
        OKUPASI_PJOI_PENCEMARAN_UDARA: 0,
        OKUPASI_PJ_PENCEMARAN_UDARA: 1,
        OKUPASI_PJO_PENGOLAHAN_AIR: 2,
        OKUPASI_PJ_PENCEMARAN_AIR: 3
    };

    // Helper function untuk mendapatkan timestamp terbaru
    async function getLatestTimestamp() {
        const block = await ethers.provider.getBlock('latest');
        return block.timestamp;
    }

    beforeEach(async function () {
        // Setup akun
        [deployer, bnsp, lsp1, lsp2, peserta1, peserta2, peserta3, publicUser] = await ethers.getSigners();

        // Deploy contract
        const MainContract = await ethers.getContractFactory("MainContract");
        mainContract = await MainContract.connect(bnsp).deploy();
        await mainContract.waitForDeployment();

        console.log("Contract deployed to:", await mainContract.getAddress());
        console.log("BNSP address:", bnsp.address);
    });

    describe("1. Contract Deployment", function () {
        it("Should set BNSP correctly", async function () {
            expect(await mainContract.bnsp()).to.equal(bnsp.address);
        });

        it("Should start with zero participants", async function () {
            expect(await mainContract.pesertaCount()).to.equal(0);
        });
    });

    describe("2. LSP Management", function () {
        it("Should allow BNSP to add LSP", async function () {
            await expect(
                mainContract.connect(bnsp).tambahLSP(lsp1.address, "QmLSP1MetadataCID")
            ).to.emit(mainContract, "LSPDitambahkan")
             .withArgs(lsp1.address, "QmLSP1MetadataCID");

            expect(await mainContract.isLSP(lsp1.address)).to.be.true;
        });

        it("Should reject non-BNSP trying to add LSP", async function () {
            await expect(
                mainContract.connect(lsp1).tambahLSP(lsp2.address, "QmLSP2MetadataCID")
            ).to.be.revertedWith("Hanya BNSP");
        });

        it("Should reject adding BNSP as LSP", async function () {
            await expect(
                mainContract.connect(bnsp).tambahLSP(bnsp.address, "QmBNSPMetadataCID")
            ).to.be.revertedWith("BNSP tidak bisa jadi LSP");
        });

        it("Should reject duplicate LSP registration", async function () {
            await mainContract.connect(bnsp).tambahLSP(lsp1.address, "QmLSP1MetadataCID");
            
            await expect(
                mainContract.connect(bnsp).tambahLSP(lsp1.address, "QmLSP1NewCID")
            ).to.be.revertedWith("LSP sudah terdaftar");
        });

        it("Should allow adding multiple LSPs", async function () {
            const addresses = [lsp1.address, lsp2.address];
            const cids = ["QmLSP1CID", "QmLSP2CID"];

            await expect(
                mainContract.connect(bnsp).tambahMultipleLSP(addresses, cids)
            ).to.emit(mainContract, "LSPDitambahkan")
             .withArgs(lsp1.address, "QmLSP1CID");

            expect(await mainContract.isLSP(lsp1.address)).to.be.true;
            expect(await mainContract.isLSP(lsp2.address)).to.be.true;
        });

        it("Should allow LSP to update metadata", async function () {
            await mainContract.connect(bnsp).tambahLSP(lsp1.address, "QmLSP1MetadataCID");
            
            await expect(
                mainContract.connect(lsp1).updateMetadataLSP("QmLSP1NewMetadataCID")
            ).to.emit(mainContract, "LSPMetadataUpdated")
             .withArgs(lsp1.address, "QmLSP1NewMetadataCID");
        });

        it("Should allow BNSP to remove LSP", async function () {
            await mainContract.connect(bnsp).tambahLSP(lsp1.address, "QmLSP1MetadataCID");
            
            await expect(
                mainContract.connect(bnsp).hapusLSP(lsp1.address)
            ).to.emit(mainContract, "LSPDihapus")
             .withArgs(lsp1.address);

            expect(await mainContract.isLSP(lsp1.address)).to.be.false;
        });
    });

    describe("3. Peserta Management", function () {
        it("Should allow participant registration", async function () {
            const tx = await mainContract.connect(peserta1).daftarPeserta("QmPeserta1MetadataCID");
            const receipt = await tx.wait();
            const timestamp = await getLatestTimestamp();

            await expect(tx)
                .to.emit(mainContract, "PesertaTerdaftar")
                .withArgs(peserta1.address, "QmPeserta1MetadataCID", timestamp);

            expect(await mainContract.pesertaCount()).to.equal(1);
            expect(await mainContract.isPesertaTerdaftar(peserta1.address)).to.be.true;
        });

        it("Should reject duplicate participant registration", async function () {
            await mainContract.connect(peserta1).daftarPeserta("QmPeserta1MetadataCID");
            
            await expect(
                mainContract.connect(peserta1).daftarPeserta("QmPeserta1NewCID")
            ).to.be.revertedWith("Sudah terdaftar");
        });

        it("Should reject empty metadata CID", async function () {
            await expect(
                mainContract.connect(peserta1).daftarPeserta("")
            ).to.be.revertedWith("String tidak boleh kosong");
        });

        it("Should allow participant to update metadata", async function () {
            await mainContract.connect(peserta1).daftarPeserta("QmPeserta1MetadataCID");
            
            await expect(
                mainContract.connect(peserta1).updateMetadata("QmPeserta1NewMetadataCID")
            ).to.emit(mainContract, "MetadataDiupdate")
             .withArgs(peserta1.address, "QmPeserta1NewMetadataCID");
        });

        it("Should allow BNSP to deactivate participant", async function () {
            await mainContract.connect(peserta1).daftarPeserta("QmPeserta1MetadataCID");
            
            await expect(
                mainContract.connect(bnsp).nonaktifkanPeserta(peserta1.address)
            ).to.emit(mainContract, "PesertaDinonaktifkan")
             .withArgs(peserta1.address);

            const info = await mainContract.getPesertaInfo(peserta1.address);
            expect(info.aktif).to.be.false;
        });
    });

    describe("4. Sertifikasi Process", function () {
        beforeEach(async function () {
            // Setup LSP dan Peserta
            await mainContract.connect(bnsp).tambahLSP(lsp1.address, "QmLSP1MetadataCID");
            await mainContract.connect(peserta1).daftarPeserta("QmPeserta1MetadataCID");
        });

        it("Should allow participant to submit certification", async function () {
            const tx = await mainContract.connect(peserta1).ajukanSertifikasi(
                SkemaSertifikasi.OKUPASI_PJOI_PENCEMARAN_UDARA
            );
            
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    const parsed = mainContract.interface.parseLog(log);
                    return parsed.name === "SertifikasiDiajukan";
                } catch (e) {
                    return false;
                }
            });

            expect(event).to.not.be.undefined;
            expect(await mainContract.getTotalSertifikasi()).to.equal(1);
        });

        it("Should reject multiple active certifications", async function () {
            await mainContract.connect(peserta1).ajukanSertifikasi(
                SkemaSertifikasi.OKUPASI_PJOI_PENCEMARAN_UDARA
            );
            
            await expect(
                mainContract.connect(peserta1).ajukanSertifikasi(
                    SkemaSertifikasi.OKUPASI_PJ_PENCEMARAN_UDARA
                )
            ).to.be.revertedWith("Masih ada sertifikasi aktif");
        });

        it("Should allow LSP to approve certification", async function () {
            // Submit certification
            const tx = await mainContract.connect(peserta1).ajukanSertifikasi(
                SkemaSertifikasi.OKUPASI_PJOI_PENCEMARAN_UDARA
            );
            
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    const parsed = mainContract.interface.parseLog(log);
                    return parsed.name === "SertifikasiDiajukan";
                } catch (e) {
                    return false;
                }
            });

            const sertifikasiID = event.args[1];

            // LSP approve
            const approveTx = await mainContract.connect(lsp1).updateKelulusan(sertifikasiID, "QmSertifikatCID");
            const timestamp = await getLatestTimestamp();

            await expect(approveTx)
                .to.emit(mainContract, "KelulusanDiupdate")
                .withArgs(lsp1.address, sertifikasiID, "QmSertifikatCID", timestamp);

            const sertifikasiData = await mainContract.getSertifikasi(sertifikasiID);
            expect(sertifikasiData.lulus).to.be.true;
            expect(sertifikasiData.aktif).to.be.false;
        });

        it("Should allow LSP to reject certification", async function () {
            // Submit certification
            const tx = await mainContract.connect(peserta1).ajukanSertifikasi(
                SkemaSertifikasi.OKUPASI_PJOI_PENCEMARAN_UDARA
            );
            
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    const parsed = mainContract.interface.parseLog(log);
                    return parsed.name === "SertifikasiDiajukan";
                } catch (e) {
                    return false;
                }
            });

            const sertifikasiID = event.args[1];

            // LSP reject
            const rejectTx = await mainContract.connect(lsp1).updateKegagalan(sertifikasiID, "Tidak memenuhi syarat");
            const timestamp = await getLatestTimestamp();

            await expect(rejectTx)
                .to.emit(mainContract, "SertifikasiBatal")
                .withArgs(lsp1.address, sertifikasiID, "Tidak memenuhi syarat", timestamp);

            const sertifikasiData = await mainContract.getSertifikasi(sertifikasiID);
            expect(sertifikasiData.lulus).to.be.false;
            expect(sertifikasiData.aktif).to.be.false;
            expect(sertifikasiData.alasanGagal).to.equal("Tidak memenuhi syarat");
        });

        it("Should allow participant to cancel certification", async function () {
            // Submit certification
            const tx = await mainContract.connect(peserta1).ajukanSertifikasi(
                SkemaSertifikasi.OKUPASI_PJOI_PENCEMARAN_UDARA
            );
            
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    const parsed = mainContract.interface.parseLog(log);
                    return parsed.name === "SertifikasiDiajukan";
                } catch (e) {
                    return false;
                }
            });

            const sertifikasiID = event.args[1];

            // Participant cancel
            await expect(
                mainContract.connect(peserta1).batalkanSertifikasi()
            ).to.emit(mainContract, "SertifikasiBatal");

            const sertifikasiData = await mainContract.getSertifikasi(sertifikasiID);
            expect(sertifikasiData.aktif).to.be.false;
            expect(sertifikasiData.alasanGagal).to.equal("Dibatalkan oleh peserta");
        });

        it("Should reject non-LSP trying to approve certification", async function () {
            const tx = await mainContract.connect(peserta1).ajukanSertifikasi(
                SkemaSertifikasi.OKUPASI_PJOI_PENCEMARAN_UDARA
            );
            
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    const parsed = mainContract.interface.parseLog(log);
                    return parsed.name === "SertifikasiDiajukan";
                } catch (e) {
                    return false;
                }
            });

            const sertifikasiID = event.args[1];

            await expect(
                mainContract.connect(peserta2).updateKelulusan(sertifikasiID, "QmSertifikatCID")
            ).to.be.revertedWith("Hanya LSP");
        });
    });

    describe("5. Public Verification", function () {
        let sertifikasiID;

        beforeEach(async function () {
            // Setup complete certification process
            await mainContract.connect(bnsp).tambahLSP(lsp1.address, "QmLSP1MetadataCID");
            await mainContract.connect(peserta1).daftarPeserta("QmPeserta1MetadataCID");
            
            const tx = await mainContract.connect(peserta1).ajukanSertifikasi(
                SkemaSertifikasi.OKUPASI_PJOI_PENCEMARAN_UDARA
            );
            
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    const parsed = mainContract.interface.parseLog(log);
                    return parsed.name === "SertifikasiDiajukan";
                } catch (e) {
                    return false;
                }
            });

            sertifikasiID = event.args[1];
            
            // Approve certification
            await mainContract.connect(lsp1).updateKelulusan(sertifikasiID, "QmSertifikatCID");
        });

        it("Should verify valid certification", async function () {
            const isValid = await mainContract.connect(publicUser).verifikasiKelulusan(sertifikasiID);
            expect(isValid).to.be.true;
        });

        it("Should return false for invalid certification ID", async function () {
            const invalidID = ethers.ZeroAddress;
            const isValid = await mainContract.connect(publicUser).verifikasiKelulusan(invalidID);
            expect(isValid).to.be.false;
        });

        it("Should get certificate CID", async function () {
            const cid = await mainContract.connect(publicUser).getSertifikatCID(sertifikasiID);
            expect(cid).to.equal("QmSertifikatCID");
        });

        it("Should get complete verification details", async function () {
            const details = await mainContract.connect(publicUser).verifikasiSertifikasiLengkap(sertifikasiID);
            
            expect(details.exists).to.be.true;
            expect(details.lulus).to.be.true;
            expect(details.aktif).to.be.false;
            expect(details.peserta).to.equal(peserta1.address);
            expect(details.skema).to.equal(SkemaSertifikasi.OKUPASI_PJOI_PENCEMARAN_UDARA);
            expect(details.sertifikatCID).to.equal("QmSertifikatCID");
            expect(details.lspPenilai).to.equal(lsp1.address);
        });

        it("Should get participant status", async function () {
            const status = await mainContract.connect(publicUser).cekStatusPeserta(peserta1.address);
            
            expect(status.terdaftar).to.be.true;
            expect(status.aktif).to.be.true;
            expect(status.adaSertifikasiAktif).to.be.false;
            expect(status.totalSertifikasi).to.equal(1);
        });

        it("Should get schema name", async function () {
            const namaSkema = await mainContract.getSkemaNama(SkemaSertifikasi.OKUPASI_PJOI_PENCEMARAN_UDARA);
            expect(namaSkema).to.equal("Okupasi Penanggung Jawab Operasional Instalasi Pengendalian Pencemaran Udara");
        });
    });

    describe("6. Edge Cases & Security", function () {
        beforeEach(async function () {
            await mainContract.connect(bnsp).tambahLSP(lsp1.address, "QmLSP1MetadataCID");
            await mainContract.connect(peserta1).daftarPeserta("QmPeserta1MetadataCID");
        });

        it("Should handle zero address validations", async function () {
            await expect(
                mainContract.connect(bnsp).tambahLSP(ethers.ZeroAddress, "QmLSP1MetadataCID")
            ).to.be.revertedWith("Alamat tidak valid");
        });

        it("Should handle empty string validations", async function () {
            await expect(
                mainContract.connect(peserta2).daftarPeserta("")
            ).to.be.revertedWith("String tidak boleh kosong");
        });

        it("Should prevent unauthorized access", async function () {
            await expect(
                mainContract.connect(peserta1).tambahLSP(lsp2.address, "QmLSP2MetadataCID")
            ).to.be.revertedWith("Hanya BNSP");
        });

        it("Should generate unique certification IDs", async function () {
            // Register multiple participants
            await mainContract.connect(peserta2).daftarPeserta("QmPeserta2MetadataCID");
            await mainContract.connect(peserta3).daftarPeserta("QmPeserta3MetadataCID");

            // Submit certifications at the same time
            const tx1 = await mainContract.connect(peserta1).ajukanSertifikasi(
                SkemaSertifikasi.OKUPASI_PJOI_PENCEMARAN_UDARA
            );
            const tx2 = await mainContract.connect(peserta2).ajukanSertifikasi(
                SkemaSertifikasi.OKUPASI_PJ_PENCEMARAN_UDARA
            );

            const receipt1 = await tx1.wait();
            const receipt2 = await tx2.wait();

            const event1 = receipt1.logs.find(log => {
                try {
                    const parsed = mainContract.interface.parseLog(log);
                    return parsed.name === "SertifikasiDiajukan";
                } catch (e) {
                    return false;
                }
            });

            const event2 = receipt2.logs.find(log => {
                try {
                    const parsed = mainContract.interface.parseLog(log);
                    return parsed.name === "SertifikasiDiajukan";
                } catch (e) {
                    return false;
                }
            });

            const sertifikasiID1 = event1.args[1];
            const sertifikasiID2 = event2.args[1];

            expect(sertifikasiID1).to.not.equal(sertifikasiID2);
        });

        it("Should handle certification history correctly", async function () {
            // Submit and complete first certification
            let tx = await mainContract.connect(peserta1).ajukanSertifikasi(
                SkemaSertifikasi.OKUPASI_PJOI_PENCEMARAN_UDARA
            );
            
            let receipt = await tx.wait();
            let event = receipt.logs.find(log => {
                try {
                    const parsed = mainContract.interface.parseLog(log);
                    return parsed.name === "SertifikasiDiajukan";
                } catch (e) {
                    return false;
                }
            });

            const sertifikasiID1 = event.args[1];
            await mainContract.connect(lsp1).updateKelulusan(sertifikasiID1, "QmSertifikat1CID");

            // Submit second certification
            tx = await mainContract.connect(peserta1).ajukanSertifikasi(
                SkemaSertifikasi.OKUPASI_PJ_PENCEMARAN_UDARA
            );
            
            receipt = await tx.wait();
            event = receipt.logs.find(log => {
                try {
                    const parsed = mainContract.interface.parseLog(log);
                    return parsed.name === "SertifikasiDiajukan";
                } catch (e) {
                    return false;
                }
            });

            const sertifikasiID2 = event.args[1];

            // Check history
            const riwayat = await mainContract.lihatRiwayatSertifikasi(peserta1.address);
            expect(riwayat.length).to.equal(2);
            expect(riwayat[0]).to.equal(sertifikasiID1);
            expect(riwayat[1]).to.equal(sertifikasiID2);
        });
    });

    describe("7. Gas Optimization Tests", function () {
        it("Should efficiently handle multiple LSP additions", async function () {
            const addresses = [lsp1.address, lsp2.address];
            const cids = ["QmLSP1CID", "QmLSP2CID"];

            const tx = await mainContract.connect(bnsp).tambahMultipleLSP(addresses, cids);
            const receipt = await tx.wait();
            
            // Gas usage should be reasonable
            expect(receipt.gasUsed).to.be.below(200000);
        });
    });
});