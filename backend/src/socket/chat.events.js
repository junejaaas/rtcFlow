import onlineUsers from "./onlineUsers.js";
import Message from "../models/Message.js";

const registerChatEvents = (io, socket) => {

  socket.on("send-message", async (data) => {

    try {

      const {
        senderId,
        receiverId,
        message,
      } = data;

      const savedMessage = await Message.create({
        sender: senderId,
        receiver: receiverId,
        text: message,
      });

      const receiverSocketId =
        onlineUsers.get(receiverId);

      if (receiverSocketId) {

        io.to(receiverSocketId).emit(
        "receive-message",
        {
            senderId,
            receiverId,
            message
        }
        );

      }

    } catch (error) {
      console.error("Error in send-message event:", error);
    }

  });

};

export default registerChatEvents;