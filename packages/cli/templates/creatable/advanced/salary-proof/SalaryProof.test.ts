import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";

async function deploySalaryProofFixture(account: HardhatEthersSigner) {
  const proofValidityPeriod = 86400; // 1 day

  const contractFactory = await hre.ethers.getContractFactory("SalaryProof");
  const contract = await contractFactory.connect(account).deploy(proofValidityPeriod);
  await contract.waitForDeployment();
  return contract;
}

describe("SalaryProof", function () {
  let salaryProofContract: ethers.Contract;
  let salaryProofContractAddress: string;
  let owner: HardhatEthersSigner;
  let employer: HardhatEthersSigner;
  let employee: HardhatEthersSigner;
  let verifier: HardhatEthersSigner;

  before(async function () {
    [owner, employer, employee, verifier] = await hre.ethers.getSigners();

    salaryProofContract = await deploySalaryProofFixture(owner);
    salaryProofContractAddress = await salaryProofContract.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(salaryProofContract, "SalaryProof");
  });

  describe("Setup", function () {
    it("should have correct proof validity period", async function () {
      expect(await salaryProofContract.proofValidityPeriod()).to.eq(86400);
    });

    it("should start with no verifiers", async function () {
      expect(await salaryProofContract.isVerifier(verifier.address)).to.be.false;
    });
  });

  describe("Verifier Management", function () {
    it("should add verifier", async function () {
      const tx = await salaryProofContract.addVerifier(verifier.address);
      await tx.wait();

      expect(await salaryProofContract.isVerifier(verifier.address)).to.be.true;
    });

    it("should remove verifier", async function () {
      const [, , , , otherVerifier] = await hre.ethers.getSigners();
      await salaryProofContract.addVerifier(otherVerifier.address);
      await salaryProofContract.removeVerifier(otherVerifier.address);

      expect(await salaryProofContract.isVerifier(otherVerifier.address)).to.be.false;
    });
  });

  describe("Salary Registration", function () {
    it("should register salary for employee", async function () {
      const salary = 75000n; // $75,000 annual

      const input = hre.fhevm.createEncryptedInput(salaryProofContractAddress, employer.address);
      input.add64(salary);
      const encryptedInput = await input.encrypt();

      const tx = await salaryProofContract.connect(employer).registerSalary(
        employee.address,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      expect(await salaryProofContract.hasSalaryRegistered(employee.address)).to.be.true;
    });

    it("should return correct salary info", async function () {
      const [employerAddr, registeredAt, active] = await salaryProofContract.getSalaryInfo(employee.address);
      expect(employerAddr).to.eq(employer.address);
      expect(active).to.be.true;
      expect(registeredAt).to.be.gt(0);
    });

    it("should reject duplicate registration", async function () {
      const salary = 80000n;

      const input = hre.fhevm.createEncryptedInput(salaryProofContractAddress, employer.address);
      input.add64(salary);
      const encryptedInput = await input.encrypt();

      await expect(
        salaryProofContract.connect(employer).registerSalary(
          employee.address,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(salaryProofContract, "SalaryAlreadyRegistered");
    });
  });

  describe("Proof Generation - Above Threshold", function () {
    it("should prove salary above $50,000", async function () {
      const tx = await salaryProofContract.connect(employee).proveAboveThreshold(50000, verifier.address);
      const receipt = await tx.wait();

      // Should emit ProofGenerated event
      const event = receipt.logs.find(
        (log: any) => log.fragment?.name === "ProofGenerated"
      );
      expect(event).to.not.be.undefined;
    });

    it("should prove salary above $70,000", async function () {
      const tx = await salaryProofContract.connect(employee).proveAboveThreshold(70000, verifier.address);
      await tx.wait();
    });

    it("should reject proof from unregistered user", async function () {
      const [, , , , unregistered] = await hre.ethers.getSigners();
      await expect(
        salaryProofContract.connect(unregistered).proveAboveThreshold(50000, verifier.address)
      ).to.be.revertedWithCustomError(salaryProofContract, "SalaryNotRegistered");
    });
  });

  describe("Proof Generation - Below Threshold", function () {
    it("should prove salary below $100,000", async function () {
      const tx = await salaryProofContract.connect(employee).proveBelowThreshold(100000, verifier.address);
      await tx.wait();
    });
  });

  describe("Proof Generation - In Range", function () {
    it("should prove salary in range $60,000 - $90,000", async function () {
      const tx = await salaryProofContract.connect(employee).proveInRange(60000, 90000, verifier.address);
      await tx.wait();
    });

    it("should reject invalid range (min >= max)", async function () {
      await expect(
        salaryProofContract.connect(employee).proveInRange(90000, 60000, verifier.address)
      ).to.be.revertedWithCustomError(salaryProofContract, "InvalidThreshold");
    });
  });

  describe("Proof Verification", function () {
    let proofId: string;

    before(async function () {
      // Create a proof to verify
      const tx = await salaryProofContract.connect(employee).proveAboveThreshold(30000, verifier.address);
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        (log: any) => log.fragment?.name === "ProofGenerated"
      );
      proofId = event.args[0];
    });

    it("should verify proof by authorized verifier", async function () {
      const tx = await salaryProofContract.connect(verifier).verifyProof(proofId);
      await tx.wait();

      const [, , , , verified] = await salaryProofContract.getProofStatus(proofId);
      expect(verified).to.be.true;
    });

    it("should reject verification from non-verifier", async function () {
      // Create another proof
      const createTx = await salaryProofContract.connect(employee).proveAboveThreshold(20000, verifier.address);
      const createReceipt = await createTx.wait();
      const event = createReceipt.logs.find(
        (log: any) => log.fragment?.name === "ProofGenerated"
      );
      const newProofId = event.args[0];

      await expect(
        salaryProofContract.connect(employer).verifyProof(newProofId)
      ).to.be.revertedWithCustomError(salaryProofContract, "NotAuthorized");
    });

    it("should return correct proof status", async function () {
      const [user, proofVerifier, proofType, expiresAt, verified] =
        await salaryProofContract.getProofStatus(proofId);

      expect(user).to.eq(employee.address);
      expect(proofVerifier).to.eq(verifier.address);
      expect(proofType).to.eq(0); // ProofType.AboveThreshold
      expect(verified).to.be.true;
      expect(expiresAt).to.be.gt(0);
    });
  });

  describe("Salary Update", function () {
    it("should update salary by employer", async function () {
      const newSalary = 85000n;

      const input = hre.fhevm.createEncryptedInput(salaryProofContractAddress, employer.address);
      input.add64(newSalary);
      const encryptedInput = await input.encrypt();

      const tx = await salaryProofContract.connect(employer).updateSalary(
        employee.address,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();
    });

    it("should reject update from non-employer", async function () {
      const newSalary = 90000n;

      const input = hre.fhevm.createEncryptedInput(salaryProofContractAddress, verifier.address);
      input.add64(newSalary);
      const encryptedInput = await input.encrypt();

      await expect(
        salaryProofContract.connect(verifier).updateSalary(
          employee.address,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWith("Not employer");
    });
  });
});
