
export type UlsanMarbleArrivalCause =
  | "DICE"
  | "GOLDEN_KEY"
  | "AIRPORT";

export type UlsanMarbleArrivalContext = {
  arrivalId: string;
  cause: UlsanMarbleArrivalCause;

  playerId: string;
  position: number;
  turnSequence: number;
};

export type UlsanMarblePropertyDecisionRequest = {
  arrivalId: string;
  propertyId: string;
  action:
    UlsanMarblePropertyDecisionAction;
};  

export type UlsanMarblePropertyDecisionAction =
  | "BUY"
  | "DECLINE";

export type UlsanMarbleStockTradeAction =
  | "BUY"
  | "SELL";  

export type UlsanMarbleTollPaidPayload = {
  payerPlayerId: string;
  ownerPlayerId: string;
  propertyId: string;

  amount: number;
  ownerIncome: number;

  bankWithdrawalAmount: number;

  ownerWasJailed: boolean;
};

type UlsanMarbleAirportTravelActionBase = {
  actionId: string;

  playerId: string;

  visitId: string;

  fromPosition: number;

  turnSequence: number;
};

export type UlsanMarbleAirportTravelDecidedPayload =
  | (
      UlsanMarbleAirportTravelActionBase & {
        action: "TRAVEL";

        destinationPosition: number;

        arrivalId: string;
      }
    )
  | (
      UlsanMarbleAirportTravelActionBase & {
        action: "CANCEL";
      }
    );

export interface UlsanMarbleTaxAssessmentItemPayload {
  propertyId: string;
  propertyName: string;

  stage:
    UlsanMarblePropertyDevelopmentStage;

  basePrice: number;
  currentPrice: number;
  priceIndex: number;
  rate: number;
  amount: number;
}

export interface UlsanMarbleTaxAssessmentPayload {
  playerId: string;

  settlementTurn: number;

  items:
    UlsanMarbleTaxAssessmentItemPayload[];

  totalAmount: number;
}

export interface UlsanMarbleTaxSettlementStartedPayload {
  settlementId: string;

  settlementTurn: number;
  turnSequence: number;

  additionallyDisabledPlayerIds:
    string[];

  rawAssessments:
    UlsanMarbleTaxAssessmentPayload[];

  assessments:
    UlsanMarbleTaxAssessmentPayload[];

  discountedPlayerIds:
    string[];
}

type UlsanMarbleTaxActionBasePayload = {
  actionId: string;

  settlementId: string;
  taxpayerId: string;

  settlementTurn: number;
  turnSequence: number;
};

export type UlsanMarbleTaxActionDecidedPayload =
  UlsanMarbleTaxActionBasePayload &
    (
      | {
          action: "PAY";
          totalAmount: number;
        }

      | {
          action: "SELL_PROPERTY";
          propertyId: string;
          salePrice: number;
        }

      | {
          action: "SELL_STOCK";
          companyId: string;
          quantity: number;
          pricePerShare: number;
        }

      | {
          action:
            "DECLARE_BANKRUPTCY";
        }
    );

export type UlsanMarblePropertyDevelopmentStage =
  | "LAND"
  | "DEVELOPED"
  | "BUILDING"
  | "LANDMARK";

export type UlsanMarblePropertyDevelopmentDecidedPayload =
  | {
      playerId: string;
      propertyId: string;

      action: "DECLINE";

      currentStage:
        UlsanMarblePropertyDevelopmentStage;
    }
  | {
      playerId: string;
      propertyId: string;

      action: "BUILD";

      currentStage:
        UlsanMarblePropertyDevelopmentStage;

      nextStage:
        UlsanMarblePropertyDevelopmentStage;

      constructionCost: number;

      currentConstructionInvestment: number;
      nextConstructionInvestment: number;

      developedTurn: number;

      usedConstructionSupportItem: boolean;
      usedCityHallDevelopmentSupport: boolean;
    };

export type UlsanMarbleRecurringSavingsProductId =
  | "SMALL"
  | "STANDARD"
  | "LARGE";

type UlsanMarbleBankActionBase = {
  playerId: string;
  visitId: string;
  turnSequence: number;
};

export type UlsanMarbleBankActionDecidedPayload =
  | (
      UlsanMarbleBankActionBase & {
        action: "DEPOSIT";
        amount: number;
      }
    )
  | (
      UlsanMarbleBankActionBase & {
        action: "WITHDRAW";
        amount: number;
      }
    )
  | (
      UlsanMarbleBankActionBase & {
        action: "START_SAVINGS";
        productId:
          UlsanMarbleRecurringSavingsProductId;
        openedTurn: number;
      }
    )
  | (
      UlsanMarbleBankActionBase & {
        action: "CLOSE";
      }
    );

