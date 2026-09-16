import {useCallback,useEffect,useRef,useState,} from "react";

import type {
  UlsanMarbleGameEvent,
  UlsanMarbleGoldenKeyAppliedPayload,
  UlsanMarbleGoldenKeyDrawnPayload,
  UlsanMarbleGoldenKeyConfirmedPayload,
  UlsanMarblePropertyDevelopmentDecidedPayload,
  UlsanMarbleTollPaidPayload,
  UlsanMarbleAirportTravelDecidedPayload,
  UlsanMarbleBankActionDecidedPayload,
  UlsanMarbleLotteryActionDecidedPayload,
  UlsanMarbleLottoDrawConfirmedPayload,
  UlsanMarbleLottoDrawResolvedPayload,
  UlsanMarblePortActionDecidedPayload,
  UlsanMarblePortSettlementResolvedPayload,
  UlsanMarblePortSettlementConfirmedPayload,
  UlsanMarbleJailEntryConfirmedPayload,
  UlsanMarbleJailTurnActionDecidedPayload,
  UlsanMarbleStockMarketSettlementConfirmedPayload,
  UlsanMarbleStockMarketResolvedPayload,
  UlsanMarbleMacroEconomyResolvedPayload,
  UlsanMarbleCompanyDividendEventResolvedPayload,
  UlsanMarbleAuctionActionDecidedPayload,
  UlsanMarbleMiniGameActionDecidedPayload,
  UlsanMarbleInsuranceActionDecidedPayload,
  UlsanMarblePropertyMarketResolvedPayload,
  UlsanMarblePropertyMarketSettlementConfirmedPayload,
  UlsanMarbleTaxSettlementStartedPayload,
  UlsanMarbleTaxActionDecidedPayload,
  UlsanMarbleJailFineActionDecidedPayload,
  UlsanMarbleEconomicNewsAppliedPayload,
  UlsanMarbleEconomicNewsConfirmedPayload,
  UlsanMarbleEconomicNewsDrawDecidedPayload,
  UlsanMarbleCityHallActionDecidedPayload,
  UlsanMarbleDisasterResolvedPayload,
  UlsanMarbleDisasterActionDecidedPayload,
  UlsanMarbleFestivalTriggerResolvedPayload,
  UlsanMarbleFestivalAnnouncementConfirmedPayload,
  UlsanMarbleTouristTurnResolvedPayload,
  UlsanMarbleTouristTurnConfirmedPayload,
  UlsanMarbleFestivalDevEndedPayload,
  UlsanMarbleMayorElectionStartedPayload,
  UlsanMarbleMayorElectionVoteCastPayload,
  UlsanMarbleMayorElectionResultResolvedPayload,
  UlsanMarbleMayorElectionResultConfirmedPayload,
} from "../../../../shared/ulsanMarbleProtocol";

export type NetworkGameEventApplyResult =
  | "APPLIED"
  | "WAIT"
  | "ALREADY_APPLIED"
  | "INVALID";

