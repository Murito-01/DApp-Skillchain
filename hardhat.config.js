/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-toolbox");

const fs = require("fs");
const path = require("path");

task("export-abi", "Export ABI ke frontend")
  .setAction(() => {
    const abi = require("./artifacts/contracts/MainContract.sol/MainContract.json").abi;
    fs.writeFileSync(
      path.join(__dirname, "client/src/abi/MainContract.json"),
      JSON.stringify(abi, null, 2)
    );
    console.log("✅ ABI berhasil diexport ke client/src/abi/MainContract.json");
  });

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200  // Bisa disesuaikan, semakin tinggi semakin efisien gas tapi ukuran kontrak lebih besar
      }
    }
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true  // Untuk testing
    }
  }
};