// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import './token/ERC1155Tradeble.sol';
import './interfaces/INft150V1.sol';

/**
 * @title 1155 General
 * 1155General
 */
contract NFT150 is ERC1155Tradeble {
	mapping(uint256 => bool) migratedTokenId;
	mapping(address => mapping(uint256 => bool)) migratedBalance;

	constructor(address _polkaUriAddress) ERC1155Tradeble('NFT150 General', 'NFT150', _polkaUriAddress) {}

	function migrateDataFromV1(
		uint256 _fromTokenId,
		uint256 _toTokenId,
		address _v1Address
	) public onlyOwner {
		INft150V1 v1 = INft150V1(_v1Address);
		_currentTokenID = v1._currentTokenID();
		for (uint256 i = _fromTokenId; i <= _toTokenId; i++) {
			require(!migratedTokenId[i], 'already migrated');
			creators[i] = v1.creators(i);
			loyaltyFee[i] = v1.loyaltyFee(i);
			xUserFee[i] = v1.xUserFee(i);
			tokenSupply[i] = v1.tokenSupply(i);
			tokenMaxSupply[i] = v1.tokenMaxSupply(i);
			dataURIs[i] = v1.tokenURI(i);
			migratedTokenId[i] = true;
		}
	}

	function migrateBalancesFromV1(
		address _user,
		uint256 _fromTokenId,
		uint256 _toTokenId,
		address _v1Address
	) public onlyOwner {
		INft150V1 v1 = INft150V1(_v1Address);
		for (uint256 i = _fromTokenId; i <= _toTokenId; i++) {
			require(!migratedBalance[_user][i], 'already migrated');
			uint256 currentBalance = v1.balanceOf(_user, i);
			if (currentBalance > 0) {
				_mint(_user, i, currentBalance, '0x');
			}
			migratedBalance[_user][i] = true;
		}
	}
}
