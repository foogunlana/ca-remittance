pragma solidity ^0.4.11;

contract Remittance{
  bytes32 private passwordHash;

  function Remittance(bytes32 passwordHash1, bytes32 passwordHash2)
    payable
    returns(bool) {
    passwordHash = sha3(passwordHash1 + passwordHash2);
    return true;
  }
}
