import { UlsanBoard } from "./components/UlsanBoard";
import type {
  UlsanMarbleParticipantInput,
} from "./game/prototypePlayers";
import type {
  UlsanMarbleNetworkDiceRoll,
  UlsanMarbleNetworkPropertyDecision,
  UlsanMarbleNetworkStockTrade,
} from "./game/usePrototypeGame";
import type {
  GameRoundLimit,
} from "./game/endGame/endGameTypes";
import type {
  UlsanMarbleCommand,
  UlsanMarbleGameEvent,
} from "../../shared/ulsanMarbleProtocol";

export type UlsanMarblePlatformSettings = {
  startingMoney: number;
  salary: number;
  roundLimit: GameRoundLimit;
};

export type UlsanMarbleNetworkState = {
  activePlayerId: string;
  turnSequence: number;

  phase:
    | "WAITING_FOR_ROLL"
    | "STOCK_TRADING";

  diceRoll:
    UlsanMarbleNetworkDiceRoll | null;

  propertyDecision:
    UlsanMarbleNetworkPropertyDecision | null;

  stockTrades:
    UlsanMarbleNetworkStockTrade[];

  gameEvents:
    UlsanMarbleGameEvent[];
};

export type UlsanMarbleNetworkAdapter = {
  state: UlsanMarbleNetworkState | null;

  sendCommand: (
    command: UlsanMarbleCommand,
  ) => void;
};

export type UlsanMarbleAppProps = {
  participants?: UlsanMarbleParticipantInput[];
  localPlayerId?: string;
  settings?: UlsanMarblePlatformSettings;

  network?: UlsanMarbleNetworkAdapter;
};

export default function App({
  participants,
  localPlayerId,
  settings,
  network,
}: UlsanMarbleAppProps = {}) {
    return (
      <UlsanBoard
        participants={participants}
        localPlayerId={localPlayerId}
        settings={settings}
        network={network}
      />
    );
}