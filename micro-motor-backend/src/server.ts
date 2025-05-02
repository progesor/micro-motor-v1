// src/server.ts

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { MotorController, MotorMode } from './controllers/MotorController';
import { DcMotorController } from './controllers/DcMotorController';

////////////////////////////////////////////////////////////////////////////////
// 1) Controller Örneğimizi Oluşturalım
////////////////////////////////////////////////////////////////////////////////
let controller: MotorController = new DcMotorController(
    /* IN1 */ 23,
    /* IN2 */ 24,
    /* ENA */ 18
);

////////////////////////////////////////////////////////////////////////////////
// 2) Express & Socket.io Kurulumu
////////////////////////////////////////////////////////////////////////////////
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: { origin: '*' }
});

app.use(express.json());

app.get('/', (_req, res) => {
    res.send('Micro Motor Backend is up and running!');
});

////////////////////////////////////////////////////////////////////////////////
// 3) WebSocket Event’lerini Tanımlayalım
////////////////////////////////////////////////////////////////////////////////
io.on('connection', socket => {
    console.log('Client connected:', socket.id);

    // Motor tipini değiştirme (şimdilik sadece 'dc' destekli)
    socket.on('setMotorType', (type: string) => {
        if (type === 'dc') {
            controller = new DcMotorController(23, 24, 18);
            socket.emit('mode', controller);
        } else {
            socket.emit('error', `Motor type "${type}" not supported yet.`);
        }
    });

    // Çalışma modunu ayarla: { mode: 'normal' } veya { mode: 'oscillation', preRunTime: 2000 }
    socket.on('setMode', (args: { mode: MotorMode; preRunTime?: number }) => {
        const { mode, preRunTime } = args;
        controller.setMode(mode, preRunTime);
        socket.emit('modeChanged', { mode, preRunTime });
    });

    // Başlat
    socket.on('start', () => {
        console.log('Start command received');
        controller.start();
        socket.emit('started');
    });

    // Durdur
    socket.on('stop', () => {
        console.log('Stop command received');
        controller.stop();
        socket.emit('stopped');
    });

    // Hızı %0–100 aralığında ayarla
    socket.on('setSpeed', (speed: number) => {
        console.log(`Speed set to: ${speed}%`);
        controller.setSpeed(speed);
        socket.emit('speedChanged', speed);
    });

    // Oscillation şiddetini %0–100 aralığında ayarla
    socket.on('setOscillation', (osc: number) => {
        console.log(`Oscillation set to: ${osc}%`);
        controller.setOscillation(osc);
        socket.emit('oscillationChanged', osc);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

////////////////////////////////////////////////////////////////////////////////
// 4) Sunucuyu Başlat
////////////////////////////////////////////////////////////////////////////////
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