export type UlsanMarbleScratchPrizeTier =
  | "MISS"
  | "SMALL"
  | "REFUND"
  | "WIN"
  | "BIG"
  | "JACKPOT";

export type UlsanMarbleScratchLotteryResultPayload = {
  id: string;
  tier: UlsanMarbleScratchPrizeTier;
  label: string;
  prizeAmount: number;
};

export type UlsanMarbleLottoTicketPayload = {
  id: string;
  playerId: string;
  drawNumber: number;
  numbers: number[];
  purchasedTurn: number;
};

type UlsanMarbleLotteryActionBasePayload = {
  playerId: string;
  visitId: string;
  turnSequence: number;
};

export type UlsanMarbleLotteryActionDecidedPayload =
  | (
      UlsanMarbleLotteryActionBasePayload & {
        action: "BUY_SCRATCH";
        expectedPurchaseCount: number;
        result:
          UlsanMarbleScratchLotteryResultPayload;
      }
    )
  | (
      UlsanMarbleLotteryActionBasePayload & {
        action: "BUY_LOTTO";
        expectedPurchaseCount: number;
        drawNumber: number;
        jackpotContribution: number;
        tickets:
          UlsanMarbleLottoTicketPayload[];
      }
    )
  | (
      UlsanMarbleLotteryActionBasePayload & {
        action: "CLOSE";
      }
    );

export type UlsanMarbleLottoDrawMode = "SCHEDULED";

export type UlsanMarbleLottoPrizeRank =
  | 1
  | 2
  | 3
  | 4
  | null;

export interface UlsanMarbleLottoTicketResultPayload {
  ticketId: string;
  playerId: string;
  numbers: number[];
  matchCount: number;
  rank: UlsanMarbleLottoPrizeRank;
  prizeAmount: number;
}

export interface UlsanMarbleLottoPlayerPrizePayload {
  playerId: string;
  prizeAmount: number;
  winningTicketCount: number;
}

export interface UlsanMarbleLottoDrawResultPayload {
  drawNumber: number;
  winningNumbers: number[];
  totalTicketCount: number;

  jackpotBefore: number;
  jackpotAfter: number;

  ticketResults:
    UlsanMarbleLottoTicketResultPayload[];

  playerPrizes:
    UlsanMarbleLottoPlayerPrizePayload[];
}

export interface UlsanMarbleLottoStatePayload {
  drawNumber: number;
  jackpot: number;

  tickets:
    UlsanMarbleLottoTicketPayload[];
}

export interface UlsanMarbleLottoDrawResolvedPayload {
  drawId: string;

  turnNumber: number;
  turnSequence: number;

  mode: UlsanMarbleLottoDrawMode;

  additionallyDisabledPlayerIds:
    string[];

  nextState:
    UlsanMarbleLottoStatePayload;

  result:
    UlsanMarbleLottoDrawResultPayload;
}

export interface UlsanMarbleLottoDrawConfirmedPayload {
  drawId: string;

  turnNumber: number;
  turnSequence: number;
}
 
export type UlsanMarblePortContractType =
  | "COASTAL"
  | "EAST_ASIA"
  | "OCEAN";

export interface UlsanMarblePortContractPayload {
  id: string;
  playerId: string;
  type: UlsanMarblePortContractType;

  purchasedTurn: number;
  settlesAfterTurn: number;
  investmentAmount: number;
}

type UlsanMarblePortActionBasePayload = {
  playerId: string;
  visitId: string;
  turnSequence: number;
};

export type UlsanMarblePortActionDecidedPayload =
  | (
      UlsanMarblePortActionBasePayload & {
        action: "START_CONTRACT";
        contract:
          UlsanMarblePortContractPayload;
      }
    )
  | (
      UlsanMarblePortActionBasePayload & {
        action: "CLOSE";
      }
    );

export type UlsanMarblePortSettlementModifierType =
  | "TYPHOON"
  | "SHIPBUILDING_UP"
  | "ECONOMIC_NEWS"
  | "CITY_HALL"
  | "CARGO_INSURANCE";

export interface UlsanMarblePortSettlementModifierPayload {
  type:
    UlsanMarblePortSettlementModifierType;

  label: string;
  chanceDelta: number;
}

export interface UlsanMarblePortSettlementResultPayload {
  contract:
    UlsanMarblePortContractPayload;

  success: boolean;
  finalSuccessChance: number;

  modifiers:
    UlsanMarblePortSettlementModifierPayload[];

  payoutAmount: number;
  netProfit: number;
}

export interface UlsanMarblePortSettlementResolvedPayload {
  settlementId: string;

