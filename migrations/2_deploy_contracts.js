var Remittance = artifacts.require("./Remittance.sol");

module.exports = function(deployer) {
  deployer.deploy(
    Remittance,
    web3.sha3('hello'),
    web3.sha3('world'));
};
