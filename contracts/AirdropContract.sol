// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol'; 
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "./interfaces/IAirdropContract.sol";

contract AirdropContract is IAirdropContract, Ownable, EIP712("Airdrop", "1") {
    using SafeERC20 for IERC20;   

    bytes32 internal constant _CONTAINER_TYPE = keccak256("Container(address recipient,uint256 amount,uint256 deadline,address rewardType)");
  
    IERC20 public token;
    uint256 public totalTokenSupply;
    mapping(address => uint256) public tokenBalances;
    mapping(address => uint256) public etherBalances;


    /**
     * @dev Initializes the accepted token as a reward token.
     * Creates a DOMAIN_SEPARATOR and _CONTAINER_TYPE to verify the signature of an EIP-712 message.
     *
     * @param tokenAddress ERC-20 token address.
     */
    constructor(address tokenAddress) {
        require(tokenAddress != address(0), "Airdrop: token address is zero");
        token = IERC20(tokenAddress);
        emit UpdateTokenAddress(tokenAddress);
    }

     /**
     * @dev Transfers tokens from owner to this contract.
     * Can only be called by the current owner.
     *
     * Emits an {DepositTokens} event that indicates from what address and how many tokens was transferred to the contract.
     * @param amount Amount of tokens.
     */
    function depositTokens(uint256 amount) external override onlyOwner {
        require(amount > 0, "Airdrop: zero transaction amount");

        totalTokenSupply += amount;
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit DepositTokens(msg.sender, amount);
    }

    /**
     * @dev Transfers ether from owner to this contract.
     * Can only be called by the current owner.
     *
     * Emits an {DepositEther} event that indicates from what address and how many ether was transferred to the contract.
     * Without parameters.
     */
    function depositEther() external payable override onlyOwner {
        emit DepositEther(msg.sender, msg.value);
    }

    /**
     * @dev Transfers ether back to the owner.
     * Can only be called by the current owner.
     *
     * Emits an {WithdrawEther} event that indicates to what address and how many ether were withdrawn from the contract.
     * Without parameters.
     */
    function withdrawEther() external override onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Airdrop: no ether in the contact");

        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "Airdrop: unable to send value, recipient may have reverted");
        emit WithdrawEther(msg.sender, balance);
    }

    /**
     * @dev Checks if the message is signed by the contract owner.
     *
     * @param dropStruct Structure consisting of: 
     *  address recipient,
     *  uint256 amount,
     *  uint256 deadline,
     *  address rewardType,
     *  bytes32 r,
     *  bytes32 s,
     *  uint8 v
     */
    function checkSign(DropStruct calldata dropStruct) external view returns (bool) {
        return _checkSign(dropStruct);
    }

    /**
     * @dev Sets the eligible tokens and ether amounts for recipients.
     * Can only be called by the current owner.
     * The owner should sign the transaction.
     *
     * @param dropStructs An array of structures consisting of: 
     *  address recipient,
     *  uint256 amount,
     *  uint256 deadline,
     *  address rewardType,
     *  bytes32 r,
     *  bytes32 s,
     *  uint8 v
     */
    function drop(DropStruct[] calldata dropStructs) external onlyOwner {
        for (uint256 i = 0; i < dropStructs.length; i++) {           
            if (dropStructs[i].rewardType == address(0)) {
                dropEther(dropStructs[i]);
            } else if (dropStructs[i].rewardType == address(token)) {
                dropTokens(dropStructs[i]);
            } else {
                revert("Airdrop: such reward doesn't exist");
            }
        }
    }
    
    /**
     * @dev Transfers tokens to beneficiary.
     *
     * Emits an {ClaimTokens} event that indicates to what address and how much tokens were withdrawn from the contract.
     * Without parameters.
     */
    function claimTokens() external override {
        require(tokenBalances[msg.sender] > 0, "Airdrop: no tokens available");
        require(totalTokenSupply >= tokenBalances[msg.sender], "Airdrop: contract doesn't own enough tokens");

        uint256 amount = tokenBalances[msg.sender];
        tokenBalances[msg.sender] = 0;  
        totalTokenSupply -= amount;           
        token.safeTransfer(msg.sender, amount);  
        emit ClaimTokens(msg.sender, amount);  
    }

    /**
     * @dev Transfers tokens to beneficiary.
     *
     * Emits an {ClaimEther} event that indicates to what address and how much ether were withdrawn from the contract.
     * Without parameters.
     */
    function claimEther() external override {
        require(etherBalances[msg.sender] > 0, "Airdrop: there are no ether in your address");
        require(etherBalances[msg.sender] <= address(this).balance, "Airdrop: contract doesn't own enough ether");

        uint256 amount = etherBalances[msg.sender];
        etherBalances[msg.sender] = 0;  
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Airdrop: unable to send value, recipient may have reverted");
        emit ClaimEther(msg.sender, amount);
    }

    /**
     * @dev Sets the eligible tokens amount for recipient.
     * Can only be called by the current owner.
     * The owner should sign the transaction.
     *
     * Emits an {DropTokens} event that indicates that the eligible tokens amount was set for recipient.
     *
     * @param dropStruct Structure consisting of: 
     *  address recipient,
     *  uint256 amount,
     *  uint256 deadline,
     *  address rewardType,
     *  bytes32 r,
     *  bytes32 s,
     *  uint8 v
     */
    function dropTokens(DropStruct calldata dropStruct) public override onlyOwner {
        require(dropStruct.deadline > block.timestamp, "Airdrop: deadline of this message has expired");
        require(dropStruct.rewardType == address(token), "Airdrop: invalid reward type in the message");
        require(_checkSign(dropStruct), "Airdrop: this message wasn't signed by owner");
        
        tokenBalances[dropStruct.recipient] += dropStruct.amount;
        emit DropTokens(dropStruct.recipient, dropStruct.amount);
    }

    /**
     * @dev Sets the eligible ether amount for recipient.
     * Can only be called by the current owner.
     * The owner should sign the transaction.
     *
     * Emits an {DropEther} event that indicates that the eligible ether amount was set for recipient.
     *
     * @param dropStruct Structure consisting of: 
     *  address recipient,
     *  uint256 amount,
     *  uint256 deadline,
     *  address rewardType,
     *  bytes32 r,
     *  bytes32 s,
     *  uint8 v
     */
    function dropEther(DropStruct calldata dropStruct) public override onlyOwner {
        require(dropStruct.deadline > block.timestamp, "Airdrop: deadline of this message has expired");
        require(dropStruct.rewardType == address(0), "Airdrop: invalid reward type in the message");
        require(_checkSign(dropStruct), "Airdrop: this message wasn't signed by owner"); 

        etherBalances[dropStruct.recipient] += dropStruct.amount;
        emit DropEther(dropStruct.recipient, dropStruct.amount);
    }

    /**
     * @dev Updates token address.
     * Can only be called by the current owner.
     *
     * Emits an {UpdateTokenAddress} event that indicates a change in the token address.
     *
     * @param tokenAddress ERC-20 token address.
     */
    function updateTokenAddress(address tokenAddress) public override onlyOwner {
        require(tokenAddress != address(0), "Airdrop: update token to zero address");
        if(token.balanceOf(address(this))  > 0) {
            withdrawTokens();
        }
        token = IERC20(tokenAddress);
        totalTokenSupply = token.balanceOf(address(this));
        emit UpdateTokenAddress(tokenAddress);
    }
  
    /**
     * @dev Transfers tokens back to the owner.
     * Can only be called by the current owner.
     *
     * Emits an {WithdrawTokens} event that indicates to what address and how many tokens were withdrawn from the contract.
     * Without parameters.
     */
    function withdrawTokens() public override onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "Airdrop: none tokens in the contact");

        totalTokenSupply = 0;
        token.safeTransfer(msg.sender, balance);
        emit WithdrawTokens(msg.sender, balance);
    }

    /**
     * @dev Checks if the message is signed by the contract owner.
     *
     * @param dropStruct Structure consisting of: 
     *  address recipient,
     *  uint256 amount,
     *  uint256 deadline,
     *  address rewardType,
     *  bytes32 r,
     *  bytes32 s,
     *  uint8 v
     */
    function _checkSign(DropStruct calldata dropStruct) internal view returns (bool) {
        bytes32 structHash = keccak256(abi.encode(
            _CONTAINER_TYPE,
            dropStruct.recipient,
            dropStruct.amount,
            dropStruct.deadline,
            dropStruct.rewardType
        ));

        bytes32 hash = _hashTypedDataV4(structHash);
        address messageSigner = ECDSA.recover( hash, dropStruct.v, dropStruct.r, dropStruct.s );
        
        return messageSigner == owner();
    }
}