  turnNumber: number;
  turnSequence: number;

  additionallyDisabledPlayerIds:
    string[];

  nextActiveContracts:
    UlsanMarblePortContractPayload[];

  results:
    UlsanMarblePortSettlementResultPayload[];

  consumedCargoInsurancePlayerIds:
    string[];
}

export interface UlsanMarblePortSettlementConfirmedPayload {
  settlementId: string;

  turnNumber: number;
  turnSequence: number;
}    

export type UlsanMarbleJailEntryConfirmedPayload = {
  playerId: string;
  entryId: string;
  turnSequence: number;
};

export type UlsanMarbleJailTurnDiceFace =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6;

type UlsanMarbleJailTurnActionBasePayload = {
  actionId: string;

  playerId: string;
  turnSequence: number;

  diceValues: [
    UlsanMarbleJailTurnDiceFace,
    UlsanMarbleJailTurnDiceFace,
  ];
};

export type UlsanMarbleJailTurnActionDecidedPayload =
  | (
      UlsanMarbleJailTurnActionBasePayload & {
        action: "PAY_BAIL";
      }
    )
  | (
      UlsanMarbleJailTurnActionBasePayload & {
        action: "USE_ESCAPE_CARD";

        escapeCardsBefore: number;
      }
    )
  | (
      UlsanMarbleJailTurnActionBasePayload & {
        action: "TRY_DOUBLE";

        failedAttemptsBefore: number;
      }
    );

type UlsanMarbleJailFineActionBasePayload = {
  actionId: string;

  fineId: string;

  playerId: string;
  amount: number;

  turnSequence: number;
};

export type UlsanMarbleJailFineActionDecidedPayload =
  UlsanMarbleJailFineActionBasePayload &
    (
      | {
          action: "PAY";
        }

      | {
          action: "SELL_PROPERTY";

          propertyId: string;
          salePrice: number;
        }

      | {
          action: "SELL_STOCK";

          companyId: string;
          quantity: number;

          pricePerShare: number;
          holdingBefore: number;
        }

      | {
          action:
            "DECLARE_BANKRUPTCY";
        }
    );

export type UlsanMarbleStockStatus =
  | "NORMAL"
  | "MANAGEMENT"
  | "TRADING_HALT"
  | "DELISTED";

export type UlsanMarbleDistrictId =
  | "NAM"
  | "JUNG"
  | "BUK"
  | "DONG"
  | "ULJU";

export interface UlsanMarblePropertyMarketStatePayload {
  propertyId: string;

  priceIndex: number;

  lastChangeRate: number;
  districtChangeRate: number;
  individualChangeRate: number;

  updatedTurn: number;
}

export type UlsanMarblePropertyMarketMapPayload =
  Record<
    string,
    UlsanMarblePropertyMarketStatePayload
  >;

export interface UlsanMarbleDistrictMarketChangePayload {
  districtId:
    UlsanMarbleDistrictId;

  changeRate: number;
}

export interface UlsanMarblePropertyMarketChangePayload {
  propertyId: string;
  propertyName: string;

  districtId:
    UlsanMarbleDistrictId;

  previousPriceIndex: number;
  nextPriceIndex: number;

  districtChangeRate: number;
  individualChangeRate: number;
  appliedChangeRate: number;

  previousPrice: number;
  currentPrice: number;
}

export interface UlsanMarblePropertyMarketCyclePayload {
  turnNumber: number;

  districtChanges:
    UlsanMarbleDistrictMarketChangePayload[];

  propertyChanges:
    UlsanMarblePropertyMarketChangePayload[];
}

export interface UlsanMarblePropertyMarketResolvedPayload {
  resolutionId: string;

  turnNumber: number;
  turnSequence: number;

  mode: "SCHEDULED";

  additionallyDisabledPlayerIds:
    string[];

  nextMarket:
    UlsanMarblePropertyMarketMapPayload;

  cycle:
    UlsanMarblePropertyMarketCyclePayload;

  nextPropertyDefenseByPlayer:
    Record<string, string>;
}

export interface UlsanMarblePropertyMarketSettlementConfirmedPayload {
  resolutionId: string;

  turnNumber: number;
  turnSequence: number;
}

export interface UlsanMarbleStockQuotePayload {
  companyId: string;

  currentPrice: number;
  previousPrice: number;

  lastChangeRate: number;
  lastIndustryChangeRate: number;
  lastCompanyChangeRate: number;

  status: UlsanMarbleStockStatus;
}

export type UlsanMarbleStockMarketMapPayload =
  Record<
    string,
    UlsanMarbleStockQuotePayload
  >;

