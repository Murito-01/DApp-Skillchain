/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-toolbox");

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