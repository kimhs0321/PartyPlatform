export interface PendingAirportTravel {
  playerId: string;

  airportPosition: number;

  visitId: string;
  turnSequence: number;
}

export interface AirportFlightState {
  id: string;

  /**
   * 목적지 도착 후 부동산 구매·개발·통행료 등의
   * 후속 칸 처리에 사용하는 고유 도착 ID
   */
  arrivalId: string;
  turnSequence: number;

  playerId: string;
  fromPosition: number;
  destinationPosition: number;
  destinationName: string;
}

export type AirportTravelError =
  | "NO_PENDING_AIRPORT"
  | "PLAYER_NOT_FOUND"
  | "INVALID_DESTINATION"
  | "INSUFFICIENT_FUNDS"
  | "PAYMENT_FAILED";