export interface UlsanMarbleStockIndustryTrendPayload {
  industryId: string;
  changeRate: number;
}

export interface UlsanMarbleStockMarketMoverPayload {
  companyId: string;
  companyName: string;
  ticker: string;
  industryId: string;

  previousPrice: number;
  currentPrice: number;
  changeRate: number;
}

export interface UlsanMarbleStockMarketCyclePayload {
  turnNumber: number;

  industryTrends:
    UlsanMarbleStockIndustryTrendPayload[];

  movers:
    UlsanMarbleStockMarketMoverPayload[];

  topGainers:
    UlsanMarbleStockMarketMoverPayload[];

  topLosers:
    UlsanMarbleStockMarketMoverPayload[];
}

export interface UlsanMarbleStockProtectionCreditPayload {
  playerId: string;
  industryId: string;
  amount: number;
}

export type UlsanMarbleStockMarketResolutionMode = "SCHEDULED";

export interface UlsanMarbleStockMarketResolvedPayload {
  resolutionId: string;

  turnNumber: number;
  turnSequence: number;

  mode:
    UlsanMarbleStockMarketResolutionMode;

  additionallyDisabledPlayerIds:
    string[];

  nextMarket:
    UlsanMarbleStockMarketMapPayload;

  cycle:
    UlsanMarbleStockMarketCyclePayload;

  protectionCredits:
    UlsanMarbleStockProtectionCreditPayload[];

  nextStockLossIndustryByPlayer:
    Record<string, string>;

  consumedCityHallOneTimeBoost:
    boolean;
}

export interface UlsanMarbleStockMarketSettlementConfirmedPayload {
  resolutionId: string;

  turnNumber: number;
  turnSequence: number;
}

export type UlsanMarbleAuctionItemId =
  | "DICE_REROLL"
  | "TOLL_EXEMPTION"
  | "CONSTRUCTION_SUPPORT"
  | "TAX_DISCOUNT"
  | "DISASTER_SUPPORT"
  | "SAVINGS_GRACE"
  | "EMERGENCY_FLIGHT"
  | "TOLL_BOOST"
  | "PROPERTY_DEFENSE"
  | "PORT_CARGO_INSURANCE"
  | "DEPOSIT_BONUS"
  | "STOCK_LOSS_PROTECTION";

export interface UlsanMarbleAuctionItemInstancePayload {
  instanceId: string;
  itemId: UlsanMarbleAuctionItemId;
}

export interface UlsanMarbleAuctionDeckPayload {
  drawPile:
    UlsanMarbleAuctionItemInstancePayload[];

  cycle: number;
}

export type UlsanMarbleAuctionStage =
  | "BIDDING"
  | "CHOOSE_DISCARD"
  | "RESULT";

export type UlsanMarbleAuctionResult =
  | "SOLD"
  | "UNSOLD";

export interface UlsanMarbleAuctionSnapshotPayload {
  auctionId: string;

  arrivalPlayerId: string;

  item:
    UlsanMarbleAuctionItemInstancePayload;

  eligibleBidderIds: string[];
  activeBidderIds: string[];

  currentBidderId:
    string | null;

  highestBidderId:
    string | null;

  currentBid: number;

  winnerPlayerId:
    string | null;

  result:
    UlsanMarbleAuctionResult | null;

  stage:
    UlsanMarbleAuctionStage;

  deadlineAt:
    number | null;
}

type UlsanMarbleAuctionActionBasePayload = {
  actionId: string;
  auctionId: string;

  turnNumber: number;
  turnSequence: number;
};

export type UlsanMarbleAuctionActionDecidedPayload =
  UlsanMarbleAuctionActionBasePayload &
    (
      | {
          action: "START";

          auction:
            UlsanMarbleAuctionSnapshotPayload;

          nextDeck:
            UlsanMarbleAuctionDeckPayload;
        }

      | {
          action: "BID";

          bidderId: string;
          amount: number;

          auction:
            UlsanMarbleAuctionSnapshotPayload;
        }

      | {
          action: "PASS";

          bidderId: string;

          auction:
            UlsanMarbleAuctionSnapshotPayload;
        }

      | {
          action: "DISCARD";

          playerId: string;

          discardInstanceId:
            string;

          auction:
            UlsanMarbleAuctionSnapshotPayload;
        }

      | {
          action: "CLOSE";

          playerId: string;
        }
    );

export type UlsanMarbleMiniGameId =
  | "TIMING_STOP"
  | "TARGET_DICE"
  | "ODD_EVEN"
  | "HIGH_LOW";

export type UlsanMarbleMiniGameStage =
  | "PLAYING"
  | "RESULT";

export type UlsanMarbleMiniGameDiceFace =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6;

