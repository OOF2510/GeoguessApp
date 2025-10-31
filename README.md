# 🌍 GeoFinder App

A fun and addictive mobile game where you test your geography knowledge by guessing locations from street view images. Compete for high scores on the global leaderboard! Built with React Native and powered by my [GeoGuess API](https://geo.api.oof2510.space), which serves pre-processed street view images and location data. The API handles all the heavy lifting by:
1. Fetching images from Mapillary's global street view network
2. Enhancing location data using OpenStreetMap's Nominatim service
3. Delivering everything in a clean, optimized format for the mobile app

## 📋 Table of Contents

- [How to Play](#how-to-play)
- [Game Features](#game-features)
- [Installation (Android Only)](#installation-android-only)
- [Tech Stack](#tech-stack)
- [Integration with geoguess-api](#integration-with-geoguess-api)
- [Getting Started (Developers)](#getting-started-developers)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## 🎮 How to Play

### Starting Out
- Tap "Start Game" to begin a 10-round challenge
- Each round shows a random street view image from somewhere in the world

### Making Guesses
- Type in the country name where you think the image was taken
- You get 3 attempts to guess correctly
- Points are awarded based on how quickly you guess:
  - 1st try: 3 points
  - 2nd try: 2 points
  - 3rd try: 1 point

### During the Game
- See your current score and personal best at the bottom of the screen
- Incorrect guesses are shown to help you narrow it down
- Get instant feedback after each guess
- Tap on the image to zoom in for a closer look

### After 10 Rounds
- View your final score and how many you got right
- Choose to play another 10 rounds to improve your score
- Your best score is automatically saved

### Leaderboard
- When you're done, return to the main menu to submit your score
- Check the leaderboard to see how you rank against other players
- Play as many 10-round sessions as you want to climb the ranks!

## 🎯 Game Features

- 🖼️ Mapillary street view images
- 🌎 Global locations
- 🏆 Competitive leaderboard
- 🔄 Smooth gameplay experience
- 🔒 Secure API access
- 📱 [GeoFinder Android app (APK download available)](https://github.com/oof2510/GeoguessApp/releases/latest)

Compete with players worldwide! The leaderboard shows:
- Global rankings
- Top scores
- When scores were set

## Installation (Android Only)

1. Head over to the [Releases](https://github.com/oof2510/GeoguessApp/releases/latest) page
2. Download the latest `.apk` file
3. Open the downloaded file to install (you might need to allow installation from unknown sources)
4. That's it! Open the app and start playing

*Note: Currently only available for Android. Google Play Store coming soon!*

## 🔧 Tech Stack

### Frontend (This App)
- **React Native 0.82.1** - Cross-platform mobile app framework
- **TypeScript (TSX)** - Type-safe JavaScript
- **React Navigation** - Screen management and navigation
  - @react-navigation/native
  - @react-navigation/native-stack
  - @react-navigation/stack
- **Firebase** - App security and services
  - @react-native-firebase/app
  - @react-native-firebase/app-check
- **UI & UX**
  - react-native-gesture-handler - Touch gestures
  - react-native-safe-area-context - Safe area insets
  - react-native-screens - Native navigation components
  - react-native-image-zoom-viewer - Image zooming functionality
- **Data**
  - Axios - HTTP client for API requests
  - @react-native-async-storage/async-storage - Local data persistence
  - react-native-fs - File system access for caching and storage

  ### Backend ([geoguess-api](https://github.com/oof2510/geoguess-api))
- **Node.js** with **Express** - API server
- **MongoDB** - For storing game sessions and leaderboard data
- **Mapillary Integration** - Fetches and serves street view images
- **OpenStreetMap Nominatim** - Provides accurate country data for locations
- **Firebase App Check** - For API security

## 🔄 Integration with GeoGuess API

This app connects to my [geoguess-api](https://github.com/oof2510/geoguess-api) which handles:

- **Image Processing**: Fetches images from Mapillary and enriches them with OpenStreetMap location data
- **Game Sessions**: Manages game state and scoring
- **Leaderboard**: Tracks top scores globally
- **Security**: Uses Firebase App Check to prevent abuse

### API Endpoints Used:
- `GET /getImage` - Fetches a random street view image with location data
- `POST /game/start` - Starts a new game session
- `POST /game/submit` - Submits a completed game score
- `GET /leaderboard/top` - Gets the top scores

## 🚀 Getting Started (Developers)

### Prerequisites
- Node.js
- npm or yarn
- React Native development environment (Android)
- Android Emulator or physical device required

### Installation
```bash
# Clone the repo
git clone https://github.com/oof2510/GeoguessApp.git
cd GeoguessApp

# Install dependencies
npm install

# Run on Android
npm run android

# Other useful scripts
npm start          # Start Metro bundler
npm run ios        # Run on iOS (if available)
npm run lint       # Run ESLint
npm run prettier   # Format code with Prettier
```

*Note: You'll need [Node.js](https://nodejs.org/), [Git](https://git-scm.com/), and Android development tools installed. This app is currently Android-only.*

## 🤝 Contributing

Feel free to submit issues and enhancement requests. Pull requests are welcome!

## 📄 License

This project is licensed under the Mozilla Public License 2.0 - see the [LICENSE.md](LICENSE.md) file for details.

## 🙏 Acknowledgments

- Mapillary for providing the street view imagery
- OpenStreetMap for accurate location and country data
- The React Native community
- Special thanks to my friends for giving me feedback and helping me improve the app

---

Made with ❤️ by [oof2510](https://oof2510.space) | [API Status](https://geo.api.oof2510.space/health)
