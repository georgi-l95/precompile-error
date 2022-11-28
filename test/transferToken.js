const { expect } = require("chai");
describe("Transfer token", function () {
  const gasLimitOverride = { gasLimit: 1_000_000 };

  let tokenCreateContract;
  let tokenTransferContract;
  let erc20Contract;
  let tokenAddress;
  let signers;

  before(async function () {
    signers = await ethers.getSigners();

    // deploy TokenCreateContract
    const tokenCreateFactory = await ethers.getContractFactory("TokenCreateContract");
    const tokenCreateTx = await tokenCreateFactory.deploy(gasLimitOverride);
    tokenCreateContract = await ethers.getContractAt("TokenCreateContract", (await tokenCreateTx.deployTransaction.wait()).contractAddress);
    console.log(`deployed tokenCreateContract to: ${tokenCreateContract.address}`);

    // deploy TokenTransferContract
    const tokenTransferFactory = await ethers.getContractFactory("TokenTransferContract");
    const tokenTransfer = await tokenTransferFactory.deploy(gasLimitOverride);
    tokenTransferContract = await ethers.getContractAt("TokenTransferContract", (await tokenTransfer.deployTransaction.wait()).contractAddress);
    console.log(`deployed tokenTransferContract to: ${tokenTransferContract.address}`);

    // deploy erc20 wrapper
    const erc20ContractFactory = await ethers.getContractFactory("ERC20Contract");
    const erc20 = await erc20ContractFactory.deploy(gasLimitOverride);
    erc20Contract = await ethers.getContractAt("ERC20Contract", (await erc20.deployTransaction.wait()).contractAddress);
    console.log(`deployed erc20Contract to: ${erc20Contract.address}`);

    // create fungible token
    const tokenAddressTx = await tokenCreateContract.createFungibleTokenPublic(tokenCreateContract.address, {
      value: "10000000000000000000",
      ...gasLimitOverride
    });
    tokenAddress = (await tokenAddressTx.wait()).events.filter((e) => e.event === "CreatedToken")[0].args.tokenAddress;
    console.log(`created fungible token to: ${tokenAddress}`);

    // associate token
    const associateTx1 = await ethers.getContractAt("TokenCreateContract", tokenCreateContract.address, signers[0]);
    const associateTx2 = await ethers.getContractAt("TokenCreateContract", tokenCreateContract.address, signers[1]);
    await tokenCreateContract.associateTokenPublic(tokenCreateContract.address, tokenAddress, gasLimitOverride);
    await associateTx1.associateTokenPublic(signers[0].address, tokenAddress, gasLimitOverride);
    await associateTx2.associateTokenPublic(signers[1].address, tokenAddress, gasLimitOverride);
    console.log(`associate token - done`);

    // grant kyc
    await tokenCreateContract.grantTokenKycPublic(tokenAddress, tokenCreateContract.address);
    await tokenCreateContract.grantTokenKycPublic(tokenAddress, signers[0].address);
    await tokenCreateContract.grantTokenKycPublic(tokenAddress, signers[1].address);
    console.log('grant kyc - done');
  });

  it("Should be able to transfer 300 tokens from contract to signers[0] via tokenCreateContract", async function () {
    const INITIAL_BALANCE = 300;
    const TOTAL_SUPPLY = 1000;

    const contractOwnerBalanceBefore = await erc20Contract.balanceOf(tokenAddress, tokenCreateContract.address);
    const wallet1BalanceBefore = await erc20Contract.balanceOf(tokenAddress, signers[0].address);
    expect(contractOwnerBalanceBefore.toNumber()).to.eq(TOTAL_SUPPLY);
    expect(wallet1BalanceBefore.toNumber()).to.eq(0);

    // const tx = await tokenCreateContract.transferTokenPublic(tokenAddress, tokenCreateContract.address, signers[0].address, INITIAL_BALANCE);
    const tx = await tokenTransferContract.transferTokenPublic(tokenAddress, tokenCreateContract.address, signers[0].address, INITIAL_BALANCE);
    await tx.wait();

    const contractOwnerBalanceAfter = await erc20Contract.balanceOf(tokenAddress, tokenCreateContract.address);
    const wallet1BalanceAfter = await erc20Contract.balanceOf(tokenAddress, signers[0].address);
    expect(contractOwnerBalanceAfter.toNumber()).to.eq(TOTAL_SUPPLY - INITIAL_BALANCE);
    expect(wallet1BalanceAfter.toNumber()).to.eq(INITIAL_BALANCE);
  });
});
