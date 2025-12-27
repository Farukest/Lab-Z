import "@nomicfoundation/hardhat-toolbox";
import "@fhevm/hardhat-plugin";
import { HardhatUserConfig, vars } from "hardhat/config";

const MNEMONIC = vars.has("MNEMONIC")
  ? vars.get("MNEMONIC")
  : "test test test test test test test test test test test junk";

const INFURA_API_KEY = vars.has("INFURA_API_KEY")
  ? vars.get("INFURA_API_KEY")
  : "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      // Local hardhat network with FHEVM mock
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts: {
        mnemonic: MNEMONIC,
      },
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

export default config;
