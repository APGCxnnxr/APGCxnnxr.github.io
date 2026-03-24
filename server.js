const WebSocket = require('ws');

const ADMIN_PASSWORD = "amplr-admin-2024"; 
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: port });

let onlineUsers = {}; 
let isGlobalLocked = false; // Persistent lock state

console.log(`Server live on port ${port}`);

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'join') {
                ws.userId = data.user.id;
                ws.userName = data.user.name;
                onlineUsers[ws.userId] = data.user.name;
                
                console.log(`Join: ${ws.userName}`);

                // If a new person joins while the site is locked, lock them immediately
                if (isGlobalLocked) {
                    ws.send(JSON.stringify({
                        type: 'serverAction',
                        action: 'lock',
                        targetId: ws.userId
                    }));
                }

                broadcastUserList(); 
            }

            if (data.type === 'adminCommand') {
                if (data.password !== ADMIN_PASSWORD) return;

                // Update global state if action is lock/unlock
                if (data.action === 'lock') isGlobalLocked = true;
                if (data.action === 'unlock') isGlobalLocked = false;

                const commandPayload = JSON.stringify({
                    type: 'serverAction',
                    action: data.action,
                    payload: data.payload,
                    targetId: data.targetId
                });

                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        if (data.targetId === 'all' || client.userId === data.targetId) {
                            client.send(commandPayload);
                        }
                    }
                });
            }
        } catch (e) { console.error(e); }
    });

    ws.on('close', () => {
        if (ws.userId) {
            delete onlineUsers[ws.userId];
            broadcastUserList();
        }
    });
});

function broadcastUserList() {
    const listData = JSON.stringify({ type: 'userListUpdate', users: onlineUsers });
    wss.clients.forEach(c => { if(c.readyState === WebSocket.OPEN) c.send(listData); });
}
