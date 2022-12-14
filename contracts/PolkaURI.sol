// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/access/Ownable.sol';

contract PolkaURI is Ownable {

    string public baseMetadataURI;

    function _setBaseMetadataURI(string memory _newBaseMetadataURI) internal {
        baseMetadataURI = _newBaseMetadataURI;
    }

    constructor(string memory _newBaseMetadataURI)
    {
        _setBaseMetadataURI(_newBaseMetadataURI);
    }

    function adminSetBaseMetadataURI(string memory _newBaseMetadataURI) external onlyOwner() {
        _setBaseMetadataURI(_newBaseMetadataURI);
    }
}
