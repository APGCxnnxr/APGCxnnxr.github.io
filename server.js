const WebSocket = require('ws');

const port = process.env.PORT || 10000; 
const wss = new WebSocket.Server({ port: port }, () => {
    console.log(`WebSocket server running on port ${port}`);
});

const ADMIN_PASSWORD = "AdminConBad";

const clients = new Map();
const admins = new Set(); // NEW: Keep track of active admin panels

// Helper function to push the user list to all admins
function pushUserListToAdmins() {
    const userList = Array.from(clients.values());
    admins.forEach((adminWs) => {
        if (adminWs.readyState === WebSocket.OPEN) {
            adminWs.send(JSON.stringify({
                action: 'userListUpdate',
                payload: userList
            }));
        }
    });
}

wss.on('connection', (ws) => {
    console.log('New connection detected.');

    ws.on('message', (messageAsString) => {
        try {
            const data = JSON.parse(messageAsString);

            // 1. Regular player joins
            if (data.type === 'join') {
                clients.set(ws, data.user);
                console.log(`${data.user.name} (${data.user.id}) joined the playground.`);
                pushUserListToAdmins(); // Automatically update the admin dropdown!
                return;
            }

            // 2. Admin logs in
            if (data.type === 'getUsers') {
                if (data.password !== ADMIN_PASSWORD) return; 
                
                admins.add(ws); // Register this connection as an admin
                pushUserListToAdmins(); // Send them the initial list
                return;
            }

            // 3. Admin fires a command
            if (data.type === 'adminCommand') {
                if (data.password !== ADMIN_PASSWORD) return;

                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN && !admins.has(client)) {
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

    ws.on('close', () => {
        // If an admin leaves, remove them from the admin set
        if (admins.has(ws)) {
            admins.delete(ws);
        } else {
            // If a regular player leaves, remove them and update the admins
            const user = clients.get(ws);
            if (user) console.log(`${user.name} left the playground.`);
            clients.delete(ws);
            pushUserListToAdmins(); // Update the dropdown so ghosts are removed
        }
    });
});
wss.on('connection', function connection(ws, req) {
  // 1. Log EVERY connection attempt immediately
  console.log(`[WSS] New connection attempt from: ${req.socket.remoteAddress}`);

  ws.on('message', function message(data) {
    // 2. Log EVERY raw message before trying to parse it
    console.log('[WSS] Raw message received:', data.toString());
    
    try {
      const parsed = JSON.parse(data);
      // Handle your admin commands here
    } catch (err) {
      console.error('[WSS] Failed to parse message:', err);
    }
  });
});