export type UlsanMarbleMiniGameOddEvenChoice =
  | "ODD"
  | "EVEN";

export type UlsanMarbleMiniGameHighLowChoice =
  | "HIGH"
  | "LOW";

export interface UlsanMarbleMiniGameDeckPayload {
  drawPile:
    UlsanMarbleMiniGameId[];

  cycle: number;
}

interface UlsanMarbleMiniGameSnapshotBase {
  arrivalPlayerId: string;

  eligiblePlayerIds:
    string[];

  currentPlayerIndex:
    number;

  round: number;

  stage:
    UlsanMarbleMiniGameStage;

  winnerPlayerId:
    string | null;

  resultText:
    string | null;

  deadlineAt:
    number | null;
}

export interface UlsanMarbleMiniGameTimingAttemptPayload {
  playerId: string;
  distance: number;
  responseMs: number;
}

export interface UlsanMarbleMiniGameTargetDiceAttemptPayload {
  playerId: string;

  diceValues: [
    UlsanMarbleMiniGameDiceFace,
    UlsanMarbleMiniGameDiceFace,
  ];

  total: number;
  distance: number;
}

export interface UlsanMarbleMiniGameSettlementPayload {
  playerId: string;

  stake: number;
  payout: number;

  result:
    | "WIN"
    | "LOSE"
    | "REFUND"
    | "PASS";
}

export type UlsanMarbleMiniGameSnapshotPayload =
  | (
      UlsanMarbleMiniGameSnapshotBase & {
        gameId:
          "TIMING_STOP";

        roundPlayerIds:
          string[];

        attempts:
          UlsanMarbleMiniGameTimingAttemptPayload[];
      }
    )

  | (
      UlsanMarbleMiniGameSnapshotBase & {
        gameId:
          "TARGET_DICE";

        roundPlayerIds:
          string[];

        targetNumber:
          number;

        attempts:
          UlsanMarbleMiniGameTargetDiceAttemptPayload[];
      }
    )

  | (
      UlsanMarbleMiniGameSnapshotBase & {
        gameId:
          "ODD_EVEN";

        bets:
          Array<{
            playerId: string;

            choice:
              UlsanMarbleMiniGameOddEvenChoice |
              null;

            amount: number;
          }>;

        diceValues:
          [
            UlsanMarbleMiniGameDiceFace,
            UlsanMarbleMiniGameDiceFace,
          ] |
          null;

        settlements:
          UlsanMarbleMiniGameSettlementPayload[];
      }
    )

  | (
      UlsanMarbleMiniGameSnapshotBase & {
        gameId:
          "HIGH_LOW";

        firstNumber:
          4 | 5 | 6;

        secondNumber:
          number | null;

        bets:
          Array<{
            playerId: string;

            choice:
              UlsanMarbleMiniGameHighLowChoice |
              null;

            amount: number;
          }>;

        settlements:
          UlsanMarbleMiniGameSettlementPayload[];
      }
    );

type UlsanMarbleMiniGameActionBasePayload = {
  actionId: string;

  miniGameId: string;

  turnNumber: number;
  turnSequence: number;
};

export type UlsanMarbleMiniGameActionDecidedPayload =
  UlsanMarbleMiniGameActionBasePayload &
    (
      | {
          action: "START";
          game:
            UlsanMarbleMiniGameSnapshotPayload;
          nextDeck:
            UlsanMarbleMiniGameDeckPayload;
        }

      | {
          action:
            "TIMING_STOP";
          playerId: string;
          distance: number;
          responseMs: number;
          game:
            UlsanMarbleMiniGameSnapshotPayload;
        }

      | {
          action:
            "TARGET_DICE";
          playerId: string;
          diceValues: [
            UlsanMarbleMiniGameDiceFace,
            UlsanMarbleMiniGameDiceFace,
          ];
          game:
            UlsanMarbleMiniGameSnapshotPayload;
        }

      | {
          action:
            "ODD_EVEN_BET";
          playerId: string;
          choice:
            UlsanMarbleMiniGameOddEvenChoice;
          amount: number;
          game:
            UlsanMarbleMiniGameSnapshotPayload;
        }

      | {
          action:
            "HIGH_LOW_BET";
          playerId: string;
          choice:
            UlsanMarbleMiniGameHighLowChoice;
          amount: number;
          game:
            UlsanMarbleMiniGameSnapshotPayload;
        }

      | {
          action: "PASS";
          playerId: string;
          game:
            UlsanMarbleMiniGameSnapshotPayload;
        }

      | {
          action: "CLOSE";
          playerId: string;
        }
    );    

export type UlsanMarbleInsurancePlanType =
  | "BASIC"
  | "COMPREHENSIVE";

