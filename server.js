const WebSocket = require('ws');

// Render gives us a dynamic PORT, or we default to 10000
const port = process.env.PORT || 10000; 
const wss = new WebSocket.Server({ port: port });

let clients = new Map(); // Stores connections and user info

wss.on('connection', (ws) => {
    console.log('New connection established!');

    ws.on('message', (messageAsString) => {
        try {
            const data = JSON.parse(messageAsString);

            // 1. Save user info when they join
            if (data.type === 'join') {
                clients.set(ws, data.user);
                broadcastUserList();
            } 
            
            // 2. Route admin commands to the correct player(s)
            else if (data.type === 'adminCommand') {
                const sender = clients.get(ws);
                if (sender && sender.isAdmin) {
                    executeAdminCommand(data);
                }
            }
        } catch (err) {
            console.error("Invalid message received", err);
        }
    });

    // 3. Clean up when someone closes the tab
    ws.on('close', () => {
        clients.delete(ws);
        broadcastUserList();
    });
});

// Sends the player list to the admin panel
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

// Sends the lock/unlock/redirect command
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

console.log(`WebSocket server is running on port ${port}`);
