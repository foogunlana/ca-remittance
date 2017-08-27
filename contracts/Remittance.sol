pragma solidity ^0.4.11;

import { OwnedDestroyable } from './OwnedDestroyable.sol';

contract Remittance is OwnedDestroyable{
  bytes32 private passwordHash1;
  bytes32 private passwordHash2;
  uint public deadline;
  uint public maxDuration = 15;

  modifier deadlinePassed {
    assert(block.number >= deadline);
    _;
  }

  modifier onlyRecipient {
    require(sha3(sha3(msg.sender)) == passwordHash2);
    _;
  }

  event LogWithdrawal(address indexed _sender);

  function () payable {}

  function Remittance(
    bytes32 _passwordHash1, bytes32 _passwordHash2, uint _duration)
    public
    payable {
    require(_duration <= maxDuration);

    passwordHash1 = sha3(_passwordHash1);
    passwordHash2 = sha3(_passwordHash2);
    deadline = block.number + _duration;
  }

  function withdraw(bytes32 _passwordHash1, bytes32 _passwordHash2)
    public
    onlyRecipient
    returns(bool) {
    require(sha3(_passwordHash1) == passwordHash1);
    require(sha3(_passwordHash2) == passwordHash2);
    msg.sender.transfer(this.balance);
    LogWithdrawal(msg.sender);
    return true;
  }

  function destroy()
    public
    deadlinePassed {
    super.destroy();
  }
}
