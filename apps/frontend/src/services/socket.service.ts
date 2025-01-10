import { io, Socket } from "socket.io-client";
import { ComplaintEvent } from "@/types/api/complaint";

class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(token: string) {
    this.socket = io(import.meta.env.VITE_API_URL, {
      auth: {
        token
      }
    });

    this.socket.on("connect", () => {
      console.log("Connected to WebSocket server");
    });

    this.socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribeToComplaint(complaintId: number, callback: (event: ComplaintEvent) => void) {
    if (!this.socket) return;
    
    this.socket.emit("join_complaint", complaintId);
    this.socket.on(`complaint_${complaintId}`, callback);
  }

  unsubscribeFromComplaint(complaintId: number) {
    if (!this.socket) return;
    
    this.socket.emit("leave_complaint", complaintId);
    this.socket.off(`complaint_${complaintId}`);
  }
}

export const socketService = SocketService.getInstance();