    /// @notice Multiply two encrypted values and return the result
    /// @param encryptedA First encrypted value
    /// @param proofA Proof for first value
    /// @param encryptedB Second encrypted value
    /// @param proofB Proof for second value
    /// @return result The encrypted product
    function encryptedMul(
        [[EXTERNAL_TYPE]] encryptedA,
        bytes calldata proofA,
        [[EXTERNAL_TYPE]] encryptedB,
        bytes calldata proofB
    ) external returns ([[COUNTER_TYPE]] result) {
        [[COUNTER_TYPE]] a = FHE.fromExternal(encryptedA, proofA);
        [[COUNTER_TYPE]] b = FHE.fromExternal(encryptedB, proofB);
        result = FHE.mul(a, b);
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        emit EncryptedMulResult(msg.sender);
        return result;
    }
