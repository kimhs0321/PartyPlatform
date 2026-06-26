import { io } from "socket.io-client";

const SERVER_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

export const socket = io(SERVER_URL, {
  autoConnect: false,
});