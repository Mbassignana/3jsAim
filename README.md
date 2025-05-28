# 3jsAim - FPS Aim Training Game

A first-person shooter aim training game built with JavaScript and Web technologies. Features both Canvas 2D raycasting and Three.js 3D rendering engines.

## Creators

- **MBassignana** - [GitHub](https://github.com/Mbassignana/)
- **TBassignana** - [GitHub](https://github.com/tbassignana)

## How to Download and Run

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Local web server (recommended for best performance)

### Installation

1. **Clone or Download the Repository**
   ```bash
   git clone https://github.com/[repository-url]/3jsAim.git
   cd 3jsAim
   ```

2. **Run with Local Server** (Recommended)
   
   **Option A: Python**
   ```bash
   # Python 3
   python -m http.server 8000
   # Python 2
   python -m SimpleHTTPServer 8000
   ```
   
   **Option B: Node.js**
   ```bash
   npx serve .
   ```
   
   **Option C: PHP**
   ```bash
   php -S localhost:8000
   ```

3. **Open in Browser**
   Navigate to `http://localhost:8000` in your web browser

### Direct File Access
You can also open `index.html` directly in your browser, though some features may not work properly due to CORS restrictions.

## Game Controls

- **WASD** - Move around
- **Mouse** - Look around
- **Click** - Shoot / Request pointer lock
- **Escape** - Exit pointer lock

## Gameplay

- **Objective**: Shoot as many circles as possible in 2 minutes
- **Scoring**: 
  - Circles: +10 points
  - Animals (NPCs): -1 point
- **Timer**: 2 minutes per game session
- New circles spawn every 30 seconds

## Troubleshooting

### Game Won't Load
- **Check Console**: Open browser developer tools (F12) and check for error messages
- **Try Different Browser**: Some browsers may have compatibility issues
- **Use Local Server**: Avoid opening HTML file directly - use a local server instead
- **Clear Cache**: Clear browser cache and reload the page

### Performance Issues
- **Lower Quality**: Close other browser tabs and applications
- **Update Browser**: Ensure you're using the latest browser version
- **Check Hardware**: Game requires WebGL support for 3D rendering

### Controls Not Working
- **Pointer Lock**: Click on the game area to enable mouse controls
- **Keyboard**: Ensure the game window has focus
- **Check Permissions**: Some browsers may block pointer lock - check browser settings

### Audio/Visual Issues
- **WebGL Support**: Ensure your browser supports WebGL
- **Graphics Drivers**: Update your graphics card drivers
- **Hardware Acceleration**: Enable hardware acceleration in browser settings

### Common Error Messages
- **"THREE.js library not loaded"**: Refresh the page or check internet connection
- **"CANNON.js library not loaded"**: Physics engine failed to load - try refreshing
- **"Raw mode not supported"**: This is a development tool error and won't affect gameplay

## Technologies Used

### Core Technologies
- **HTML5** - Structure and markup
- **CSS3** - Styling and UI design
- **JavaScript (ES6+)** - Game logic and interactivity

### Graphics & Rendering
- **Canvas 2D API** - 2D raycasting renderer (fallback version)
- **Three.js** - 3D graphics library for WebGL rendering
- **WebGL** - Hardware-accelerated 3D graphics

### Physics & Game Engine
- **CANNON.js** - 3D physics engine for collision detection
- **Custom Physics** - Simple physics for 2D version

### Web APIs
- **Pointer Lock API** - Mouse control for FPS camera
- **requestAnimationFrame** - Smooth animation loop
- **Performance API** - High-resolution timing

### Architecture Patterns
- **Object-Oriented Programming** - Class-based game structure
- **Component System** - Modular game managers (Scene, Player, NPCs, UI)
- **Observer Pattern** - Event-driven interactions
- **Factory Pattern** - Object spawning and management

### Development Features
- **Modular Design** - Separate files for different game systems
- **Debug Mode** - Real-time debugging information
- **Cross-browser Compatibility** - Works on modern browsers
- **Responsive Design** - Adapts to different screen sizes

## Project Structure

```
3jsAim/
├── index.html          # Main game file with Canvas 2D version
├── js/                 # JavaScript modules
│   ├── main.js         # Game initialization and core loop
│   ├── scene.js        # 3D scene management
│   ├── player.js       # Player controls and camera
│   ├── physics.js      # Physics world management
│   ├── circle.js       # Target circle management
│   ├── npc.js          # NPC (animal) management
│   ├── ui.js           # User interface management
│   └── simple-physics.js # 2D physics utilities
├── assets/             # Game assets
│   ├── models/         # 3D models (if any)
│   └── textures/       # Texture files (if any)
└── README.md          # This file
```

## Browser Compatibility

- **Chrome/Chromium** - Fully supported
- **Firefox** - Fully supported  
- **Safari** - Supported (may require WebGL enabling)
- **Edge** - Fully supported
- **Mobile Browsers** - Limited support (desktop recommended)

---

**Enjoy the game and improve your aim!** 🎯