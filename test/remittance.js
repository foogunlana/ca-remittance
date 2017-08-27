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

// https://stackoverflow.com/questions/32536049/do-i-need-to-return-after-early-resolve-reject
// See above for inspiration
const promisify = function(inner) {
  return new Promise((resolve, reject) =>
    inner((err, res) => {
      err ? reject(err) : resolve(res);
    })
  );
}

contract('Remittance', accounts => {
  const alice = accounts[0];
  const carol = accounts[1];
  const bob = accounts[2];
  const password = "hello";
  const wrongPassword1 = password + "x";
  const recipientAddress = bob;
  const amount = web3.toWei(5, 'ether');
  const duration = 10;
  const deadlineTooLong = 100;
  var contractInstance;

  beforeEach(() => {
    return Remittance.new(
      web3.sha3(password, {encoding: 'hex'}),
      web3.sha3(recipientAddress, {encoding: 'hex'}),
      0,
      {from: alice, value: amount})
    .then(instance => {
      contractInstance = instance;
    });
  });

  it('should be owned', () => {
    return contractInstance.owner()
    .then(_owner => {
      assert.equal(
        _owner,
        alice,
        'The contract owner was not set to the initial creator');
    });
  });

  it('should be destroyable immediately without deadline or (duration = 0)', () => {
    return contractInstance.destroy()
    .then(() => {
      assert.equal(
        web3.eth.getCode(contractInstance.address),
        '0x0',
        'The code is not equal to 0x0 (empty code)');
    });
  });

  it('should reject deadlines that are too long', () => {
    return expectedExceptionPromise(() => {
      return Remittance.new(
        web3.sha3(password, {encoding: 'hex'}),
        web3.sha3(recipientAddress, {encoding: 'hex'}),
        deadlineTooLong,
        {from: alice, value: amount, gas: 1000000})
      .then(txObj => txObj.tx);
    }, 1000000);
  });

  it('should be not be destroyable before deadline', () => {
    var instance;
    return Remittance.new(
      web3.sha3(password, {encoding: 'hex'}),
      web3.sha3(recipientAddress, {encoding: 'hex'}),
      duration,
      {from: alice, value: amount})
    .then(_instance => {
      instance = _instance;
      return expectedExceptionPromise(() => {
        return instance.destroy({from: alice, gas: 1000000})
        .then(txObj => txObj.tx);
      }, 1000000);
    })
    .then(() => {
      assert.notEqual(
        web3.eth.getCode(instance.address),
        '0x0',
        'The code was not destroyed');
    });
  });

  it('should release funds to recipient if both correct hashes are provided', () => {
    var initialBalance;

    return promisify((cb) => web3.eth.getBalance(bob, cb))
    .then(balance => {
      initialBalance = balance;
      return contractInstance.withdraw(
        web3.sha3(password, {encoding: 'hex'}),
        web3.sha3(recipientAddress, {encoding: 'hex'}),
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

    return promisify((cb) => web3.eth.getBalance(bob, cb))
    .then(balance => {
      initialBalance = balance;
      return expectedExceptionPromise(() => {
        return contractInstance.withdraw(
          web3.sha3(wrongPassword1, {encoding: 'hex'}),
          web3.sha3(recipientAddress, {encoding: 'hex'}),
          {from: bob, gas: 1000000})
        .then(txObj => txObj.tx);
      }, 1000000);
    })
  });

  it("should not release funds to any addres that isn't the recipient", () => {
    var initialBalance;
    var notRecipient = alice;
    return promisify((cb) => web3.eth.getBalance(bob, cb))
    .then(balance => {
      initialBalance = balance;
      return expectedExceptionPromise(() => {
        return contractInstance.withdraw(
          web3.sha3(password, {encoding: 'hex'}),
          web3.sha3(recipientAddress, {encoding: 'hex'}),
          {from: notRecipient, gas: 1000000})
        .then(txObj => txObj.tx);
      }, 1000000);
    })
  });
});
