    /// @notice Compare two encrypted values for equality
    function encryptedEq(
        [[EXTERNAL_TYPE]] encryptedA, bytes calldata proofA,
        [[EXTERNAL_TYPE]] encryptedB, bytes calldata proofB
    ) external returns (ebool result) {
        [[COUNTER_TYPE]] a = FHE.fromExternal(encryptedA, proofA);
        [[COUNTER_TYPE]] b = FHE.fromExternal(encryptedB, proofB);
        result = FHE.eq(a, b);
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
    }

    /// @notice Check if a > b (encrypted)
    function encryptedGt(
        [[EXTERNAL_TYPE]] encryptedA, bytes calldata proofA,
        [[EXTERNAL_TYPE]] encryptedB, bytes calldata proofB
    ) external returns (ebool result) {
        [[COUNTER_TYPE]] a = FHE.fromExternal(encryptedA, proofA);
        [[COUNTER_TYPE]] b = FHE.fromExternal(encryptedB, proofB);
        result = FHE.gt(a, b);
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
    }

    /// @notice Check if a >= b (encrypted)
    function encryptedGe(
        [[EXTERNAL_TYPE]] encryptedA, bytes calldata proofA,
        [[EXTERNAL_TYPE]] encryptedB, bytes calldata proofB
    ) external returns (ebool result) {
        [[COUNTER_TYPE]] a = FHE.fromExternal(encryptedA, proofA);
        [[COUNTER_TYPE]] b = FHE.fromExternal(encryptedB, proofB);
        result = FHE.ge(a, b);
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
    }

    /// @notice Check if a < b (encrypted)
    function encryptedLt(
        [[EXTERNAL_TYPE]] encryptedA, bytes calldata proofA,
        [[EXTERNAL_TYPE]] encryptedB, bytes calldata proofB
    ) external returns (ebool result) {
        [[COUNTER_TYPE]] a = FHE.fromExternal(encryptedA, proofA);
        [[COUNTER_TYPE]] b = FHE.fromExternal(encryptedB, proofB);
        result = FHE.lt(a, b);
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
    }

    /// @notice Check if a <= b (encrypted)
    function encryptedLe(
        [[EXTERNAL_TYPE]] encryptedA, bytes calldata proofA,
        [[EXTERNAL_TYPE]] encryptedB, bytes calldata proofB
    ) external returns (ebool result) {
        [[COUNTER_TYPE]] a = FHE.fromExternal(encryptedA, proofA);
        [[COUNTER_TYPE]] b = FHE.fromExternal(encryptedB, proofB);
        result = FHE.le(a, b);
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
    }
