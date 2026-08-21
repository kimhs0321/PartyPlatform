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
} from "../../../../shared/ulsanMarbleProtocol";



interface UlsanMarbleGameEventHandlers {
  TOLL_PAID: (payload: UlsanMarbleTollPaidPayload,) => boolean;
  GOLDEN_KEY_DRAWN: (payload: UlsanMarbleGoldenKeyDrawnPayload,) => boolean;
  GOLDEN_KEY_APPLIED: (payload:UlsanMarbleGoldenKeyAppliedPayload,) => boolean;
  GOLDEN_KEY_CONFIRMED: (payload: UlsanMarbleGoldenKeyConfirmedPayload) => boolean;  
  PROPERTY_DEVELOPMENT_DECIDED: (payload:UlsanMarblePropertyDevelopmentDecidedPayload,) => boolean;
  AIRPORT_TRAVEL_DECIDED: (payload:UlsanMarbleAirportTravelDecidedPayload,) => boolean;
  BANK_ACTION_DECIDED: (payload:UlsanMarbleBankActionDecidedPayload,) => boolean;
  LOTTERY_ACTION_DECIDED: (payload:UlsanMarbleLotteryActionDecidedPayload,) => boolean;
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
  AUCTION_ACTION_DECIDED: (payload: UlsanMarbleAuctionActionDecidedPayload,) => boolean;
  MINI_GAME_ACTION_DECIDED: (payload: UlsanMarbleMiniGameActionDecidedPayload,) => boolean;
  INSURANCE_ACTION_DECIDED: (payload: UlsanMarbleInsuranceActionDecidedPayload,) => boolean;
  ECONOMIC_NEWS_DRAW_DECIDED: (payload: UlsanMarbleEconomicNewsDrawDecidedPayload) => boolean;
  ECONOMIC_NEWS_APPLIED: (payload: UlsanMarbleEconomicNewsAppliedPayload) => boolean;
  ECONOMIC_NEWS_CONFIRMED: (payload: UlsanMarbleEconomicNewsConfirmedPayload) => boolean;
  CITY_HALL_ACTION_DECIDED: (payload: UlsanMarbleCityHallActionDecidedPayload,) => boolean;
  DISASTER_RESOLVED: (payload: UlsanMarbleDisasterResolvedPayload,) => boolean;
  DISASTER_ACTION_DECIDED: (payload: UlsanMarbleDisasterActionDecidedPayload,) => boolean;

}

interface UseNetworkGameEventsOptions {
  events?: UlsanMarbleGameEvent[];

  turnSequence?: number;

  handlers:
    UlsanMarbleGameEventHandlers;
}

