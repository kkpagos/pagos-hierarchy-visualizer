# Pagos Hierarchy Visualizer

A React application built with Vite for visualizing hierarchical data with beautiful animations.

## Features

- 🚀 Built with Vite for fast development
- ⚛️ React 18 with modern hooks
- 🎨 Styled with TailwindCSS
- 🎭 Smooth animations with Framer Motion
- 📊 CSV parsing with PapaParse
- 📱 Responsive design

## Prerequisites

Before running this project, make sure you have Node.js installed on your system. You can download it from [nodejs.org](https://nodejs.org/).

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
pagos-hierarchy-visualizer/
├── src/
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # Application entry point
│   └── index.css        # Global styles with TailwindCSS
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # TailwindCSS configuration
└── postcss.config.js    # PostCSS configuration
```

## Technologies Used

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **PapaParse** - CSV parsing library
- **ESLint** - Code linting

## Getting Started

The application is ready to use! The main App component includes:

- A responsive header with the project title
- A beautiful landing page with feature cards
- Smooth animations powered by Framer Motion
- TailwindCSS styling for a modern look
- Ready-to-use CSV upload functionality (UI only)

To add CSV parsing functionality, you can extend the upload button's onClick handler to use PapaParse for parsing uploaded files.
