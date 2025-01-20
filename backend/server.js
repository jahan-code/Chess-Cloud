require('dotenv').config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const Chess = require("chess.js").Chess;

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL 

// Enable CORS
app.use(cors({ origin: FRONTEND_URL }));
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
});

// In-memory storage for rooms
const rooms = {};

// Helper function to log room states
const logRoomState = (roomID) => {
    const room = rooms[roomID];

};

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle room join
    socket.on("join", ({ roomID }) => {
        if (!roomID || typeof roomID !== "string") {
            socket.emit("error", { message: "Invalid Room ID." });
            return;
        }

        socket.join(roomID);

        if (!rooms[roomID]) {
            rooms[roomID] = {
                chess: new Chess(),
                players: [],
                turn: "w",
            };
        }

        const room = rooms[roomID];

        if (room.players.length >= 2) {
            socket.emit("roomFull", { message: "Room is full." });
            return;
        }

        const color = room.players.length === 0 ? "w" : "b";
        room.players.push({ id: socket.id, color });

        socket.emit("playerColor", color);

        io.to(roomID).emit("roomData", {
            board: room.chess.fen(),
            players: room.players,
            turn: room.turn,
        });

        console.log(`Player ${socket.id} joined room ${roomID} as ${color}`);
        logRoomState(roomID);
    });

    // Handle making a move
    socket.on("makeMove", ({ roomID, move }) => {
        const room = rooms[roomID];
        if (!room || !move) {
            socket.emit("error", { message: "Invalid room or move." });
            return;
        }

        const chess = room.chess;
        const currentPlayer = room.players.find((player) => player.id === socket.id);

        if (!currentPlayer) {
            socket.emit("error", { message: "You are not in this room." });
            return;
        }

        if (currentPlayer.color !== room.turn) {
            socket.emit("invalidMove", { message: "It's not your turn." });
            return;
        }

        const result = chess.move(move);
        if (result) {
            room.turn = chess.turn();

            io.to(roomID).emit("moveMade", {
                board: chess.fen(),
                turn: room.turn,
            });

            if (chess.isGameOver()) {
                const resultMessage = chess.isCheckmate()
                    ? `${room.turn === "w" ? "Black" : "White"} wins by checkmate!`
                    : chess.isStalemate()
                    ? "Game over: Stalemate!"
                    : chess.isDraw()
                    ? "Game over: Draw!"
                    : "Game over!";
                io.to(roomID).emit("gameOver", { result: resultMessage });
            }
        } else {
            socket.emit("invalidMove", { message: "Invalid move." });
        }
    });

    // Handle valid move request
    socket.on("getValidMoves", ({ roomID, square }) => {
        const room = rooms[roomID];
        if (!room) {
            socket.emit("error", { message: "Room not found." });
            return;
        }

        const chess = room.chess;
        const validMoves = chess.moves({ square, verbose: true });

        socket.emit("validMoves", validMoves.map((move) => move.to));
    });

    // Handle player disconnection
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);

        for (const roomID in rooms) {
            const room = rooms[roomID];
            room.players = room.players.filter((player) => player.id !== socket.id);

            if (room.players.length === 0) {
                delete rooms[roomID];
                console.log(`Room ${roomID} deleted.`);
            } else {
                io.to(roomID).emit("roomData", {
                    board: room.chess.fen(),
                    players: room.players,
                    turn: room.turn,
                });
            }
        }
    });
});
app.get("/", (req, res) => {
    res.send("Backend is working!");
});

server.listen(PORT, () => console.log(`Server running on https://cloud-chess.zeabur.app`));
