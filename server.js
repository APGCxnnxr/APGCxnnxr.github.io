const WebSocket = require('ws');

// 1. SET YOUR SECRET PASSWORD HERE
const ADMIN_PASSWORD = "amplr_admin335"; 

const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: port });

// This object keeps track of everyone currently connected
let onlineUsers = {}; 

console.log(`Server heartbeat started on port ${port}`);

wss.on('connection', (ws) => {
    // We'll give each connection a temporary internal ID until they 'join'
    ws.isAlive = true;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // --- PLAYER JOINING ---
            if (data.type === 'join') {
                ws.userId = data.user.id;
                ws.userName = data.user.name;
                
                // Add to our global tracking list
                onlineUsers[ws.userId] = data.user.name;
                
                console.log(`User Logged: ${ws.userName} (${ws.userId})`);
                broadcastUserList(); 
            }

            // --- ADMIN COMMANDS ---
            if (data.type === 'adminCommand') {
                // Security Check
                if (data.password !== ADMIN_PASSWORD) {
                    console.log(`BLOCKED: Unauthorized admin attempt from ${ws.userName || 'Unknown'}`);
                    return;
                }

                console.log(`ADMIN ACTION: ${data.action} -> Target: ${data.targetId}`);

                const commandPayload = JSON.stringify({
                    type: 'serverAction', // Differentiates from list updates
                    action: data.action,
                    payload: data.payload,
                    targetId: data.targetId
                });

                // Send to the targeted user(s)
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        if (data.targetId === 'all' || client.userId === data.targetId) {
                            client.send(commandPayload);
                        }
                    }
                });
            }

        } catch (error) {
            console.error('Message Error:', error);
        }
    });

    ws.on('close', () => {
        if (ws.userId) {
            console.log(`${ws.userName} left the playground.`);
            delete onlineUsers[ws.userId];
            broadcastUserList(); // Update the list for the admin
        }
    });
});

// Sends the current list of names/IDs to everyone
function broadcastUserList() {
    const listData = JSON.stringify({
        type: 'userListUpdate',
        users: onlineUsers
    });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(listData);
        }
    });
}
