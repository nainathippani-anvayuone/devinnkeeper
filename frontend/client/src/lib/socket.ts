import { io, Socket } from "socket.io-client";
import { useStore, Room } from "./store";
import type { QueryClient } from "@tanstack/react-query";

let socket: Socket | null = null;
let queryClientRef: QueryClient | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // If running in development with Vite proxy or production
    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    socket = io(wsUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      withCredentials: true,
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("[Socket.IO] Connected to PMS real-time server with id:", socket?.id);
    });

    socket.on("connect_error", (err: Error) => {
      console.warn("[Socket.IO] Connection warning (polling fallback active):", err.message);
    });

    // Listen to centralized room status changes
    socket.on("room:status_changed", (data: any) => {
      console.log("[Socket.IO] Received room:status_changed:", data);
      handleRoomUpdate(data);
    });

    // Also listen to module2:rooms
    socket.on("module2:rooms", (data: any) => {
      if (data?.room) {
        handleRoomUpdate({
          roomId: data.room.id,
          roomNumber: data.room.room_number || data.room.number,
          status: data.room.status,
          availability: data.room.availability,
          floor: data.room.floor,
          currentPrice: data.room.current_price,
        });
      }
    });
  }

  return socket;
}

function handleRoomUpdate(data: {
  roomId?: number | string;
  roomNumber?: string;
  floor?: number;
  status?: string;
  availability?: boolean;
  currentPrice?: number;
}) {
  if (!data.roomId && !data.roomNumber) return;

  const currentRooms = useStore.getState().rooms;
  const targetId = Number(data.roomId);
  const targetNum = String(data.roomNumber || "");

  const updatedRooms = currentRooms.map((r: Room) => {
    const isMatch = (targetId && r.id === targetId) || (targetNum && String(r.number) === targetNum);
    if (!isMatch) return r;

    return {
      ...r,
      ...(data.status ? { status: data.status.toLowerCase() as any } : {}),
      ...(data.availability !== undefined ? { isAvailable: data.availability ? 1 : 0 } : {}),
      ...(data.floor !== undefined ? { floor: Number(data.floor) } : {}),
      ...(data.currentPrice !== undefined ? { rate: Number(data.currentPrice) } : {}),
      updatedAt: new Date(),
    };
  });

  useStore.getState().setRooms(updatedRooms);

  // Invalidate React Query caches if query client is registered
  if (queryClientRef) {
    queryClientRef.invalidateQueries({ queryKey: ["rooms"] });
    queryClientRef.invalidateQueries({ queryKey: ["dashboard"] });
    queryClientRef.invalidateQueries({ queryKey: ["housekeeping"] });
    queryClientRef.invalidateQueries({ queryKey: ["reservations"] });
  }
}

export function initSocketSync(qc?: QueryClient) {
  if (qc) {
    queryClientRef = qc;
  }
  return getSocket();
}
