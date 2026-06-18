import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import app from './app.js';
import socketHandler from './socket/socketHandler.js';

dotenv.config();

await connectDB();

const server = http.createServer(app);

const io = new Server(server, {
    cors : {
        origin : '*'
    },
});

socketHandler(io);

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server Running');
})

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    socket.on("disconnect", () => {
        console.log(`User Disconnected : ${socket.id}`)
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})