pragma solidity ^0.4.11;

import { OwnedDestroyable } from './OwnedDestroyable.sol';

contract Remittance is OwnedDestroyable{
  bytes32 private passwordHash1;
  bytes32 private passwordHash2;
  address public sender;
  uint public deadline;
  uint public maxDuration = 15;
  uint public creationGas = 21051;

  modifier deadlinePassed {
    assert(block.number >= deadline);
    _;
  }

  modifier onlyRecipient {
    require(sha3(sha3(msg.sender)) == passwordHash2);
    _;
  }

  modifier onlySender {
    require(msg.sender == sender);
    _;
  }

  event LogWithdrawal(address indexed _sender);

  function () payable {
    uint commission = (creationGas * tx.gasprice) - 1;
    owner.transfer(commission);
  }

  function Remittance(
    address _sender, bytes32 _passwordHash1, bytes32 _passwordHash2, uint _duration)
    public
    payable {
    require(_duration <= maxDuration);

    sender = _sender;
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

  function refund()
    public
    payable
    onlySender
    deadlinePassed
    returns(bool) {

    sender.transfer(this.balance);
    return true;
  }

  function destroy()
    public {
    require((block.number >= deadline + 100) || (this.balance == 0));
    super.destroy();
  }
}
