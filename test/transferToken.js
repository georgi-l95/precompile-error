const { expect } = require("chai");
describe("Transfer token", function () {
  const gasLimitOverride = { gasLimit: 1_000_000 };

  let tokenCreateContract;
  let tokenTransferContract;
  let erc721Contract;
  let nftTokenAddress;
  let signers;

  before(async function () {
    signers = await ethers.getSigners();

    // deploy TokenCreateContract
    const tokenCreateFactory = await ethers.getContractFactory("TokenCreateContract");
    const tokenCreateTx = await tokenCreateFactory.connect(signers[0]).deploy(gasLimitOverride);
    tokenCreateContract = await ethers.getContractAt("TokenCreateContract", (await tokenCreateTx.deployTransaction.wait()).contractAddress, signers[0]);
    console.log(`deployed tokenCreateContract to: ${tokenCreateContract.address}`);

    // deploy TokenTransferContract
    const tokenTransferFactory = await ethers.getContractFactory("TokenTransferContract");
    const tokenTransfer = await tokenTransferFactory.connect(signers[0]).deploy(gasLimitOverride);
    tokenTransferContract = await ethers.getContractAt("TokenTransferContract", (await tokenTransfer.deployTransaction.wait()).contractAddress, signers[0]);
    console.log(`deployed tokenTransferContract to: ${tokenTransferContract.address}`);

    // deploy erc721 wrapper
    const erc721ContractFactory = await ethers.getContractFactory("ERC721Contract");
    const erc721ContractDeployment = await erc721ContractFactory.connect(signers[0]).deploy({gasLimit: 1_000_000,});
    const erc721ContractReceipt = await erc721ContractDeployment.deployTransaction.wait();
    erc721Contract = await ethers.getContractAt("ERC721Contract",erc721ContractReceipt.contractAddress, signers[0]);
    console.log(`deployed erc721Contract to: ${erc721Contract.address}`);

    // create fungible token
    const tokenAddressTx = await tokenCreateContract.createNonFungibleTokenPublic(
      tokenCreateContract.address,
      {
        value: "10000000000000000000",
        gasLimit: 1_000_000,
      }
    );
    const tokenAddressReceipt = await tokenAddressTx.wait();
    const { tokenAddress } = tokenAddressReceipt.events.filter((e) => e.event === "CreatedToken")[0].args;
    nftTokenAddress = tokenAddress
    console.log(`created non fungible token to: ${tokenAddress}`);

    // associate token
    const associateTx1 = await ethers.getContractAt("TokenCreateContract", tokenCreateContract.address, signers[0]);
    const associateTx2 = await ethers.getContractAt("TokenCreateContract", tokenCreateContract.address, signers[1]);
    await tokenCreateContract.associateTokenPublic(erc721Contract.address, tokenAddress, gasLimitOverride);
    await associateTx1.associateTokenPublic(signers[0].address, tokenAddress, gasLimitOverride);
    await associateTx2.associateTokenPublic(signers[1].address, tokenAddress, gasLimitOverride);
    console.log(`associate token - done`);

    // grant kyc
    await tokenCreateContract.grantTokenKycPublic(tokenAddress, tokenCreateContract.address);
    await tokenCreateContract.grantTokenKycPublic(tokenAddress, signers[0].address);
    await tokenCreateContract.grantTokenKycPublic(tokenAddress, signers[1].address);
    console.log('grant kyc - done');
  });

  it("Should be able to grand setApproveForAll", async function () {
    const secondWallet = (await ethers.getSigners())[1];
    const isApprovedForAllBefore = await erc721Contract.isApprovedForAll(nftTokenAddress, erc721Contract.address, secondWallet.address);
    await erc721Contract.setApprovalForAll(nftTokenAddress, secondWallet.address, true, {gasLimit: 1_000_000});
    const isApprovedForAllAfter = await erc721Contract.isApprovedForAll(nftTokenAddress, erc721Contract.address, secondWallet.address);

    expect(isApprovedForAllBefore).to.equal(false);
    expect(isApprovedForAllAfter).to.equal(true);
  });
});
