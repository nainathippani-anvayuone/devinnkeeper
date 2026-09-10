import axios from "axios";

// Vite only exposes env vars prefixed VITE_ to client code (via import.meta.env,
// not process.env, which Next.js uses but this project does not run on).
// Falls back to the relative "/api" path used by the local dev proxy in vite.config.ts.
const apiUrl = import.meta.env.VITE_API_BASE_URL || "/api";

export const api = axios.create({
  baseURL: apiUrl,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Attach Authorization header from localStorage (remember me) or sessionStorage (session-only)
api.interceptors.request.use((config) => {
  try {
    const token: string | null =
      localStorage.getItem("innkeeper_token") ||
      sessionStorage.getItem("innkeeper_session_token");
    if (token) {
      config.headers = { ...(config.headers ?? {}), Authorization: `Bearer ${token}` } as any;
    }
  } catch (e) {
    // ignore
  }
  return config;
});

export const apiClient = {
  auth: {
    login: (payload: any) => api.post('/auth/login', payload),
    signup: (payload: any) => api.post('/auth/signup', payload),
    logout: () => api.post('/auth/logout'),
    forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
    resetPassword: (payload: any) => api.post('/auth/reset-password', payload),
    me: () => api.get('/auth/me'),
  },
  rooms: {
    list: (params?: any) => api.get("/rooms", { params }),
    get: (id: string) => api.get(`/rooms/${id}`),
    create: (data: any) => api.post("/rooms", data),
    update: (id: string, data: any) => api.put(`/rooms/${id}`, data),
    remove: (id: string) => api.delete(`/rooms/${id}`),
  },
  reservations: {
    list: (params?: any) => api.get("/reservations", { params }),
    create: (data: any) => api.post("/reservations", data),
    update: (id: string, data: any) => api.put(`/reservations/${id}`, data),
    remove: (id: string) => api.delete(`/reservations/${id}`),
  },
  guests: {
    list: (params?: any) => api.get("/guests", { params }),
    create: (data: any) => api.post("/guests", data),
    update: (id: string, data: any) => api.put(`/guests/${id}`, data),
    remove: (id: string) => api.delete(`/guests/${id}`),
  },
  payments: {
    list: (params?: any) => api.get("/payments", { params }),
    get: (id: string) => api.get(`/payments/${id}`),
    create: (data: any) => api.post("/payments", data),
    update: (id: string, data: any) => api.put(`/payments/${id}`, data),
    remove: (id: string) => api.delete(`/payments/${id}`),
  },
  cashLedger: {
    list: (params?: any) => api.get("/cash-ledger", { params }),
    create: (data: any) => api.post("/cash-ledger", data),
    update: (id: string, data: any) => api.put(`/cash-ledger/${id}`, data),
    remove: (id: string) => api.delete(`/cash-ledger/${id}`),
  },
  shiftAudits: {
    list: (params?: any) => api.get("/shift-audits", { params }),
    create: (data: any) => api.post("/shift-audits", data),
    update: (id: string, data: any) => api.put(`/shift-audits/${id}`, data),
    remove: (id: string) => api.delete(`/shift-audits/${id}`),
  },
  vehicles: {
    list: (params?: any) => api.get("/vehicles", { params }),
    get: (id: string) => api.get(`/vehicles/${id}`),
    create: (data: any) => api.post("/vehicles", data),
    update: (id: string, data: any) => api.put(`/vehicles/${id}`, data),
    remove: (id: string) => api.delete(`/vehicles/${id}`),
  },
  housekeeping: {
    list: (params?: any) => api.get("/housekeeping", { params }),
    create: (data: any) => api.post("/housekeeping", data),
    update: (id: string, data: any) => api.put(`/housekeeping/${id}`, data),
  },
  maintenance: {
    list: (params?: any) => api.get("/maintenance", { params }),
    create: (data: any) => api.post("/maintenance", data),
    update: (id: string, data: any) => api.put(`/maintenance/${id}`, data),
  },
  notifications: {
    list: (params?: any) => api.get("/notifications", { params }),
    getUnreadCount: () => api.get("/notifications/unread-count"),
    create: (data: any) => api.post("/notifications", data),
    markRead: (ids?: number[]) => api.post("/notifications/mark-read", { ids }),
    markOneRead: (id: number) => api.patch(`/notifications/${id}/read`),
    markAllRead: () => api.post("/notifications/mark-all-read"),
    deleteOne: (id: number) => api.delete(`/notifications/${id}`),
  },
  analytics: {
    get: () => api.get("/analytics"),
  },
  dashboard: {
    get: () => api.get("/dashboard"),
  },
  weather: {
    get: () => api.get("/weather"),
  },
  roomAvailability: {
    list: (params?: any) => api.get("/room-availability", { params }),
  },
};
