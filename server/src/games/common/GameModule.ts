import type { Server, Socket } from "socket.io";

export interface GameModule {
  name: string;
  enabled: boolean;

  registerSocket(io: Server, socket: Socket): void;

  startGame?(
    io: Server,
    startedRoom: any
  ): void | Promise<void>;

  onDisconnect?(
    io: Server,
    roomId: string,
    playerId: string
  ): void | Promise<void>;
}