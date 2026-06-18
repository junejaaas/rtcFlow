import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import API from "../api/axios";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { setCurrentUser, registerUserOnSocket } = useSocket();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      setError("");
      const response = await API.post("/auth/register", { username, email, password });
      
      if (response.data.success) {
        // Auto-login after successful registration
        const loginResponse = await API.post("/auth/login", { email, password });
        if (loginResponse.data.success) {
          localStorage.setItem("token", loginResponse.data.token);
          setCurrentUser(loginResponse.data.user);
          registerUserOnSocket(loginResponse.data.user.id || loginResponse.data.user._id);
          navigate("/chat");
        } else {
          navigate("/login");
        }
      } else {
        setError(response.data.message || "Registration failed.");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Registration failed.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Register</h2>
        {error && (
          <div style={{ color: "var(--danger-color)", fontSize: "0.85rem", marginBottom: "12px", textAlign: "center" }}>
            {error}
          </div>
        )}
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="johndoe"
              className="form-input"
            />
          </div>

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
            Register
          </button>
        </form>

        <div className="text-center mt-4">
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--primary-color)", textDecoration: "none" }}>
              Login
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Register;
