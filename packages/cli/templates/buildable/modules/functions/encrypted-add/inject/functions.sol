    /// @notice Add two encrypted values and return the result
    /// @param encryptedA First encrypted value
    /// @param proofA Proof for first value
    /// @param encryptedB Second encrypted value
    /// @param proofB Proof for second value
    /// @return result The encrypted sum
    function encryptedAdd(
        [[EXTERNAL_TYPE]] encryptedA,
        bytes calldata proofA,
        [[EXTERNAL_TYPE]] encryptedB,
        bytes calldata proofB
    ) external returns ([[COUNTER_TYPE]] result) {
        [[COUNTER_TYPE]] a = FHE.fromExternal(encryptedA, proofA);
        [[COUNTER_TYPE]] b = FHE.fromExternal(encryptedB, proofB);
        result = FHE.add(a, b);
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        emit EncryptedAddResult(msg.sender);
        return result;
    }
