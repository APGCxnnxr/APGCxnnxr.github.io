const WebSocket = require('ws');

// Render provides a PORT environment variable. We use 10000 as a fallback.
const port = process.env.PORT || 10000; 
const wss = new WebSocket.Server({ port: port });

let clients = new Map(); // Stores the connection and user data

wss.on('connection', (ws) => {
    console.log('New player connected');

    ws.on('message', (messageAsString) => {
        try {
            const data = JSON.parse(messageAsString);

            // 1. When a user joins, save their info
            if (data.type === 'join') {
                clients.set(ws, data.user);
                broadcastUserList();
            } 
            
            // 2. When an admin sends a command, route it to the target
            else if (data.type === 'adminCommand') {
                const sender = clients.get(ws);
                // Candor note: We are trusting the frontend 'isAdmin' flag here. 
                if (sender && sender.isAdmin) {
                    executeAdminCommand(data);
                }
            }
        } catch (err) {
            console.error("Invalid message format", err);
        }
    });

    // 3. When a user leaves, remove them and update admins
    ws.on('close', () => {
        clients.delete(ws);
        broadcastUserList();
    });
});

// Send the active player list ONLY to admins
function broadcastUserList() {
    const userList = Array.from(clients.values());
    const msg = JSON.stringify({ action: 'userListUpdate', payload: userList, targetId: 'all' });
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            const user = clients.get(client);
            if (user && user.isAdmin) {
                client.send(msg);
            }
        }
    });
}

// Forward the lock/redirect/message command to the right player
function executeAdminCommand(commandData) {
    const msg = JSON.stringify(commandData);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            const user = clients.get(client);
            if (commandData.targetId === 'all' || (user && user.id === commandData.targetId)) {
                client.send(msg);
            }
        }
    });
}

console.log(`WebSocket server running on port ${port}`);
