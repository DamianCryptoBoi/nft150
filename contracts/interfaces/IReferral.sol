pragma solidity ^0.6.6;

interface IReferral {
	function getReferral(address user) external view returns (address payable);
}
