import type {
  Server,
  Socket,
} from "socket.io";
import { EVENTS } from "../../../shared/events";
import { playerManager } from "../../../managers/PlayerManager";
import { roomManager } from "../../../managers/RoomManager";
import { ulsanMarbleGameManager } from "./../UlsanMarbleGameManager";
import { emitUlsanMarbleState } from "./ulsanMarbleEmitter";
import type {
  UlsanMarbleCommand,
} from "../../../../../shared/ulsanMarbleProtocol";

function getUlsanMarbleRoomId(
  socket: Socket,
): string | null {
  const player =
    playerManager.getPlayer(socket.id);

  if (!player?.roomId) {
    return null;
  }

  const room =
    roomManager.getRoom(player.roomId);

  if (
    !room ||
    room.game !== "울산마블" ||
    room.status !== "playing"
  ) {
    return null;
  }

  return room.id;
}

export function registerUlsanMarbleSocket(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    EVENTS.ULSAN_MARBLE_GET_STATE,
    () => {
      const roomId =
        getUlsanMarbleRoomId(socket);

      if (!roomId) return;

      const state =
        ulsanMarbleGameManager.getGame(roomId);

      if (!state) return;

      socket.emit(
        EVENTS.ULSAN_MARBLE_STATE,
        state,
      );
    },
  );


  socket.on(
    EVENTS.ULSAN_MARBLE_COMMAND,
    (command: UlsanMarbleCommand) => {
      const roomId =
        getUlsanMarbleRoomId(socket);

      if (!roomId) return;

      const player =
        playerManager.getPlayer(socket.id);

      if (!player) return;

      const playerId = player.id;

      try {
        if (!command || typeof command !== "object") {
          throw new Error(
            "울산마블 요청이 올바르지 않습니다.",
          );
        }

        switch (command.type) {
          case "ROLL_DICE": {
            ulsanMarbleGameManager.rollDice(
              roomId,
              playerId,
            );
            break;
          }

          case "DEV_ROLL_DICE": {
            if (
              !Array.isArray(command.values) ||
              command.values.length !== 2 ||
              !Number.isInteger(command.values[0]) ||
              command.values[0] < 1 ||
              command.values[0] > 6 ||
              !Number.isInteger(command.values[1]) ||
              command.values[1] < 1 ||
              command.values[1] > 6
            ) {
              throw new Error(
                "DEV 주사위 요청이 올바르지 않습니다.",
              );
            }

            ulsanMarbleGameManager.rollDice(
              roomId,
              playerId,
              command.values,
            );

            break;
          }

          case "PROPERTY_DECISION": {
            if (
              typeof command.arrivalId !==
                "string" ||
              command.arrivalId.trim().length ===
                0 ||
              command.arrivalId.length > 160 ||
              typeof command.propertyId !==
                "string" ||
              command.propertyId.trim().length ===
                0 ||
              (
                command.action !== "BUY" &&
                command.action !== "DECLINE"
              )
            ) {
              throw new Error(
                "부동산 선택 요청이 올바르지 않습니다.",
              );
            }

            ulsanMarbleGameManager.decideProperty(
              roomId,
              playerId,
              {
                arrivalId:
                  command.arrivalId.trim(),

                propertyId:
                  command.propertyId.trim(),

                action:
                  command.action,
              },
            );

            break;
          }

          case "STOCK_TRADE": {
            if (
              (
                command.action !== "BUY" &&
                command.action !== "SELL"
              ) ||
              typeof command.companyId !==
                "string" ||
              !command.companyId.trim() ||
              !Number.isInteger(
                command.quantity,
              ) ||
              command.quantity <= 0 ||
              !Number.isInteger(
                command.pricePerShare,
              ) ||
              command.pricePerShare <= 0
            ) {
              throw new Error(
                "주식 거래 요청이 올바르지 않습니다.",
              );
            }

            ulsanMarbleGameManager.tradeStock(
              roomId,
              playerId,
              {
                action: command.action,
                companyId:
                  command.companyId,
                quantity:
                  command.quantity,
                pricePerShare:
                  command.pricePerShare,
              },
            );

            break;
          }

          case "PUBLISH_GAME_EVENT": {
            if (
              !Number.isInteger(command.expectedTurnSequence) ||
              !command.event ||
              typeof command.event !== "object" ||
              typeof command.event.kind !== "string"
            ) {
              throw new Error(
                "게임 이벤트 요청이 올바르지 않습니다.",
              );
            }

            ulsanMarbleGameManager.publishGameEvent(
              roomId,
              playerId,
              command.expectedTurnSequence,
              command.event,
            );

            break;
          }   

          case "ACK_GAME_EVENT": {
            if (
              !Number.isInteger(
                command.eventId,
              ) ||
              command.eventId <= 0 ||
              !Number.isInteger(
                command.turnSequence,
              ) ||
              command.turnSequence < 0
            ) {
              throw new Error(
                "게임 이벤트 ACK가 올바르지 않습니다.",
              );
            }

            ulsanMarbleGameManager
              .ackGameEvent(
                roomId,
                playerId,
                command.eventId,
                command.turnSequence,
              );

            break;
          }

          case "TURN_READY": {
            if (
              !Number.isInteger(
                command.turnSequence,
              ) ||
              command.turnSequence < 0
            ) {
              throw new Error(
                "턴 준비 신호가 올바르지 않습니다.",
              );
            }

            ulsanMarbleGameManager
              .markTurnReady(
                roomId,
                playerId,
                command.turnSequence,
              );

            break;
          }

          case "DEV_END_TURN": {
            ulsanMarbleGameManager.devEndTurn(
              roomId,
              playerId,
            );

            break;
          }

          case "END_TURN": {
            ulsanMarbleGameManager.endTurn(
              roomId,
              playerId,
            );
            break;
          }

          default: {
            const unsupportedCommand: never =
              command;

            throw new Error(
              `지원하지 않는 울산마블 요청입니다: ${String(
                unsupportedCommand,
              )}`,
            );
          }
        }

        emitUlsanMarbleState(
          io,
          roomId,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "울산마블 요청 처리 중 오류가 발생했습니다.";

        socket.emit(
          EVENTS.ULSAN_MARBLE_ERROR,
          { message },
        );
      }
    },
  );
}