var Remittance = artifacts.require('./Remittance.sol');

function getTransactionReceiptMined(txHash, interval) {
  const transactionReceiptAsync = function(resolve, reject) {
    web3.eth.getTransactionReceipt(txHash, (error, receipt) => {
      if (error) {
        reject(error);
      } else if (receipt == null) {
        setTimeout(
          () => transactionReceiptAsync(resolve, reject),
          interval ? interval : 500);
      } else {
        resolve(receipt);
      }
    });
  };

  if (Array.isArray(txHash)) {
    return Promise.all(txHash.map(
      oneTxHash => web3.eth.getTransactionReceiptMined(oneTxHash, interval)));
  } else if (typeof txHash === "string") {
    return new Promise(transactionReceiptAsync);
  } else {
    throw new Error("Invalid Type: " + txHash);
  }
};

function expectedExceptionPromise(action, gasToUse) {
  return new Promise(function (resolve, reject) {
    try {
      resolve(action());
    } catch(e) {
      reject(e);
    }
  })
  .then(function (txn) {
    // https://gist.github.com/xavierlepretre/88682e871f4ad07be4534ae560692ee6
    return getTransactionReceiptMined(txn);
  })
  .then(function (receipt) {
    // We are in Geth
    assert.equal(receipt.gasUsed, gasToUse, "should have used all the gas");
  })
  .catch(function (e) {
    if (((e + "").indexOf("invalid opcode") > -1) || ((e + "").indexOf("out of gas") > -1)) {
      // We are in TestRPC
    } else if ((e + "").indexOf("please check your gas amount") > -1) {
      // We are in Geth for a deployment
    } else {
      throw e;
    }
  });
};

contract('Remittance', accounts => {
  var alice = accounts[0];
  var carol = accounts[1];
  var bob = accounts[2];
  var password1 = "hello";
  var wrongPassword1 = password1 + "x";
  var password2 = "world";
  var amount = web3.toWei(5, 'ether');

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

  it('should not release funds to any account without correct passwords', () => {
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
      return expectedExceptionPromise(() => {
        return instance.withdraw(
          web3.sha3(wrongPassword1),
          web3.sha3(password2),
          {from: bob, gas: 1000000})
        .then(txObj => txObj.tx);
      }, 1000000);
    })
  });
});
