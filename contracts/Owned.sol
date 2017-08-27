pragma solidity ^0.4.11;

/*
  Owner contract preserves the contract creator
  as the owner
*/
contract Owned {
    address public owner;

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    function Owned() {
        owner = msg.sender;
    }
}
