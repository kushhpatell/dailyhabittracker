import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
});

// Restore token from localStorage on load so the first request after refresh is authorized
const stored = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
if (stored) api.defaults.headers.common.Authorization = `Bearer ${stored}`;

export function setAuthToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

