var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "total ethics write wage drill kick seminar climb virus dinosaur cliff index";
var NonceTrackerSubprovider = require("web3-provider-engine/subproviders/nonce-tracker");
const infuraKey = "830d9d263bd9486f83862bc9b0abe0c6";

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*" // Match any network id
    },
    rinkeby: {
      provider: function () {
        var wallet = new HDWalletProvider(mnemonic, `https://rinkeby.infura.io/v3/${infuraKey}`)
        var nonceTracker = new NonceTrackerSubprovider()
        wallet.engine._providers.unshift(nonceTracker)
        nonceTracker.setEngine(wallet.engine)
        return wallet
      },
      network_id: 4,
      // gas: 2000000,   // <--- Twice as much
      // gasPrice: 10000000000,
    }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};
