import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import API from "../api/axios";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { setCurrentUser, registerUserOnSocket } = useSocket();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter all fields.");
      return;
    }

    try {
      setError("");
      const response = await API.post("/auth/login", { email, password });
      
      if (response.data.success) {
        // Set user session details
        localStorage.setItem("token", response.data.token);
        setCurrentUser(response.data.user);
        
        // Hook session to signaling sockets
        registerUserOnSocket(response.data.user.id || response.data.user._id);
        
        navigate("/chat");
      } else {
        setError(response.data.message || "Login failed.");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Login failed. Check server status.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login</h2>
        {error && (
          <div style={{ color: "var(--danger-color)", fontSize: "0.85rem", marginBottom: "12px", textAlign: "center" }}>
            {error}
          </div>
        )}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="form-input"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "12px" }}>
            Login
          </button>
        </form>

        <div className="text-center mt-4">
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "var(--primary-color)", textDecoration: "none" }}>
              Register
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
