import onlineUsers from "./onlineUsers.js";
import registerChatEvents from "./chat.events.js";
import registerCallEvents from "./call.events.js";

const socketHandler = (io) => {

  io.on("connection", (socket) => {

    registerChatEvents(io, socket);
    registerCallEvents(io, socket);

    socket.on("register-user", (userId) => {

      onlineUsers.set(
        userId,
        socket.id
      );

      io.emit(
        "online-users",
        Array.from(onlineUsers.keys())
      );

    });

    socket.on("disconnect", () => {

      for (const [userId, socketId] of onlineUsers.entries()) {

        if (socketId === socket.id) {

          onlineUsers.delete(userId);

          break;
        }

      }

      io.emit(
        "online-users",
        Array.from(onlineUsers.keys())
      );

    });

  });

};

export default socketHandler;