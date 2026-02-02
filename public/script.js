const API_URL = '/api/status';
const ADD_API_URL = '/api/add';
const POLLING_INTERVAL = 20000; // 20 Seconds

// DOM Elements
const serverGridEl = document.getElementById('server-grid');
const addServerForm = document.getElementById('add-server-form');
const refreshBtn = document.getElementById('refresh-btn');
const lastUpdateTimeEl = document.getElementById('last-update-time');

// Audio Context
let audioCtx;
let oscillator;
let gainNode;
let sirenInterval;
let isAlerting = false;

// --- INITIALIZATION ---
async function init() {
    // 0. Initialize Visuals (Particles, etc.)
    initParticles();

    // 1. Initial Load (Show Skeletons first)
    setRefreshLoading(true, true); // true = show skeletons
    await fetchData();
    setRefreshLoading(false);

    // 2. Start Automatic Polling
    setInterval(async () => {
        if (!document.getElementById('view-dashboard').classList.contains('hidden')) {
            setRefreshLoading(true, false); // false = no skeletons on background poll
            await fetchData();
            setRefreshLoading(false);
        }
    }, POLLING_INTERVAL);

    // 3. Audio Unlock
    document.body.addEventListener('click', initAudioContext, { once: true });
    document.body.addEventListener('keydown', initAudioContext, { once: true });

    // 4. Listeners
    addServerForm.addEventListener('submit', handleAddServer);
    refreshBtn.addEventListener('click', async () => {
        setRefreshLoading(true, true); // explicit click = show skeletons
        await fetchData();
        setRefreshLoading(false);
    });

    addDynamicStyles();

    // 5. Sidebar Toggle
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('closed');
    });
}

