import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RoomStatus = "vacant" | "occupied" | "dirty" | "maintenance" | "reserved";
export type RoomType = "standard" | "deluxe" | "suite" | "premium" | "family";

export interface Room {
  id: number;
  number: string;
  name: string;
  type: RoomType;
  floor: number;
  status: RoomStatus;
  rate: number;
  capacity: number;
  amenities: string | null;
  image?: string | null;
  bookImmediately?: boolean;
  isAvailable: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Guest {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  idType: string | null;
  idNumber: string | null;
  loyaltyPoints: number | null;
  specialRequests: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reservation {
  id: number;
  guestId: number | null;
  roomId: number | null;
  checkIn: Date;
  checkOut: Date;
  status: "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show" | "cancellation_requested" | string;
  totalCharges: number | null;
  paidAmount: number | null;
  notes: string | null;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: number;
  type: "arrival" | "departure" | "maintenance" | "charge" | "system" | "ai_insight" | "cancellation" | string;
  title: string;
  message: string;
  isRead: boolean | number;
  createdAt: Date;
}

export interface SelectedRoom {
  room: Room;
  guest?: Guest;
  reservation?: Reservation;
}

interface PMSStore {
  // Rooms
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  updateRoomStatus: (roomId: number, status: RoomStatus) => void;

  // Filters
  filterType: RoomType | "all";
  filterFloor: number | null;
  filterStatus: RoomStatus | "all";
  setFilterType: (type: RoomType | "all") => void;
  setFilterFloor: (floor: number | null) => void;
  setFilterStatus: (status: RoomStatus | "all") => void;
  clearFilters: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Selected room for drawer
  selectedRoom: SelectedRoom | null;
  setSelectedRoom: (room: SelectedRoom | null) => void;

  // Tape chart
  tapeChartStartDate: Date;
  setTapeChartStartDate: (date: Date) => void;
  tapeChartDays: number;
  setTapeChartDays: (days: number) => void;

  // Reservations
  reservations: Reservation[];
  setReservations: (reservations: Reservation[]) => void;

  // Guests
  guests: Guest[];
  setGuests: (guests: Guest[]) => void;

  // Notifications
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;

  // AI features
  showAIAssistant: boolean;
  toggleAIAssistant: () => void;
  showAIPrediction: boolean;
  toggleAIPrediction: () => void;
  showAIInsights: boolean;
  toggleAIInsights: () => void;
  showHeatmap: boolean;
  toggleHeatmap: () => void;
}

export const useStore = create<PMSStore>()(
  persist(
    (set) => ({
      rooms: [],
      setRooms: (rooms) => set({ rooms }),
      updateRoomStatus: (roomId, status) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId ? { ...r, status } : r
          ),
        })),

      filterType: "all",
      filterFloor: null,
      filterStatus: "all",
      setFilterType: (type) => set({ filterType: type }),
      setFilterFloor: (floor) => set({ filterFloor: floor }),
      setFilterStatus: (status) => set({ filterStatus: status }),
      clearFilters: () => set({ filterType: "all", filterFloor: null, filterStatus: "all" }),

      searchQuery: "",
      setSearchQuery: (query) => set({ searchQuery: query }),

      selectedRoom: null,
      setSelectedRoom: (room) => set({ selectedRoom: room }),

      tapeChartStartDate: new Date(),
      setTapeChartStartDate: (date) => set({ tapeChartStartDate: date }),
      tapeChartDays: 14,
      setTapeChartDays: (days) => set({ tapeChartDays: days }),

      reservations: [],
      setReservations: (reservations) => set({ reservations }),

      guests: [],
      setGuests: (guests) => set({ guests }),

      notifications: [],
      setNotifications: (notifications) => set({ notifications }),
      unreadCount: 0,
      setUnreadCount: (count) => set({ unreadCount: count }),

      showAIAssistant: false,
      toggleAIAssistant: () => set((s: PMSStore) => ({ showAIAssistant: !s.showAIAssistant })),
      showAIPrediction: false,
      toggleAIPrediction: () => set((s: PMSStore) => ({ showAIPrediction: !s.showAIPrediction })),
      showAIInsights: false,
      toggleAIInsights: () => set((s: PMSStore) => ({ showAIInsights: !s.showAIInsights })),
      showHeatmap: false,
      toggleHeatmap: () => set((s: PMSStore) => ({ showHeatmap: !s.showHeatmap })),
    }),
    {
      name: "pms-store",
      partialize: (state: PMSStore) => ({
        filterType: state.filterType,
        filterFloor: state.filterFloor,
        filterStatus: state.filterStatus,
        tapeChartDays: state.tapeChartDays,
        showAIAssistant: state.showAIAssistant,
        showAIPrediction: state.showAIPrediction,
        showAIInsights: state.showAIInsights,
        showHeatmap: state.showHeatmap,
      }),
    }
  )
);
