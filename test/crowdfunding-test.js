const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrowdFunding Testing", () => {
  let crowdFunding, owner, account1, account2, account3, account4, account5;

  beforeEach(async () => {
    crowdFunding = await ethers.getContractFactory("CrowdFunding");
    [owner, account1, account2, account3, account4, account5] =
      await ethers.getSigners();
    crowdFunding = await crowdFunding.deploy();
    await crowdFunding.deployed();
  });

  it("Owner Test", async () => {
    expect(await crowdFunding.admin()).to.equal(owner.address);
  });

  it("Create Campaign Test", async () => {
    await crowdFunding.createCampaign(
      "Child Development",
      account1.address,
      1,
      1
    );
    let campaign = await crowdFunding.campaigns(0);
    expect(campaign).to.not.equal(undefined);
    expect(campaign.campaignId).to.equal(1);
  });

  it("Create Campaign Event Test", async () => {
    await expect(
      crowdFunding.createCampaign("Child Development", account1.address, 1, 1)
    )
      .to.emit(crowdFunding, "CampaignRegistered")
      .withArgs(1, account1.address);
  });

  it("Create Campaign Accessibility Test", async () => {
    await expect(
      crowdFunding
        .connect(account1)
        .createCampaign("Child Development", account1.address, 1, 1)
    ).to.revertedWith("ERROR: ONLY ADMIN CAN ACCESS THIS RESOURCE");
  });

  it("Donate Fund Test", async () => {
    await crowdFunding.createCampaign(
      "Child Development",
      account1.address,
      1,
      1
    );

    const initialBalance = await ethers.provider.getBalance(account1.address);

    const options = { value: ethers.utils.parseEther("0.3") };
    await crowdFunding.connect(account1).donateFund(1, options);

    const finalBalance = await ethers.provider.getBalance(account1.address);

    const weiValue = initialBalance - finalBalance;
    const etherValue = weiValue / Math.pow(10, 18);

    expect(parseFloat(etherValue.toFixed(2))).to.equal(0.3);

    const contractBalance =
      (await crowdFunding.checkBalance()) / Math.pow(10, 18);

    expect(contractBalance).to.equal(0.3);
  });

  it("Donate Fund Event Test", async () => {
    await crowdFunding.createCampaign(
      "Child Development",
      account1.address,
      1,
      1
    );

    const options = { value: ethers.utils.parseEther("0.3") };

    await expect(crowdFunding.connect(account1).donateFund(1, options))
      .to.emit(crowdFunding, "SuccessfulDonation")
      .withArgs(1, account1.address);
  });

  it("Donate Fund - INVALID ID Test", async () => {
    await expect(crowdFunding.connect(account1).donateFund(10)).to.revertedWith(
      "ERROR: Invalid Campain Id!!"
    );
  });

  it("Donate Fund - Campaign Completed Test", async () => {
    await crowdFunding.createCampaign(
      "Child Development",
      account1.address,
      1,
      1
    );

    const options = { value: ethers.utils.parseEther("2") };
    await crowdFunding.connect(account1).donateFund(1, options);

    let campaign = await crowdFunding.campaigns(0);

    expect(campaign.completedTarget).to.equal(true);

    await expect(crowdFunding.connect(account1).donateFund(1)).to.revertedWith(
      "ERROR: Campaign Already Completed!"
    );
  });

  it("Donate Fund - Provide Some Fund Test", async () => {
    const tx = await crowdFunding.createCampaign(
      "Child Development",
      account1.address,
      1,
      1
    );

    await tx.wait();

    await expect(crowdFunding.connect(account1).donateFund(1)).to.revertedWith(
      "ERROR: Provide Some Fund!!"
    );
  });

  it("Donate Fund - Provide Some Fund Test", async () => {
    const tx = await crowdFunding.createCampaign(
      "Child Development",
      account1.address,
      1,
      1
    );

    await tx.wait();

    await expect(crowdFunding.connect(account2).donateFund(1)).to.revertedWith(
      "ERROR: Provide Some Fund!!"
    );
  });

  it("Transfer Funds Test", async () => {
    const tx = await crowdFunding.createCampaign(
      "Child Development",
      account1.address,
      1,
      1
    );
    await tx.wait();

    const options = { value: ethers.utils.parseEther("1") };
    await crowdFunding.connect(account2).donateFund(1, options);

    const initialBalance = await ethers.provider.getBalance(account1.address);
    await crowdFunding.transferFunds(1);
    const finalBalance = await ethers.provider.getBalance(account1.address);
    const weiValue = finalBalance - initialBalance;
    const etherValue = weiValue / Math.pow(10, 18);

    expect(parseFloat(etherValue.toFixed(2))).to.equal(1);
  });

  it("Transfer Funds - Invalid Id Test", async () => {
    const tx = await crowdFunding.createCampaign(
      "Child Development",
      account1.address,
      1,
      1
    );

    await tx.wait();

    await expect(crowdFunding.transferFunds(5)).to.revertedWith(
      "ERROR: INVALID CAMPAIGN ID"
    );
  });

  it("Transfer Funds - Transfer Already Completed Test", async () => {
    const tx = await crowdFunding.createCampaign(
      "Child Development",
      account1.address,
      1,
      1
    );
    await tx.wait();

    const options = { value: ethers.utils.parseEther("1") };
    await crowdFunding.connect(account2).donateFund(1, options);
    await crowdFunding.transferFunds(1);
    await expect(crowdFunding.transferFunds(1)).to.revertedWith(
      "ERROR: Transfer Already Completed"
    );
  });

  it("Transfer Funds - Campaign Not Over Test", async () => {
    const tx = await crowdFunding.createCampaign(
      "Child Development",
      account1.address,
      1,
      1
    );

    await tx.wait();

    await expect(crowdFunding.transferFunds(1)).to.revertedWith(
      "ERROR: CAAMPAIGN IS NOT OVER YET"
    );
  });

  it("Transfer Completed Event Test", async () => {
    await crowdFunding.createCampaign(
      "Child Development",
      account1.address,
      1,
      1
    );

    const options = { value: ethers.utils.parseEther("1") };
    await crowdFunding.connect(account2).donateFund(1, options);

    await expect(crowdFunding.transferFunds(1))
      .to.emit(crowdFunding, "TransferCompleted")
      .withArgs(1, account1.address);
  });
});
