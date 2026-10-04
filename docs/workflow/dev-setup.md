# CodeBrix Developer Setup Guide

**Prerequisites & Environment Configuration for CodeBrix Desktop (React + Tauri)**

---

## 1. Prerequisites

- **Node.js**: >= 20.0.0 (v24 LTS recommended, see `.nvmrc`)
- **pnpm**: >= 10.0.0 (v11+ recommended)
- **Rust & Cargo**: Latest stable toolchain (`rustup update stable`)
- **Python**: 3.10+ (for runtime ML execution)

### Platform-Specific Dependencies

#### macOS
- Xcode Command Line Tools: `xcode-select --install`

#### Linux (Debian / Ubuntu)
```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

#### Windows
- Microsoft C++ Build Tools
- WebView2 Runtime (pre-installed on Windows 10/11)

---

## 2. Initial Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Mayank3613/CodeBrix.git
   cd CodeBrix
   ```

2. **Install Workspace Dependencies**:
   ```bash
   pnpm install
   ```

3. **Verify Environment**:
   ```bash
   pnpm run ci
   ```

---

## 3. Running CodeBrix Desktop

### Development Mode (with Hot Reload)
```bash
# Starts Vite dev server + Tauri native window
pnpm run dev
```

Or run directly within `apps/desktop`:
```bash
cd apps/desktop
pnpm run dev
```

### Production Build
```bash
pnpm run build
```
This builds the frontend bundle and compiles the native Tauri binary.
