const {
    BN,
    expectEvent,
    constants,
    expectRevert,
    snapshot
} = require("@openzeppelin/test-helpers");

require("chai")
    .use(require("chai-as-promised"))
    .use(require("chai-bn")(BN))
    .should();

    
const TevaToken = artifacts.require("TevaToken.sol");


contract("TevaToken", function(accounts) {
    [deployer, user1, user2, user3] = accounts;

    const NAME = "Teva token";
    const SYMBOL = "TEVA";
    const DECIMALS = new BN(18);
    const ZERO_AMOUNT = new BN(0);
    const AMOUNT = new BN("98362810984236519907");

    before(async function () {
        snapshotA = await snapshot();
        tevaToken = await TevaToken.new();
    });

    after(async function () {
        await snapshotA.restore();  //After ALL tests in "Teva Token Test Cases" reverts blockchain in the captured state
    });
    
    describe("Teva Token Test Cases", function () {

        describe("Teva Token Deploy Test Cases 🏗️", function () {

            it("should deploy with correct owner", async () => {
                (await tevaToken.owner()).should.equal(deployer);
            });

            it("should deploy with correct name", async () => {
                (await tevaToken.name()).should.equal(NAME);
            });

            it("should deploy with correct symbol", async () => {
                (await tevaToken.symbol()).should.equal(SYMBOL);
            });

            it("should deploy with correct decimals", async () => {
                (await tevaToken.decimals()).should.be.bignumber.equal(DECIMALS);
            });

            it("should deploy with correct initial total supply", async () => {
                (await tevaToken.totalSupply()).should.be.bignumber.equal(ZERO_AMOUNT);
            });

        });

        describe("Teva Token Test Cases 🔧", function () {

            //mint 
            it("should mint tokens correctly", async () => {
                receipt = await tevaToken.mint(deployer, AMOUNT);
                expectEvent(
                    receipt,
                    "Transfer",
                    {
                        from: constants.ZERO_ADDRESS,
                        to: deployer,
                        value: AMOUNT
                    }
                );
            });

            it("shouldn't mint tokens by not the current owner", async () => {
                await expectRevert(
                    tevaToken.mint(deployer, AMOUNT, { from: user1 }),
                    "Ownable: caller is not the owner"
                );
            });

            //burn
            it("should burn tokens correctly", async () => {
                await tevaToken.mint(deployer, AMOUNT);
                receipt = await tevaToken.burn(AMOUNT);
                expectEvent(
                    receipt,
                    "Transfer",
                    {
                        from: deployer,
                        to: constants.ZERO_ADDRESS,
                        value: AMOUNT
                    }
                );
            });

            //transfer
            it("should transfer tokens correctly", async () => {
                await tevaToken.mint(deployer, AMOUNT);
                userBalanceBefore = await tevaToken.balanceOf(user1);

                receipt = await tevaToken.transfer(user1, AMOUNT, { from: deployer });
                expectEvent(
                    receipt,
                    "Transfer",
                    {
                        from: deployer,
                        to: user1,
                        value: AMOUNT
                    }
                );
                
                (await tevaToken.balanceOf(user1)).should.be.bignumber.equal(userBalanceBefore.add(AMOUNT));
            });

            it("shouldn't transfer tokens to the zero address", async () => {
                await expectRevert(
                    tevaToken.transfer(constants.ZERO_ADDRESS, AMOUNT, { from: deployer }),
                    "ERC20: transfer to the zero address"
                );
            });

            it("shouldn't transfer tokens if transfer amount exceed balance", async () => {
                await expectRevert(
                    tevaToken.transfer(user2, constants.MAX_UINT256, { from: user1 }),
                    "ERC20: transfer amount exceeds balance"
                );
            });

            //approve
            it("should approve correctly", async () => {
                receipt = await tevaToken.approve(user1, AMOUNT);
                expectEvent(
                    receipt,
                    "Approval",
                    { 
                        owner: deployer,
                        spender: user1,
                        value: AMOUNT 
                    }
                );

                (await tevaToken.allowance(deployer, user1)).should.be.bignumber.equal(AMOUNT);
            });

            it("shouldn't approve to the zero address", async () => {
                await expectRevert(
                    tevaToken.approve(constants.ZERO_ADDRESS, AMOUNT),
                    "ERC20: approve to the zero address"
                );
            });

            //increaseAllowance
            it("should increase allowance correctly", async () => {
                await tevaToken.approve(user1, AMOUNT);
                (await tevaToken.allowance(deployer, user1)).should.be.bignumber.equal(AMOUNT);

                receipt = await tevaToken.increaseAllowance(user1, AMOUNT);
                expectEvent(
                    receipt,
                    "Approval",
                    {
                        owner: deployer,
                        spender: user1,
                        value: AMOUNT.mul(new BN(2))
                    }
                );

                (await tevaToken.allowance(deployer, user1)).should.be.bignumber.equal(AMOUNT.mul(new BN(2)));
            });

            it("shouldn't increase allowance for zero address", async () => {
                await expectRevert(
                    tevaToken.increaseAllowance(constants.ZERO_ADDRESS, AMOUNT),
                    "ERC20: approve to the zero address"
                );
            });

            //decreaseAllowance
            it("should decrease allowance correctly", async () => {
                await tevaToken.approve(user1, AMOUNT);
                (await tevaToken.allowance(deployer, user1)).should.be.bignumber.equal(AMOUNT);
                
                receipt = await tevaToken.decreaseAllowance(user1, AMOUNT);
                expectEvent(
                    receipt,
                    "Approval",
                    {
                        owner: deployer,
                        spender: user1,
                        value: ZERO_AMOUNT
                    }
                );

                (await tevaToken.allowance(deployer, user1)).should.be.bignumber.equal(ZERO_AMOUNT);
            });

            it("shouldn't decrease allowance for zero address", async () => {
                await expectRevert(
                    tevaToken.decreaseAllowance(constants.ZERO_ADDRESS, AMOUNT),
                    "ERC20: decreased allowance below zero"
                );
            });

            it("shouldn't decrease allowance below zero", async () => {
                await expectRevert(
                    tevaToken.decreaseAllowance(user1, AMOUNT),
                    "ERC20: decreased allowance below zero"
                );
            });

            //transferFrom
            it("should transfer tokens from address correctly", async () => {
                await tevaToken.mint(deployer, AMOUNT);
                await tevaToken.approve(user1, AMOUNT);
                (await tevaToken.balanceOf(user2)).should.be.bignumber.equal(ZERO_AMOUNT);

                receipt = await tevaToken.transferFrom(deployer, user2, AMOUNT, { from: user1 });
                expectEvent(
                    receipt,
                    "Transfer",
                    {
                        from: deployer,
                        to: user2,
                        value: AMOUNT
                    }
                );

                (await tevaToken.balanceOf(user2)).should.be.bignumber.equal(AMOUNT);
            });

            it("shouldn't transfer tokens from address if amount exceed allowance", async () => {
                await expectRevert(
                    tevaToken.transferFrom(deployer, user2, AMOUNT, { from: user1 }),
                    "ERC20: insufficient allowance"
                );
            });
        });
    });
});