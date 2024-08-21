const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();

// Serve static files or routes if needed
app.get('/', (req, res) => {
    res.send('Hello, world!');
});

// Create an HTTP server and attach it to Express
const server = http.createServer(app);

// Set up WebSocket server on top of the HTTP server
const wss = new WebSocket.Server({ server });

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        console.log('Received:', message);

        // Broadcast the message to all connected clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Start the HTTP server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is listening on http://localhost:${PORT}`);
});
