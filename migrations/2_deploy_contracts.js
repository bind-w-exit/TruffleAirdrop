const TevaToken = artifacts.require("./TevaToken.sol");
const AirdropContract = artifacts.require("./AirdropContract.sol")


module.exports = async function(deployer) {
  await deployer.deploy(TevaToken);
  await deployer.deploy(AirdropContract, TevaToken.address);
};