export interface UlsanMarbleInsuranceContractPayload {
  propertyId: string;
  playerId: string;

  planType:
    UlsanMarbleInsurancePlanType;

  premiumPaid: number;
  coverageRate: number;

  startedTurn: number;
  expiresAfterTurn: number;
}

type UlsanMarbleInsuranceActionBasePayload = {
  actionId: string;

  playerId: string;
  visitId: string;

  turnNumber: number;
  turnSequence: number;
};

export type UlsanMarbleInsuranceActionDecidedPayload =
  | (
      UlsanMarbleInsuranceActionBasePayload & {
        action: "BUY";

        propertyId: string;

        planType:
          UlsanMarbleInsurancePlanType;

        premium: number;

        contract:
          UlsanMarbleInsuranceContractPayload;
      }
    )
  | (
      UlsanMarbleInsuranceActionBasePayload & {
        action: "CLOSE";
      }
    );

export type UlsanMarbleEconomicNewsSource =
  | "NEWSPAPER"
  | "RANDOM"
  | "DEV";

export interface UlsanMarbleEconomicNewsDeckPayload {
  drawPile: string[];
  discardPile: string[];
  cycle: number;
  lastRandomPublishedTurn: number | null;
}

type UlsanMarbleEconomicNewsBasePayload = {
  resolutionId: string;

  controllerPlayerId: string;

  turnNumber: number;
  turnSequence: number;

  additionallyDisabledPlayerIds: string[];
};

export type UlsanMarbleEconomicNewsDrawDecidedPayload =
  | (
      UlsanMarbleEconomicNewsBasePayload & {
        outcome: "DRAWN";

        source:
          UlsanMarbleEconomicNewsSource;

        playerId: string | null;
        articleId: string;

        nextDeck:
          UlsanMarbleEconomicNewsDeckPayload;
      }
    )
  | (
      UlsanMarbleEconomicNewsBasePayload & {
        outcome: "SKIP";
        source: "RANDOM";
      }
    );

export type UlsanMarbleEconomicNewsAppliedPayload =
  UlsanMarbleEconomicNewsBasePayload & {
    source:
      UlsanMarbleEconomicNewsSource;

    articleId: string;
    affectedPlayerId: string | null;
    activeFromTurn: number;
    instanceId: string;
    developmentRestrictionPropertyId:
      string | null;
    resultText: string;
  };

export interface UlsanMarbleEconomicNewsConfirmedPayload
  extends UlsanMarbleEconomicNewsBasePayload {
  source:
    UlsanMarbleEconomicNewsSource;
}

export type UlsanMarbleCityHallApplicationType =
  | "DEVELOPMENT_PERMIT"
  | "DEVELOPMENT_SUPPORT"
  | "PROPERTY_TAX_SUPPORT";

type UlsanMarbleCityHallActionBasePayload = {
  actionId: string;

  playerId: string;
  visitId: string;

  turnNumber: number;
  turnSequence: number;
};

export type UlsanMarbleCityHallActionDecidedPayload =
  UlsanMarbleCityHallActionBasePayload &
    (
      | {
          action: "START";

          projectId: string;
          instanceId: string;

          selectedTurn: number;
          activeFromTurn: number;
          expiresAfterTurn: number;

          targetIndustryId: string | null;
        }
      | {
          action: "APPLY";

          applicationType: UlsanMarbleCityHallApplicationType;
          propertyId: string;
        }
      | {
          action: "CLOSE";
        }
    );

export type UlsanMarbleDisasterType =
  | "TYPHOON"
  | "HEAVY_RAIN"
  | "EARTHQUAKE"
  | "WILDFIRE";

export interface UlsanMarbleDisasterPropertyDamagePayload {
  propertyId: string;
  propertyName: string;

  districtId:
    UlsanMarbleDistrictId;

  ownerPlayerId: string | null;

  stage:
    UlsanMarblePropertyDevelopmentStage | null;

  previousPriceIndex: number;
  nextPriceIndex: number;
  marketChangeRate: number;

  previousPrice: number;
  currentPrice: number;

  tollMultiplier: number;
  tollPenaltyUntilTurn: number;

  originalRepairCost: number;

  insurancePlanType:
    UlsanMarbleInsurancePlanType | null;

  insuranceCoverageRate: number;
  insuranceCoverage: number;

  finalRepairCost: number;
}

export interface UlsanMarbleDisasterPlayerAssessmentPayload {
  playerId: string;
  totalAmount: number;

  damages:
    UlsanMarbleDisasterPropertyDamagePayload[];
}

export interface UlsanMarbleDisasterEventPayload {
  id: string;

