export const EVENTS = {
  JOIN_LOBBY: "join-lobby",
  JOIN_LOBBY_SUCCESS: "join-lobby-success",

  GET_LOBBY_PLAYERS: "get-lobby-players",
  LOBBY_PLAYERS: "lobby-players",

  CREATE_ROOM: "create-room",
  CREATE_ROOM_SUCCESS: "create-room-success",

  JOIN_ROOM: "join-room",
  JOIN_ROOM_SUCCESS: "join-room-success",

  GET_ROOMS: "get-rooms",
  ROOMS_UPDATED: "rooms-updated",

  GET_ROOM: "get-room",
  ROOM_INFO: "room-info",

  SEND_ROOM_MESSAGE: "send-room-message",
  ROOM_MESSAGES: "room-messages",
  LEAVE_ROOM: "leave-room",
} as const;