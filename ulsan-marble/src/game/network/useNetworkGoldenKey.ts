import { useCallback } from "react";
import type {PlayerTokenData,} from "../../components/PlayerToken";
import type { BoardTile,} from "../../types";
import type { UlsanMarbleGoldenKeyDrawnPayload,} from "../../../../shared/ulsanMarbleProtocol";
import { GOLDEN_KEY_CARD_MAP,} from "../goldenKey/goldenKeyDeck";
import type { GoldenKeyDeckState, PendingGoldenKeyResolution,} from "../goldenKey/goldenKeyTypes";

interface UseNetworkGoldenKeyOptions {
  playersRef: {
    current: PlayerTokenData[];
  };

  tiles: BoardTile[];

  commitGoldenKeyDeck: (
    nextDeck: GoldenKeyDeckState,
  ) => void;

  setPendingGoldenKey: (
    nextResolution:
      PendingGoldenKeyResolution,
  ) => void;
}

export function useNetworkGoldenKey({
  playersRef,
  tiles,
  commitGoldenKeyDeck,
  setPendingGoldenKey,
}: UseNetworkGoldenKeyOptions) {
  return useCallback(
    (
      payload:
        UlsanMarbleGoldenKeyDrawnPayload,
    ): boolean => {
      const player =
        playersRef.current.find(
          (candidate) =>
            candidate.id ===
            payload.playerId,
        );

      if (!player) {
        return false;
      }

      const currentTile =
        tiles[player.position];

      if (
        currentTile?.type !==
        "GOLDEN_KEY"
      ) {
        return false;
      }

      const card =
        GOLDEN_KEY_CARD_MAP.get(
          payload.cardId,
        );

      if (!card) {
        console.error(
          "[UlsanMarble] 존재하지 않는 황금열쇠 카드",
          payload.cardId,
        );
        return false;
      }

      commitGoldenKeyDeck({
        selectedCardIds: [
          ...payload.deck.selectedCardIds,
        ],
        drawPile: [
          ...payload.deck.drawPile,
        ],
        discardPile: [
          ...payload.deck.discardPile,
        ],
        cycle:
          payload.deck.cycle,
        lastDrawnCardId:
          payload.deck.lastDrawnCardId,
      });

      setPendingGoldenKey({
        playerId: payload.playerId,
        card,
        stage: "DRAWN",
        resultText: null,
        followUpPosition: null,
      });

      return true;
    },
    [
      commitGoldenKeyDeck,
      playersRef,
      setPendingGoldenKey,
      tiles,
    ],
  );
}