// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IAirdropContract {
    struct DropStruct {
        address recipient;
        uint256 amount;
        uint256 deadline;
        address rewardType;
        bytes32 r;
        bytes32 s;
        uint8 v;
    }

    function depositTokens(uint256 amount) external;

    function depositEther() external payable;

    function dropTokens(DropStruct calldata dropStruct) external;

    function dropEther(DropStruct calldata dropStruct) external;

    function updateTokenAddress(address tokenAddress) external;
    
    function withdrawTokens() external;

    function withdrawEther() external;

    function claimTokens() external;

    function claimEther() external;

}