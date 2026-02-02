const express = require('express');
const router = express.Router();
const net = require('net');
const ping = require('ping'); // Uses the 'ping' package from package.json
const { loadServers, addServer, deleteServer, updateLastSeen } = require('../utils/configLoader');

// TCP Port Check (Service Status)
const checkPort = (ip, port) => {
    return new Promise((resolve) => {
        const start = Date.now();
        const socket = new net.Socket();
        socket.setTimeout(1500); // 1.5s timeout for ports

        socket.on('connect', () => {
            const time = Date.now() - start;
            socket.destroy();
            resolve({ port, isOpen: true, time });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({ port, isOpen: false, error: 'Timeout' });
        });

        socket.on('error', () => {
            socket.destroy();
            resolve({ port, isOpen: false, error: 'Closed' });
        });

        socket.connect(port, ip);
    });
};

router.get('/status', async (req, res) => {
    const servers = loadServers();

    const results = await Promise.all(servers.map(async (server) => {
        // 1. ICMP PING (The "Host" check)
        // This gives us true packet loss and system latency
        const pingRes = await ping.promise.probe(server.ip, {
            timeout: 2,
            extra: ["-c", "2"] // Send 2 packets for better accuracy
        });

        // 2. TCP PORTS (The "Service" check)
        const portChecks = await Promise.all(
            server.ports.map(port => checkPort(server.ip, port))
        );

        // Logic: Server is "Alive" if Ping works OR any port is open
        // (Sometimes firewalls block ping but allow port 80)
        const isAlive = pingRes.alive || portChecks.some(p => p.isOpen);

        // Update Last Seen if alive
        if (isAlive) {
            // We do this asynchronously so we don't block the response
            updateLastSeen(server.id, Date.now()); 
        }

        return {
            id: server.id,
            name: server.name,
            ip: server.ip,
            isAlive: isAlive,
            // Use Ping time if available, otherwise avg port time
            responseTime: pingRes.alive ? Math.round(pingRes.avg) : null,
            packetLoss: pingRes.packetLoss, // NEW: Detailed metric
            lastSeen: server.lastSeen,      // NEW: Historical metric
            portStatus: portChecks
        };
    }));

    res.json(results);
});

// Add Server
router.post('/add', (req, res) => {
    const { name, ip, ports } = req.body;
    if (!name || !ip) return res.status(400).json({ error: 'Missing fields' });
    
    const portArray = Array.isArray(ports) ? ports : ports.split(',').map(p => p.trim());
    
    const success = addServer({ name, ip, ports: portArray });
    res.json({ success });
});

// Delete Server (New Endpoint)
router.delete('/server/:id', (req, res) => {
    const success = deleteServer(req.params.id);
    if(success) res.json({ success: true });
    else res.status(404).json({ error: "Server not found" });
});

module.exports = router;