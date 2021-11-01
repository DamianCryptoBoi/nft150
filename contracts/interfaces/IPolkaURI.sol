pragma solidity ^0.8.0;

interface IPolkaURI {
    function baseMetadataURI() view external returns(string memory);
}