interface UlsanMarbleGameEventHandlers {
  TOLL_PAID: (payload: UlsanMarbleTollPaidPayload,) => NetworkGameEventApplyResult;
  GOLDEN_KEY_DRAWN: (payload: UlsanMarbleGoldenKeyDrawnPayload,) => boolean;
  GOLDEN_KEY_APPLIED: (payload:UlsanMarbleGoldenKeyAppliedPayload,) => boolean;
  GOLDEN_KEY_CONFIRMED: (payload: UlsanMarbleGoldenKeyConfirmedPayload) => boolean;  
  PROPERTY_DEVELOPMENT_DECIDED: (payload:UlsanMarblePropertyDevelopmentDecidedPayload,) => boolean;
  AIRPORT_TRAVEL_DECIDED: (payload:UlsanMarbleAirportTravelDecidedPayload,) => boolean;
  BANK_ACTION_DECIDED: (payload: UlsanMarbleBankActionDecidedPayload,) => NetworkGameEventApplyResult;
  LOTTERY_ACTION_DECIDED: (payload:UlsanMarbleLotteryActionDecidedPayload,) => NetworkGameEventApplyResult;
  LOTTO_DRAW_RESOLVED: (payload:UlsanMarbleLottoDrawResolvedPayload,) => boolean;
  LOTTO_DRAW_CONFIRMED: (payload:UlsanMarbleLottoDrawConfirmedPayload,) => boolean;
  PORT_ACTION_DECIDED: (payload:UlsanMarblePortActionDecidedPayload,) => boolean;
  PORT_SETTLEMENT_RESOLVED: (payload: UlsanMarblePortSettlementResolvedPayload) => boolean;
  PORT_SETTLEMENT_CONFIRMED: (payload: UlsanMarblePortSettlementConfirmedPayload,) => boolean;
  JAIL_ENTRY_CONFIRMED: (payload: UlsanMarbleJailEntryConfirmedPayload,) => boolean;
  JAIL_TURN_ACTION_DECIDED: (payload: UlsanMarbleJailTurnActionDecidedPayload,) => boolean;
  JAIL_FINE_ACTION_DECIDED: (payload: UlsanMarbleJailFineActionDecidedPayload,) => boolean;
  TAX_SETTLEMENT_STARTED: (payload: UlsanMarbleTaxSettlementStartedPayload,) => boolean;
  TAX_ACTION_DECIDED: (payload: UlsanMarbleTaxActionDecidedPayload,) => boolean;
  PROPERTY_MARKET_RESOLVED: (payload: UlsanMarblePropertyMarketResolvedPayload,) => boolean;
  PROPERTY_MARKET_SETTLEMENT_CONFIRMED: (payload: UlsanMarblePropertyMarketSettlementConfirmedPayload,) => boolean;
  STOCK_MARKET_RESOLVED: (payload: UlsanMarbleStockMarketResolvedPayload,) => boolean;
  STOCK_MARKET_SETTLEMENT_CONFIRMED: (payload: UlsanMarbleStockMarketSettlementConfirmedPayload,) => boolean;
  MACRO_ECONOMY_RESOLVED: (payload: UlsanMarbleMacroEconomyResolvedPayload,) => boolean;
  COMPANY_DIVIDEND_EVENT_RESOLVED: (payload:UlsanMarbleCompanyDividendEventResolvedPayload,) => boolean;
  AUCTION_ACTION_DECIDED: (payload: UlsanMarbleAuctionActionDecidedPayload,) => NetworkGameEventApplyResult;
  MINI_GAME_ACTION_DECIDED: (payload: UlsanMarbleMiniGameActionDecidedPayload,) => NetworkGameEventApplyResult;
  INSURANCE_ACTION_DECIDED: (payload: UlsanMarbleInsuranceActionDecidedPayload,) => boolean;
  ECONOMIC_NEWS_DRAW_DECIDED: (payload: UlsanMarbleEconomicNewsDrawDecidedPayload) => boolean;
  ECONOMIC_NEWS_APPLIED: (payload: UlsanMarbleEconomicNewsAppliedPayload) => boolean;
  ECONOMIC_NEWS_CONFIRMED: (payload: UlsanMarbleEconomicNewsConfirmedPayload) => NetworkGameEventApplyResult;
  CITY_HALL_ACTION_DECIDED: (payload: UlsanMarbleCityHallActionDecidedPayload,) => NetworkGameEventApplyResult;
  DISASTER_RESOLVED: (payload: UlsanMarbleDisasterResolvedPayload,) => boolean;
  DISASTER_ACTION_DECIDED: (payload: UlsanMarbleDisasterActionDecidedPayload,) => boolean;
  FESTIVAL_TRIGGER_RESOLVED: (payload: UlsanMarbleFestivalTriggerResolvedPayload,) => NetworkGameEventApplyResult;
  FESTIVAL_ANNOUNCEMENT_CONFIRMED: (payload: UlsanMarbleFestivalAnnouncementConfirmedPayload,) => NetworkGameEventApplyResult;
  TOURIST_TURN_RESOLVED: (payload: UlsanMarbleTouristTurnResolvedPayload,) => NetworkGameEventApplyResult;
  TOURIST_TURN_CONFIRMED: (payload: UlsanMarbleTouristTurnConfirmedPayload,) => NetworkGameEventApplyResult;
  FESTIVAL_DEV_ENDED: (payload: UlsanMarbleFestivalDevEndedPayload,) => NetworkGameEventApplyResult;
  MAYOR_ELECTION_STARTED: (payload: UlsanMarbleMayorElectionStartedPayload,) => NetworkGameEventApplyResult;
  MAYOR_ELECTION_VOTE_CAST: (payload: UlsanMarbleMayorElectionVoteCastPayload,) => NetworkGameEventApplyResult;
  MAYOR_ELECTION_RESULT_RESOLVED: (payload: UlsanMarbleMayorElectionResultResolvedPayload,) => NetworkGameEventApplyResult;
  MAYOR_ELECTION_RESULT_CONFIRMED: (payload: UlsanMarbleMayorElectionResultConfirmedPayload,) => NetworkGameEventApplyResult;
}

