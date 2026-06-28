export const EVENTS = {
  JOIN_LOBBY: "join-lobby",
  JOIN_LOBBY_SUCCESS: "join-lobby-success",

  GET_LOBBY_PLAYERS: "get-lobby-players",
  LOBBY_PLAYERS: "lobby-players",

  CREATE_ROOM: "create-room",
  CREATE_ROOM_SUCCESS: "create-room-success",

  GET_ROOMS: "get-rooms",
  ROOMS: "rooms",

  JOIN_ROOM: "join-room",
  JOIN_ROOM_SUCCESS: "join-room-success",

  GET_ROOM: "get-room",
  ROOM_INFO: "room-info",

  LEAVE_ROOM: "leave-room",

  TOGGLE_READY: "toggle-ready",

  START_GAME: "start-game",
  GAME_STARTED: "game-started",
  START_GAME_FAILED: "start-game-failed",

  END_GAME: "end-game",
  GAME_ENDED: "game-ended",
  
  GET_GAME_STATE: "get-game-state",
  GAME_STATE: "game-state",

  LIAR_START_GAME: "liar:start-game",
  LIAR_GAME_STATE: "liar:game-state",
  LIAR_SUBMIT_DESCRIPTION: "liar:submit-description",
  LIAR_REACT_DESCRIPTION: "liar:react-description",
  LIAR_SEND_CHAT: "liar:send-chat",
  LIAR_SUBMIT_VOTE: "liar:submit-vote",
  LIAR_REQUEST_PAUSE: "liar:request-pause",
  LIAR_RESUME_GAME: "liar:resume-game",
  LIAR_SUBMIT_LAST_SPEECH: "liar:submit-last-speech",
  LIAR_NEXT_ROUND: "liar:next-round",
} as const;