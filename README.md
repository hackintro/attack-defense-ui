# Attack-Defense CTF Visualization

A real-time visualization dashboard for Attack-Defense Capture The Flag competitions, providing live attack monitoring, team leaderboards, and interactive network graphs.

Made by ethan42 and deathwish24

## Features

- Real-time Attack Visualization: Interactive network graph showing live attacks between teams
- Dynamic Leaderboard: Live scoring and team rankings with performance metrics
- Responsive Design: Optimized for desktop and mobile devices
- Dark/Light Theme: Toggle between themes with persistent settings
- Zoom & Pan: Interactive graph navigation with touch support for mobile
- Service Status Monitoring: Visual indicators for service health and attacks

## Tech Stack

- Frontend: React 18 + Vite
- Styling: Tailwind CSS + shadcn/ui components
- Visualization: D3.js for interactive graphs
- Routing: React Router DOM
- State Management: React hooks with local storage persistence
- Build Tool: Vite with TypeScript support

## Installation

```bash
bun install
```

## Development

Start the development server:

```bash
bun run dev
```

The application will be available at `http://localhost:5173`

## Production

Build for production:

```bash
bun run build
```

Format code:

```bash
bun run format
```

Check formatting:

```bash
bun run format:check
```