interface NetworkGameEventCursorRef {
  current: number;
}

interface UseNetworkGameEventsOptions {
  events?: UlsanMarbleGameEvent[];

  turnSequence?: number;

  processedEventCursorRef?:
    NetworkGameEventCursorRef;

  onEventApplied?: (
    eventId: number,
    turnSequence: number,
  ) => void;

  handlers:
    UlsanMarbleGameEventHandlers;
}

export function useNetworkGameEvents({
  events,
  turnSequence,
  processedEventCursorRef,
  handlers,
  onEventApplied,
}: UseNetworkGameEventsOptions): () => void {
  const fallbackProcessedEventIdRef =
    useRef(0);

  const processedEventIdRef =
    processedEventCursorRef ??
    fallbackProcessedEventIdRef;

  const [
    processedVersion,
    setProcessedVersion,
  ] = useState(0);

  const applyTollPaid =handlers.TOLL_PAID;
  const applyGoldenKeyDrawn = handlers.GOLDEN_KEY_DRAWN;
  const applyGoldenKeyApplied = handlers.GOLDEN_KEY_APPLIED;
  const applyGoldenKeyConfirmed = handlers.GOLDEN_KEY_CONFIRMED;
  const applyPropertyDevelopmentDecided = handlers.PROPERTY_DEVELOPMENT_DECIDED;
  const applyAirportTravelDecided = handlers.AIRPORT_TRAVEL_DECIDED;
  const applyBankActionDecided = handlers.BANK_ACTION_DECIDED;
  const applyLotteryActionDecided = handlers.LOTTERY_ACTION_DECIDED;
  const applyLottoDrawResolved = handlers.LOTTO_DRAW_RESOLVED;
  const applyLottoDrawConfirmed = handlers.LOTTO_DRAW_CONFIRMED;
  const applyPortActionDecided = handlers.PORT_ACTION_DECIDED;
  const applyPortSettlementResolved = handlers.PORT_SETTLEMENT_RESOLVED;
  const applyPortSettlementConfirmed = handlers.PORT_SETTLEMENT_CONFIRMED;
  const applyJailEntryConfirmed = handlers.JAIL_ENTRY_CONFIRMED;
  const applyJailTurnActionDecided =handlers.JAIL_TURN_ACTION_DECIDED;
  const applyJailFineActionDecided = handlers.JAIL_FINE_ACTION_DECIDED;
  const applyTaxSettlementStarted = handlers.TAX_SETTLEMENT_STARTED;
  const applyTaxActionDecided = handlers.TAX_ACTION_DECIDED;
  const applyPropertyMarketResolved = handlers.PROPERTY_MARKET_RESOLVED;
  const applyPropertyMarketSettlementConfirmed = handlers.PROPERTY_MARKET_SETTLEMENT_CONFIRMED;
  const applyStockMarketResolved = handlers.STOCK_MARKET_RESOLVED;
  const applyStockMarketSettlementConfirmed = handlers.STOCK_MARKET_SETTLEMENT_CONFIRMED;
  const applyMacroEconomyResolved = handlers.MACRO_ECONOMY_RESOLVED;
  const applyCompanyDividendEventResolved = handlers.COMPANY_DIVIDEND_EVENT_RESOLVED;
  const applyAuctionActionDecided = handlers.AUCTION_ACTION_DECIDED;
  const applyMiniGameActionDecided = handlers.MINI_GAME_ACTION_DECIDED;
  const applyInsuranceActionDecided = handlers.INSURANCE_ACTION_DECIDED;
  const applyEconomicNewsDrawDecided = handlers.ECONOMIC_NEWS_DRAW_DECIDED;
  const applyEconomicNewsApplied = handlers.ECONOMIC_NEWS_APPLIED;
  const applyEconomicNewsConfirmed = handlers.ECONOMIC_NEWS_CONFIRMED;
  const applyCityHallActionDecided = handlers.CITY_HALL_ACTION_DECIDED;
  const applyDisasterResolved =  handlers.DISASTER_RESOLVED;
  const applyDisasterActionDecided = handlers.DISASTER_ACTION_DECIDED;
  const applyFestivalTriggerResolved = handlers.FESTIVAL_TRIGGER_RESOLVED;
  const applyFestivalAnnouncementConfirmed = handlers.FESTIVAL_ANNOUNCEMENT_CONFIRMED;
  const applyTouristTurnResolved = handlers.TOURIST_TURN_RESOLVED;
  const applyTouristTurnConfirmed = handlers.TOURIST_TURN_CONFIRMED;
  const applyFestivalDevEnded = handlers.FESTIVAL_DEV_ENDED;
  const applyMayorElectionStarted = handlers.MAYOR_ELECTION_STARTED;
  const applyMayorElectionVoteCast = handlers.MAYOR_ELECTION_VOTE_CAST;
  const applyMayorElectionResultResolved = handlers.MAYOR_ELECTION_RESULT_RESOLVED;
  const applyMayorElectionResultConfirmed = handlers.MAYOR_ELECTION_RESULT_CONFIRMED;

  useEffect(() => {
    if (
      !events ||
      events.length === 0 ||
      turnSequence === undefined
    ) {
      return;
    }

    const nextEvent =
      events
        .filter(
          (event) =>
            event.eventId >
              processedEventIdRef.current &&
            event.turnSequence ===
              turnSequence,
        )
        .sort(
          (first, second) =>
            first.eventId -
            second.eventId,
        )[0];

    if (!nextEvent) {
      return;
    }

    let result:
      | boolean
      | NetworkGameEventApplyResult =
      false;

    console.log(
      "[GAME EVENT] 처리 시도",
      "kind =", nextEvent.kind,
      "eventId =", nextEvent.eventId,
      "eventSeq =", nextEvent.turnSequence,
      "currentSeq =", turnSequence,
      "processed =", processedEventIdRef.current,
      "payload =", JSON.stringify(nextEvent.payload),
    );

    switch (nextEvent.kind) {
      case "TOLL_PAID":result = applyTollPaid(nextEvent.payload);break;
      case "GOLDEN_KEY_DRAWN": result = applyGoldenKeyDrawn(nextEvent.payload);break;
      case "GOLDEN_KEY_APPLIED":result = applyGoldenKeyApplied(nextEvent.payload);break;
      case "GOLDEN_KEY_CONFIRMED":result = applyGoldenKeyConfirmed(nextEvent.payload); break;
      case "PROPERTY_DEVELOPMENT_DECIDED": result = applyPropertyDevelopmentDecided(nextEvent.payload,);break;  
      case "AIRPORT_TRAVEL_DECIDED": result = applyAirportTravelDecided(nextEvent.payload,);break;  
      case "BANK_ACTION_DECIDED": result = applyBankActionDecided(nextEvent.payload,);break;
      case "LOTTERY_ACTION_DECIDED": result = applyLotteryActionDecided(nextEvent.payload,);break;
      case "LOTTO_DRAW_RESOLVED":result = applyLottoDrawResolved(nextEvent.payload,);break;
      case "LOTTO_DRAW_CONFIRMED":result = applyLottoDrawConfirmed(nextEvent.payload,);break;
      case "PORT_ACTION_DECIDED":result = applyPortActionDecided(nextEvent.payload,);break;
      case "PORT_SETTLEMENT_RESOLVED":result = applyPortSettlementResolved(nextEvent.payload,);break;
      case "PORT_SETTLEMENT_CONFIRMED":result = applyPortSettlementConfirmed(nextEvent.payload,);break;
      case "JAIL_ENTRY_CONFIRMED":result = applyJailEntryConfirmed(nextEvent.payload,);break;
      case "JAIL_TURN_ACTION_DECIDED":result = applyJailTurnActionDecided(nextEvent.payload,);break;
      case "JAIL_FINE_ACTION_DECIDED":result = applyJailFineActionDecided( nextEvent.payload, );break;
      case "STOCK_MARKET_RESOLVED":result = applyStockMarketResolved(nextEvent.payload,);break;
      case "STOCK_MARKET_SETTLEMENT_CONFIRMED":result = applyStockMarketSettlementConfirmed(nextEvent.payload,);break;
      case "MACRO_ECONOMY_RESOLVED":result = applyMacroEconomyResolved(nextEvent.payload,); break;
      case "TAX_SETTLEMENT_STARTED":result = applyTaxSettlementStarted(nextEvent.payload,);break;
      case "COMPANY_DIVIDEND_EVENT_RESOLVED":result = applyCompanyDividendEventResolved(nextEvent.payload,); break;
      case "TAX_ACTION_DECIDED":result = applyTaxActionDecided(nextEvent.payload,); break;
      case "PROPERTY_MARKET_RESOLVED": result = applyPropertyMarketResolved(nextEvent.payload,);break;
      case "PROPERTY_MARKET_SETTLEMENT_CONFIRMED": result = applyPropertyMarketSettlementConfirmed(nextEvent.payload,);break;
      case "AUCTION_ACTION_DECIDED":result = applyAuctionActionDecided(nextEvent.payload,);break;
      case "MINI_GAME_ACTION_DECIDED": result = applyMiniGameActionDecided(nextEvent.payload,);break;
      case "INSURANCE_ACTION_DECIDED":result = applyInsuranceActionDecided(nextEvent.payload,);break;
      case "ECONOMIC_NEWS_DRAW_DECIDED":result = applyEconomicNewsDrawDecided(nextEvent.payload);break;
      case "ECONOMIC_NEWS_APPLIED":result = applyEconomicNewsApplied(nextEvent.payload);break;
      case "ECONOMIC_NEWS_CONFIRMED":result = applyEconomicNewsConfirmed(nextEvent.payload);break;
      case "CITY_HALL_ACTION_DECIDED":result = applyCityHallActionDecided(nextEvent.payload);break;
      case "DISASTER_RESOLVED":result = applyDisasterResolved(nextEvent.payload,);break;
      case "DISASTER_ACTION_DECIDED": result = applyDisasterActionDecided(nextEvent.payload,);break;
      case "FESTIVAL_TRIGGER_RESOLVED": result = applyFestivalTriggerResolved(nextEvent.payload,);break;
      case "FESTIVAL_ANNOUNCEMENT_CONFIRMED": result = applyFestivalAnnouncementConfirmed(nextEvent.payload,);break;
      case "TOURIST_TURN_RESOLVED": result = applyTouristTurnResolved(nextEvent.payload,);break;
      case "TOURIST_TURN_CONFIRMED": result = applyTouristTurnConfirmed(nextEvent.payload,);break;
      case "FESTIVAL_DEV_ENDED": result = applyFestivalDevEnded(nextEvent.payload,);break;
      case "MAYOR_ELECTION_STARTED": result = applyMayorElectionStarted(nextEvent.payload,);break;
      case "MAYOR_ELECTION_VOTE_CAST": result = applyMayorElectionVoteCast(nextEvent.payload,);break;
      case "MAYOR_ELECTION_RESULT_RESOLVED": result = applyMayorElectionResultResolved(nextEvent.payload,);break;
      case "MAYOR_ELECTION_RESULT_CONFIRMED": result = applyMayorElectionResultConfirmed(nextEvent.payload,);break;

      default:
        return;
    }

    const applyResult:
      NetworkGameEventApplyResult =
        typeof result === "boolean"
          ? result
            ? "APPLIED"
            : "INVALID"
          : result;

    if (applyResult === "WAIT") {
      console.log(
        "[GAME EVENT] 적용 대기",
        "kind =", nextEvent.kind,
        "eventId =", nextEvent.eventId,
        "eventSeq =", nextEvent.turnSequence,
        "currentSeq =", turnSequence,
        "processed =", processedEventIdRef.current,
      );

      return;
    }

    if (applyResult === "INVALID") {
      console.warn(
        "[GAME EVENT] 잘못된 이벤트 - 큐 정지",
        "kind =", nextEvent.kind,
        "eventId =", nextEvent.eventId,
        "eventSeq =", nextEvent.turnSequence,
        "currentSeq =", turnSequence,
        "processed =", processedEventIdRef.current,
        "payload =", JSON.stringify(
          nextEvent.payload,
        ),
      );

      return;
    }

  if (
    applyResult ===
    "ALREADY_APPLIED"
  ) {
    console.log(
      "[GAME EVENT] 이미 적용됨",
      "kind =", nextEvent.kind,
      "eventId =", nextEvent.eventId,
      "eventSeq =", nextEvent.turnSequence,
    );
  } else {
    console.log(
      "[GAME EVENT] 적용 완료",
      "kind =", nextEvent.kind,
      "eventId =", nextEvent.eventId,
      "eventSeq =", nextEvent.turnSequence,
    );
  } // ← 이게 빠져 있었음

  processedEventIdRef.current =
    nextEvent.eventId;

  onEventApplied?.(
    nextEvent.eventId,
    nextEvent.turnSequence,
  );

  console.log(
    "[GAME EVENT ACK SEND]",
    "eventId =", nextEvent.eventId,
    "eventSeq =", nextEvent.turnSequence,
  );

  setProcessedVersion(
    (current) => current + 1,
  );

  },[
  applyTollPaid,
  applyGoldenKeyDrawn,
  applyGoldenKeyApplied,
  applyGoldenKeyConfirmed,
  applyPropertyDevelopmentDecided,
  applyAirportTravelDecided,
  applyBankActionDecided,
  applyLotteryActionDecided,
  applyLottoDrawResolved,
  applyLottoDrawConfirmed,
  applyPortActionDecided,
  applyPortSettlementResolved,
  applyPortSettlementConfirmed,
  applyJailEntryConfirmed,
  applyJailTurnActionDecided,
  applyJailFineActionDecided,
  applyTaxSettlementStarted,
  applyTaxActionDecided,
  applyPropertyMarketResolved,
  applyPropertyMarketSettlementConfirmed,
  applyStockMarketResolved,
  applyStockMarketSettlementConfirmed,
  applyMacroEconomyResolved,
  applyCompanyDividendEventResolved,
  applyAuctionActionDecided,
  applyMiniGameActionDecided,
  applyInsuranceActionDecided,
  applyCityHallActionDecided,
  applyEconomicNewsDrawDecided,
  applyEconomicNewsApplied,
  applyEconomicNewsConfirmed,
  applyDisasterResolved,
  applyDisasterActionDecided,
  applyFestivalTriggerResolved,
  applyFestivalAnnouncementConfirmed,
  applyTouristTurnResolved,
  applyTouristTurnConfirmed,
  applyFestivalDevEnded,
  applyMayorElectionStarted,
  applyMayorElectionVoteCast,
  applyMayorElectionResultResolved,
  applyMayorElectionResultConfirmed,
  onEventApplied,
  events,
  processedVersion,
  turnSequence,
]);
  return useCallback(() => {
    processedEventIdRef.current = 0;

    setProcessedVersion(
      (current) => current + 1,
    );
  }, [processedEventIdRef]);
}