// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CrowdFunding {
    address payable public admin;

    struct Donation {
        uint256 donationId;
        address donorAddress;
        uint256 donationAmount;
        bool voted;
    }

    struct Campaign {
        uint256 campaignId;
        string description;
        address payable benificiary;
        uint256 targetAmount;
        uint256 currentAmount;
        uint256 deadline;
        bool completedTarget;
        bool fundsTransferred;
        Donation[] receivedDonations;
    }

    uint256 public totalCampaigns;
    uint256 public totalDonations;
    Campaign[20] public campaigns;
    mapping(address => uint256[]) public beneficiaries;

    event CampaignRegistered(uint256 campaignId, address benificiary);
    event SuccessfulDonation(uint256 donationId, address donor);
    event TransferCompleted(uint256 campaignId, address benificiary);

    constructor() {
        admin = payable(msg.sender);
    }

    modifier onlyAdmin() {
        require(
            msg.sender == admin,
            "ERROR: ONLY ADMIN CAN ACCESS THIS RESOURCE"
        );
        _;
    }

    function createCampaign(
        string memory _description,
        address payable _benificiary,
        uint256 _targetAmount,
        uint256 _deadline
    ) external onlyAdmin {
        Campaign storage campaign = campaigns[totalCampaigns++];
        campaign.campaignId = totalCampaigns;
        campaign.description = _description;
        campaign.benificiary = _benificiary;
        campaign.targetAmount = _targetAmount * (1 ether);
        campaign.currentAmount = 0;
        campaign.deadline = block.timestamp + (_deadline * 24 * 60 * 60);
        campaign.completedTarget = false;
        campaign.fundsTransferred = false;

        beneficiaries[_benificiary].push(campaign.campaignId);

        emit CampaignRegistered(campaign.campaignId, campaign.benificiary);
    }

    function donateFund(uint256 campaignId) external payable returns (bool) {
        require(campaignId <= totalCampaigns, "ERROR: Invalid Campain Id!!");
        require(
            !campaigns[campaignId - 1].completedTarget,
            "ERROR: Campaign Already Completed!"
        );
        require(msg.value > 0, "ERROR: Provide Some Fund!!");

        Campaign storage campaign = campaigns[campaignId - 1];
        uint256 proposedDonationAmount = msg.value;
        address payable donorAddress = payable(msg.sender);

        if (
            (campaign.currentAmount + proposedDonationAmount) <=
            campaign.targetAmount
        ) {
            Donation memory donation = Donation({
                donationId: ++totalDonations,
                donorAddress: donorAddress,
                donationAmount: proposedDonationAmount,
                voted: false
            });

            campaign.currentAmount += proposedDonationAmount;
            campaign.receivedDonations.push(donation);

            emit SuccessfulDonation(donation.donationId, donation.donorAddress);

            if (campaign.currentAmount == campaign.targetAmount) {
                campaign.completedTarget = true;
            }
        } else {
            uint256 requiredDonation = campaign.targetAmount -
                campaign.currentAmount;

            Donation memory donation = Donation({
                donationId: ++totalDonations,
                donorAddress: donorAddress,
                donationAmount: requiredDonation,
                voted: false
            });

            // update campaign
            campaign.currentAmount += requiredDonation;
            campaign.receivedDonations.push(donation);
            campaign.completedTarget = true;

            emit SuccessfulDonation(donation.donationId, donation.donorAddress);

            // return extra remaining funds
            uint256 extraFund = proposedDonationAmount - requiredDonation;
            (bool success, ) = donorAddress.call{value: extraFund}("");
            return success;
        }

        return true;
    }

    function retrieveDonations(
        uint256 campaignId
    ) external view returns (Donation[] memory) {
        return campaigns[campaignId - 1].receivedDonations;
    }

    function checkBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function transferFunds(
        uint256 campaignId
    ) external onlyAdmin returns (bool) {
        require(campaignId <= totalCampaigns, "ERROR: INVALID CAMPAIGN ID");
        require(
            !campaigns[campaignId - 1].fundsTransferred,
            "ERROR: Transfer Already Completed"
        );
        require(
            campaigns[campaignId - 1].completedTarget ||
                campaigns[campaignId - 1].deadline <= block.timestamp,
            "ERROR: CAAMPAIGN IS NOT OVER YET"
        );

        (bool success, ) = (campaigns[campaignId - 1].benificiary).call{
            value: campaigns[campaignId - 1].currentAmount
        }("");

        if (success) {
            campaigns[campaignId - 1].fundsTransferred = true;
            emit TransferCompleted(
                campaignId,
                campaigns[campaignId - 1].benificiary
            );
        }

        return success;
    }
}
