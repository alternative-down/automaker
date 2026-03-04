# Automaker (Web UI Fork)

Automaker is an autonomous AI development studio that transforms how you build software. Instead of manually writing every line of code, you describe features on a Kanban board and watch as AI agents powered by Claude Agent SDK automatically implement them. Built with React, Vite, and Express, Automaker provides a complete workflow for managing AI agents through a web browser, with features like real-time streaming, git worktree isolation, plan approval, and multi-agent task execution.

## Key Features

- 🤖 **Autonomous AI Agents** - Powered by Claude Agent SDK
- 🌐 **Web UI** - Run directly in your browser
- 📊 **Kanban Workflow** - Manage features and implementation progress
- 🌿 **Git Worktree Isolation** - Safely implement features in isolated environments
- 💬 **Real-time Streaming** - Watch agents work in real-time
- 🛠️ **Multi-Agent Execution** - Parallelize development tasks

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Access the UI at `http://localhost:3007`

## Architecture

- `apps/ui`: React + Vite frontend
- `apps/server`: Node.js + Express backend
- `libs/`: Shared utility and type libraries
