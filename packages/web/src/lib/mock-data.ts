import type { Template } from "./types";

export const templates: Template[] = [
  {
    id: "counter",
    name: "FHE Counter",
    category: "basics",
    difficulty: "beginner",
    tags: ["counter", "euint32", "add", "sub", "state", "beginner", "FHE.add", "FHE.sub"],
    description: "A simple encrypted counter with increment and decrement operations",
    longDescription: "This example demonstrates the fundamental concepts of FHEVM by implementing a basic counter that stores its value as an encrypted euint32. Users can increment or decrement the counter using encrypted inputs, and only authorized users can decrypt the current count value.",
    blocks: [
      {
        id: "imports",
        type: "import",
        lines: [1, 5],
        explanation: "Import the FHE library with encrypted types (euint32, externalEuint32) and network configuration.",
        searchTerms: ["import", "FHE", "library", "euint32", "externalEuint32"]
      },
      {
        id: "state",
        type: "state",
        lines: [10, 11],
        explanation: "The encrypted counter value - stored as euint32. This value is never visible on-chain.",
        searchTerms: ["state", "euint32", "encrypted", "private"]
      },
      {
        id: "increment",
        type: "function",
        lines: [20, 31],
        explanation: "Increments the counter by an encrypted value using FHE.add(). Grants permissions using allowThis() and allow().",
        searchTerms: ["increment", "add", "FHE.add", "permission"]
      }
    ],
    contractCode: `// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/Config.sol";

/// @title FHE Counter - A simple encrypted counter
/// @notice Demonstrates basic FHEVM operations
contract FHECounter is SepoliaConfig {
    /// @dev The encrypted counter value
    euint32 private _count;

    /// @notice Returns the encrypted counter handle
    function getCount() external view returns (euint32) {
        return _count;
    }

    /// @notice Increments the counter by an encrypted value
    /// @param inputEuint32 The encrypted value to add
    /// @param inputProof Zero-knowledge proof validating the input
    function increment(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 evalue = FHE.fromExternal(inputEuint32, inputProof);
        _count = FHE.add(_count, evalue);

        FHE.allowThis(_count);
        FHE.allow(_count, msg.sender);
    }

    /// @notice Decrements the counter by an encrypted value
    function decrement(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 evalue = FHE.fromExternal(inputEuint32, inputProof);
        _count = FHE.sub(_count, evalue);

        FHE.allowThis(_count);
        FHE.allow(_count, msg.sender);
    }
}`,
    testCode: `import { FHECounter, FHECounter__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

describe("FHECounter", function () {
  it("should increment the counter", async function () {
    const [alice] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("FHECounter");
    const contract = await factory.deploy();
    const address = await contract.getAddress();

    const encrypted = await fhevm
      .createEncryptedInput(address, alice.address)
      .add32(5)
      .encrypt();

    await contract.increment(encrypted.handles[0], encrypted.inputProof);

    const result = await contract.getCount();
    const decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint32, result, address, alice
    );

    expect(decrypted).to.eq(5);
  });
});`,
    relatedTemplates: ["add", "encryption-single"],
    nextSteps: ["add", "acl-allow"]
  },
  {
    id: "add",
    name: "Encrypted Addition",
    category: "basics",
    difficulty: "beginner",
    tags: ["add", "arithmetic", "euint64", "FHE.add", "basic operation"],
    description: "Add two encrypted values and return the encrypted result",
    longDescription: "Demonstrates the most fundamental FHE operation: adding two encrypted values. The operation happens entirely on encrypted data.",
    blocks: [
      {
        id: "add-function",
        type: "function",
        lines: [14, 28],
        explanation: "The add function takes two external encrypted values, converts them, adds them with FHE.add(), and sets permissions.",
        searchTerms: ["add", "FHE.add", "arithmetic", "encrypted addition"]
      }
    ],
    contractCode: `// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/Config.sol";

/// @title Encrypted Addition
contract EncryptedAdd is SepoliaConfig {
    euint64 private _result;

    function add(
        externalEuint64 a,
        externalEuint64 b,
        bytes calldata inputProof
    ) external returns (euint64) {
        euint64 encryptedA = FHE.fromExternal(a, inputProof);
        euint64 encryptedB = FHE.fromExternal(b, inputProof);

        _result = FHE.add(encryptedA, encryptedB);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);

        return _result;
    }

    function getResult() external view returns (euint64) {
        return _result;
    }
}`,
    testCode: `import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

describe("EncryptedAdd", function () {
  it("should add two encrypted values", async function () {
    const [alice] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("EncryptedAdd");
    const contract = await factory.deploy();
    const address = await contract.getAddress();

    const encrypted = await fhevm
      .createEncryptedInput(address, alice.address)
      .add64(42n)
      .add64(58n)
      .encrypt();

    await contract.add(
      encrypted.handles[0],
      encrypted.handles[1],
      encrypted.inputProof
    );

    const result = await contract.getResult();
    const decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint64, result, address, alice
    );

    expect(decrypted).to.eq(100n);
  });
});`,
    relatedTemplates: ["counter"],
    prerequisites: ["counter"],
    nextSteps: ["compare", "encryption-single"]
  },
  {
    id: "acl-allow",
    name: "Access Control (ACL)",
    category: "acl",
    difficulty: "intermediate",
    tags: ["ACL", "allow", "allowThis", "allowTransient", "permission", "access control"],
    description: "Demonstrates FHE permission management with allow, allowThis, and allowTransient",
    longDescription: "Access Control Lists (ACL) are critical in FHEVM. Every encrypted value has an ACL that determines who can access it.",
    blocks: [
      {
        id: "allow",
        type: "function",
        lines: [30, 37],
        explanation: "Demonstrates granting persistent access with FHE.allow(). Once allowed, the address can decrypt anytime.",
        searchTerms: ["allow", "permission", "grant access"]
      },
      {
        id: "allowTransient",
        type: "function",
        lines: [39, 46],
        explanation: "Temporary access with allowTransient. Permission only lasts for the current transaction.",
        searchTerms: ["allowTransient", "temporary", "one-time"]
      }
    ],
    contractCode: `// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/Config.sol";

/// @title ACL Demo - Access Control for Encrypted Values
contract ACLDemo is SepoliaConfig {
    euint32 private _secret;
    address public secretOwner;

    function setSecret(externalEuint32 encryptedSecret, bytes calldata inputProof) external {
        _secret = FHE.fromExternal(encryptedSecret, inputProof);
        secretOwner = msg.sender;

        FHE.allowThis(_secret);
        FHE.allow(_secret, msg.sender);
    }

    function shareAccess(address recipient) external {
        require(msg.sender == secretOwner, "Only owner can share");
        FHE.allow(_secret, recipient);
    }

    function shareTransientAccess(address recipient) external {
        require(msg.sender == secretOwner, "Only owner can share");
        FHE.allowTransient(_secret, recipient);
    }

    function hasAccess(address account) external view returns (bool) {
        return FHE.isAllowed(_secret, account);
    }

    function getSecret() external view returns (euint32) {
        return _secret;
    }
}`,
    testCode: `import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

describe("ACLDemo", function () {
  it("should allow owner to share access", async function () {
    const [alice, bob] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("ACLDemo");
    const contract = await factory.deploy();
    const address = await contract.getAddress();

    // Alice sets secret
    const encrypted = await fhevm
      .createEncryptedInput(address, alice.address)
      .add32(42)
      .encrypt();

    await contract.connect(alice).setSecret(
      encrypted.handles[0],
      encrypted.inputProof
    );

    // Bob initially has no access
    expect(await contract.hasAccess(bob.address)).to.eq(false);

    // Alice shares with Bob
    await contract.connect(alice).shareAccess(bob.address);

    // Now Bob has access
    expect(await contract.hasAccess(bob.address)).to.eq(true);
  });
});`,
    relatedTemplates: ["counter"],
    prerequisites: ["counter"],
    nextSteps: ["user-decrypt-single"]
  },
  {
    id: "compare",
    name: "Encrypted Comparison",
    category: "basics",
    difficulty: "beginner",
    tags: ["compare", "lt", "gt", "eq", "ebool", "conditional"],
    description: "Compare two encrypted values with FHE.lt, FHE.gt, FHE.eq",
    longDescription: "Shows how to compare encrypted values without revealing them. Returns encrypted booleans (ebool).",
    blocks: [
      {
        id: "compare-ops",
        type: "function",
        lines: [15, 30],
        explanation: "FHE comparison operations return ebool - an encrypted boolean that can be used in further computations.",
        searchTerms: ["compare", "lt", "gt", "eq", "less than", "greater than"]
      }
    ],
    contractCode: `// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, ebool, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/Config.sol";

/// @title Encrypted Comparison
contract EncryptedCompare is SepoliaConfig {

    function isGreater(
        externalEuint32 a,
        externalEuint32 b,
        bytes calldata inputProof
    ) external returns (ebool) {
        euint32 encA = FHE.fromExternal(a, inputProof);
        euint32 encB = FHE.fromExternal(b, inputProof);

        ebool result = FHE.gt(encA, encB);
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        return result;
    }

    function isEqual(
        externalEuint32 a,
        externalEuint32 b,
        bytes calldata inputProof
    ) external returns (ebool) {
        euint32 encA = FHE.fromExternal(a, inputProof);
        euint32 encB = FHE.fromExternal(b, inputProof);

        ebool result = FHE.eq(encA, encB);
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        return result;
    }
}`,
    testCode: `import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

describe("EncryptedCompare", function () {
  it("should compare encrypted values", async function () {
    const [alice] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("EncryptedCompare");
    const contract = await factory.deploy();
    const address = await contract.getAddress();

    const encrypted = await fhevm
      .createEncryptedInput(address, alice.address)
      .add32(10)
      .add32(5)
      .encrypt();

    await contract.isGreater(
      encrypted.handles[0],
      encrypted.handles[1],
      encrypted.inputProof
    );
  });
});`,
    relatedTemplates: ["add"],
    prerequisites: ["add"],
    nextSteps: ["select"]
  },
  {
    id: "select",
    name: "Conditional Select",
    category: "basics",
    difficulty: "intermediate",
    tags: ["select", "conditional", "ternary", "ebool", "branching"],
    description: "Select between two encrypted values based on an encrypted condition",
    longDescription: "FHE.select is the encrypted equivalent of a ternary operator. It chooses between two encrypted values based on an encrypted boolean condition.",
    blocks: [
      {
        id: "select-op",
        type: "function",
        lines: [12, 25],
        explanation: "FHE.select(condition, ifTrue, ifFalse) - selects one of two encrypted values based on an encrypted boolean.",
        searchTerms: ["select", "conditional", "ternary", "if-else", "branching"]
      }
    ],
    contractCode: `// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, ebool, externalEuint32, externalEbool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/Config.sol";

/// @title Conditional Select
contract EncryptedSelect is SepoliaConfig {
    euint32 private _result;

    function selectValue(
        externalEbool condition,
        externalEuint32 valueIfTrue,
        externalEuint32 valueIfFalse,
        bytes calldata inputProof
    ) external returns (euint32) {
        ebool encCondition = FHE.fromExternal(condition, inputProof);
        euint32 encTrue = FHE.fromExternal(valueIfTrue, inputProof);
        euint32 encFalse = FHE.fromExternal(valueIfFalse, inputProof);

        _result = FHE.select(encCondition, encTrue, encFalse);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);

        return _result;
    }

    function getResult() external view returns (euint32) {
        return _result;
    }
}`,
    testCode: `import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

describe("EncryptedSelect", function () {
  it("should select based on condition", async function () {
    const [alice] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("EncryptedSelect");
    const contract = await factory.deploy();
    const address = await contract.getAddress();

    const encrypted = await fhevm
      .createEncryptedInput(address, alice.address)
      .addBool(true)
      .add32(100)
      .add32(50)
      .encrypt();

    await contract.selectValue(
      encrypted.handles[0],
      encrypted.handles[1],
      encrypted.handles[2],
      encrypted.inputProof
    );
  });
});`,
    relatedTemplates: ["compare"],
    prerequisites: ["compare"],
    nextSteps: ["min-max"]
  }
];
