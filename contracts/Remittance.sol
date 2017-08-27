pragma solidity ^0.4.11;

import { OwnedDestroyable } from './OwnedDestroyable.sol';

contract Remittance is OwnedDestroyable{
  bytes32 private passwordHash1;
  bytes32 private passwordHash2;

  event LogWithdrawal(address indexed _sender);

  function () payable {}

  function Remittance(bytes32 _passwordHash1, bytes32 _passwordHash2)
    public
    payable {
    passwordHash1 = sha3(_passwordHash1);
    passwordHash2 = sha3(_passwordHash2);
  }

  function withdraw(bytes32 _passwordHash1, bytes32 _passwordHash2)
    public
    returns(bool) {
    require(sha3(_passwordHash1) == passwordHash1);
    require(sha3(_passwordHash2) == passwordHash2);
    msg.sender.transfer(this.balance);
    LogWithdrawal(msg.sender);
    return true;
  }
}
