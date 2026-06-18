import React from "react";
import { useSocket } from "../context/SocketContext";

const Sidebar = () => {
  const { users, activeUser, setActiveUser, currentUser, onlineUsers } = useSocket();

  return (
    <div className="sidebar">
      {/* Current User Profile info */}
      <div style={{
        padding: "16px",
        borderBottom: "1px solid var(--border-color)",
        backgroundColor: "rgba(0, 0, 0, 0.1)"
      }}>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Logged In As</div>
        <div style={{ fontWeight: 600, fontSize: "1rem", marginTop: "4px" }}>
          {currentUser ? currentUser.username : "Guest User"}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          {currentUser ? currentUser.email : ""}
        </div>
      </div>

      {/* Header */}
      <div style={{ padding: "16px", fontWeight: "bold", fontSize: "1.1rem", borderBottom: "1px solid var(--border-color)" }}>
        Users Directory
      </div>

      {/* Users List */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {users
          .filter(u => {
            const uId = u.id || u._id;
            const currentId = currentUser?.id || currentUser?._id;
            return uId !== currentId;
          }) // Hide current user
          .map((u) => {
            const uId = u.id || u._id;
            const isActive = activeUser && (activeUser.id === uId || activeUser._id === uId);
            const isOnline = onlineUsers.includes(uId);
            return (
              <div
                key={uId}
                onClick={() => setActiveUser(u)}
                style={{
                  padding: "14px 16px",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border-color)",
                  backgroundColor: isActive ? "rgba(99, 102, 241, 0.15)" : "transparent",
                  transition: "background-color 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <div style={{ fontWeight: isActive ? "bold" : "normal", fontSize: "0.95rem" }}>{u.username}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{u.email}</div>
                </div>
                {/* Active Indicator dot */}
                {isOnline && (
                  <div style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#10b981"
                  }} />
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default Sidebar;
