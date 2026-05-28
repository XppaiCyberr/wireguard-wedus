# WireGuard Wedus

**WireGuard Wedus** is a premium, ultra-modern Windows client manager for WireGuard VPNs. Built on a high-performance **Tauri v2** Rust core with a **React + TypeScript** frontend, it leverages a custom borderless design, fluid animations, and a rich, glassmorphism dark theme with a signature glowing mint/teal accent (`#00D4AA`).

---

## ✨ Features

- 🛡️ **Seamless Tunnel Operations**: Import, create, update, and delete WireGuard tunnels easily through visual forms or direct raw configuration edits.
- ⚡ **Real-time Interface Analytics**: Visual Native Canvas-based speedometer and bandwidth throughput graph showing transfer rx/tx and connection duration dynamically.
- 💼 **Windows Service Integration**: Automatically installs tunnels as elevated Windows services (`WireGuardTunnel$`) so they remain connected even after the GUI closes.
- 🎨 **Premium Aesthetics**: Pure CSS glassmorphism, responsive title bars, and glowing interactive cards.
- 🤫 **Silent Executions**: All Windows CLI calls (`wg.exe`, `sc.exe`, `net.exe`) are handled silently behind the scenes with suppressed shell windows.
- 📥 **Config Import & Export**: Import your existing `.conf` configuration files instantly and export tunnels securely.

---

## 🛠️ Tech Stack

- **Backend**: Rust, Tauri v2
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Vanilla CSS (Tailwind-free)
- **Package Manager**: pnpm

---

## 📥 Prerequisites

To run or build the application, make sure you have the following installed:
1. **WireGuard for Windows**: The app leverages the official `wireguard.exe` and `wg.exe` command-line interfaces.
2. **Rust & Node.js**: Required to compile the project.
3. **pnpm**: Global package manager (`npm install -g pnpm`).

---

## 🚀 Running in Development

Since the app modifies Windows Network Interfaces and Services, **your terminal must be run as Administrator**.

1. Clone the repository:
   ```bash
   git clone https://github.com/XppaiCyberr/wireguard-wedus.git
   cd wireguard-wedus
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Launch the development environment (Rust compiler + React dev server):
   ```bash
   pnpm tauri dev
   ```

---

## 📦 Building Production Installers

To package the application into standalone Windows installers:
```bash
pnpm tauri build
```
The build system will output:
- **NSIS Setup**: `src-tauri/target/release/bundle/nsis/WireGuard Wedus_0.1.0_x64-setup.exe`
- **MSI Installer**: `src-tauri/target/release/bundle/msi/WireGuard Wedus_0.1.0_x64_en-US.msi`

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
