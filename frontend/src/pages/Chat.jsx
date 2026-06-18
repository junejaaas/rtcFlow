import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { useSocket } from "../context/SocketContext";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";

const Chat = () => {
  const { callStatus, setUsers } = useSocket();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Redirect user to Call screen automatically if ringing/receiving a call
  useEffect(() => {
    if (callStatus === "ringing" || callStatus === "connected") {
      navigate("/call");
    }
  }, [callStatus, navigate]);

  // Fetch registered users from backend on mount
  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await API.get("/users");
        
        // Populate the user list in global socket context state
        setUsers(response.data);
      } catch (err) {
        console.error("Error fetching users:", err);
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          // Token expired or invalid, clear and redirect to login
          localStorage.removeItem("token");
          navigate("/login");
        } else {
          setError("Failed to fetch users. Please check backend connection.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [navigate, setUsers]);

  if (loading) {
    return (
      <div style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-color)",
        color: "var(--text-color)"
      }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{
            border: "4px solid rgba(255,255,255,0.1)",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            borderLeftColor: "var(--primary-color)",
            animation: "spin 1s linear infinite",
            margin: "0 auto 12px auto"
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <div>Loading contacts...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-color)",
        color: "var(--text-color)"
      }}>
        <div style={{ textAlign: "center", maxWidth: "400px", padding: "20px" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⚠️</div>
          <div style={{ color: "var(--danger-color)", marginBottom: "16px" }}>{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* User directory sidebar */}
      <Sidebar />

      {/* Main chat log & calling panel */}
      <ChatWindow />
    </div>
  );
};

export default Chat;