export function useNetworkGameEvents({
  events,
  turnSequence,
  handlers,
}: UseNetworkGameEventsOptions): () => void {
  const processedEventIdRef =
  useRef(0);

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
  const applyAuctionActionDecided = handlers.AUCTION_ACTION_DECIDED;
  const applyMiniGameActionDecided = handlers.MINI_GAME_ACTION_DECIDED;
  const applyInsuranceActionDecided = handlers.INSURANCE_ACTION_DECIDED;
  const applyEconomicNewsDrawDecided = handlers.ECONOMIC_NEWS_DRAW_DECIDED;
  const applyEconomicNewsApplied = handlers.ECONOMIC_NEWS_APPLIED;
  const applyEconomicNewsConfirmed = handlers.ECONOMIC_NEWS_CONFIRMED;
  const applyCityHallActionDecided = handlers.CITY_HALL_ACTION_DECIDED;
  const applyDisasterResolved =  handlers.DISASTER_RESOLVED;
  const applyDisasterActionDecided = handlers.DISASTER_ACTION_DECIDED;

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

    let applied = false;

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
      case "TOLL_PAID":applied = applyTollPaid(nextEvent.payload);break;
      case "GOLDEN_KEY_DRAWN": applied = applyGoldenKeyDrawn(nextEvent.payload);break;
      case "GOLDEN_KEY_APPLIED":applied = applyGoldenKeyApplied(nextEvent.payload);break;
      case "GOLDEN_KEY_CONFIRMED":applied = applyGoldenKeyConfirmed(nextEvent.payload); break;
      case "PROPERTY_DEVELOPMENT_DECIDED": applied =applyPropertyDevelopmentDecided(nextEvent.payload,);break;  
      case "AIRPORT_TRAVEL_DECIDED": applied = applyAirportTravelDecided(nextEvent.payload,);break;  
      case "BANK_ACTION_DECIDED": applied = applyBankActionDecided(nextEvent.payload,);break;
      case "LOTTERY_ACTION_DECIDED": applied = applyLotteryActionDecided(nextEvent.payload,);break;
      case "LOTTO_DRAW_RESOLVED":applied = applyLottoDrawResolved(nextEvent.payload,);break;
      case "LOTTO_DRAW_CONFIRMED":applied = applyLottoDrawConfirmed(nextEvent.payload,);break;
      case "PORT_ACTION_DECIDED":applied = applyPortActionDecided(nextEvent.payload,);break;
      case "PORT_SETTLEMENT_RESOLVED":applied = applyPortSettlementResolved(nextEvent.payload,);break;
      case "PORT_SETTLEMENT_CONFIRMED":applied = applyPortSettlementConfirmed(nextEvent.payload,);break;
      case "JAIL_ENTRY_CONFIRMED":applied = applyJailEntryConfirmed(nextEvent.payload,);break;
      case "JAIL_TURN_ACTION_DECIDED":applied = applyJailTurnActionDecided(nextEvent.payload,);break;
      case "JAIL_FINE_ACTION_DECIDED":applied = applyJailFineActionDecided( nextEvent.payload, );break;
      case "STOCK_MARKET_RESOLVED":applied = applyStockMarketResolved(nextEvent.payload,);break;
      case "STOCK_MARKET_SETTLEMENT_CONFIRMED":applied = applyStockMarketSettlementConfirmed(nextEvent.payload,);break;
      case "TAX_SETTLEMENT_STARTED":applied = applyTaxSettlementStarted(nextEvent.payload,);break;
      case "TAX_ACTION_DECIDED":applied = applyTaxActionDecided(nextEvent.payload,); break;
      case "PROPERTY_MARKET_RESOLVED": applied = applyPropertyMarketResolved(nextEvent.payload,);break;
      case "PROPERTY_MARKET_SETTLEMENT_CONFIRMED": applied = applyPropertyMarketSettlementConfirmed(nextEvent.payload,);break;
      case "AUCTION_ACTION_DECIDED":applied = applyAuctionActionDecided(nextEvent.payload,);break;
      case "MINI_GAME_ACTION_DECIDED": applied = applyMiniGameActionDecided(nextEvent.payload,);break;
      case "INSURANCE_ACTION_DECIDED":applied = applyInsuranceActionDecided(nextEvent.payload,);break;
      case "ECONOMIC_NEWS_DRAW_DECIDED":applied = applyEconomicNewsDrawDecided(nextEvent.payload);break;
      case "ECONOMIC_NEWS_APPLIED":applied = applyEconomicNewsApplied(nextEvent.payload);break;
      case "ECONOMIC_NEWS_CONFIRMED":applied = applyEconomicNewsConfirmed(nextEvent.payload);break;
      case "CITY_HALL_ACTION_DECIDED":applied = applyCityHallActionDecided(nextEvent.payload);break;
      case "DISASTER_RESOLVED":applied = applyDisasterResolved(nextEvent.payload,);break;
      case "DISASTER_ACTION_DECIDED": applied = applyDisasterActionDecided(nextEvent.payload,);break;

      default:
        return;
    }

    if (!applied) {
      console.warn(
        "[GAME EVENT] 적용 실패 - 큐 정지",
        "kind =", nextEvent.kind,
        "eventId =", nextEvent.eventId,
        "eventSeq =", nextEvent.turnSequence,
        "currentSeq =", turnSequence,
        "processed =", processedEventIdRef.current,
        "payload =", JSON.stringify(nextEvent.payload),
      );
      return;
    }
      console.log(
        "[GAME EVENT] 적용 완료",
        "kind =", nextEvent.kind,
        "eventId =", nextEvent.eventId,
        "eventSeq =", nextEvent.turnSequence,
      );

    processedEventIdRef.current =
      nextEvent.eventId;

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
  applyAuctionActionDecided,
  applyMiniGameActionDecided,
  applyInsuranceActionDecided,
  applyCityHallActionDecided,
  applyEconomicNewsDrawDecided,
  applyEconomicNewsApplied,
  applyEconomicNewsConfirmed,
  applyDisasterResolved,
  applyDisasterActionDecided,
  events,
  processedVersion,
  turnSequence,
]);
  return useCallback(() => {
    processedEventIdRef.current = 0;
    setProcessedVersion(
      (current) => current + 1,
    );
  }, []);
}