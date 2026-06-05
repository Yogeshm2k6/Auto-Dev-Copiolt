# 🤖 AutoDev Copilot — Autonomous Self-Healing AI Developer Agent

> An AI-powered autonomous coding assistant that can **build**, **fix**, **explain**, and **run** software projects with self-healing capabilities. It integrates as a **VS Code Extension** with a **Python FastAPI Backend** powered by **Groq LLM**.

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [System Architecture](#-system-architecture)
3. [Technology Stack](#-technology-stack)
4. [Module Descriptions](#-module-descriptions)
5. [VS Code Extension](#-vs-code-extension)
6. [Features](#-features)
7. [Installation & Setup](#-installation--setup)
8. [Usage Guide](#-usage-guide)
9. [Self-Healing Mechanism](#-self-healing-mechanism)
10. [API Endpoints](#-api-endpoints)
11. [Safety & Guardrails](#-safety--guardrails)
12. [Project Structure](#-project-structure)
13. [Future Scope](#-future-scope)

---

## 🎯 Project Overview

**AutoDev Copilot** is a full-stack autonomous development agent that combines:

- A **Python backend** (`self-healing-agent/`) — the AI brain that scans codebases, generates fixes, applies patches, and runs commands.
- A **VS Code Extension** (`autodev-vscode/`) — a beautiful sidebar chat UI that lets developers interact with the AI agent directly inside their editor.

### Key Innovation
The agent features a **3-retry self-healing loop**: when running a project, if the code crashes, the agent automatically:
1. Captures the error output
2. Sends it to the LLM for analysis
3. Receives and applies the fix (code patches + install commands)
4. Retries the execution — up to 3 times

This creates a **fully autonomous debug → fix → retry cycle** without any human intervention.

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   VS Code Extension                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Sidebar  │  │ Commands │  │  Hover Provider  │  │
│  │ Chat UI  │  │ (ask/fix │  │  (Inline hints)  │  │
│  │          │  │  explain │  │                  │  │
│  │          │  │  run)    │  │                  │  │
│  └────┬─────┘  └────┬─────┘  └──────────────────┘  │
│       │              │                               │
│       └──────┬───────┘                               │
│              │ HTTP POST (JSON)                      │
│              │ + workspace path                      │
└──────────────┼───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│              FastAPI Backend (server.py)              │
│                  Port 8001                            │
│  ┌────────────────────────────────────────────────┐  │
│  │           SelfHealingAgent (agent.py)           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────────┐  │  │
│  │  │ Project  │ │  Error   │ │      Fix      │  │  │
│  │  │ Scanner  │ │  Parser  │ │   Generator   │  │  │
│  │  │          │ │          │ │   (Groq LLM)  │  │  │
│  │  └──────────┘ └──────────┘ └───────────────┘  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────────┐  │  │
│  │  │ Command  │ │  Patch   │ │    Error      │  │  │
│  │  │  Runner  │ │ Applier  │ │   Memory      │  │  │
│  │  └──────────┘ └──────────┘ └───────────────┘  │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│              Groq Cloud LLM API                      │
│        Model: llama-3.3-70b-versatile                │
│        Fallback: llama-3.1-8b-instant                │
└──────────────────────────────────────────────────────┘
```

---

## 🛠 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | VS Code Extension API (TypeScript) | Sidebar UI, command palette, hover tooltips |
| **Backend** | Python 3.10 + FastAPI + Uvicorn | REST API server, agent orchestration |
| **AI/LLM** | Groq API (LLaMA 3.3 70B / 3.1 8B) | Code generation, error analysis, fix generation |
| **Communication** | HTTP POST (JSON) | Extension ↔ Backend data exchange |
| **Packaging** | VSCE (VS Code Extension CLI) | `.vsix` packaging for local installation |

---

## 📦 Module Descriptions

### Backend (Python) — `self-healing-agent/`

| Module | File | Description |
|--------|------|-------------|
| **Entry Point** | `main.py` | Interactive CLI with command loop (`ask`, `fix`, `explain`, `run`) |
| **API Server** | `server.py` | FastAPI server exposing REST endpoints for the VS Code extension |
| **Agent Core** | `agent.py` | Main orchestrator — coordinates scanning, LLM calls, patching, and execution |
| **Project Scanner** | `project_scanner.py` | Recursively scans directories, builds file trees, reads source code for context |
| **Fix Generator** | `fix_generator.py` | LLM integration (Groq API) — generates structured JSON responses with code fixes |
| **Patch Applier** | `patch_applier.py` | Writes AI-generated code to the filesystem with path traversal protection |
| **Command Runner** | `command_runner.py` | Executes shell commands (`npm install`, `node app.js`, etc.) with output capture |
| **Error Parser** | `error_parser.py` | Extracts and classifies errors (Missing Dependency, Syntax Error, etc.) |
| **Tools/Utilities** | `tools.py` | Logger configuration + ErrorMemory (JSON-based fix history database) |

### Frontend (TypeScript) — `autodev-vscode/`

| Module | File | Description |
|--------|------|-------------|
| **Extension Host** | `src/extension.ts` | Registers all VS Code commands, hover provider, and sidebar |
| **Sidebar Provider** | `src/sidebar.ts` | Webview chat UI with mode-selector buttons, typing indicator, and permission flow |

---

## ✨ Features

### 1. Autonomous Commands
- **`ask`** — Describe a project in natural language → AI scaffolds the entire codebase
- **`fix`** — Point at a file/folder → AI scans for errors and auto-patches them
- **`explain`** — Get a plain-English architectural breakdown of any codebase
- **`run`** — Execute any script with a 3-retry self-healing debug loop

### 2. Premium VS Code Sidebar UI
- Gradient header with animated glowing icon
- Glassmorphism message bubbles (user/bot/status/error styles)
- Animated typing indicator (bouncing dots)
- **Mode-selector quick buttons** (New Project, Fix, Explain, Run)
- Glowing input bar with focus effects
- Smooth slide-in animations for messages

### 3. Self-Healing Loop
- Automatic error capture → LLM analysis → patch + install → retry
- Structured **Auto-Healing Report** showing every step taken
- Error type classification (Missing Dependency, Syntax Error, etc.)

### 4. Workspace Awareness
- Extension injects the active VS Code workspace path into every API request
- Backend writes files and runs commands in the correct user directory
- Works across multiple VS Code windows simultaneously

### 5. Safety Guardrails
- **Self-Preservation**: AI is strictly instructed to never modify core agent files
- **Path Traversal Protection**: PatchApplier validates all file paths against the root directory
- **Permission Prompts**: VS Code popup asks for user approval before executing patches/commands
- **Context Truncation**: Automatic context reduction to stay within LLM token limits
- **Model Fallback**: Auto-switches from 70B → 8B model when token limits are exceeded

---

## 🚀 Installation & Setup

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **VS Code 1.80+**
- **Groq API Key** (free at [console.groq.com](https://console.groq.com))

### Step 1: Backend Setup
```bash
cd self-healing-agent

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate     # Windows
# source .venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure API key
echo GROQ_API_KEY=your_api_key_here > .env
```

### Step 2: Start Backend Server
```bash
python server.py
# Server runs on http://127.0.0.1:8001
```

### Step 3: Install VS Code Extension
```bash
cd autodev-vscode
npm install
npm run compile
npx @vscode/vsce package --allow-missing-repository
```
Then in VS Code: `Ctrl+Shift+P` → "Install from VSIX" → select `autodev-vscode-0.0.10.vsix`

### Step 4: Use the Extension
1. Open any folder in VS Code
2. Click the AutoDev Copilot icon in the sidebar
3. Start chatting! e.g. "ask create a weather app using Node.js"

---

## 📖 Usage Guide

### Via Terminal (CLI Mode)
```bash
python main.py

agent> ask create a calculator app in Python
agent> fix calculator.py
agent> explain calculator.py
agent> run calculator.py
```

### Via VS Code Extension
1. **New Project**: Click ⚡ → Type "create a REST API with Express" → Send
2. **Fix Errors**: Click 🔧 → Type "app.js" → Send
3. **Explain Code**: Click 📚 → Type "." → Send
4. **Run Project**: Click ▶ → Type "app.js" → Send

---

## 🔄 Self-Healing Mechanism

```
┌─────────────────────┐
│   User runs app.js  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌──────────────┐
│  CommandRunner.run() │────►│  Success? ✅  │──► Done! Print report
└──────────┬──────────┘     └──────────────┘
           │ ❌ Error
           ▼
┌─────────────────────┐
│  ErrorParser.extract │  ← Captures stderr/stdout
│  + identify_type()  │  ← Classifies: "Missing Dependency"
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  FixGenerator (LLM) │  ← Sends error + context to AI
│  → JSON response    │  ← Gets {patches, commands, message}
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  PatchApplier.apply  │  ← Writes fixed code to files
│  CommandRunner.run() │  ← Runs "npm install axios" etc.
└──────────┬──────────┘
           │
           ▼
     Retry (up to 3x)
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description | Payload |
|--------|----------|-------------|---------|
| POST | `/api/ask` | Generate a project or answer a query | `{query, target, context, workspace}` |
| POST | `/api/apply` | Execute patches and commands | `{patches, commands, workspace}` |
| POST | `/api/fix` | Scan and fix errors in code | `{query, target, context, workspace}` |
| POST | `/api/explain` | Explain a codebase or file | `{query, target, context, workspace}` |
| POST | `/api/run` | Run a script with self-healing | `{query, target, context, workspace}` |

---

## 🛡 Safety & Guardrails

1. **Self-Preservation Rule**: The system prompt explicitly forbids the AI from modifying its own core files (`agent.py`, `server.py`, `main.py`, etc.)
2. **Path Traversal Protection**: `PatchApplier` validates that all resolved paths remain within the specified root directory
3. **User Permission Flow**: The VS Code extension shows a native popup before applying any patches or commands
4. **Token Limit Management**: Automatic context truncation (8K-10K chars) and model fallback (70B → 8B)
5. **Error Memory**: Past errors and their fixes are stored in `error_memory.json` for future reference

---

## 📁 Project Structure

```
nritt/
├── self-healing-agent/          # Python Backend
│   ├── main.py                  # CLI Entry Point
│   ├── server.py                # FastAPI REST Server
│   ├── agent.py                 # Core Agent Orchestrator
│   ├── fix_generator.py         # LLM Integration (Groq)
│   ├── project_scanner.py       # Codebase Scanner
│   ├── patch_applier.py         # File Writer (with security)
│   ├── command_runner.py        # Shell Command Executor
│   ├── error_parser.py          # Error Classifier
│   ├── tools.py                 # Logger + Error Memory
│   ├── requirements.txt         # Python Dependencies
│   ├── .env                     # API Key (GROQ_API_KEY)
│   └── vscode_system_prompt.txt # AI Behavior Instructions
│
├── autodev-vscode/              # VS Code Extension
│   ├── package.json             # Extension Manifest
│   ├── src/
│   │   ├── extension.ts         # Extension Host (commands, hover)
│   │   └── sidebar.ts           # Sidebar Chat UI (Webview)
│   ├── out/                     # Compiled JavaScript
│   └── autodev-vscode-0.0.10.vsix  # Packaged Extension
│
└── .venv/                       # Python Virtual Environment
```

---

## 🔮 Future Scope

1. **Inline Ghost Text Completions** — AI-powered autocomplete as you type
2. **Quick Fix Lightbulb** — Automatic error detection with one-click fixes
3. **Multi-Model Support** — Add OpenAI GPT-4o, Claude, and local Ollama models
4. **Streaming Responses** — Real-time token-by-token responses in the chat
5. **Git Integration** — Auto-commit after successful fixes
6. **Test Generation** — Automatically write unit tests for generated code
7. **Debugger Integration** — Connect to VS Code's built-in debugger for advanced error capture

---

## 👨‍💻 Author

**Yogesh** — Built with ❤️ using Python, TypeScript, and Groq LLM

---

*This project demonstrates the potential of autonomous AI agents in software development — from project scaffolding to self-healing error recovery, all integrated seamlessly into the developer's IDE.*
