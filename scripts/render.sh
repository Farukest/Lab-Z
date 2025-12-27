#!/bin/bash

TEMPLATE_DIR="C:/Users/Farukest-Working/Desktop/PROJECTS/Lab-Z/templates/bases"
OUTPUT_DIR="C:/Users/Farukest-Working/Desktop/PROJECTS/Lab-Z/templates/_test/contracts/bases"

render() {
    local template="$1"
    local output="$2"
    local name="$3"

    sed -e "s|{{IMPORTS}}|import { FHE, euint64, euint8, ebool, eaddress, externalEuint64, externalEuint8, externalEbool, externalEaddress } from \"@fhevm/solidity/lib/FHE.sol\";\nimport { ZamaEthereumConfig } from \"@fhevm/solidity/config/ZamaConfig.sol\";|g" \
        -e "s|{{CONTRACT_NAME}}|$name|g" \
        -e "s|{{INHERITS}}|ZamaEthereumConfig|g" \
        -e "s|{{[A-Z_]*}}||g" \
        -e 's|\[\[AMOUNT_TYPE\]\]|euint64|g' \
        -e 's|\[\[EXTERNAL_AMOUNT_TYPE\]\]|externalEuint64|g' \
        -e 's|\[\[TICKET_TYPE\]\]|euint64|g' \
        -e 's|\[\[VOTE_TYPE\]\]|euint64|g' \
        -e 's|\[\[EXTERNAL_VOTE_TYPE\]\]|externalEuint64|g' \
        -e 's|\[\[RARITY_TYPE\]\]|euint8|g' \
        -e 's|\[\[CARD_TYPE\]\]|euint8|g' \
        -e 's|\[\[DICE_TYPE\]\]|euint64|g' \
        -e 's|\[\[DATE_TYPE\]\]|euint64|g' \
        -e 's|\[\[EXTERNAL_DATE_TYPE\]\]|externalEuint64|g' \
        -e 's|\[\[BID_TYPE\]\]|euint64|g' \
        -e 's|\[\[EXTERNAL_BID_TYPE\]\]|externalEuint64|g' \
        -e 's|\[\[SCORE_TYPE\]\]|euint64|g' \
        -e 's|\[\[ORDER_TYPE\]\]|euint64|g' \
        -e 's|\[\[PREF_TYPE\]\]|euint64|g' \
        -e 's|\[\[EXTERNAL_PREF_TYPE\]\]|externalEuint64|g' \
        -e 's|\[\[COUNTER_TYPE\]\]|euint64|g' \
        -e 's|\[\[EXTERNAL_TYPE\]\]|externalEuint64|g' \
        -e 's|\[\[PRICE_TYPE\]\]|euint64|g' \
        -e 's|\[\[EXTERNAL_PRICE_TYPE\]\]|externalEuint64|g' \
        -e 's|\[\[BET_TYPE\]\]|euint64|g' \
        -e 's|\[\[EXTERNAL_BET_TYPE\]\]|externalEuint64|g' \
        -e 's|\[\[BALANCE_TYPE\]\]|euint64|g' \
        -e 's|\[\[EXTERNAL_BALANCE_TYPE\]\]|externalEuint64|g' \
        -e 's|\[\[SALARY_TYPE\]\]|euint64|g' \
        -e 's|\[\[EXTERNAL_SALARY_TYPE\]\]|externalEuint64|g' \
        -e 's|\[\[[A-Z_]*TYPE\]\]|euint64|g' \
        -e 's|\[\[EXTERNAL_[A-Z_]*TYPE\]\]|externalEuint64|g' \
        "$template" > "$output"
}

render "$TEMPLATE_DIR/age-gate/contracts/AgeGate.sol.tmpl" "$OUTPUT_DIR/AgeGate.sol" "AgeGate"
render "$TEMPLATE_DIR/auction/contracts/Auction.sol.tmpl" "$OUTPUT_DIR/Auction.sol" "Auction"
render "$TEMPLATE_DIR/blind-match/contracts/BlindMatch.sol.tmpl" "$OUTPUT_DIR/BlindMatch.sol" "BlindMatch"
render "$TEMPLATE_DIR/counter/contracts/Counter.sol.tmpl" "$OUTPUT_DIR/Counter.sol" "Counter"
render "$TEMPLATE_DIR/dark-pool/contracts/DarkPool.sol.tmpl" "$OUTPUT_DIR/DarkPool.sol" "DarkPool"
render "$TEMPLATE_DIR/dice-game/contracts/DiceGame.sol.tmpl" "$OUTPUT_DIR/DiceGame.sol" "DiceGame"
render "$TEMPLATE_DIR/escrow/contracts/Escrow.sol.tmpl" "$OUTPUT_DIR/Escrow.sol" "Escrow"
render "$TEMPLATE_DIR/lottery/contracts/Lottery.sol.tmpl" "$OUTPUT_DIR/Lottery.sol" "Lottery"
render "$TEMPLATE_DIR/mystery-box/contracts/MysteryBox.sol.tmpl" "$OUTPUT_DIR/MysteryBox.sol" "MysteryBox"
render "$TEMPLATE_DIR/poker/contracts/Poker.sol.tmpl" "$OUTPUT_DIR/Poker.sol" "Poker"
render "$TEMPLATE_DIR/prediction-market/contracts/PredictionMarket.sol.tmpl" "$OUTPUT_DIR/PredictionMarket.sol" "PredictionMarket"
render "$TEMPLATE_DIR/quadratic-vote/contracts/QuadraticVote.sol.tmpl" "$OUTPUT_DIR/QuadraticVote.sol" "QuadraticVote"
render "$TEMPLATE_DIR/salary-proof/contracts/SalaryProof.sol.tmpl" "$OUTPUT_DIR/SalaryProof.sol" "SalaryProof"
render "$TEMPLATE_DIR/sealed-tender/contracts/SealedTender.sol.tmpl" "$OUTPUT_DIR/SealedTender.sol" "SealedTender"
render "$TEMPLATE_DIR/token/contracts/Token.sol.tmpl" "$OUTPUT_DIR/Token.sol" "Token"
render "$TEMPLATE_DIR/voting/contracts/Voting.sol.tmpl" "$OUTPUT_DIR/Voting.sol" "Voting"

echo "Rendered 16 templates"
