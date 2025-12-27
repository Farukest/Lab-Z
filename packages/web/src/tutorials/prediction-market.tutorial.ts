import { Tutorial, FHE_CONCEPTS } from './types';

/**
 * Prediction Market Tutorial
 *
 * Polymarket-style prediction market with encrypted bet amounts.
 * Users can bet on YES/NO outcomes, pools are encrypted until resolution.
 *
 * Flow:
 * 1. Create Market -> Initialize encrypted pools
 * 2. Place Bets -> Add encrypted amounts to pools
 * 3. Resolve -> Oracle sets outcome
 * 4. Decrypt Pools -> Off-chain decryption
 * 5. Claim Winnings -> Proportional payout calculation
 */
export const predictionMarketTutorial: Tutorial = {
  templateId: 'prediction-market',
  title: 'Prediction Market Tutorial',
  description: 'Polymarket-style prediction market with encrypted bet positions',

  modes: {
    lineByLine: true,
    fheStepsOnly: true,
  },

  sections: [
    // =========================================================================
    //                    SECTION: Setup
    // =========================================================================
    {
      id: 'setup',
      title: 'Setup',
      steps: [
        {
          id: 'deploy',
          title: 'Contract Deployment',
          test: { method: 'before' },
          contract: { pattern: 'contract PredictionMarket' },
          leftExplanation: 'Deploy PredictionMarket contract with oracle address and minimum bet amount.',
          rightExplanation: 'Contract is deployed with oracle and minBetAmount configuration.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'verify-oracle',
          title: 'Verify Oracle',
          test: { pattern: 'predictionMarketContract\\.oracle\\(\\)' },
          contract: { pattern: 'address public oracle' },
          leftExplanation: 'Test verifies the oracle address is set correctly.',
          rightExplanation: 'Oracle is the trusted authority who resolves market outcomes.',
          flow: 'test-to-contract',
          duration: 2500,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Market Creation
    // =========================================================================
    {
      id: 'market-creation',
      title: 'Market Creation',
      steps: [
        {
          id: 'create-market',
          title: 'Create Market',
          test: { block: 'should create a market', call: 'createMarket' },
          contract: { method: 'createMarket' },
          leftExplanation: 'Test calls createMarket() with a question and future deadline.',
          rightExplanation: 'Creates a new market with encrypted YES and NO pools initialized to 0.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'fhe-init-pools',
          title: 'FHE.asEuint64() - Initialize Pools',
          contract: { fheOp: 'asEuint64' },
          rightExplanation: 'Both yesPool and noPool are initialized as encrypted zeros using FHE.asEuint64(0).',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.asEuint64',
            description: 'Initialize encrypted pool values'
          },
          concept: FHE_CONCEPTS.HANDLE,
          duration: 3500,
        },
        {
          id: 'fhe-allow-pools',
          title: 'FHE.allowThis() - Pool Access',
          contract: { fheOp: 'allowThis' },
          rightExplanation: 'FHE.allowThis() grants the contract permission to modify pool handles in future transactions.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.allowThis',
            description: 'Allow contract to access pool handles'
          },
          concept: FHE_CONCEPTS.ALLOW_THIS,
          duration: 3000,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Placing Bets
    // =========================================================================
    {
      id: 'placing-bets',
      title: 'Placing Bets',
      steps: [
        {
          id: 'encrypt-bet',
          title: 'Client-Side Encryption',
          test: { pattern: 'createEncryptedInput' },
          leftExplanation: 'Client encrypts bet amount using fhevm.createEncryptedInput(). The bet value stays hidden.',
          flow: 'test-only',
          concept: FHE_CONCEPTS.ENCRYPTED_INPUT,
          duration: 3000,
        },
        {
          id: 'place-bet-yes',
          title: 'Place YES Bet',
          test: { block: 'should allow bettor1 to bet YES', call: 'placeBet' },
          contract: { method: 'placeBet' },
          leftExplanation: 'Test sends encrypted bet amount with outcome=true (YES) and input proof.',
          rightExplanation: 'Contract receives encrypted bet and validates the ZK proof.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'fhe-from-external',
          title: 'FHE.fromExternal() - Validate Input',
          contract: { fheOp: 'fromExternal' },
          rightExplanation: 'FHE.fromExternal() validates the ZK proof and converts external encrypted input to internal handle.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.fromExternal',
            description: 'Validate proof and create internal handle'
          },
          concept: FHE_CONCEPTS.FROM_EXTERNAL,
          duration: 3500,
        },
        {
          id: 'fhe-add-pool',
          title: 'FHE.add() - Update Pool',
          contract: { fheOp: 'add' },
          rightExplanation: 'Bet amount is added to the encrypted pool. FHE.add() works on encrypted values without revealing amounts.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.add',
            description: 'Add encrypted bet to pool'
          },
          concept: FHE_CONCEPTS.ADD,
          duration: 3500,
        },
        {
          id: 'place-bet-no',
          title: 'Place NO Bet',
          test: { block: 'should allow bettor2 to bet NO', call: 'placeBet' },
          contract: { method: 'placeBet' },
          leftExplanation: 'Another bettor places a bet on NO outcome. Amount is encrypted.',
          rightExplanation: 'Contract adds bet to noPool using FHE.add().',
          flow: 'test-to-contract',
          duration: 2500,
        },
        {
          id: 'fhe-allow-user',
          title: 'FHE.allow() - User Access',
          contract: { pattern: 'FHE\\.allow\\(pos' },
          rightExplanation: 'FHE.allow() gives the bettor permission to decrypt their own position later.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.allow',
            description: 'Grant user access to their position'
          },
          concept: FHE_CONCEPTS.ALLOW,
          duration: 3000,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Market Resolution
    // =========================================================================
    {
      id: 'resolution',
      title: 'Market Resolution',
      steps: [
        {
          id: 'advance-time',
          title: 'Wait for Deadline',
          test: { pattern: 'time.increase' },
          leftExplanation: 'Test advances blockchain time past the market deadline.',
          flow: 'test-only',
          duration: 2000,
        },
        {
          id: 'resolve-market',
          title: 'Oracle Resolves Market',
          test: { block: 'should resolve market', call: 'resolveMarket' },
          contract: { method: 'resolveMarket' },
          leftExplanation: 'Oracle calls resolveMarket() with the final outcome (true/false).',
          rightExplanation: 'Market is marked as resolved. Oracle gets permission to decrypt pools.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'fhe-allow-oracle',
          title: 'FHE.allow() - Oracle Access',
          contract: { pattern: 'FHE\\.allow\\(market\\.yesPool, oracle\\)' },
          rightExplanation: 'Oracle is granted access to decrypt pool values for payout calculation.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.allow',
            description: 'Grant oracle access to pools'
          },
          concept: FHE_CONCEPTS.ALLOW,
          duration: 3000,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Pool Decryption
    // =========================================================================
    {
      id: 'decryption',
      title: 'Pool Decryption',
      steps: [
        {
          id: 'set-decrypted',
          title: 'Set Decrypted Pool Values',
          test: { block: 'should set decrypted pools', call: 'setDecryptedPools' },
          contract: { method: 'setDecryptedPools' },
          leftExplanation: 'Oracle decrypts pool values off-chain and submits the plaintext values.',
          rightExplanation: 'Decrypted pool values are stored for payout calculation.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'verify-decrypted',
          title: 'Verify Decryption',
          test: { pattern: 'getDecryptedPools' },
          contract: { method: 'getDecryptedPools' },
          leftExplanation: 'Test verifies the decrypted values match expected amounts.',
          rightExplanation: 'View function returns the public pool totals.',
          flow: 'test-to-contract',
          duration: 2500,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Claim Winnings
    // =========================================================================
    {
      id: 'claim',
      title: 'Claim Winnings',
      steps: [
        {
          id: 'claim-winnings',
          title: 'Claim Winnings',
          contract: { method: 'claimWinnings' },
          rightExplanation: 'Winner calls claimWinnings() to calculate and receive their proportional share.',
          flow: 'contract-only',
          duration: 3000,
        },
        {
          id: 'fhe-mul',
          title: 'FHE.mul() - Calculate Share',
          contract: { fheOp: 'mul' },
          rightExplanation: 'User bet is multiplied by total pool to calculate numerator. Encrypted math preserves privacy.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.mul',
            description: 'Multiply encrypted bet by pool total'
          },
          duration: 3000,
        },
        {
          id: 'fhe-div',
          title: 'FHE.div() - Proportional Payout',
          contract: { fheOp: 'div' },
          rightExplanation: 'Division by winning pool gives proportional payout. FHE.div() uses plaintext divisor.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.div',
            description: 'Divide to get proportional share'
          },
          duration: 3000,
        },
        {
          id: 'fhe-allow-payout',
          title: 'FHE.allow() - Payout Access',
          contract: { pattern: 'FHE\\.allow\\(payout, msg\\.sender\\)' },
          rightExplanation: 'Winner is granted access to decrypt their payout amount.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.allow',
            description: 'Grant winner access to payout'
          },
          concept: FHE_CONCEPTS.ALLOW,
          duration: 3000,
        },
      ],
    },
  ],
};
