import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

socket.emit(
  "register-user",
  "user123"
);