  turnNumber: number;

  type:
    UlsanMarbleDisasterType;

  name: string;
  description: string;

  affectedDistrictIds:
    UlsanMarbleDistrictId[];

  propertyDamages:
    UlsanMarbleDisasterPropertyDamagePayload[];

  playerAssessments:
    UlsanMarbleDisasterPlayerAssessmentPayload[];

  totalRepairCost: number;
}

export interface UlsanMarbleDisasterPenaltyPayload {
  propertyId: string;
  propertyName: string;

  disasterType:
    UlsanMarbleDisasterType;

  disasterName: string;

  tollMultiplier: number;
  expiresAfterTurn: number;
}

export type UlsanMarbleDisasterPenaltyMapPayload =
  Record<
    string,
    UlsanMarbleDisasterPenaltyPayload
  >;

type UlsanMarbleDisasterResolvedBasePayload = {
  turnNumber: number;
  turnSequence: number;

  additionallyDisabledPlayerIds:
    string[];
};

export type UlsanMarbleDisasterResolvedPayload =
  | (
      UlsanMarbleDisasterResolvedBasePayload & {
        mode: "SCHEDULED";
        outcome: "SKIP";
      }
    )
  | (
      UlsanMarbleDisasterResolvedBasePayload & {
        mode:
          | "SCHEDULED"
          | "DEV";

        outcome: "EVENT";

        event:
          UlsanMarbleDisasterEventPayload;

        nextMarket:
          UlsanMarblePropertyMarketMapPayload;

        penalties:
          UlsanMarbleDisasterPenaltyMapPayload;

        nextAuctionInventories:
          Record<
            string,
            UlsanMarbleAuctionItemInstancePayload[]
          >;
      }
    );

type UlsanMarbleDisasterActionBasePayload = {
  actionId: string;

  disasterId: string;

  playerId: string;

  turnNumber: number;
  turnSequence: number;
};

export type UlsanMarbleDisasterActionDecidedPayload =
  UlsanMarbleDisasterActionBasePayload &
    (
      | {
          action: "ACKNOWLEDGE";
        }

      | {
          action: "PAY";

          totalAmount: number;
        }

      | {
          action: "SELL_PROPERTY";

          propertyId: string;
          salePrice: number;
        }

      | {
          action: "SELL_STOCK";

          companyId: string;

          quantity: number;
          pricePerShare: number;

          holdingBefore: number;
        }

      | {
          action:
            "DECLARE_BANKRUPTCY";
        }
    );    

export type UlsanMarbleGameEventRequest =
  | {kind: "TOLL_PAID"; payload:UlsanMarbleTollPaidPayload;}
  | {kind: "GOLDEN_KEY_DRAWN"; payload: UlsanMarbleGoldenKeyDrawnPayload;}
  | {kind: "GOLDEN_KEY_APPLIED"; payload: UlsanMarbleGoldenKeyAppliedPayload;}
  | {kind: "GOLDEN_KEY_CONFIRMED"; payload: UlsanMarbleGoldenKeyConfirmedPayload;}
  | {kind: "PROPERTY_DEVELOPMENT_DECIDED"; payload:UlsanMarblePropertyDevelopmentDecidedPayload;}
  | {kind: "AIRPORT_TRAVEL_DECIDED"; payload:UlsanMarbleAirportTravelDecidedPayload;}    
  | {kind: "BANK_ACTION_DECIDED"; payload:UlsanMarbleBankActionDecidedPayload;} 
  | {kind: "LOTTERY_ACTION_DECIDED"; payload: UlsanMarbleLotteryActionDecidedPayload; }
  | {kind: "LOTTO_DRAW_RESOLVED"; payload: UlsanMarbleLottoDrawResolvedPayload;}
  | {kind: "LOTTO_DRAW_CONFIRMED"; payload: UlsanMarbleLottoDrawConfirmedPayload;}
  | {kind: "PORT_ACTION_DECIDED"; payload:  UlsanMarblePortActionDecidedPayload;}
  | {kind: "PORT_SETTLEMENT_RESOLVED"; payload: UlsanMarblePortSettlementResolvedPayload;}
  | {kind: "PORT_SETTLEMENT_CONFIRMED"; payload: UlsanMarblePortSettlementConfirmedPayload;}
  | {kind: "TAX_SETTLEMENT_STARTED"; payload: UlsanMarbleTaxSettlementStartedPayload; }
  | {kind: "TAX_ACTION_DECIDED"; payload: UlsanMarbleTaxActionDecidedPayload; }
  | {kind: "PROPERTY_MARKET_RESOLVED"; payload: UlsanMarblePropertyMarketResolvedPayload;}
  | {kind: "PROPERTY_MARKET_SETTLEMENT_CONFIRMED"; payload: UlsanMarblePropertyMarketSettlementConfirmedPayload;}  
  | {kind: "STOCK_MARKET_RESOLVED"; payload: UlsanMarbleStockMarketResolvedPayload;}
  | {kind: "STOCK_MARKET_SETTLEMENT_CONFIRMED"; payload: UlsanMarbleStockMarketSettlementConfirmedPayload;}  
  | {kind: "JAIL_ENTRY_CONFIRMED"; payload: UlsanMarbleJailEntryConfirmedPayload;}
  | {kind: "JAIL_TURN_ACTION_DECIDED"; payload: UlsanMarbleJailTurnActionDecidedPayload;}
  | {kind: "JAIL_FINE_ACTION_DECIDED"; payload: UlsanMarbleJailFineActionDecidedPayload;}  
  | {kind: "AUCTION_ACTION_DECIDED";  payload: UlsanMarbleAuctionActionDecidedPayload;}
  | {kind: "MINI_GAME_ACTION_DECIDED"; payload: UlsanMarbleMiniGameActionDecidedPayload;}
  | {kind: "INSURANCE_ACTION_DECIDED"; payload: UlsanMarbleInsuranceActionDecidedPayload;}
  | {kind: "CITY_HALL_ACTION_DECIDED"; payload: UlsanMarbleCityHallActionDecidedPayload;}  
  | {kind: "ECONOMIC_NEWS_DRAW_DECIDED"; payload: UlsanMarbleEconomicNewsDrawDecidedPayload; }
  | {kind: "ECONOMIC_NEWS_APPLIED"; payload: UlsanMarbleEconomicNewsAppliedPayload; }
  | {kind: "ECONOMIC_NEWS_CONFIRMED"; payload: UlsanMarbleEconomicNewsConfirmedPayload; }  
  | {kind: "DISASTER_RESOLVED"; payload: UlsanMarbleDisasterResolvedPayload;}  
  | {kind: "DISASTER_ACTION_DECIDED"; payload: UlsanMarbleDisasterActionDecidedPayload;}  

