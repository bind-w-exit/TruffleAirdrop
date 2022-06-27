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

contract("TevaToken", function (accounts) {
    [deployer, user1, user2, user3] = accounts;
    const name = "Teva token";
    const symbol = "TEVA";
    const decimals = new BN(18);
    const amount = new BN(100000);

    before(async function () {
        snapshotA = await snapshot();
        tevaToken = await TevaToken.new();
        snapshotB = await snapshot();
    });

    after(async function () {
        await snapshotA.restore();  //After ALL tests in "Teva Token Test Cases" reverts blockchain in the captured state
    });
    
    describe("Teva Token Test Cases", function () {

        describe("Teva Token Deploy Test Cases", function () {

            it("should deploy with correct owner", async () => {
                (await tevaToken.owner()).should.equal(deployer);
            });

            it("should deploy with correct name", async () => {
                (await tevaToken.name()).should.equal(name);
            });

            it("should deploy with correct symbol", async () => {
                (await tevaToken.symbol()).should.equal(symbol);
            });

            it("should deploy with correct decimals", async () => {
                (await tevaToken.decimals()).should.be.bignumber.equal(decimals);
            });

            it("should deploy with correct initial total supply", async () => {
                (await tevaToken.totalSupply()).should.be.bignumber.equal(new BN(0));
            });

        });

        describe("Teva Token Test Cases", function () {

            afterEach(async function () {
                await snapshotB.restore();
            });

            it("should mint tokens correctly", async () => {
                receipt = await tevaToken.mint(deployer, amount);
                expectEvent(
                    receipt,
                    "Transfer",
                    {
                        from: constants.ZERO_ADDRESS,
                        to: deployer,
                        value: amount
                    }
                );
            });

            it("shouldn't mint tokens by not the current owner", async () => {
                await expectRevert(
                    tevaToken.mint(deployer, amount, { from: user1 }),
                    "Ownable: caller is not the owner"
                );
            });

            it("should burn tokens correctly", async () => {
                await tevaToken.mint(deployer, amount);
                receipt = await tevaToken.burn(amount);
                expectEvent(
                    receipt,
                    "Transfer",
                    {
                        from: deployer,
                        to: constants.ZERO_ADDRESS,
                        value: amount
                    }
                );
            });


            it("should transfer tokens correctly", async () => {
                await tevaToken.mint(deployer, amount);
                (await tevaToken.balanceOf(deployer)).should.be.bignumber.equal(amount);
                (await tevaToken.balanceOf(user1)).should.be.bignumber.equal(new BN(0));
                receipt = await tevaToken.transfer(user1, amount, { from: deployer });
                (await tevaToken.balanceOf(user1)).should.be.bignumber.equal(amount);
                expectEvent(
                    receipt,
                    "Transfer",
                    {
                        from: deployer,
                        to: user1,
                        value: amount
                    }
                );
            });

            it("shouldn't transfer tokens to the zero address", async () => {
                await expectRevert(
                    tevaToken.transfer(constants.ZERO_ADDRESS, amount, { from: deployer }),
                    "ERC20: transfer to the zero address"
                );
            });

            it("shouldn't transfer tokens if transfer amount exceed balance", async () => {
                await expectRevert(
                    tevaToken.transfer(user2, constants.MAX_UINT256, { from: user1 }),
                    "ERC20: transfer amount exceeds balance"
                );
            });

            it("should approve correctly", async () => {
                receipt = await tevaToken.approve(user1, amount);
                (await tevaToken.allowance(deployer, user1)).should.be.bignumber.equal(amount);
                expectEvent(
                    receipt,
                    "Approval",
                    { 
                        owner: deployer,
                        spender: user1,
                        value: amount 
                    }
                );
            });

            it("shouldn't approve to the zero address", async () => {
                await expectRevert(
                    tevaToken.approve(constants.ZERO_ADDRESS, amount),
                    "ERC20: approve to the zero address"
                );
            });

            it("should increase allowance correctly", async () => {
                await tevaToken.approve(user1, amount);
                (await tevaToken.allowance(deployer, user1)).should.be.bignumber.equal(amount);
                receipt = await tevaToken.increaseAllowance(user1, amount);
                (await tevaToken.allowance(deployer, user1)).should.be.bignumber.equal(new BN(amount * 2));
                expectEvent(
                    receipt,
                    "Approval",
                    {
                        owner: deployer,
                        spender: user1,
                        value: new BN(amount * 2)
                    }
                );
            });

            it("shouldn't increase allowance for zero address", async () => {
                await expectRevert(
                    tevaToken.increaseAllowance(constants.ZERO_ADDRESS, amount),
                    "ERC20: approve to the zero address"
                );
            });

            it("should decrease allowance correctly", async () => {
                await tevaToken.approve(user1, amount);
                (await tevaToken.allowance(deployer, user1)).should.be.bignumber.equal(amount);
                receipt = await tevaToken.decreaseAllowance(user1, amount);
                (await tevaToken.allowance(deployer, user1)).should.be.bignumber.equal(new BN(0));
                expectEvent(
                    receipt,
                    "Approval",
                    {
                        owner: deployer,
                        spender: user1,
                        value: new BN(0)
                    }
                );
            });

            it("shouldn't decrease allowance for zero address", async () => {
                await expectRevert(
                    tevaToken.decreaseAllowance(constants.ZERO_ADDRESS, amount),
                    "ERC20: decreased allowance below zero"
                );
            });

            it("shouldn't decrease allowance below zero", async () => {
                await expectRevert(
                    tevaToken.decreaseAllowance(user1, amount),
                    "ERC20: decreased allowance below zero"
                );
            });

            it("should transfer tokens from address correctly", async () => {
                await tevaToken.mint(deployer, amount);
                await tevaToken.approve(user1, amount);
                (await tevaToken.balanceOf(user2)).should.be.bignumber.equal(new BN(0));
                receipt = await tevaToken.transferFrom(deployer, user2, amount, { from: user1 });
                (await tevaToken.balanceOf(user2)).should.be.bignumber.equal(amount);
                expectEvent(
                    receipt,
                    "Transfer",
                    {
                        from: deployer,
                        to: user2,
                        value: amount
                    }
                );
            });

            it("shouldn't transfer tokens from address if amount exceed allowance", async () => {
                await expectRevert(
                    tevaToken.transferFrom(deployer, user2, amount, { from: user1 }),
                    "ERC20: insufficient allowance"
                );
            });
        });
    });
});