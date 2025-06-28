const hre = require("hardhat");

async function main() {
  const MainContract = await hre.ethers.getContractFactory("MainContract");
  const contract = await MainContract.deploy(); // ← deploy contract
  await contract.waitForDeployment();           // ← tunggu sampai selesai

  const address = await contract.getAddress();  // ← ambil alamatnya
  console.log(`✅ MainContract deployed to: ${address}`);
}

main().catch((error) => {
  console.error("❌ Error saat deploy:", error);
  process.exitCode = 1;
});