// --- PARTICLE NETWORK BACKGROUND ---
function initParticles() {
    const canvas = document.createElement('canvas');
    canvas.id = 'particles-js';
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particlesArray = [];
    const numberOfParticles = 50; // Adjust for density

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = Math.random() * 0.5 - 0.25;
            this.speedY = Math.random() * 0.5 - 0.25;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            // Bounce
            if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
            if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;
        }
        draw() {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initP() {
        particlesArray = [];
        for (let i = 0; i < numberOfParticles; i++) {
            particlesArray.push(new Particle());
        }
    }

    function animateP() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
            particlesArray[i].draw();

            // Draw Connections
            for (let j = i; j < particlesArray.length; j++) {
                const dx = particlesArray[i].x - particlesArray[j].x;
                const dy = particlesArray[i].y - particlesArray[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 150) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(59, 130, 246, ${0.1 - distance / 1500})`;
                    ctx.lineWidth = 1;
                    ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
                    ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animateP);
    }

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initP();
    });

    initP();
    animateP();
}

// --- HOLOGRAPHIC TILT EFFECT ---
function initTiltEffect() {
    const cards = document.querySelectorAll('.server-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', handleTilt);
        card.addEventListener('mouseleave', resetTilt);
    });
}

function handleTilt(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate rotation (max 10 degrees)
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
}

function resetTilt(e) {
    const card = e.currentTarget;
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
}

// --- DATA FETCHING & LOGIC ---
async function fetchData() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        renderDashboard(data);
        updateHeaderStats(data);
        checkAlertStatus(data);

        lastUpdateTimeEl.textContent = new Date().toLocaleTimeString();
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

function checkAlertStatus(servers) {
    const anyServerDown = servers.some(server => !server.isAlive);
    const body = document.body;

    if (anyServerDown) {
        if (!body.classList.contains('red-alert')) {
            body.classList.add('red-alert');
        }
        initAudioContext();
        startSiren();
    } else {
        body.classList.remove('red-alert');
        stopSiren();
    }
}

// --- HELPERS FOR LATENCY CALCULATION ---
function getEffectiveLatency(server) {
    // 1. Try server response time (Ping)
    if (server.responseTime !== null && server.responseTime !== undefined && server.responseTime !== 'unknown') {
        return parseFloat(server.responseTime);
    }
    // 2. Fallback: Calculate average from open ports
    if (server.portStatus && Array.isArray(server.portStatus)) {
        const openPorts = server.portStatus.filter(p => p.isOpen && p.time);
        if (openPorts.length > 0) {
            const total = openPorts.reduce((acc, p) => acc + p.time, 0);
            return total / openPorts.length;
        }
    }
    return null;
}

// --- RENDERING ---
function renderDashboard(servers) {
    serverGridEl.innerHTML = '';

    if (servers.length === 0) {
        serverGridEl.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted); background:var(--glass-bg); border-radius:16px;">
                <i data-lucide="server-off" style="width:48px; height:48px; margin-bottom:16px; opacity:0.5;"></i>
                <p>No active monitors configured.</p>
            </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    servers.forEach((server, index) => {
        const isOverallUp = server.isAlive;
        const latency = getEffectiveLatency(server);
        const card = document.createElement('div');

        card.style.animationDelay = `${index * 100}ms`;
        card.className = `server-card ${isOverallUp ? 'online' : 'offline'}`;

        let portsHtml = '';
        if (server.portStatus && server.portStatus.length > 0) {
            portsHtml = '<div class="port-grid">';
            server.portStatus.forEach(p => {
                const pClass = p.isOpen ? 'open' : 'closed';
                portsHtml += `
                    <div class="port-badge ${pClass}">
                        <span>:${p.port}</span>
                        <span style="opacity:0.7; font-size:0.9em; margin-left:4px;">
                            ${p.isOpen ? Math.round(p.time) + 'ms' : 'ERR'}
                        </span>
                    </div>
                `;
            });
            portsHtml += '</div>';
        }

        let statusText = isOverallUp ? 'System Active' : 'CRITICAL ERROR';
        let statusSubtext = '';

        if (!isOverallUp && server.lastSeen) {
            const minsAgo = Math.floor((Date.now() - server.lastSeen) / 60000);
            statusSubtext = minsAgo < 1 ? ' (Just now)' : ` (${minsAgo}m ago)`;
        }

        // SVG Heartbeat for Online status
        const heartbeatSvg = isOverallUp ? `
            <svg class="heartbeat-line" viewBox="0 0 24 24">
                <path class="heartbeat-path" d="M2,12 h3 l2,-6 l4,12 l4,-8 l2,4 h3" />
            </svg>
        ` : '';

        card.innerHTML = `
            <div class="card-header">
                <div class="server-name">${server.name}</div>
                <div class="status-badge ${isOverallUp ? 'online' : 'offline'}">
                    ${isOverallUp ? heartbeatSvg : ''}
                    <span>${statusText}${statusSubtext}</span>
                </div>
            </div>
            
            <div class="card-body">
                <div class="metric-row">
                    <span class="label">Host Address</span>
                    <span class="value">${server.ip}</span>
                </div>
                <div class="metric-row">
                    <span class="label">Response Time</span>
                    <span class="value" style="color: ${getLatencyColor(latency)}">
                        ${latency !== null ? Math.round(latency) + ' ms' : '--'}
                    </span>
                </div>
                ${(server.packetLoss !== undefined && server.packetLoss !== 'unknown') ? `
                <div class="metric-row">
                    <span class="label">Packet Loss</span>
                    <span class="value" style="color: ${parseFloat(server.packetLoss) > 0 ? '#f43f5e' : '#fff'}">
                        ${Math.round(server.packetLoss)}%
                    </span>
                </div>` : ''}
                ${portsHtml}
            </div>
        `;
        serverGridEl.appendChild(card);
    });

    // Attach Tilt Listeners to new cards
    initTiltEffect();

    if (window.lucide) lucide.createIcons();
}

// --- SKELETON LOADING ---
function renderSkeletons() {
    serverGridEl.innerHTML = '';
    // Generate 4 skeleton cards
    for (let i = 0; i < 4; i++) {
        const skel = document.createElement('div');
        skel.className = 'skeleton-card';
        serverGridEl.appendChild(skel);
    }
}

// --- SVG CHARTS FOR HEADER ---
function createSvgChart(percent, color) {
    // Circumference of circle with r=15.9155 is ~100
    const dashArray = `${percent}, 100`;
    return `
        <div class="stat-chart-container">
            <svg viewBox="0 0 36 36" class="circular-chart">
                <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path class="circle" stroke="${color}" stroke-dasharray="${dashArray}" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
        </div>
    `;
}

function updateHeaderStats(servers) {
    const total = servers.length || 1;
    const onlineCount = servers.filter(s => s.isAlive).length;
    const offlineCount = servers.length - onlineCount;

    const onlinePercent = (onlineCount / total) * 100;
    const offlinePercent = (offlineCount / total) * 100;

    // Update STAT CARDS (Replace icons/text with charts where appropriate)

    // 1. Total Servers
    const totalEl = document.querySelector('#total-servers').closest('.stat-card');
    totalEl.querySelector('p').innerText = servers.length;

    // 2. Online Servers (Chart)
    const onlineEl = document.querySelector('#online-servers').parentElement.parentElement; // stat-card
    // Replace icon with chart if not already replaced
    if (!onlineEl.querySelector('.stat-chart-container')) {
        const iconDiv = onlineEl.querySelector('.stat-icon');
        iconDiv.outerHTML = createSvgChart(onlinePercent, '#10b981'); // Green
    } else {
        onlineEl.querySelector('.stat-chart-container').outerHTML = createSvgChart(onlinePercent, '#10b981');
    }
    onlineEl.querySelector('#online-servers').innerText = onlineCount;

    // 3. Offline Servers (Chart)
    const offlineEl = document.querySelector('#offline-servers').parentElement.parentElement;
    if (!offlineEl.querySelector('.stat-chart-container')) {
        const iconDiv = offlineEl.querySelector('.stat-icon');
        iconDiv.outerHTML = createSvgChart(offlinePercent, '#f43f5e'); // Red
    } else {
        offlineEl.querySelector('.stat-chart-container').outerHTML = createSvgChart(offlinePercent, '#f43f5e');
    }
    offlineEl.querySelector('#offline-servers').innerText = offlineCount;

    // 4. Latency
    // We calculate "active" latencies using our helper now
    const activeLatencies = servers
        .map(s => getEffectiveLatency(s))
        .filter(l => l !== null);

    if (activeLatencies.length > 0) {
        const totalLat = activeLatencies.reduce((acc, l) => acc + l, 0);
        document.getElementById('avg-latency').innerText = Math.round(totalLat / activeLatencies.length) + ' ms';
    } else {
        document.getElementById('avg-latency').innerText = '--';
    }
}

// --- UTILS ---
function setRefreshLoading(isLoading, showSkeleton) {
    const icon = refreshBtn.querySelector('svg') || refreshBtn.querySelector('i');

    if (isLoading) {
        refreshBtn.disabled = true;
        refreshBtn.style.opacity = '0.7';
        if (icon) icon.style.animation = 'spin 1s linear infinite';

        if (showSkeleton) renderSkeletons();

    } else {
        refreshBtn.disabled = false;
        refreshBtn.style.opacity = '1';
        if (icon) icon.style.animation = 'none';
    }
}

function getLatencyColor(ms) {
    if (!ms && ms !== 0) return '#fff';
    if (ms < 50) return '#34d399';
    if (ms < 150) return '#facc15';
    return '#f43f5e';
}

// Audio System (Siren)
function initAudioContext() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function startSiren() {
    if (isAlerting || !audioCtx) return;
    isAlerting = true;
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 600;
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    gainNode.gain.value = 0.5;
    oscillator.start();
    const modulate = () => {
        if (!oscillator) return;
        const now = audioCtx.currentTime;
        oscillator.frequency.linearRampToValueAtTime(1500, now + 0.1);
        oscillator.frequency.linearRampToValueAtTime(600, now + 0.25);
    };
    modulate();
    sirenInterval = setInterval(modulate, 250);
}

function stopSiren() {
    if (!isAlerting) return;
    isAlerting = false;
    if (sirenInterval) clearInterval(sirenInterval);
    if (oscillator) {
        try { oscillator.stop(); oscillator.disconnect(); } catch (e) { }
        oscillator = null;
    }
}

// Navigation
window.switchView = function (viewName) {
    document.querySelectorAll('.view-section').forEach(el => {
        el.style.opacity = '0';
        setTimeout(() => el.classList.add('hidden'), 200);
    });
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${viewName}`).classList.add('active');
    setTimeout(() => {
        const target = document.getElementById(`view-${viewName}`);
        target.classList.remove('hidden');
        void target.offsetWidth;
        target.style.opacity = '1';
    }, 200);
};

async function handleAddServer(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = 'Deploying...';
    btn.disabled = true;
    const payload = {
        name: document.getElementById('input-name').value,
        ip: document.getElementById('input-ip').value,
        ports: document.getElementById('input-ports').value
    };
    try {
        const res = await fetch(ADD_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            addServerForm.reset();
            switchView('dashboard');
            await fetchData();
        } else {
            alert('Failed to add server.');
        }
    } catch (err) {
        alert('Network error.');
    } finally {
        btn.innerHTML = '<i data-lucide="plus"></i> Add Server';
        btn.disabled = false;
        if (window.lucide) lucide.createIcons();
    }
}

function addDynamicStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes spin { 100% { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
}

init();