# 🔐 P2P Messenger

> **Version:** 1.0.0  
> **Last Updated:** 2025-12-17

Aplikasi pesan peer-to-peer (P2P) dengan End-to-End Encryption (E2E) menggunakan libp2p untuk komunikasi antar node dan WebSocket untuk koneksi client-server.

---

## 📋 Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Getting Started](#getting-started)
5. [Project Structure](#project-structure)
6. [Documentation](#documentation)
7. [Security](#security)

---

## ✨ Features

### Core Features
- **User Authentication** - Register, login dengan JWT
- **Real-time Messaging** - WebSocket-based chat
- **P2P Network** - Decentralized node-to-node communication via libp2p
- **End-to-End Encryption (E2E)** - RSA-OAEP + AES-GCM hybrid encryption

### P2P Features
- **Node Discovery** - Connect to peers via multiaddr
- **Message Propagation** - Gossip protocol untuk broadcast pesan
- **Peer Management** - Track connected peers dan connection status

### Security Features
- **Client-side Key Generation** - RSA-2048 key pairs
- **Hybrid Encryption** - AES-256-GCM untuk pesan, RSA untuk key exchange
- **Private Key Storage** - IndexedDB (never leaves browser)
- **Public Key Distribution** - Server stores dan distributes public keys

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │  Auth Store  │  │   Socket.IO  │  │  Crypto Lib  │  │  Key Store  │  │
│  │  (Zustand)   │  │   Client     │  │  (WebCrypto) │  │ (IndexedDB) │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ REST API / WebSocket
┌────────────────────────────────┴────────────────────────────────────────┐
│                           BACKEND (Flask)                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │   Routes     │  │  Socket.IO   │  │  P2P Manager │  │  Database   │  │
│  │  (REST API)  │  │   Events     │  │  (libp2p)    │  │  (SQLite)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │
│                                             │                            │
│                                    ┌────────┴────────┐                   │
│                                    │  Gossip Handler │                   │
│                                    └────────┬────────┘                   │
└────────────────────────────────────────────┼────────────────────────────┘
                                             │ libp2p
                                    ┌────────┴────────┐
                                    │   Other Peers   │
                                    └─────────────────┘
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Flask** | Web framework |
| **Flask-SocketIO** | WebSocket support |
| **SQLAlchemy** | ORM |
| **SQLite** | Database |
| **JWT** | Authentication |
| **py-libp2p** | P2P networking |
| **bcrypt** | Password hashing |

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework |
| **TypeScript** | Type safety |
| **Zustand** | State management |
| **Socket.IO Client** | WebSocket client |
| **Web Crypto API** | Encryption |
| **IndexedDB** | Local key storage |
| **Tailwind CSS** | Styling |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- pnpm (recommended) atau npm

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# atau: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Run server
python run.py
```

Server akan berjalan di `http://localhost:8080`

### Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install
# atau: npm install

# Run development server
pnpm dev
# atau: npm run dev
```

Frontend akan berjalan di `http://localhost:3000`

### Docker Setup (Optional)

```bash
# Build dan run semua services
docker-compose up --build
```

---

## 📁 Project Structure

```
p2p-messager/
├── backend/
│   ├── app/
│   │   ├── models/          # Database models
│   │   │   ├── base.py      # BaseModel, mixins
│   │   │   └── user.py      # User model
│   │   ├── routes/          # API endpoints
│   │   │   ├── auth.py      # Auth endpoints
│   │   │   ├── keys.py      # Key exchange endpoints
│   │   │   ├── p2p_routes.py # P2P endpoints
│   │   │   └── socket_events.py # WebSocket handlers
│   │   ├── p2p/             # P2P networking
│   │   │   ├── p2p_manager.py
│   │   │   └── gossip_handler.py
│   │   └── utils/           # Utilities
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js pages
│   │   ├── components/      # React components
│   │   ├── lib/             # Utilities
│   │   │   ├── api.ts       # API client
│   │   │   ├── crypto.ts    # Encryption functions
│   │   │   ├── e2eSetup.ts  # Auto E2E setup on login
│   │   │   ├── keyStore.ts  # IndexedDB key storage
│   │   │   └── useSocket.ts # WebSocket hook
│   │   └── store/           # Zustand stores
│   └── package.json
├── API_DOCUMENTATION.md     # REST API & WebSocket docs
├── MODELS_DOCUMENTATION.md  # Data models docs
└── README.md               # This file
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, design patterns, data flows |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | REST API endpoints, WebSocket events, Postman collection |
| [MODELS_DOCUMENTATION.md](./MODELS_DOCUMENTATION.md) | Database models, TypeScript interfaces, data structures |

---

## 🔒 Security

### End-to-End Encryption Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  SENDER                                                           │
│  1. Generate random AES-256 key                                  │
│  2. Encrypt message with AES-GCM                                 │
│  3. Encrypt AES key with recipient's RSA public key              │
│  4. Send encrypted payload (server cannot read)                  │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │  Encrypted Payload    │
                    │  (Server is blind)    │
                    └───────────┬───────────┘
                                │
┌───────────────────────────────┴──────────────────────────────────┐
│  RECEIVER                                                         │
│  1. Decrypt AES key with private key                             │
│  2. Decrypt message with AES key                                 │
│  3. Read original message                                        │
└──────────────────────────────────────────────────────────────────┘
```

### Security Features

| Feature | Implementation |
|---------|----------------|
| **Password Hashing** | bcrypt with salt |
| **JWT Tokens** | HS256 algorithm |
| **Key Encryption** | RSA-OAEP 2048-bit |
| **Message Encryption** | AES-256-GCM |
| **Private Key Storage** | IndexedDB (client-side only) |
| **Public Key Distribution** | Server-side storage |

### Security Notes

⚠️ **Important:**
- Private keys NEVER leave the browser
- Server CANNOT decrypt E2E messages
- Messages are ephemeral (not persisted to database)
- Each message uses unique AES key

### E2E Auto-Setup

E2E encryption disetup **otomatis** setelah login/register:

1. 🔑 RSA-2048 key pair generate otomatis (jika belum ada)
2. 💾 Private key disimpan di IndexedDB browser
3. 📤 Public key diupload ke server untuk distribusi
4. ✅ E2E ready untuk kirim/terima pesan encrypted

---

## 📄 License

MIT License

---

*Documentation generated on 2025-12-17*