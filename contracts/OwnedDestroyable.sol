pragma solidity ^0.4.11;

import { Owned } from './Owned.sol';

/*
  Destroyable contract can be destroyed
*/
contract OwnedDestroyable is Owned {
    function destroy()
        public
        onlyOwner {
        selfdestruct(owner);
    }
}
