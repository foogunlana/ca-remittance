pragma solidity ^0.4.11;

import { OwnedDestroyable } from './OwnedDestroyable.sol';

contract Remittance is OwnedDestroyable{
  bytes32 public passwordHash;
  address public sender;
  uint public deadline;
  uint public commission;
  uint public amount;
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
    uint commissionAmount = (creationGas * tx.gasprice) - 1;
    require(msg.value > commissionAmount);
    commission = commissionAmount;
    amount = msg.value - commission;
  }

  function Remittance(address _sender, bytes32 _passwordHash, uint _duration) {
    require(_duration <= maxDuration);
    sender = _sender;
    passwordHash = _passwordHash;
    deadline = block.number + _duration;
  }

  function withdraw(string _password1, bytes32 _password2)
    public
    returns(bool)
  {
    require(sha3(_password1, _password2) == passwordHash);
    require(sha3(msg.sender) == _password2);
    uint transferAmount = amount;
    amount = 0;
    msg.sender.transfer(transferAmount);
    LogWithdrawal(msg.sender);
    return true;
  }

  function withdrawCommission()
    public
    onlyOwner
    returns(bool)
  {
    require(commission > 0);
    uint commissionAmount = commission;
    commission = 0;
    owner.transfer(commissionAmount);
    LogWithdrawCommission(msg.sender);
    return true;
  }

  function refund()
    public
    onlySender
    deadlinePassed
    returns(bool)
  {
    uint transferAmount = amount;
    amount = 0;
    sender.transfer(transferAmount);
    return true;
  }

  function destroy()
    public
  {
    require((block.number >= deadline + 100) || (amount == 0));
    super.destroy();
  }
}
