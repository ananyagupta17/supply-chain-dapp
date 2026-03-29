const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SupplyChain", function () {

// -------------------------------------------------------------------
  // TEST SETUP
  // Deploys a fresh contract instance and initializes test accounts
  // before each test case to ensure isolation.
  // -------------------------------------------------------------------

  let supplyChain;
  let admin, manufacturer, distributor, retailer;

  beforeEach(async function () {
    [admin, manufacturer, distributor, retailer] = await ethers.getSigners();

    const SupplyChain = await ethers.getContractFactory("SupplyChain");
    const deployment = await SupplyChain.deploy();
    supplyChain = await deployment.waitForDeployment();
});

  // -------------------------------------------------------------------
  // 1. Product Registration
  // -------------------------------------------------------------------
  describe("registerProduct()", function () {

    it("allows admin to register a product", async function () {
      // Call registerProduct as admin
      await expect(
        supplyChain.connect(admin).registerProduct("iPhone 15", "Apple smartphone")
      )
        .to.emit(supplyChain, "ProductRegistered") // check event was emitted
        .withArgs(1, "iPhone 15", admin.address);  // check event arguments

      // Verify product count increased
      expect(await supplyChain.productCount()).to.equal(1);
    });

    it("stores product data correctly", async function () {
      await supplyChain.connect(admin).registerProduct("Nike Shoes", "Limited edition");

      const product = await supplyChain.getProduct(1);

      expect(product.id).to.equal(1);
      expect(product.name).to.equal("Nike Shoes");
      expect(product.description).to.equal("Limited edition");
      expect(product.owner).to.equal(admin.address);
      expect(product.stage).to.equal(0); // 0 = Manufactured
    });

    it("rejects non-admin from registering a product", async function () {
      await expect(
        supplyChain.connect(distributor).registerProduct("Fake Product", "Unauthorized")
      ).to.be.revertedWith("Only admin can call this");
    });

    it("increments product ID correctly for multiple products", async function () {
      await supplyChain.connect(admin).registerProduct("Product A", "First");
      await supplyChain.connect(admin).registerProduct("Product B", "Second");

      expect(await supplyChain.productCount()).to.equal(2);

      const p2 = await supplyChain.getProduct(2);
      expect(p2.name).to.equal("Product B");
    });

  });

  // -------------------------------------------------------------------
  // 2. Stage Updates
  // -------------------------------------------------------------------
  describe("updateStage()", function () {

    beforeEach(async function () {
      // Register a product before each stage test
      await supplyChain.connect(admin).registerProduct("MacBook", "Apple laptop");
    });

    it("allows owner to advance stage forward", async function () {
      await expect(supplyChain.connect(admin).updateStage(1, 1)) // 1 = Shipped
        .to.emit(supplyChain, "StageUpdated")
        .withArgs(1, 1, admin.address);

      const product = await supplyChain.getProduct(1);
      expect(product.stage).to.equal(1); // Shipped
    });

    it("moves through all stages correctly", async function () {
      await supplyChain.connect(admin).updateStage(1, 1); // Shipped
      await supplyChain.connect(admin).updateStage(1, 2); // InTransit
      await supplyChain.connect(admin).updateStage(1, 3); // Delivered

      const product = await supplyChain.getProduct(1);
      expect(product.stage).to.equal(3); // Delivered
    });

    it("rejects skipping stages", async function () {
      // Try to jump from Manufactured (0) straight to Delivered (3)
      await expect(
        supplyChain.connect(admin).updateStage(1, 3)
    ).to.be.revertedWith("Can only move one stage at a time");
    });

    it("rejects going backwards in stage", async function () {
        await supplyChain.connect(admin).updateStage(1, 1); // Manufactured → Shipped
        await supplyChain.connect(admin).updateStage(1, 2); // Shipped → InTransit
      
        // Try to go back to Shipped (1), should fail
        await expect(
          supplyChain.connect(admin).updateStage(1, 1)
        ).to.be.reverted;
      });

    it("rejects non-owner from updating stage", async function () {
      await expect(
        supplyChain.connect(distributor).updateStage(1, 1)
      ).to.be.revertedWith("Only product owner can call this");
    });

    it("rejects update on non-existent product", async function () {
      await expect(
        supplyChain.connect(admin).updateStage(99, 1)
      ).to.be.revertedWith("Product does not exist");
    });

  });

  // -------------------------------------------------------------------
  // 3. Ownership Transfer
  // -------------------------------------------------------------------
  describe("transferOwnership()", function () {

    beforeEach(async function () {
      await supplyChain.connect(admin).registerProduct("Samsung TV", "OLED 4K");
    });

    it("transfers ownership to a new address", async function () {
      await expect(
        supplyChain.connect(admin).transferOwnership(1, distributor.address)
      )
        .to.emit(supplyChain, "OwnershipTransferred")
        .withArgs(1, admin.address, distributor.address);

      const product = await supplyChain.getProduct(1);
      expect(product.owner).to.equal(distributor.address);
    });

    it("new owner can update stage after transfer", async function () {
      // Transfer from admin → distributor
      await supplyChain.connect(admin).transferOwnership(1, distributor.address);

      // Now distributor updates the stage
      await expect(
        supplyChain.connect(distributor).updateStage(1, 1)
      ).to.emit(supplyChain, "StageUpdated");
    });

    it("old owner cannot update stage after transfer", async function () {
      await supplyChain.connect(admin).transferOwnership(1, distributor.address);

      // Admin no longer owns it — should fail
      await expect(
        supplyChain.connect(admin).updateStage(1, 1)
      ).to.be.revertedWith("Only product owner can call this");
    });

    it("rejects transfer to zero address", async function () {
      await expect(
        supplyChain.connect(admin).transferOwnership(1, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });

    it("rejects transfer by non-owner", async function () {
      await expect(
        supplyChain.connect(retailer).transferOwnership(1, distributor.address)
      ).to.be.revertedWith("Only product owner can call this");
    });

  });

  // -------------------------------------------------------------------
  // 4. Full Supply Chain Journey
  // -------------------------------------------------------------------
  describe("Full supply chain journey", function () {

    it("tracks a product from manufacture to delivery", async function () {
      // Step 1: Admin registers product
      await supplyChain.connect(admin).registerProduct("Laptop", "Dell XPS");

      // Step 2: Ship it (admin still owns it)
      await supplyChain.connect(admin).updateStage(1, 1); // Shipped

      // Step 3: Transfer to distributor
      await supplyChain.connect(admin).transferOwnership(1, distributor.address);

      // Step 4: Distributor marks it InTransit
      await supplyChain.connect(distributor).updateStage(1, 2); // InTransit

      // Step 5: Transfer to retailer
      await supplyChain.connect(distributor).transferOwnership(1, retailer.address);

      // Step 6: Retailer marks it Delivered
      await supplyChain.connect(retailer).updateStage(1, 3); // Delivered

      // Verify final state
      const product = await supplyChain.getProduct(1);
      expect(product.stage).to.equal(3);       // Delivered
      expect(product.owner).to.equal(retailer.address);
    });

  });

});