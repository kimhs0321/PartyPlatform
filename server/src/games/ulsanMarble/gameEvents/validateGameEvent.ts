import type {UlsanMarbleGameEventRequest,} from "../../../../../shared/ulsanMarbleProtocol";
import type {ClientUlsanMarbleGameState,} from "../types/ulsanMarbleGame";
import {validateTollPaidEvent,} from "./validateTollPaidEvent";
import {validateGoldenKeyDrawnEvent,} from "./validateGoldenKeyDrawnEvent";
import {validateGoldenKeyAppliedEvent,} from "./validateGoldenKeyAppliedEvent";
import {validatePropertyDevelopmentDecidedEvent,} from "./validatePropertyDevelopmentDecidedEvent";
import {validateAirportTravelDecidedEvent,} from "./validateAirportTravelDecidedEvent";
import {validateBankActionDecidedEvent,} from "./validateBankActionDecidedEvent";
import {validateLotteryActionDecidedEvent,} from "./validateLotteryActionDecidedEvent";
import {validatePortActionDecidedEvent,} from "./validatePortActionDecidedEvent";
import {validatePortSettlementConfirmedEvent,validatePortSettlementResolvedEvent,} from "./validatePortSettlementEvent";
import {validateJailEntryConfirmedEvent,} from "./validateJailEntryConfirmedEvent";
import {validateJailTurnActionDecidedEvent,} from "./validateJailTurnActionEvent";
import {validateStockMarketResolvedEvent,validateStockMarketSettlementConfirmedEvent,} from "./validateStockMarketEvent";
import {validateAuctionActionDecidedEvent,} from "./validateAuctionEvent";
import {validateMiniGameActionDecidedEvent,} from "./validateMiniGameEvent";
import {validateInsuranceActionDecidedEvent,} from "./validateInsuranceEvent";
import {validatePropertyMarketResolvedEvent,validatePropertyMarketSettlementConfirmedEvent,} from "./validatePropertyMarketEvent";
import { validateTaxActionDecidedEvent, validateTaxSettlementStartedEvent,} from "./validateTaxEvent";
import {validateJailFineActionDecidedEvent,} from "./validateJailFineActionEvent";
import {validateLottoDrawConfirmedEvent,validateLottoDrawResolvedEvent,} from "./validateLottoDrawEvent";
import {validateEconomicNewsAppliedEvent,validateEconomicNewsConfirmedEvent,validateEconomicNewsDrawDecidedEvent,} from "./validateEconomicNewsEvent";
import {validateGoldenKeyConfirmedEvent} from "./validateGoldenKeyConfirmedEvent";
import {validateCityHallActionDecidedEvent,} from "./validateCityHallEvent";
import {validateDisasterResolvedEvent,validateDisasterActionDecidedEvent,} from "./validateDisasterEvent";
import {validateMacroEconomyResolvedEvent,} from "./validateMacroEconomyEvent";
import {
  validateFestivalAnnouncementConfirmedEvent,
  validateFestivalDevEndedEvent,
  validateFestivalTriggerResolvedEvent,
  validateTouristTurnConfirmedEvent,
  validateTouristTurnResolvedEvent,
} from "./validateFestivalEvent";
import {
  validateMayorElectionResultConfirmedEvent,
  validateMayorElectionResultResolvedEvent,
  validateMayorElectionStartedEvent,
  validateMayorElectionVoteCastEvent,
} from "./validateMayorElectionEvent";
import {validateCompanyDividendEventResolvedEvent,} from "./validateCompanyDividendEvent";

export function validateUlsanMarbleGameEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  request: UlsanMarbleGameEventRequest,
): void {
  const rawRequest = request as {
    kind?: unknown;
    payload?: unknown;
  };

  switch (request.kind) {
      case "TOLL_PAID":
        validateTollPaidEvent(game, playerId, request.payload,);
        return;

      case "GOLDEN_KEY_DRAWN":
        validateGoldenKeyDrawnEvent(game, playerId, request.payload,);
        return;

      case "GOLDEN_KEY_APPLIED":
        validateGoldenKeyAppliedEvent(playerId, request.payload, );
        return;

      case "GOLDEN_KEY_CONFIRMED":
        validateGoldenKeyConfirmedEvent(game, playerId, request.payload,);
        return;  
        
      case "PROPERTY_DEVELOPMENT_DECIDED":
        validatePropertyDevelopmentDecidedEvent(playerId, request.payload,);
        return;  

      case "AIRPORT_TRAVEL_DECIDED":
        validateAirportTravelDecidedEvent(game, playerId, request.payload,);
        return;   
       
      case "BANK_ACTION_DECIDED":
        validateBankActionDecidedEvent(game, playerId, request.payload,);
        return;  

      case "LOTTERY_ACTION_DECIDED":
        validateLotteryActionDecidedEvent(game, playerId, request.payload,);
        return;  

      case "LOTTO_DRAW_RESOLVED":
        validateLottoDrawResolvedEvent(game, playerId, request.payload);
        return;

      case "LOTTO_DRAW_CONFIRMED":
        validateLottoDrawConfirmedEvent(game, playerId, request.payload);
        return;  

      case "PORT_ACTION_DECIDED":
        validatePortActionDecidedEvent(game, playerId, request.payload,);
        return;  

      case "PORT_SETTLEMENT_RESOLVED":
        validatePortSettlementResolvedEvent(game, playerId, request.payload,);
        return;

      case "PORT_SETTLEMENT_CONFIRMED":
        validatePortSettlementConfirmedEvent(game, playerId, request.payload,);
        return;  

      case "JAIL_ENTRY_CONFIRMED":
        validateJailEntryConfirmedEvent(game, playerId, request.payload,);
        return;  

      case "JAIL_TURN_ACTION_DECIDED":
        validateJailTurnActionDecidedEvent(game, playerId, request.payload,);
        return;

      case "JAIL_FINE_ACTION_DECIDED":
        validateJailFineActionDecidedEvent(game, playerId, request.payload,);
        return;  

      case "TAX_SETTLEMENT_STARTED":
        validateTaxSettlementStartedEvent( game, playerId, request.payload,);
        return;

      case "TAX_ACTION_DECIDED":
        validateTaxActionDecidedEvent(game, playerId, request.payload,);
        return;

      case "PROPERTY_MARKET_RESOLVED":
        validatePropertyMarketResolvedEvent(game, playerId, request.payload,);
        return;

      case "PROPERTY_MARKET_SETTLEMENT_CONFIRMED":
        validatePropertyMarketSettlementConfirmedEvent(game, playerId, request.payload,);
        return;  

      case "STOCK_MARKET_RESOLVED":
        validateStockMarketResolvedEvent(game, playerId, request.payload,);
        return;      

      case "COMPANY_DIVIDEND_EVENT_RESOLVED":
        validateCompanyDividendEventResolvedEvent(game, playerId, request.payload,);
        return;  

      case "MACRO_ECONOMY_RESOLVED":
        validateMacroEconomyResolvedEvent(game,playerId,request.payload,);
        return;

      case "STOCK_MARKET_SETTLEMENT_CONFIRMED":
        validateStockMarketSettlementConfirmedEvent(game, playerId, request.payload,);
        return;  

      case "AUCTION_ACTION_DECIDED":
        validateAuctionActionDecidedEvent(game, playerId, request.payload,);
        return;    

      case "MINI_GAME_ACTION_DECIDED":
        validateMiniGameActionDecidedEvent(game, playerId,request.payload,);
        return;  

      case "INSURANCE_ACTION_DECIDED":
        validateInsuranceActionDecidedEvent(game, playerId, request.payload,);
        return;  

      case "ECONOMIC_NEWS_DRAW_DECIDED":
        validateEconomicNewsDrawDecidedEvent(game, playerId, request.payload);
        return;

      case "ECONOMIC_NEWS_APPLIED":
        validateEconomicNewsAppliedEvent(game, playerId, request.payload);
        return;

      case "ECONOMIC_NEWS_CONFIRMED":
        validateEconomicNewsConfirmedEvent(game, playerId, request.payload);
        return;  

      case "CITY_HALL_ACTION_DECIDED":
        validateCityHallActionDecidedEvent(game, playerId, request.payload,);
        return;  

      case "DISASTER_RESOLVED":
        validateDisasterResolvedEvent(game, playerId, request.payload,);
        return;  

      case "DISASTER_ACTION_DECIDED":
        validateDisasterActionDecidedEvent(game,playerId,request.payload,);
        return;  

      case "FESTIVAL_TRIGGER_RESOLVED":
        validateFestivalTriggerResolvedEvent(game,playerId,request.payload,);
        return;

      case "FESTIVAL_ANNOUNCEMENT_CONFIRMED":
        validateFestivalAnnouncementConfirmedEvent(game,playerId,request.payload,);
        return;

      case "TOURIST_TURN_RESOLVED":
        validateTouristTurnResolvedEvent(game,playerId,request.payload,);
        return;

      case "TOURIST_TURN_CONFIRMED":
        validateTouristTurnConfirmedEvent(game,playerId,request.payload,);
        return;

      case "FESTIVAL_DEV_ENDED":
        validateFestivalDevEndedEvent(game,playerId,request.payload,);
        return;

      case "MAYOR_ELECTION_STARTED":
        validateMayorElectionStartedEvent(game,playerId,request.payload,);
        return;

      case "MAYOR_ELECTION_VOTE_CAST":
        validateMayorElectionVoteCastEvent(game,playerId,request.payload,);
        return;

      case "MAYOR_ELECTION_RESULT_RESOLVED":
        validateMayorElectionResultResolvedEvent(game,playerId,request.payload,);
        return;

      case "MAYOR_ELECTION_RESULT_CONFIRMED":
        validateMayorElectionResultConfirmedEvent(game,playerId,request.payload,);
        return;

    default:
      console.error("[SERVER UNSUPPORTED GAME EVENT]", {
        kind: rawRequest.kind,
        payload: rawRequest.payload,
      });
      throw new Error("지원하지 않는 게임 이벤트입니다.");
          }
}