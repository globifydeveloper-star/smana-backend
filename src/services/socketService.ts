import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

class SocketService {
    private static instance: SocketService;
    public io: Server | null = null;

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public async init(httpServer: HttpServer): Promise<void> {
        if (this.io) {
            console.log("Socket.io already initialized");
            return;
        }

        this.io = new Server(httpServer, {
            cors: {
                origin: [process.env.CLIENT_URL || 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3005'],
                methods: ['GET', 'POST'],
                credentials: true,
            },
        });

        const pubClient = createClient({ url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}` });
        const subClient = pubClient.duplicate();

        try {
            await Promise.all([pubClient.connect(), subClient.connect()]);
            this.io.adapter(createAdapter(pubClient, subClient));
            console.log('Redis adapter connected');
        } catch (err) {
            console.warn('Redis connection failed, falling back to memory adapter', err);
        }

        this.io.on('connection', (socket: Socket) => {
            console.log(`New client connected: ${socket.id}`);

            socket.on('join-room', (room: string) => {
                socket.join(room);
                console.log(`Socket ${socket.id} joined room ${room}`);
            });

            socket.on('join-role', (role: string) => {
                socket.join(`role:${role}`);
                console.log(`Socket ${socket.id} joined role room: role:${role}`);
            });

            socket.on('leave-room', (room: string) => {
                socket.leave(room);
                console.log(`Socket ${socket.id} left room ${room}`);
            });

            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}`);
            });
        });
    }

    public emit(event: string, data: any, room?: string) {
        if (!this.io) return;
        if (room) {
            this.io.to(room).emit(event, data);
        } else {
            this.io.emit(event, data);
        }
    }
}

export const socketService = SocketService.getInstance();
