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
      oneTxHash => getTransactionReceiptMined(oneTxHash, interval)));
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

function solSha3 (...args) {
  args = args.map(arg => {
    if (typeof arg === 'string') {
      if (arg.substring(0, 2) === '0x') {
        return arg.slice(2);
      } else {
        return web3.toHex(arg).slice(2);
      }
    }
    if (typeof arg === 'number') {
      return leftPad((arg).toString(16), 64, 0);
    } else {
      return '';
    }
  });
  args = args.join('');
  return web3.sha3(args, { encoding: 'hex' });
}

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
  const owner = accounts[0];
  const alice = accounts[1];
  const carol = accounts[2];
  const bob = accounts[3];
  const sender = alice;
  const recipient = bob;
  const password = "hello";
  const wrongPassword = password + "x";
  const amount = web3.toWei(5, 'ether');
  const duration = 10;
  const deadlineTooLong = 100;
  let contractInstance;

  beforeEach(() => {
    return Remittance.new(
      sender,
      solSha3(password, solSha3(recipient)),
      0,
      {from: owner})
    .then(instance => {
      contractInstance = instance;
      return web3.eth.sendTransaction(
        {from: alice, value: amount, to: contractInstance.address});
    });
  });

  it('should be owned', () => {
    return contractInstance.owner.call()
    .then(_owner => {
      assert.equal(
        _owner,
        owner,
        'The contract owner was not set to the initial creator');
    });
  });

  it('should be destroyable immediately without funds', () => {
    return Remittance.new(
      sender,
      solSha3(password, solSha3(recipient)),
      0,
      {from: owner})
    .then(_instance => {
      contractInstance = _instance;
      return contractInstance.destroy({from: owner});
    })
    .then(txObj => {
      assert.equal(
        web3.eth.getCode(contractInstance.address),
        '0x0',
        'The code is not equal to 0x0 (empty code)');
    });
  });

  describe('Handles the deadline correctly', () => {
    it('should reject deadlines that are too long', () => {
      return expectedExceptionPromise(() => {
        return Remittance.new(
          sender,
          solSha3(password, solSha3(recipient)),
          deadlineTooLong,
          {from: owner, gas: 1000000})
        .then(txObj => txObj.tx);
      }, 1000000);
    });

    it('should be not be refundable before deadline', () => {
      var instance;
      return Remittance.new(
        sender,
        solSha3(password, solSha3(recipient)),
        duration,
        {from: owner})
      .then(_instance => {
        instance = _instance;
        return web3.eth.sendTransaction(
          {from: alice, value: amount, to: Remittance.address});
      })
      .then(tx => {
        return expectedExceptionPromise(() => {
          return instance.refund({from: alice, gas: 1000000})
          .then(txObj => txObj.tx);
        }, 1000000);
      });
    });
  });

  describe("Releases funds if passwords are provided by recipient only", () => {
    it('should release funds to recipient if passwords are correct', () => {
      var initialBalance;
      return promisify((cb) => web3.eth.getBalance(bob, cb))
      .then(balance => {
        initialBalance = balance;
        return contractInstance.withdraw(
          password,
          solSha3(recipient),
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

    it("should not release funds to any addres that isn't the recipient", () => {
      var initialBalance;
      var notRecipient = alice;
      return promisify((cb) => web3.eth.getBalance(bob, cb))
      .then(balance => {
        initialBalance = balance;
        return expectedExceptionPromise(() => {
          return contractInstance.withdraw(
            password,
            recipient,
            {from: notRecipient, gas: 1000000})
          .then(txObj => txObj.tx);
        }, 1000000);
      })
    });

    it('should not release funds to any account without correct passwords', () => {
      var initialBalance;
      return promisify((cb) => web3.eth.getBalance(bob, cb))
      .then(balance => {
        initialBalance = balance;
        return expectedExceptionPromise(() => {
          return contractInstance.withdraw(
            wrongPassword,
            recipient,
            {from: bob, gas: 1000000})
          .then(txObj => txObj.tx);
        }, 1000000);
      });
    });
  });

  it('it should save some commission for the owner upon withdrawal', () => {
    return contractInstance.commission.call()
    .then(commission => {
      assert.isAbove(
        commission.toNumber(),
        0,
        "Owner's commission wasn't allocated!")
    });
  });
});
