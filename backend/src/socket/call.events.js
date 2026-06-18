import onlineUsers from "./onlineUsers.js";

const registerCallEvents = (io, socket) => {
    socket.on("call-user", (data) => {
        const{callerId, receiverId, callerName} = data;

        const receiverSocketId = onlineUsers.get(receiverId);

        if(receiverSocketId){
            io.to(receiverSocketId).emit("incoming-call", {callerId, callerName});
        }
    });

    socket.on("accept-call", (data) => {
        const collerSocketId = onlineUsers.get(data.callerId);

        if(collerSocketId){
            io.to(collerSocketId).emit("call-accepted", {receiverId: data.receiverId});
        }
    });

    socket.on("reject-call", (data) => {
        const collerSocketId = onlineUsers.get(data.callerId);
        if(collerSocketId){
            io.to(collerSocketId).emit("call-rejected");
        }
    });

    socket.on("end-call", (data) => {
        const receiverSocketId = onlineUsers.get(data.receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("call-ended");
        }
  });

    socket.on("offer", (data) => {
        const {receiverId, offer, callerId} = data;
        const receiverSocketId = onlineUsers.get(receiverId);

        if(receiverSocketId){
            io.to(receiverSocketId).emit("offer", {offer, callerId});
        }
    });

    socket.on("answer", (data) => {
        const {callerId, answer, receiverId} = data;
        const receiverSocketId = onlineUsers.get(receiverId);

        if(receiverSocketId){
            io.to(receiverSocketId).emit("answer", {answer, callerId});
        }
    });

    socket.on("ice-candidate", (data) => {
        const {receiverId, candidate, senderId} = data;

        const receiverSocketId = onlineUsers.get(receiverId);

        if (receiverSocketId) {
            io.to(receiverSocketId).emit("ice-candidate",{candidate, senderId});
        }
    });
}

export default registerCallEvents;