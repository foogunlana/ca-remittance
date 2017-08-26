var Remittance = artifacts.require('./Remittance.sol');

contract('Remittance', accounts => {
  var alice = accounts[0];
  var carol = accounts[1];
  var bob = accounts[2];
  var password1 = "hello";
  var password2 = "world";
  var amount = web3.toWei(10, 'ether');

  it('should release funds to any account if both password hashes are provided', () => {
    var initialBalance;
    var instance;
    return Remittance.new(
      web3.sha3(password1),
      web3.sha3(password2),
      {from: alice, value: amount})
    .then(_instance => {
      instance = _instance;
      return web3.eth.getBalance(bob);
    })
    .then(balance => {
      initialBalance = balance;
      return instance.withdraw(
        web3.sha3(password1),
        web3.sha3(password2),
        {from: bob});
    })
    .then(txObj => {
      return web3.eth.getBalance(bob);
    })
    .then(balance => {
      assert.isAbove(
        balance.toNumber(),
        initialBalance.toNumber(),
        "Bob's balance wasn't credited!")
    });
  });
});
