const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const DATA_FILE = path.join(__dirname, '../servers.json');

// Helper: Read from JSON
const loadServers = () => {
    if (fs.existsSync(DATA_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        } catch (err) {
            console.error("Error reading servers.json", err);
            return [];
        }
    }
    return []; // Fallback to empty if no file
};

// Helper: Save to JSON
const saveServers = (servers) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(servers, null, 2));
    } catch (err) {
        console.error("Error saving servers.json", err);
    }
};

const addServer = (newServer) => {
    const servers = loadServers();
    // Prevent duplicates
    if (servers.find(s => s.ip === newServer.ip && s.name === newServer.name)) {
        return false;
    }
    servers.push({
        id: Date.now(),
        ...newServer,
        ports: newServer.ports.map(Number),
        lastSeen: null // New field for tracking
    });
    saveServers(servers);
    return true;
};

// --- NEW FEATURES ---

const deleteServer = (id) => {
    let servers = loadServers();
    const initialLen = servers.length;
    servers = servers.filter(s => s.id !== Number(id));
    
    if (servers.length !== initialLen) {
        saveServers(servers);
        return true;
    }
    return false;
};

const updateServer = (id, data) => {
    const servers = loadServers();
    const index = servers.findIndex(s => s.id === Number(id));
    if (index !== -1) {
        // Merge old data with new data
        servers[index] = { ...servers[index], ...data };
        saveServers(servers);
        return true;
    }
    return false;
};

// Update status timestamp without full re-save of config if possible, 
// but for simplicity we save the whole file here.
const updateLastSeen = (id, timestamp) => {
    const servers = loadServers();
    const s = servers.find(s => s.id === id);
    if (s) {
        s.lastSeen = timestamp;
        saveServers(servers);
    }
}

module.exports = { loadServers, addServer, deleteServer, updateServer, updateLastSeen };