export type UlsanMarbleGameEvent =
  UlsanMarbleGameEventRequest & {
    eventId: number;
    playerId: string;
    turnSequence: number;
  };

export type UlsanMarbleGoldenKeyDeckPayload = {
  selectedCardIds: string[];
  drawPile: string[];
  discardPile: string[];
  cycle: number;
  lastDrawnCardId: string | null;
};

export type UlsanMarbleGoldenKeyDrawnPayload = {
  playerId: string;
  cardId: string;
  deck: UlsanMarbleGoldenKeyDeckPayload;
};

export type UlsanMarbleGoldenKeyMoneyOperation =
  | {
      kind: "DEPOSIT";
      playerId: string;
      amount: number;
    }
  | {
      kind: "WITHDRAW";
      playerId: string;
      amount: number;
    }
  | {
      kind: "TRANSFER";
      fromPlayerId: string;
      toPlayerId: string;
      amount: number;
    };

export type UlsanMarbleGoldenKeyPlayerPatch = {
  playerId: string;
  position?: number;
  jailEscapeCards?: number;
};

export type UlsanMarbleGoldenKeyAppliedPayload = {
  playerId: string;
  cardId: string;

  moneyOperations:
    UlsanMarbleGoldenKeyMoneyOperation[];

  playerPatches:
    UlsanMarbleGoldenKeyPlayerPatch[];

  propertyMarketTargetIds: string[];
  stockMarketTargetIds: string[];

  resultText: string;
  followUpPosition: number | null;
};

export type UlsanMarbleGoldenKeyConfirmedPayload = {
  playerId: string;
  cardId: string;
  turnSequence: number;
};

export type UlsanMarbleCommand =
  | {
      type: "ROLL_DICE";
    }
  | {
      type: "DEV_ROLL_DICE";
      values: [
        1 | 2 | 3 | 4 | 5 | 6,
        1 | 2 | 3 | 4 | 5 | 6,
      ];
    }
  | (
      {
        type: "PROPERTY_DECISION";
      } &
      UlsanMarblePropertyDecisionRequest
    )
  | {
      type: "STOCK_TRADE";
      action:
        UlsanMarbleStockTradeAction;
      companyId: string;
      quantity: number;
      pricePerShare: number;
    }
  | {
      type: "PUBLISH_GAME_EVENT";
      expectedTurnSequence: number;
      event:
        UlsanMarbleGameEventRequest;
    }
  | {
      type: "DEV_END_TURN";
    }
  | {
      type: "END_TURN";
    };


    