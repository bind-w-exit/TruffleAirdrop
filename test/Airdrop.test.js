const {
    BN,
    constants,
    expectEvent, 
    expectRevert,
    snapshot
} = require("@openzeppelin/test-helpers");

require("chai")
    .use(require("chai-as-promised"))
    .use(require("chai-bn")(BN))
    .should();

const EIP712 = require("./utils/eip712.js");


const AirdropContract = artifacts.require("AirdropContract.sol");
const TevaToken = artifacts.require("TevaToken.sol");



contract("AirdropContract", function(accounts) {
    [deployer, user1, user2, user3] = accounts;
    const ZERO_AMOUNT = new BN(0);
    const AMOUNT = new BN(100000);

    before(async function () {
        tevaToken = await TevaToken.new();
        airdropContract = await AirdropContract.new(tevaToken.address);

        snapshotB = await snapshot();
    });

    describe("Airdrop Contract Test Cases", function () {

        describe("Airdrop Contract Deploy Test Cases 🏗️", function () {

            it("should deploy with correct owner", async () => {
                (await airdropContract.owner()).should.equal(deployer);
            });

            it("shouldn't deploy contract if the token address is zero", async () => {
                await expectRevert(
                    AirdropContract.new(constants.ZERO_ADDRESS),
                    "Airdrop: token address is zero"
                );
            });
        
        });

        describe("Airdrop Contract Owner Test Cases 👮", function () {

            after(async function () {
                await snapshotB.restore();
            });
            
            //updateTokenAddress 
            it("should update token address", async () => {
                anotherTevaToken = await TevaToken.new();
                receipt = await airdropContract.updateTokenAddress(anotherTevaToken.address);
                expectEvent(
                    receipt,
                    "UpdateTokenAddress",
                    {
                        newTokenAddress: anotherTevaToken.address
                    }
                );

            });

            it("shouldn't update token address from the non-current owner", async () => {
                anotherTevaToken = await TevaToken.new();
                await expectRevert(
                    airdropContract.updateTokenAddress(anotherTevaToken.address, { from: user1 }),
                    "Ownable: caller is not the owner"
                );
            });

            it("shouldn't update token address if the token address is zero", async () => {
                await expectRevert(
                    airdropContract.updateTokenAddress(constants.ZERO_ADDRESS),
                    "Airdrop: update token to zero address"
                );
            });
         
            //depositTokens 
            it("shouldn't transfer tokens to a contract from the non-current owner", async () => {
                await expectRevert(
                    airdropContract.depositTokens(AMOUNT, { from: user1 }),
                    "Ownable: caller is not the owner"
                );
            });

            it("shouldn't transfer tokens to a contract if amount equal to zero", async () => {
                await expectRevert(
                    airdropContract.depositTokens(ZERO_AMOUNT),
                    "Airdrop: zero transaction amount"
                );
            });
            
            //depositEther
            it("shouldn't transfer tokens to a contract from the non-current owner", async () => {
                await expectRevert(
                    airdropContract.depositEther({ from: user1 }),
                    "Ownable: caller is not the owner"
                );
            });

            //withdrawTokens
            it("shouldn't transfer tokens from contract to the non-current owner", async () => {
                await expectRevert(
                    airdropContract.withdrawTokens({ from: user1 }),
                    "Ownable: caller is not the owner"
                );
            });

            it("shouldn't transfer tokens from contract if token total supply is zero", async () => {
                await expectRevert(
                    airdropContract.withdrawTokens(),
                    "Airdrop: none tokens in the contact"
                );
            });

            //withdrawEther
            it("shouldn't transfer ether from contract to the non-current ownerr", async () => {
                await expectRevert(
                    airdropContract.withdrawEther({ from: user1 }),
                    "Ownable: caller is not the owner"
                );
            });

            it("shouldn't transfer tokens from contract if amount equal to zero", async () => {
                await expectRevert(
                    airdropContract.withdrawEther(),
                    "Airdrop: no ether in the contact"
                );
            });            
        });

        describe("Deposit Phase Test Cases 💵", function () {

            after(async function () {
                await snapshotB.restore();
            });

            it("should transfer tokens to a contract from the current owner", async () => {
                await tevaToken.mint(deployer, AMOUNT);
                await tevaToken.approve(airdropContract.address, AMOUNT);

                receipt = await airdropContract.depositTokens(AMOUNT);
                expectEvent(
                    receipt,
                    "DepositTokens",
                    {
                        from: deployer,
                        amount: AMOUNT
                    }
                );

                contractTokensBalance = await tevaToken.balanceOf(airdropContract.address);
                contractTokensBalance.should.be.bignumber.equal(AMOUNT);
            });

            it("should transfer ether to a contract from the current owner", async () => {
                receipt = await airdropContract.depositEther({ from: deployer, value: AMOUNT });
                expectEvent(
                    receipt,
                    "DepositEther",
                    {
                        from: deployer,
                        amount: AMOUNT
                    }
                );

                contractEtherBalance = new BN(await web3.eth.getBalance(airdropContract.address));
                contractEtherBalance.should.be.bignumber.equal(AMOUNT);
            });
        });

        describe("Methods With Signatures Phase Test Cases ✒️", function () {

            afterEach(async function () {
                await snapshotB.restore();
            })

            //checkSign
            it("should check the signature", async () => {
                deadline = Math.floor(Date.now() / 1000) + 10000;
                typedData = createTypedData(user1, Number(AMOUNT), deadline, tevaToken.address);   
                sign = await EIP712.signTypedData(web3, deployer, typedData);

                receipt = await airdropContract.checkSign({ recipient: user1, amount: Number(AMOUNT), deadline: deadline, rewardType: tevaToken.address, r: sign.r, s: sign.s, v: sign.v }); 
                receipt.should.equal(true);
            });

            //dropTokens
            it("should increase tokens for the beneficiaries", async () => {
                deadline = Math.floor(Date.now() / 1000) + 10000;
                typedData = createTypedData(user1, Number(AMOUNT), deadline, tevaToken.address);   
                sign = await EIP712.signTypedData(web3, deployer, typedData);

                balanceBefore = await airdropContract.tokenBalances(user1);
                balanceBefore.should.be.bignumber.equal(ZERO_AMOUNT);

                receipt = await airdropContract.dropTokens({ recipient: user1, amount: Number(AMOUNT), deadline: deadline, rewardType: tevaToken.address, r: sign.r, s: sign.s, v: sign.v }); 
                expectEvent(
                    receipt,
                    "DropTokens",
                    {
                        to: user1,
                        amount: AMOUNT
                    }
                );

                balanceAfter = await airdropContract.tokenBalances(user1);
                balanceAfter.should.be.bignumber.equal(AMOUNT);
            });

            it("shouldn't increase tokens for the beneficiaries from the non-current owner", async () => {
                deadline = Math.floor(Date.now() / 1000) + 10000;
                typedData = createTypedData(user1, Number(AMOUNT), deadline, tevaToken.address);   
                sign = await EIP712.signTypedData(web3, deployer, typedData);

                await expectRevert(
                    airdropContract.dropTokens({ recipient: user1, amount: Number(AMOUNT), deadline: deadline, rewardType: tevaToken.address, r: sign.r, s: sign.s, v: sign.v },
                        { from: user1 }
                    ), 
                    "Ownable: caller is not the owner"
                );
            });
            
            it("shouldn't increase tokens for the beneficiaries if deadline of this message has expired", async () => {
                deadline = Math.floor(Date.now() / 1000) - 1;
                typedData = createTypedData(user1, Number(AMOUNT), deadline, tevaToken.address);   
                sign = await EIP712.signTypedData(web3, deployer, typedData);

                await expectRevert(
                    airdropContract.dropTokens({ recipient: user1, amount: Number(AMOUNT), deadline: deadline, rewardType: tevaToken.address, r: sign.r, s: sign.s, v: sign.v }), 
                    "Airdrop: deadline of this message has expired"
                );
            });

            it("shouldn't increase tokens for the beneficiaries if reward type in the message is invalid", async () => {
                deadline = Math.floor(Date.now() / 1000) + 10000;
                typedData = createTypedData(user1, Number(AMOUNT), deadline, constants.ZERO_ADDRESS);   
                sign = await EIP712.signTypedData(web3, deployer, typedData);

                await expectRevert(
                    airdropContract.dropTokens({ recipient: user1, amount: Number(AMOUNT), deadline: deadline, rewardType: constants.ZERO_ADDRESS, r: sign.r, s: sign.s, v: sign.v }), 
                    "Airdrop: invalid reward type in the message"
                );
            });

            it("shouldn't increase tokens for the beneficiaries if message wasn't signed by owner", async () => {
                deadline = Math.floor(Date.now() / 1000) + 10000;
                typedData = createTypedData(user1, Number(AMOUNT), deadline, tevaToken.address);   
                sign = await EIP712.signTypedData(web3, user1, typedData);

                await expectRevert(
                    airdropContract.dropTokens({ recipient: user1, amount: Number(AMOUNT), deadline: deadline, rewardType: tevaToken.address, r: sign.r, s: sign.s, v: sign.v }), 
                    "Airdrop: this message wasn't signed by owner"
                );
            });

            //dropEther
            it("should increase ether for the beneficiaries", async () => {
                deadline = Math.floor(Date.now() / 1000) + 10000;
                typedData = createTypedData(user1, Number(AMOUNT), deadline, constants.ZERO_ADDRESS);   
                sign = await EIP712.signTypedData(web3, deployer, typedData);

                balanceBefore = await airdropContract.etherBalances(user1);
                balanceBefore.should.be.bignumber.equal(ZERO_AMOUNT);

                receipt = await airdropContract.dropEther({ recipient: user1, amount: Number(AMOUNT), deadline: deadline, rewardType: constants.ZERO_ADDRESS, r: sign.r, s: sign.s, v: sign.v }); 
                expectEvent(
                    receipt,
                    "DropEther",
                    {
                        to: user1,
                        amount: AMOUNT
                    }
                );

                balanceAfter = await airdropContract.etherBalances(user1);
                balanceAfter.should.be.bignumber.equal(AMOUNT);
            });

            it("shouldn't increase ether for the beneficiaries from the non-current owner", async () => {
                deadline = Math.floor(Date.now() / 1000) + 10000;
                typedData = createTypedData(user1, Number(AMOUNT), deadline, constants.ZERO_ADDRESS);   
                sign = await EIP712.signTypedData(web3, deployer, typedData);

                await expectRevert(
                    airdropContract.dropEther({ recipient: user1, amount: Number(AMOUNT), deadline: deadline, rewardType: constants.ZERO_ADDRESS, r: sign.r, s: sign.s, v: sign.v },
                        { from: user1 }
                    ), 
                    "Ownable: caller is not the owner"
                );
            });
            
            it("shouldn't increase ether for the beneficiaries if deadline of this message has expired", async () => {
                deadline = Math.floor(Date.now() / 1000) - 1;
                typedData = createTypedData(user1, Number(AMOUNT), deadline, constants.ZERO_ADDRESS);   
                sign = await EIP712.signTypedData(web3, deployer, typedData);

                await expectRevert(
                    airdropContract.dropEther({ recipient: user1, amount: Number(AMOUNT), deadline: deadline, rewardType: constants.ZERO_ADDRESS, r: sign.r, s: sign.s, v: sign.v }), 
                    "Airdrop: deadline of this message has expired"
                );
            });

            it("shouldn't increase ether for the beneficiaries if reward type in the message is invalid", async () => {
                deadline = Math.floor(Date.now() / 1000) + 10000;
                typedData = createTypedData(user1, Number(AMOUNT), deadline, tevaToken.address);   
                sign = await EIP712.signTypedData(web3, deployer, typedData);

                await expectRevert(
                    airdropContract.dropEther({ recipient: user1, amount: Number(AMOUNT), deadline: deadline, rewardType: tevaToken.address, r: sign.r, s: sign.s, v: sign.v }), 
                    "Airdrop: invalid reward type in the message"
                );
            });

            it("shouldn't increase ether for the beneficiaries if message wasn't signed by owner", async () => {
                deadline = Math.floor(Date.now() / 1000) + 10000;
                typedData = createTypedData(user1, Number(AMOUNT), deadline, constants.ZERO_ADDRESS);   
                sign = await EIP712.signTypedData(web3, user1, typedData);

                await expectRevert(
                    airdropContract.dropEther({ recipient: user1, amount: Number(AMOUNT), deadline: deadline, rewardType: constants.ZERO_ADDRESS, r: sign.r, s: sign.s, v: sign.v }), 
                    "Airdrop: this message wasn't signed by owner"
                );
            });

            //drop
            it("should increase ether and tokens for the beneficiaries", async () => {
                deadline = Math.floor(Date.now() / 1000) + 10000;
                typedData = createTypedData(user1, Number(AMOUNT), deadline, tevaToken.address);   
                sign = await EIP712.signTypedData(web3, deployer, typedData);
                typedData2 = createTypedData(user2, Number(AMOUNT), deadline, constants.ZERO_ADDRESS);   
                sign2 = await EIP712.signTypedData(web3, deployer, typedData2);

                tokenBalanceBefore = await airdropContract.tokenBalances(user1);
                tokenBalanceBefore.should.be.bignumber.equal(ZERO_AMOUNT);
                etherBalanceBefore = await airdropContract.etherBalances(user2);
                etherBalanceBefore.should.be.bignumber.equal(ZERO_AMOUNT);

                receipt = await airdropContract.drop([
                    { recipient: user1, amount: Number(AMOUNT), deadline: deadline, rewardType: tevaToken.address, r: sign.r, s: sign.s, v: sign.v },
                    { recipient: user2, amount: Number(AMOUNT), deadline: deadline, rewardType: constants.ZERO_ADDRESS, r: sign2.r, s: sign2.s, v: sign2.v }
                ]);

                expectEvent(
                    receipt,
                    "DropTokens",
                    {
                        to: user1,
                        amount: AMOUNT
                    }
                );
                expectEvent(
                    receipt,
                    "DropEther",
                    {
                        to: user2,
                        amount: AMOUNT
                    }
                );

                tokenBalanceAfter = await airdropContract.tokenBalances(user1);
                tokenBalanceAfter.should.be.bignumber.equal(AMOUNT);
                etherBalanceAfter = await airdropContract.etherBalances(user2);
                etherBalanceAfter.should.be.bignumber.equal(AMOUNT);
            });

            it("shouldn't increase ether and tokens for the beneficiaries if an invalid reward type is passed", async () => {
                deadline = Math.floor(Date.now() / 1000) + 10000;
                typedData = createTypedData(user1, Number(AMOUNT), deadline, airdropContract.address);   
                sign = await EIP712.signTypedData(web3, deployer, typedData);

                await expectRevert(
                    airdropContract.drop([
                        { recipient: user1, amount: Number(AMOUNT), deadline: deadline, rewardType: airdropContract.address, r: sign.r, s: sign.s, v: sign.v }
                    ]),
                    "Airdrop: such reward doesn't exist"
                );
            });
        });

        describe("Withdraw Phase Test Cases (Users and owner) 💳", function () {

            before(async function () {
                await tevaToken.mint(deployer, AMOUNT);
                await tevaToken.approve(airdropContract.address, AMOUNT);
                await airdropContract.depositTokens(AMOUNT);
                await airdropContract.depositEther({ from: deployer, value: AMOUNT });

                deadline = Math.floor(Date.now() / 1000) + 10000;
                typedData = createTypedData(user1, Number(AMOUNT), deadline, tevaToken.address);   
                sign = await EIP712.signTypedData(web3, deployer, typedData);
                typedData2 = createTypedData(user2, Number(AMOUNT), deadline, constants.ZERO_ADDRESS);   
                sign2 = await EIP712.signTypedData(web3, deployer, typedData2);

                snapshotC = await snapshot();
            });

            after(async function () {
                await snapshotB.restore();
            });

            afterEach(async function () {
                await snapshotC.restore();
            });

            //updateTokenAddress
            it("should update token address", async () => {
                anotherTevaToken = await TevaToken.new();
                receipt = await airdropContract.updateTokenAddress(anotherTevaToken.address);
                expectEvent(
                    receipt,
                    "WithdrawTokens",
                    {
                        to: deployer,
                        amount: AMOUNT
                    }
                );
                expectEvent(
                    receipt,
                    "UpdateTokenAddress",
                    {
                        newTokenAddress: anotherTevaToken.address
                    }
                );
            });

            //withdrawTokens
            it("should transfer amount of tokens back to the owner", async () => {
                receipt = await airdropContract.withdrawTokens();
                expectEvent(
                    receipt,
                    "WithdrawTokens",
                    {
                        to: deployer,
                        amount: AMOUNT
                    }
                );

                userBalance = await tevaToken.balanceOf(deployer);
                userBalance.should.be.bignumber.equal(AMOUNT);
            });

            //withdrawEther
            it("should transfer amount of ether back to the owner", async () => {
                BalanceBefore = new BN(await web3.eth.getBalance(deployer));
                receipt = await airdropContract.withdrawEther();
                expectEvent(
                    receipt,
                    "WithdrawEther",
                    {
                        to: deployer,
                        amount: AMOUNT
                    }
                );
                Balance = new BN(await web3.eth.getBalance(deployer));
                Fee = new BN(20000000000 * receipt.receipt.gasUsed);
                Balance.should.be.bignumber.equal(BalanceBefore.add(AMOUNT).sub(Fee));
            });

            //claimToken
            it("should transfer tokens to recipients", async () => {
                await airdropContract.dropTokens({ recipient: user1, amount: Number(AMOUNT), deadline: deadline, rewardType: tevaToken.address, r: sign.r, s: sign.s, v: sign.v });

                receipt = await airdropContract.claimTokens({from: user1});
                expectEvent(
                    receipt,
                    "ClaimTokens",
                    {
                        to: user1,
                        amount: AMOUNT
                    }
                );
                
                userBalance = await tevaToken.balanceOf(user1);
                userBalance.should.be.bignumber.equal(AMOUNT);
            });

            it("shouldn't transfer tokens to beneficiary if no tokens available", async () => {
                await expectRevert(
                    airdropContract.claimTokens({ from: user1 }),
                    "Airdrop: no tokens available"
                );
            });

            it("shouldn't transfer tokens to beneficiary if contract doesn't own enough tokens", async () => {
                await airdropContract.dropTokens({ recipient: user1, amount: Number(AMOUNT), deadline: deadline, rewardType: tevaToken.address, r: sign.r, s: sign.s, v: sign.v });
                await airdropContract.withdrawTokens();
                
                await expectRevert(
                    airdropContract.claimTokens({ from: user1 }),
                    "Airdrop: contract doesn't own enough tokens"
                );
            });

            //claimEther
            it("should transfer ether to recipients", async () => {
                await airdropContract.dropEther({ recipient: user2, amount: Number(AMOUNT), deadline: deadline, rewardType: constants.ZERO_ADDRESS, r: sign2.r, s: sign2.s, v: sign2.v });
                BalanceBefore = new BN(await web3.eth.getBalance(user2));
                receipt = await airdropContract.claimEther({from: user2});
                expectEvent(
                    receipt,
                    "ClaimEther",
                    {
                        to: user2,
                        amount: AMOUNT
                    }
                );
                
                Balance = new BN(await web3.eth.getBalance(user2));
                Fee = new BN(20000000000 * receipt.receipt.gasUsed);
                Balance.should.be.bignumber.equal(BalanceBefore.add(AMOUNT).sub(Fee));
            });

            it("shouldn't transfer ether to beneficiary if there are no ether in your address", async () => {
                await expectRevert(
                    airdropContract.claimEther({ from: user1 }),
                    "Airdrop: there are no ether in your address"
                );
            });

            it("shouldn't transfer ether to beneficiary if contract doesn't own enough ether", async () => {
                await airdropContract.dropEther({ recipient: user2, amount: Number(AMOUNT), deadline: deadline, rewardType: constants.ZERO_ADDRESS, r: sign2.r, s: sign2.s, v: sign2.v });
                await airdropContract.withdrawEther();
                
                await expectRevert(
                    airdropContract.claimEther({ from: user2 }),
                    "Airdrop: contract doesn't own enough ether"
                );
            });

        });



        function createTypedData(receipt, amount, deadline, rewardType){
            return {
                "types": {
                    "EIP712Domain": [
                        { "name": "name", "type": "string" },
                        { "name": "version", "type": "string" },
                        { "name": "chainId", "type": "uint256" },
                        { "name": "verifyingContract", "type": "address" }
                    ],
                    "Container": [
                        { "name": "recipient", "type": "address" },
                        { "name" : "amount", "type": "uint256"},
                        { "name" : "deadline", "type": "uint256"},
                        { "name": "rewardType", "type": "address"}
                    ]
                },
                "primaryType": "Container",
                "domain": {
                    "name": "Airdrop",
                    "version": "1",
                    "chainId": 1, //await web3.eth.getChainId() <- THIS 🤬
                    "verifyingContract": airdropContract.address
                },
                "message": 
                {
                    "recipient": receipt,
                    "amount": amount,
                    "deadline": deadline,
                    "rewardType": rewardType
                }
            };
        }
    });
});