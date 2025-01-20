import React, { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { io } from "socket.io-client";
import { FiCopy } from "react-icons/fi";
import { FaChessKing } from "react-icons/fa";
import { FaRegIdCard } from "react-icons/fa6";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import './App.css';

const socket = io(`https://chess-cloud.zeabur.app/`);

function App() {
    const [roomID, setRoomID] = useState("");
    const [board, setBoard] = useState("start");
    const [turn, setTurn] = useState("w");
    const [playerColor, setPlayerColor] = useState(null);
    const [players, setPlayers] = useState([]);
    const [gameOverMessage, setGameOverMessage] = useState("");
    const [highlightSquares, setHighlightSquares] = useState({});
    const [selectedSquare, setSelectedSquare] = useState(null);

    useEffect(() => {
        socket.on("playerColor", (color) => {
            setPlayerColor(color);
            toast.info(`You are playing as ${color === "w" ? "White" : "Black"}`);

        });

        socket.on("roomData", (data) => {
            if (data) {
                setBoard(data.board);
                setPlayers(data.players);
                setTurn(data.turn);
                setGameOverMessage("");
            }
        });

        socket.on("moveMade", (data) => {
            if (data) {
                setBoard(data.board);
                setTurn(data.turn);
                setHighlightSquares({});
                setSelectedSquare(null);
            }
        });

        socket.on("invalidMove", (message) => {
            toast.error(message.message);

        });

        socket.on("gameOver", (result) => {
            setGameOverMessage(result.result);
            toast.success(`Game Over: ${result.result}`);

        });

        return () => {
            socket.off("playerColor");
            socket.off("roomData");
            socket.off("moveMade");
            socket.off("invalidMove");
            socket.off("gameOver");
        };
    }, []);

    const joinRoom = () => {
        if (!roomID) {
            toast.error("Please enter a room ID.");
            return;
        }
        socket.emit("join", { roomID }, (response) => {
            if (response && response.message) {
                toast.error(response.message);

            }
            else{
                toast.success("Joined the room successfully!");

            }
        });
    };

    const generateRoomID = () => {
        const randomID = Math.random().toString(36).substring(2, 10); // Generate a random alphanumeric string
        setRoomID(randomID);
    };

    const copyRoomID = () => {
        if (roomID) {
            navigator.clipboard.writeText(roomID);
            toast.success("Room ID copied to clipboard!");
        } else {
            toast.error("Please generate or enter a Room ID first.");
        }
    };

    const onDrop = (sourceSquare, targetSquare) => {
        if (playerColor !== turn) {
            toast.warning("It's not your turn.");
            return false;
        }

        const move = { from: sourceSquare, to: targetSquare, promotion: "q" };
        socket.emit("makeMove", { roomID, move });
        return true;
    };

    const onSquareClick = (square) => {
        if (selectedSquare === square) {
            setSelectedSquare(null);
            setHighlightSquares({});
            return;
        }

        setSelectedSquare(square);
        socket.emit("getValidMoves", { roomID, square });
        socket.on("validMoves", (validMoves) => {
            const highlights = {};
            validMoves.forEach((move) => {
                highlights[move] = true;
            });
            setHighlightSquares(highlights);
        });
    };

    const customSquareStyles = (square) => {
        if (highlightSquares[square]) {
            return { backgroundColor: "rgba(0, 255, 0, 0.5)" }; // Light green for valid moves
        }
        
        return {};
    };

    return (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
            <ToastContainer position="bottom-right" autoClose={3000} />
            <img className="logo" src="/images/White-piece2.png"/>
            <h1>Chess Cloud</h1>
            <div className="input-container">
                <input
                    type="text"
                    placeholder="Enter Room ID"
                    className="rounded-input"
                    value={roomID}
                    onChange={(e) => setRoomID(e.target.value)}
                />
            <button onClick={joinRoom} ><FaChessKing /></button>
            </div>
            <div className="buttonbox">
                <button className="idbutton" onClick={generateRoomID}><FaRegIdCard /></button>
                <button className="copybutton"onClick={copyRoomID}><FiCopy /></button>
            </div>
            {!playerColor ? (
                <div style={{ marginTop: "20px" }}>
                   
                    <p style={{ fontSize: "14px", marginTop: "10px", color: "#555" }}>Waiting for an opponents...</p>
                </div>
            ) : null}
            {gameOverMessage && <h3>{gameOverMessage}</h3>}
            <div>
                <h3>Players</h3>
                
                    {players.map((player) => (
                            player.color === "w" ? (<img className="blackorWhite" src="/images/White-piece2.png" alt="White Player" />
            ) : (
                <img className="blackorWhite" src="/images/black-piece.png" alt="Black Player" />
            )
                
                    ))}
                
            </div>
            <Chessboard
                position={board}
                onPieceDrop={onDrop}
                onSquareClick={onSquareClick}
                arePiecesDraggable={playerColor === turn}
                customSquareStyles={Object.keys(highlightSquares).reduce(
                    (styles, square) => ({
                        ...styles,
                        [square]: customSquareStyles(square),
                    }),
                    {}
                )}
            />
        </div>
    );
}

export default App;
