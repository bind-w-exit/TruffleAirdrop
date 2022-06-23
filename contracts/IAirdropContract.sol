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

    event UpdateTokenAddress(address newTokenAddress);
    event DepositTokens(address from, uint256 amount);
    event DepositEther(address from, uint256 amount);
    event WithdrawTokens(address to, uint256 amount);
    event WithdrawEther(address to, uint256 amount);
    event DropTokens(address to, uint256 amount);
    event DropEther(address to, uint256 amount);
    event ClaimTokens(address to, uint256 amount);
    event ClaimEther(address to, uint256 amount);

    /**
     * @dev Updates token address.
     * Emits an {UpdateTokenAddress} event.
     */
    function updateTokenAddress(address tokenAddress) external;

    /**
     * @dev Transfers tokens from owner to this contract.
     * Emits an {DepositTokens} event.
     */
    function depositTokens(uint256 amount) external;

    /**
     * @dev Transfers ether from owner to this contract.
     * Emits an {DepositEther} event.
     */
    function depositEther() external payable;

    /**
     * @dev Transfers tokens back to the owner.
     * Emits an {WithdrawTokens} event.
     */
    function withdrawTokens() external;


    /**
     * @dev Transfers ether back to the owner.
     * Emits an {WithdrawEther} event.
     */
    function withdrawEther() external;

    /**
     * @dev Sets the eligible tokens amount for recipient.
     * Emits an {DropTokens} event.
     */
    function dropTokens(DropStruct calldata dropStruct) external;

    /**
     * @dev Sets the eligible ether amount for recipient.
     * Emits an {DropEther} event.
     */
    function dropEther(DropStruct calldata dropStruct) external;
    
    /**
     * @dev Transfers tokens to beneficiary.
     * Emits an {ClaimTokens} event.
     */
    function claimTokens() external;

    /**
     * @dev Transfers tokens to beneficiary.
     * Emits an {ClaimEther} event.
     */
    function claimEther() external;

}