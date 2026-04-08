# 🎰 Casino Bingo Game

A real-time bingo game for casino promotions featuring a display screen and admin control panel.

## ✨ Features

- **Real-time Updates**: Instant synchronization between admin and display using WebSockets
- **Configurable Boards**: Choose 1-4 boards with sizes from 3x3 to 10x10
- **Custom Number Range**: Set min/max numbers for the boards
- **Auto Win Detection**: Automatically detects winning boards (rows, columns, diagonals)
- **Winner Celebration**: Animated "WINNER!" overlay on winning boards
- **Called Numbers Display**: Visual grid showing all called numbers with last called highlighted
- **Undo Functionality**: Remove the last called number
- **Full-screen Optimized**: Designed for TV/monitor displays
- **Animated Stamps**: Colorful animations when numbers are marked

## 🎨 Color Scheme

| Color | Hex | Usage |
|-------|-----|-------|
| Blue | `#007dba` | Primary accent, borders |
| Maroon | `#6d332f` | Secondary accent, stamps |
| Charcoal | `#212322` | Backgrounds |

## 🚀 Deployment to Render

1. Push this code to GitHub
2. Go to [render.com](https://render.com) and sign in
3. Click **New +** → **Web Service**
4. Connect your GitHub repository
5. Configure:
   - **Name**: `casino-bingo`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Click **Create Web Service**

Your game will be live at:
- **Display**: `https://your-app.onrender.com/display.html`
- **Admin**: `https://your-app.onrender.com/admin.html`

## 📖 How to Use

1. Open **Admin Panel** on your device
2. Configure game settings (boards, size, number range)
3. Click **NEW GAME**
4. Open **Display** on the main screen/TV
5. Call numbers from the admin panel
6. Winner overlay appears automatically when a board wins

## 📝 License

MIT License

