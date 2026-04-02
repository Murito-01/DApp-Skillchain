
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("Pengujian DApp Sertifikasi", function () {
    let mainContract;
    let deployer, bnsp, lsp1, lsp2, peserta1, peserta2, peserta3, publicUser;

    const SkemaSertifikasi = {
        Okupasi_PJOI_Pengendalian_Pencemaran_Udara: 0,
        Okupasi_PJ_Pengendalian_Pencemaran_Udara: 1,
        Okupasi_PJO_Pengolahan_Air_Limbah: 2,
        Okupasi_PJ_Pengendalian_Pencemaran_Air: 3
    };

    const getEventArgs = async (tx, eventName) => {
        const receipt = await tx.wait();
        for (const log of receipt.logs) {
            try {
                const parsed = mainContract.interface.parseLog(log);
                if (parsed.name === eventName) {
                    return parsed.args;
                }
            } catch (err) {
                continue;
            }
        }
        throw new Error(`Event ${eventName} not found`);
    };

    const registerParticipant = async (signer, cid = "QmPesertaMetadataCID") => {
        await mainContract.connect(signer).daftarPeserta(cid);
    };

    const registerAndVerifyLSP = async (
        lspSigner,
        metadataCID = "QmLSPMetadataCID",
        suratCID = "QmSuratIzinCID"
    ) => {
        await mainContract.connect(lspSigner).daftarLSP(metadataCID);
        await mainContract.connect(bnsp).verifikasiLSP(lspSigner.address, suratCID);
    };

    const submitCertification = async (
        pesertaSigner,
        skema = SkemaSertifikasi.Okupasi_PJOI_Pengendalian_Pencemaran_Udara
    ) => {
        const tx = await mainContract.connect(pesertaSigner).ajukanSertifikasi(skema);
        const event = await getEventArgs(tx, "SertifikasiDiajukan");
        return event.sertifikasiID;
    };

    beforeEach(async function () {
        [deployer, bnsp, lsp1, lsp2, peserta1, peserta2, peserta3, publicUser] = await ethers.getSigners();
        const MainContract = await ethers.getContractFactory("MainContract");
        mainContract = await MainContract.connect(bnsp).deploy();
        await mainContract.waitForDeployment();
    });

    describe("1. Deploy Kontrak", function () {
        it("mengatur alamat BNSP dengan benar", async function () {
            expect(await mainContract.bnsp()).to.equal(bnsp.address);
        });

        it("mulai dengan jumlah peserta nol", async function () {
            expect(await mainContract.pesertaCount()).to.equal(0n);
        });
    });

    describe("2. Siklus Hidup LSP", function () {
        it("mengizinkan wallet mendaftar sebagai LSP", async function () {
            const tx = await mainContract.connect(lsp1).daftarLSP("QmLSP1MetadataCID");
            await expect(tx).to.emit(mainContract, "LSPDidaftarkan").withArgs(lsp1.address, "QmLSP1MetadataCID");

            const status = await mainContract.getStatusLSP(lsp1.address);
            expect(Number(status)).to.equal(0); // Menunggu
        });

        it("menolak BNSP yang mencoba mendaftar sebagai LSP", async function () {
            await expect(
                mainContract.connect(bnsp).daftarLSP("QmBNSPMetadataCID")
            ).to.be.revertedWith("BNSP tidak bisa daftar sebagai LSP");
        });

        it("menolak pendaftaran LSP yang duplikat", async function () {
            await mainContract.connect(lsp1).daftarLSP("QmLSP1MetadataCID");

            await expect(
                mainContract.connect(lsp1).daftarLSP("QmLSP1MetadataCID_Lagi")
            ).to.be.revertedWith("Sudah pernah daftar");
        });

        it("mengizinkan BNSP memverifikasi LSP yang terdaftar", async function () {
            await mainContract.connect(lsp1).daftarLSP("QmLSP1MetadataCID");

            const tx = await mainContract.connect(bnsp).verifikasiLSP(lsp1.address, "QmSuratIzinCID");
            await expect(tx).to.emit(mainContract, "LSPDiverifikasi").withArgs(lsp1.address, "QmSuratIzinCID");

            expect(await mainContract.isLSP(lsp1.address)).to.be.true;
            const status = await mainContract.getStatusLSP(lsp1.address);
            expect(Number(status)).to.equal(1); // Aktif
        });

        it("mengizinkan BNSP menolak pendaftaran LSP", async function () {
            await mainContract.connect(lsp1).daftarLSP("QmLSP1MetadataCID");

            const tx = await mainContract.connect(bnsp).tolakLSP(lsp1.address, "Dokumen kurang lengkap");
            await expect(tx)
                .to.emit(mainContract, "LSPDitolak")
                .withArgs(lsp1.address, "Dokumen kurang lengkap");

            const status = await mainContract.getStatusLSP(lsp1.address);
            expect(Number(status)).to.equal(2); // Ditolak
        });

        it("mengizinkan LSP memperbarui metadata-nya", async function () {
            await registerAndVerifyLSP(lsp1, "QmLSP1MetadataCID", "QmSuratIzinCID");

            const tx = await mainContract.connect(lsp1).updateMetadataLSP("QmLSP1MetadataCID_Baru");
            await expect(tx)
                .to.emit(mainContract, "LSPMetadataUpdated")
                .withArgs(lsp1.address, "QmLSP1MetadataCID_Baru");

            const lspData = await mainContract.getLSP(lsp1.address);
            expect(lspData.metadataCID).to.equal("QmLSP1MetadataCID_Baru");
        });

        it("mengizinkan BNSP menambahkan LSP ke daftar tunggu", async function () {
            const tx = await mainContract.connect(bnsp).addLSPToWaitinglist(lsp2.address);
            await expect(tx).to.emit(mainContract, "LSPDitambahkan").withArgs(lsp2.address, "-");
            expect(await mainContract.lspWaitinglist(lsp2.address)).to.be.true;
        });
    });

    describe("3. Manajemen Peserta", function () {
        it("mengizinkan pendaftaran peserta baru", async function () {
            const tx = await mainContract.connect(peserta1).daftarPeserta("QmPeserta1MetadataCID");
            await expect(tx).to.emit(mainContract, "PesertaTerdaftar");

            expect(await mainContract.pesertaCount()).to.equal(1n);
            expect(await mainContract.isPesertaTerdaftar(peserta1.address)).to.be.true;
        });

        it("menolak pendaftaran peserta yang duplikat", async function () {
            await registerParticipant(peserta1, "QmPeserta1MetadataCID");

            await expect(
                mainContract.connect(peserta1).daftarPeserta("QmPeserta1MetadataCID_V2")
            ).to.be.revertedWith("Sudah terdaftar");
        });

        it("menolak metadata CID kosong", async function () {
            await expect(mainContract.connect(peserta1).daftarPeserta("")).to.be.revertedWith("String tidak boleh kosong");
        });

        it("mengizinkan peserta memperbarui metadata", async function () {
            await registerParticipant(peserta1, "QmPeserta1MetadataCID");

            const tx = await mainContract.connect(peserta1).updateMetadata("QmPeserta1MetadataCID_Baru");
            await expect(tx)
                .to.emit(mainContract, "MetadataDiupdate")
                .withArgs(peserta1.address, "QmPeserta1MetadataCID_Baru");

            const info = await mainContract.getMetadataCID(peserta1.address);
            expect(info).to.equal("QmPeserta1MetadataCID_Baru");
        });
    });

    describe("4. Proses Sertifikasi", function () {
        beforeEach(async function () {
            await registerAndVerifyLSP(lsp1, "QmLSP1MetadataCID", "QmSuratIzinCID");
            await registerParticipant(peserta1, "QmPeserta1MetadataCID");
        });

        it("mengizinkan peserta mengajukan sertifikasi", async function () {
            const sertifikasiID = await submitCertification(
                peserta1,
                SkemaSertifikasi.Okupasi_PJOI_Pengendalian_Pencemaran_Udara
            );
            expect(sertifikasiID).to.be.properAddress;
            expect(await mainContract.getTotalSertifikasi()).to.equal(1n);
        });

        it("menolak lebih dari satu sertifikasi aktif per peserta", async function () {
            await submitCertification(peserta1);
            await expect(submitCertification(peserta1, SkemaSertifikasi.Okupasi_PJ_Pengendalian_Pencemaran_Udara)).to.be.revertedWith(
                "Masih ada sertifikasi aktif"
            );
        });

        it("mengizinkan LSP terverifikasi menyetujui sertifikasi", async function () {
            const sertifikasiID = await submitCertification(peserta1);

            const tx = await mainContract.connect(lsp1).updateKelulusan(sertifikasiID, "QmSertifikatCID");
            await expect(tx)
                .to.emit(mainContract, "KelulusanDiupdate")
                .withArgs(lsp1.address, sertifikasiID, "QmSertifikatCID", anyValue);

            const data = await mainContract.getSertifikasi(sertifikasiID);
            expect(data.lulus).to.be.true;
            expect(data.aktif).to.be.false;
        });

        it("mengizinkan LSP terverifikasi menolak sertifikasi", async function () {
            const sertifikasiID = await submitCertification(peserta1);

            const tx = await mainContract.connect(lsp1).updateKegagalan(sertifikasiID, "Tidak memenuhi syarat");
            await expect(tx)
                .to.emit(mainContract, "SertifikasiBatal")
                .withArgs(lsp1.address, sertifikasiID, "Tidak memenuhi syarat", anyValue);

            const data = await mainContract.getSertifikasi(sertifikasiID);
            expect(data.lulus).to.be.false;
            expect(data.aktif).to.be.false;
            expect(data.alasanGagal).to.equal("Tidak memenuhi syarat");
        });

        it("mengizinkan peserta membatalkan sertifikasi", async function () {
            await submitCertification(peserta1);

            const tx = await mainContract.connect(peserta1).batalkanSertifikasi();
            await expect(tx).to.emit(mainContract, "SertifikasiBatal");

            const info = await mainContract.getPesertaInfo(peserta1.address);
            expect(info.sertifikasiAktif).to.equal(ethers.ZeroAddress);
        });

        it("mencegah non-LSP mengubah status sertifikasi", async function () {
            const sertifikasiID = await submitCertification(peserta1);
            await expect(
                mainContract.connect(peserta2).updateKelulusan(sertifikasiID, "QmSertifikatCID")
            ).to.be.revertedWith("Hanya LSP");
        });

        it("mengizinkan LSP menginput nilai peserta satu kali saja", async function () {
            const sertifikasiID = await submitCertification(peserta1);

            await mainContract.connect(lsp1).inputNilaiPeserta(sertifikasiID, 80, 85, 90, true);
            const [tulis, praktek, wawancara, sudahInput] = await mainContract.getNilaiPeserta(sertifikasiID);
            expect(tulis).to.equal(80);
            expect(praktek).to.equal(85);
            expect(wawancara).to.equal(90);
            expect(sudahInput).to.equal(true);

            await expect(
                mainContract.connect(lsp1).inputNilaiPeserta(sertifikasiID, 70, 70, 70, false)
            ).to.be.revertedWith("Nilai sudah diinput");
        });
    });

    describe("5. Verifikasi Publik", function () {
        let sertifikasiID;

        beforeEach(async function () {
            await registerAndVerifyLSP(lsp1, "QmLSP1MetadataCID", "QmSuratIzinCID");
            await registerParticipant(peserta1, "QmPeserta1MetadataCID");
            sertifikasiID = await submitCertification(peserta1);
            await mainContract.connect(lsp1).updateKelulusan(sertifikasiID, "QmSertifikatCID");
        });

        it("memverifikasi sertifikasi yang valid", async function () {
            const isValid = await mainContract.connect(publicUser).verifikasiKelulusan(sertifikasiID);
            expect(isValid).to.be.true;
        });

        it("mengembalikan false untuk ID sertifikasi yang tidak valid", async function () {
            const isValid = await mainContract.connect(publicUser).verifikasiKelulusan(ethers.ZeroAddress);
            expect(isValid).to.be.false;
        });

        it("bisa mengambil CID sertifikat", async function () {
            const cid = await mainContract.connect(publicUser).getSertifikatCID(sertifikasiID);
            expect(cid).to.equal("QmSertifikatCID");
        });

        it("bisa mengambil detail verifikasi lengkap", async function () {
            const details = await mainContract.connect(publicUser).verifikasiSertifikasiLengkap(sertifikasiID);
            expect(details.exists).to.be.true;
            expect(details.lulus).to.be.true;
            expect(details.aktif).to.be.false;
            expect(details.peserta).to.equal(peserta1.address);
            expect(details.skema).to.equal(SkemaSertifikasi.Okupasi_PJOI_Pengendalian_Pencemaran_Udara);
            expect(details.sertifikatCID).to.equal("QmSertifikatCID");
            expect(details.lspPenilai).to.equal(lsp1.address);
        });

        it("bisa mengambil status peserta", async function () {
            const status = await mainContract.connect(publicUser).cekStatusPeserta(peserta1.address);
            expect(status.terdaftar).to.be.true;
            expect(status.aktif).to.be.true;
            expect(status.adaSertifikasiAktif).to.be.false;
            expect(status.totalSertifikasi).to.equal(1n);
        });

        it("bisa mengambil nama skema sertifikasi", async function () {
            const namaSkema = await mainContract.getSkemaNama(SkemaSertifikasi.Okupasi_PJOI_Pengendalian_Pencemaran_Udara);
            expect(namaSkema).to.equal("Okupasi Penanggung Jawab Operasional Instalasi Pengendalian Pencemaran Udara");
        });

        it("memverifikasi sertifikasi berdasarkan CID sertifikat yang valid", async function () {
            const [valid, idDitemukan] = await mainContract
                .connect(publicUser)
                .verifikasiKelulusanByCID("QmSertifikatCID");

            expect(valid).to.be.true;
            expect(idDitemukan).to.equal(sertifikasiID);
        });

        it("mengembalikan tidak valid untuk CID sertifikat yang tidak terdaftar", async function () {
            const [valid, idDitemukan] = await mainContract
                .connect(publicUser)
                .verifikasiKelulusanByCID("QmCIDTidakTerdaftar");

            expect(valid).to.be.false;
            expect(idDitemukan).to.equal(ethers.ZeroAddress);
        });
    });

    describe("6. Kasus Keamanan", function () {
        beforeEach(async function () {
            await registerAndVerifyLSP(lsp1, "QmLSP1MetadataCID", "QmSuratIzinCID");
            await registerParticipant(peserta1, "QmPeserta1MetadataCID");
        });

        it("menerapkan validasi alamat yang valid", async function () {
            await expect(
                mainContract.connect(bnsp).verifikasiLSP(ethers.ZeroAddress, "QmSurat")
            ).to.be.revertedWith("Alamat tidak valid");
        });

        it("menerapkan validasi string tidak boleh kosong", async function () {
            await expect(mainContract.connect(peserta2).daftarPeserta("")).to.be.revertedWith("String tidak boleh kosong");
        });

        it("mencegah verifikasi LSP oleh pihak tidak berwenang", async function () {
            await mainContract.connect(lsp2).daftarLSP("QmLSP2MetadataCID");
            await expect(
                mainContract.connect(peserta1).verifikasiLSP(lsp2.address, "QmSurat")
            ).to.be.revertedWith("Hanya BNSP");
        });

        it("menghasilkan ID sertifikasi yang unik", async function () {
            await registerParticipant(peserta2, "QmPeserta2MetadataCID");
            await registerParticipant(peserta3, "QmPeserta3MetadataCID");

            const sertifikasiID1 = await submitCertification(peserta1);
            const sertifikasiID2 = await submitCertification(peserta2, SkemaSertifikasi.Okupasi_PJ_Pengendalian_Pencemaran_Udara);

            expect(sertifikasiID1).to.not.equal(sertifikasiID2);
        });

        it("menyimpan riwayat sertifikasi dengan benar", async function () {
            const sertifikasiID1 = await submitCertification(peserta1);
            await mainContract.connect(lsp1).updateKelulusan(sertifikasiID1, "QmSertifikat1CID");

            const sertifikasiID2 = await submitCertification(peserta1, SkemaSertifikasi.Okupasi_PJ_Pengendalian_Pencemaran_Air);
            const history = await mainContract.lihatRiwayatSertifikasi(peserta1.address);

            expect(history.length).to.equal(2);
            expect(history[0]).to.equal(sertifikasiID1);
            expect(history[1]).to.equal(sertifikasiID2);
        });
    });
});