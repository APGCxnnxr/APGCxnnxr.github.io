const WebSocket = require('ws');

// 1. SET YOUR SECRET PASSWORD HERE
const ADMIN_PASSWORD = "supersecretpassword123"; 

// Render automatically assigns a PORT environment variable, so we use that.
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: port });

console.log(`WebSocket server started on port ${port}`);

wss.on('connection', (ws) => {
    console.log('New connection detected.');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // Handle a player joining
            if (data.type === 'join') {
                ws.userId = data.user.id; // Attach the user ID to their specific connection
                console.log(`User joined: ${data.user.name} (${ws.userId})`);
            }

            // Handle the Admin Commands
            if (data.type === 'adminCommand') {
                
                // --- SECURITY CHECK ---
                if (data.password !== ADMIN_PASSWORD) {
                    console.log("WARNING: Failed admin login attempt! Incorrect password.");
                    return; // Stop right here, ignore the command
                }

                console.log(`Admin command approved: [${data.action}] Targeting: [${data.targetId}]`);

                // Prepare the message to send back to the clients
                const commandToBroadcast = JSON.stringify({
                    action: data.action,
                    payload: data.payload,
                    targetId: data.targetId
                });

                // Loop through every connected player and send the command
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        
                        // Check if the command is for "all" OR if it matches this specific client's ID
                        if (data.targetId === 'all' || client.userId === data.targetId) {
                            client.send(commandToBroadcast);
                        }
                    }
                });
            }

        } catch (error) {
            console.error('Error parsing incoming message:', error);
        }
    });

    ws.on('close', () => {
        console.log('A client disconnected.');
    });
});
