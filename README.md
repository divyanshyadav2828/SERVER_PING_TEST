# Server Ping Test 🚀

A robust and professional LAN Server Status Monitor built with Node.js and Express. This application provides real-time monitoring of your server infrastructure, allowing you to track connectivity and specific port availability with a sleek, user-friendly interface.

![Server Ping Test Dashboard](https://raw.githubusercontent.com/divyanshyadav2828/SERVER_PING_TEST/refs/heads/main/images/SERVER_PING_TEST.png)
![Server Ping Test Details](https://raw.githubusercontent.com/divyanshyadav2828/SERVER_PING_TEST/refs/heads/main/images/SERVER_PING_TEST1.png)

## ✨ Features

- **Real-time Monitoring**: constantly checks the status of your configured servers.
- **Visual Status Indicators**: Instantly see if a server is Online 🟢 or Offline 🔴.
- **Port Checking**: Monitor specific ports (e.g., 80, 443) for service availability.
- **Easy Configuration**: Simple JSON-based configuration to add or remove servers.
- **Clean UI**: A modern, responsive dashboard to view your network health at a glance.

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

## 🚀 Setup & Installation

Follow these steps to get your monitor running locally:

### 1. Clone the Repository

```bash
git clone https://github.com/divyanshyadav2828/SERVER_PING_TEST.git
cd SERVER_PING_TEST
```

### 2. Install Dependencies

Install the necessary packages using npm:

```bash
npm install
```

### 3. Configuration

Open the `servers.json` file to configure the servers you want to monitor. Add your servers in the following format:

```json
[
  {
    "id": 1,
    "name": "My Web Server",
    "ip": "192.168.1.10",
    "ports": [80, 443]
  },
  {
    "id": 2,
    "name": "Database",
    "ip": "db.example.com",
    "ports": [5432]
  }
]
```

### 4. Run the Application

Start the server using:

```bash
npm start
```

You should see output similar to:

```
-----------------------------------------
🚀 LAN Monitor running!
📡 Local:   http://localhost:3055
-----------------------------------------
```

## 🖥️ Usage

Open your web browser and navigate to:

`http://localhost:3055`

You will see the dashboard updating in real-time with the status of your defined servers.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open-source and available for use.
