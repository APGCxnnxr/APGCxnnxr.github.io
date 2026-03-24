const WebSocket = require('ws');

// Render gives us a dynamic PORT, or we default to 10000
const port = process.env.PORT || 10000; 
const wss = new WebSocket.Server({ port: port }, () => {
    console.log(`WebSocket server running on port ${port}`);
});

// 🛑 YOUR SECRET ADMIN PASSWORD 🛑
// Change this to whatever you want. Don't tell your friends!
const ADMIN_PASSWORD = "AdminConBad";

// This Map will keep track of every connected player's info
const clients = new Map();

wss.on('connection', (ws) => {
    console.log('New connection detected.');

    ws.on('message', (messageAsString) => {
        try {
            const data = JSON.parse(messageAsString);

            // 1. Handle regular players joining the site
            if (data.type === 'join') {
                clients.set(ws, data.user);
                console.log(`${data.user.name} (${data.user.id}) joined the playground.`);
                return;
            }

            // 2. Handle your admin.html asking for the list of players
            if (data.type === 'getUsers') {
                // Security Check: Does the password match?
                if (data.password !== ADMIN_PASSWORD) {
                    console.warn("Unauthorized attempt to get user list.");
                    return; 
                }
                
                // If the password matches, send the list of players back to the admin panel
                const userList = Array.from(clients.values());
                ws.send(JSON.stringify({
                    action: 'userListUpdate',
                    payload: userList
                }));
                return;
            }

            // 3. Handle actual Admin Commands (Lock, Message, Redirect)
            if (data.type === 'adminCommand') {
                // Security Check: Does the password match?
                if (data.password !== ADMIN_PASSWORD) {
                    console.warn(`Unauthorized command attempt: ${data.action}`);
                    return; // Ignore the command entirely
                }

                console.log(`Admin executed: ${data.action} on target: ${data.targetId}`);

                // Broadcast the command to everyone currently connected
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            action: data.action,
                            targetId: data.targetId,
                            payload: data.payload
                        }));
                    }
                });
            }

        } catch (error) {
            console.error("Error processing message:", error);
        }
    });

    // When a player closes the tab, remove them from the list
    ws.on('close', () => {
        const user = clients.get(ws);
        if (user) console.log(`${user.name} left the playground.`);
        clients.delete(ws);
    });
});
