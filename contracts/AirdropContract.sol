// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./IAirdropContract.sol";


contract AirdropContract is IAirdropContract, Ownable, EIP712("Airdrop", "1") {
    using SafeERC20 for IERC20; 
    using ECDSA for bytes32;
    

    bytes32 private immutable CONTAINER_TYPE;
    bytes32 private immutable DOMAIN_SEPARATOR;
  
    IERC20 public token;
    uint256 public totalSupply;
    mapping(address => uint256) public tokenBalances;
    mapping(address => uint256) public etherBalances;

    event UpdateTokenAddress(address newTokenAddress);
    event DepositTokens(address from, uint256 amount);
    event DepositEther(address from, uint256 amount);
    event WithdrawTokens(address to, uint256 amount);
    event WithdrawEther(address to, uint256 amount);
    event DropTokens(address to, uint256 amount);
    event DropEther(address to, uint256 amount);
    event ClaimTokens(address to, uint256 amount);
    event ClaimEther(address to, uint256 amount);


    constructor(address tokenAddress) {
        updateTokenAddress(tokenAddress);
        CONTAINER_TYPE = keccak256("Container(address recipient,uint256 amount,uint256 deadline,address rewardType)");
        DOMAIN_SEPARATOR = _domainSeparatorV4();
    }

    function updateTokenAddress(address tokenAddress) public onlyOwner {
        require(tokenAddress != address(0), "Token address shouldn't be zero");

        token = ERC20(tokenAddress);
        emit UpdateTokenAddress(tokenAddress);
    }

    function depositTokens(uint256 amount) external onlyOwner {
        require(amount > 0, "The transaction amount is zero");

        totalSupply += amount;
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit DepositTokens(msg.sender, amount);
    }

    function depositEther() external payable onlyOwner {
        emit DepositEther(msg.sender, msg.value);
    }
   
    function withdrawTokens() external onlyOwner {
        require(totalSupply > 0, "The transaction amount is zero");


        uint256 totalSupplyBefore = totalSupply;
        totalSupply = 0;
        token.safeTransfer(msg.sender, totalSupplyBefore);
        emit WithdrawTokens(msg.sender, totalSupplyBefore);
    }

    function withdrawEther() external onlyOwner {
        uint256 balanceBefore = address(this).balance;
        require(balanceBefore > 0, "The transaction amount is zero");

        address payable to = payable(msg.sender);
        to.transfer(balanceBefore);
        emit WithdrawEther(msg.sender, balanceBefore);
    }

    function dropTokens(DropStruct calldata dropStruct) public onlyOwner {
        require(dropStruct.deadline > block.timestamp, "Deadline has passed");
        require(dropStruct.rewardType == address(token), "Invalid revard type");
        require(checkSign(dropStruct), "This message was not signed by owner");
        

        tokenBalances[dropStruct.recipient] += dropStruct.amount;
        emit DropTokens(dropStruct.recipient, dropStruct.amount);
    }

    function dropEther(DropStruct calldata dropStruct) public onlyOwner {
        require(dropStruct.deadline > block.timestamp, "Deadline has passed");
        require(dropStruct.rewardType == 0x0000000000000000000000000000000000000000, "Invalid revard type");
        require(checkSign(dropStruct), "This message was not signed by owner");
        

        etherBalances[dropStruct.recipient] += dropStruct.amount;
        emit DropEther(dropStruct.recipient, dropStruct.amount);
    }

    function checkSign(DropStruct calldata dropStruct) private view returns(bool isValid) {
        bytes32 digest =  keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            keccak256(abi.encode(
                CONTAINER_TYPE,
                dropStruct.recipient,
                dropStruct.amount,
                dropStruct.deadline,
                dropStruct.rewardType
        ))));
        
        return digest.recover(dropStruct.v, dropStruct.r, dropStruct.s) == owner();
    }

    function drop(DropStruct[] calldata dropStructs) external onlyOwner {
        for (uint256 i = 0; i < dropStructs.length; i++) {           
            if (dropStructs[i].rewardType == 0x0000000000000000000000000000000000000000)
                dropEther(dropStructs[i]);
            else if (dropStructs[i].rewardType == address(token))
                dropTokens(dropStructs[i]);
            else
                revert("No such reward");
        }
    }

    function claimTokens() external {
        require(tokenBalances[msg.sender] > 0, "There are no tokens in your address");
        require(totalSupply >= tokenBalances[msg.sender], "Not enough tokens in the contract total supply to withdraw them");

        uint256 amount = tokenBalances[msg.sender];
        tokenBalances[msg.sender] = 0;  
        totalSupply -= amount;           
        token.safeTransfer(msg.sender, amount);  
        emit ClaimTokens(msg.sender, amount);  
    }

    function claimEther() external {
        require(etherBalances[msg.sender] > 0, "There are no ether in your address");
        require(etherBalances[msg.sender] <= address(this).balance, "Contract doesn't own enough ether");

        uint256 amount = etherBalances[msg.sender];
        etherBalances[msg.sender] = 0;  
        address payable to = payable(msg.sender);
        to.transfer(amount);
        emit ClaimEther(msg.sender, amount);
    }
}