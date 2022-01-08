// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IReferral {
	function getReferral(address user) external view returns (address payable);
}
