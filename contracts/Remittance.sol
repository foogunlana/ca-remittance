pragma solidity ^0.4.11;

import { OwnedDestroyable } from './OwnedDestroyable.sol';

contract Remittance is OwnedDestroyable{
  bytes32 private passwordHash;
  address public sender;
  uint public deadline;
  uint public commission;
  uint public maxDuration = 15;
  uint public creationGas = 21051;

  modifier deadlinePassed {
    assert(block.number >= deadline);
    _;
  }

  modifier onlySender {
    require(msg.sender == sender);
    _;
  }

  event LogWithdrawal(address indexed _sender);
  event LogWithdrawCommission(address indexed _owner);

  function () payable {
    commission = (creationGas * tx.gasprice) - 1;
    require(msg.value > commission);
    amount = msg.value - commission;
  }

  function Remittance(
    address _sender, bytes32 _passwordHash, uint _duration)
    public
  {
    require(_duration <= maxDuration);
    sender = _sender;
    passwordHash = _passwordHash;
    deadline = block.number + _duration;
  }

  function withdraw(bytes32 _password1, bytes32 _password2)
    public
    returns(bool)
  {
    require(sha3(_password1, _password2) == passwordHash);
    require(sha3(msg.sender) == _password2);
    amount = 0;
    msg.sender.transfer(amount);
    LogWithdrawal(msg.sender);
    return true;
  }

  function withdrawCommission()
    public
    onlyOwner
    returns(bool)
  {
    require(commission > 0);
    commission = 0;
    owner.transfer(commission);
    LogWithdrawCommission(msg.sender);
    return true;
  }

  function refund()
    public
    onlySender
    deadlinePassed
    returns(bool)
  {
    amount = 0;
    sender.transfer(amount);
    return true;
  }

  function destroy()
    public
  {
    require((block.number >= deadline + 100) || (amount == 0));
    super.destroy();
  }
}
