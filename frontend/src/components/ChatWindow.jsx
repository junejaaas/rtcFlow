import React, { useRef, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import MessageInput from "./MessageInput";
import { useNavigate } from "react-router-dom";

const ChatWindow = () => {
  const { activeUser, messages, sendMessageOnSocket, startCall, currentUser, onlineUsers } = useSocket();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const activeUserId = activeUser ? activeUser.id || activeUser._id : null;
  const activeMessages = activeUserId ? messages[activeUserId] || [] : [];
  const isOnline = onlineUsers.includes(activeUserId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  const formatTime = (timeInput) => {
    if (!timeInput) return "";
    if (typeof timeInput === "string" && (timeInput.includes("AM") || timeInput.includes("PM"))) {
      return timeInput;
    }
    try {
      const date = new Date(timeInput);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  };

  if (!activeUser) {
    return (
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        fontSize: "1rem"
      }}>
        Select a user from the sidebar to start chatting.
      </div>
    );
  }

  const handleStartCall = () => {
    if (activeUserId) {
      startCall(activeUserId);
      navigate("/call");
    }
  };

  const handleSendMessage = (text) => {
    if (activeUserId) {
      sendMessageOnSocket(activeUserId, text);
    }
  };

  return (
    <div className="chat-area">
      {/* Header with Video Call Button */}
      <div className="chat-header">
        <div>
          <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>{activeUser.username}</span>
          {isOnline ? (
            <span style={{ fontSize: "0.8rem", color: "var(--success-color)", marginLeft: "8px" }}>(online)</span>
          ) : (
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "8px" }}>(offline)</span>
          )}
        </div>
        <button
          onClick={handleStartCall}
          className="btn btn-primary"
          style={{ padding: "8px 14px", fontSize: "0.85rem" }}
        >
          📹 Video Call
        </button>
      </div>

      {/* Messages list */}
      <div className="message-list">
        {activeMessages.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", margin: "auto", fontSize: "0.9rem" }}>
            No messages yet. Send a message to start conversation!
          </div>
        ) : (
          activeMessages.map((msg, index) => {
            const senderId = msg.senderId || msg.sender;
            const currentUserId = currentUser?.id || currentUser?._id;
            const isSentByMe = senderId === currentUserId;
            return (
              <div
                key={msg._id || msg.id || index}
                className={`message-bubble ${isSentByMe ? "message-outgoing" : "message-incoming"}`}
              >
                <div>{msg.text || msg.message}</div>
                <div style={{ fontSize: "0.65rem", textAlign: "right", marginTop: "4px", opacity: 0.7 }}>
                  {formatTime(msg.createdAt || msg.timestamp)}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
};

export default ChatWindow;
