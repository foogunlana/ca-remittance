pragma solidity ^0.4.11;

contract Remittance{
  bytes32 private passwordHash1;
  bytes32 private passwordHash2;
  uint amount;

  function Remittance(bytes32 _passwordHash1, bytes32 _passwordHash2)
    public
    payable {

    passwordHash1 = sha3(_passwordHash1);
    passwordHash2 = sha3(_passwordHash2);
    amount = msg.value;
  }
}
