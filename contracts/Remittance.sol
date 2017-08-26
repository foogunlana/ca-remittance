pragma solidity ^0.4.11;

contract Remittance{
  bytes32 private passwordHash1;
  bytes32 private passwordHash2;

  function Remittance(bytes32 passwordHash1, bytes32 passwordHash2)
    payable {

    passwordHash1 = sha3(passwordHash1);
    passwordHash2 = sha3(passwordHash2);
  }
}
