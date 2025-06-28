# PoolTracker

A modern React Native mobile app for pool service technicians to manage their daily operations, track chemicals, view schedules, and handle billing.

## 🎯 Features

### 📱 Screens
- **Home Screen**: Today's tasks, weekly reminders, and quick stats
- **Current Pool**: Next pool on schedule, manual search, and quick actions
- **Chemical Tracker**: Manual chemical logging with pool volume and strength tracking
- **Map/Route**: Interactive map with different colored pins for pools and Leslie's stores
- **Schedule**: Weekly calendar view with appointment details
- **Billing**: Account management with paid/unpaid status, receipts, and expenses

### 🎨 Design
- Clean, modern "pool tech" aesthetic
- Pool blue (#00BFFF) primary color scheme
- Card-based layouts with shadows and rounded corners
- Mobile-friendly spacing and typography

### 🔧 Tech Stack
- **React Native** with Expo
- **React Navigation** (bottom tabs)
- **Firebase** (Firestore + Auth) - configured but using mock data
- **react-native-maps** for location features
- **Victory Native** (ready for future charts)
- **React Native Vector Icons**

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS) or Android Studio (for Android)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd PoolTracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on device/simulator**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app on your phone

## 📁 Project Structure

```
PoolTracker/
├── App.js                 # Main app component with navigation
├── app.json              # Expo configuration
├── firebase.js           # Firebase configuration
├── package.json          # Dependencies
├── screens/              # Screen components
│   ├── HomeScreen.js     # Dashboard with tasks and reminders
│   ├── CurrentPoolScreen.js # Pool search and current pool info
│   ├── ChemicalTrackerScreen.js # Chemical logging and tracking
│   ├── MapScreen.js      # Interactive map with pool locations
│   ├── ScheduleScreen.js # Weekly calendar and appointments
│   └── BillingScreen.js  # Accounts, receipts, and expenses
└── README.md             # This file
```

## 🎨 App Features

### Home Screen
- **Today's Date**: Prominently displayed at the top
- **Today's Tasks**: Card-style list showing account and task details
- **Weekly Reminders**: Upcoming tasks for the week
- **Quick Stats**: Pools today, completed, and pending counts

### Current Pool Screen
- **Pool Search**: Manual search by pool name
- **Next Pool**: Displays upcoming pool with tasks and details
- **Photo Test Strip Analysis**: Placeholder for future feature
- **Quick Actions**: Add chemical, log reading, photo log, set reminder

### Chemical Tracker Screen
- **Pool Information**: Volume, chemical strength, last test date
- **Add Chemical Entry**: Modal with chemical type, amount, pool, volume, strength
- **Recent Entries**: List of chemical additions with timestamps
- **Chart Placeholder**: Future automation features
- **Monthly Stats**: Entries, pools, and expenses

### Map Screen
- **Interactive Map**: Shows all pools and Leslie's stores
- **Color-coded Pins**:
  - Gray: All pools
  - Blue: Today's pools
  - Orange: Pools with to-do tasks
  - Teal: Leslie's Pool Supply locations
- **Filter Buttons**: Toggle different pin types
- **Legend**: Explains pin colors
- **Quick Stats**: Total pools, today's count, to-do count, stores

### Schedule Screen
- **Week Navigation**: Navigate between weeks
- **Daily Appointments**: Card-style layout for each day
- **Appointment Details**: Time, pool, address, tasks
- **Today Badge**: Highlights current day
- **Quick Actions**: Navigate, call, view details
- **Weekly Summary**: Total appointments, unique pools, busy days

### Billing Screen
- **Tab Navigation**: Accounts, Receipts, Expenses
- **Accounts Tab**:
  - Summary cards (Revenue, Outstanding, Profit)
  - Account list with paid/unpaid status
  - Service details and due dates
  - Action buttons (View Invoice, Send Reminder, Call Client)
- **Receipts Tab**: Paid receipts with download options
- **Expenses Tab**: Expense tracking with categories and suppliers

## 🔮 Future Features

### Coming Soon
- **Photo Test Strip Analysis**: AI-powered chemical reading from photos
- **Automated Chemical Suggestions**: Smart recommendations based on pool conditions
- **Real-time Sync**: Firebase integration for live data
- **Push Notifications**: Reminders and alerts
- **Offline Support**: Work without internet connection
- **Advanced Charts**: Victory Native integration for analytics

### Technical Improvements
- **Authentication**: User login/registration
- **Data Persistence**: Local storage and cloud sync
- **Image Upload**: Photo storage and management
- **GPS Navigation**: Turn-by-turn directions to pools
- **Invoice Generation**: PDF creation and emailing

## 🛠 Development Notes

### Mock Data
The app currently uses mock data for demonstration. To integrate with real data:
1. Update Firebase configuration in `firebase.js`
2. Replace mock data arrays with Firebase queries
3. Implement authentication flow
4. Add error handling and loading states

### Styling
- Uses React Native StyleSheet for consistent styling
- Pool blue (#00BFFF) as primary accent color
- Card-based design with shadows and rounded corners
- Responsive layout with proper spacing

### Navigation
- Bottom tab navigation using React Navigation
- Icons from Ionicons (included with Expo)
- Consistent header styling across screens

## 📱 Platform Support

- **iOS**: Full support with native features
- **Android**: Full support with location permissions
- **Web**: Basic support (some features may be limited)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the code comments (designed for beginners)
- Open an issue on GitHub

---

**Built with ❤️ for pool service technicians** 