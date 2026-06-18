import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api", // Assume backend is at localhost:5000
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically inject JWT authentication token if stored locally
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
