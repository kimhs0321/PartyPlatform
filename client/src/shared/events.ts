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
  LIAR_SUBMIT_GUESS: "liar:submit-guess",
  LIAR_REQUEST_PAUSE: "liar:request-pause",
  LIAR_RESUME_GAME: "liar:resume-game",
  LIAR_SUBMIT_LAST_SPEECH: "liar:submit-last-speech",
  LIAR_NEXT_ROUND: "liar:next-round",
  LIAR_SUBMIT_REACTION: "liar:submitReaction",
  LIAR_TOGGLE_PAUSE: "liar:togglePause",
  LIAR_UPDATE_SETTINGS: "liar:update-settings",

    // CatchMind
  CATCH_MIND_STATE: "catchMind:state",
  CATCH_MIND_SELECT_WORD: "catchMind:selectWord",
  CATCH_MIND_DRAW: "catchMind:draw",
  CATCH_MIND_SEND_CHAT: "catchMind:sendChat",
  CATCH_MIND_CLEAR_CANVAS: "catchMind:clearCanvas",
  CATCH_MIND_UNDO: "catchMind:undo",
  CATCH_MIND_UPDATE_SETTINGS: "catchMind:updateSettings",
  CATCH_MIND_SKIP: "catchMind:skip",

    // RelayDrawing
  RELAY_DRAWING_STATE: "relayDrawing:state",
  RELAY_DRAWING_START_GAME: "relayDrawing:startGame", 
  RELAY_DRAWING_DRAW: "relayDrawing:draw",
  RELAY_DRAWING_SEND_CHAT: "relayDrawing:sendChat",
  RELAY_DRAWING_CLEAR_CANVAS: "relayDrawing:clearCanvas",
  RELAY_DRAWING_UNDO: "relayDrawing:undo",
  RELAY_DRAWING_UPDATE_SETTINGS:"relayDrawing:updateSettings",
} as const;