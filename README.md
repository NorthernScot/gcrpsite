# Gold Coast RP Community Website

A comprehensive community website for Gold Coast RP with user authentication, application management, Discord integration, and admin panel.

## Features

### 🏠 Frontend
- **Modern Design**: Dark theme with blurred background and responsive layout
- **Department Pages**: Individual pages for each department (LSPD, SAHP, BCSO, LSFD, SACD, Civilian)
- **Dropdown Navigation**: Smooth hover dropdown for department selection
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### 🔐 Authentication & User Management
- **User Registration/Login**: Secure authentication with JWT tokens
- **Profile Management**: Customizable profiles with avatar, banner, bio, and personal information
- **Role-Based Permissions**: Granular permission system for different user roles
- **Follow System**: Users can follow each other and view followers/following

### 📝 Application System
- **New Member Applications**: Complete application form with customizable questions
- **Application Status Tracking**: Users can view their application status (pending, under review, approved, rejected)
- **Admin Review System**: Admins can review, comment, and approve/reject applications
- **Notification System**: Users receive notifications for application updates and comments

### ⚙️ Admin Panel
- **User Management**: View, edit, ban/unban users
- **Role Management**: Create, edit, and assign roles with Discord integration
- **Application Management**: Review and manage all applications
- **Discord Integration**: Sync roles and ban users across Discord servers
- **Dashboard**: Overview of community statistics

### 🤖 Discord Integration
- **Role Syncing**: Automatically sync website roles with Discord roles
- **User Banning**: Ban users from both website and Discord simultaneously
- **Server Management**: View Discord server information and manage connections

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Discord.js** for Discord integration
- **Multer** for file uploads
- **Express Validator** for input validation

### Frontend
- **HTML5** with semantic markup
- **CSS3** with modern features (Grid, Flexbox, Custom Properties)
- **JavaScript** (ES6+) for interactivity
- **Responsive Design** with mobile-first approach

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Discord Bot Token (optional, for Discord integration)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gcrp-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/gcrp
   JWT_SECRET=your-super-secret-jwt-key
   SESSION_SECRET=your-session-secret-key
   DISCORD_TOKEN=your-discord-bot-token
   DISCORD_GUILD_ID=your-discord-server-id
   ```

4. **Create uploads directory**
   ```bash
   mkdir uploads
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the website**
   Open your browser and navigate to `http://localhost:3000`

## Database Setup

The application will automatically create the necessary collections when it starts. However, you may want to create some initial data:

### Create Default Role
```javascript
// In MongoDB shell or MongoDB Compass
db.roles.insertOne({
  name: "member",
  displayName: "Member",
  description: "Default member role",
  color: "#4fc3f7",
  permissions: ["applications.create"],
  isDefault: true,
  isActive: true,
  priority: 0
})
```

### Create Admin Role
```javascript
db.roles.insertOne({
  name: "admin",
  displayName: "Administrator",
  description: "Full system administrator",
  color: "#f44336",
  permissions: [
    "admin.dashboard",
    "users.view",
    "users.edit",
    "users.delete",
    "users.ban",
    "roles.view",
    "roles.create",
    "roles.edit",
    "roles.delete",
    "applications.view",
    "applications.approve",
    "applications.comment",
    "discord.sync",
    "discord.manage"
  ],
  isDefault: false,
  isActive: true,
  priority: 100
})
```

## Discord Bot Setup

1. **Create a Discord Application**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to "Bot" section and create a bot
   - Copy the bot token

2. **Invite Bot to Server**
   - Go to "OAuth2" > "URL Generator"
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: `Manage Roles`, `Ban Members`, `View Channels`
   - Use the generated URL to invite the bot

3. **Configure Environment**
   - Add your bot token to `.env` file
   - Add your server (guild) ID to `.env` file

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Applications
- `POST /api/applications/submit` - Submit new application
- `GET /api/applications/my-applications` - Get user's applications
- `GET /api/applications/:id` - Get specific application
- `POST /api/applications/:id/comments` - Add comment to application

### Users
- `GET /api/users/profile/:username` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/avatar` - Upload avatar
- `POST /api/users/banner` - Upload banner
- `POST /api/users/follow/:userId` - Follow user
- `DELETE /api/users/follow/:userId` - Unfollow user

### Admin
- `GET /api/admin/dashboard` - Get admin dashboard stats
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users/:id/ban` - Ban user
- `GET /api/admin/roles` - Get all roles
- `POST /api/admin/roles` - Create new role

### Discord
- `POST /api/discord/sync-roles/:userId` - Sync user roles with Discord
- `POST /api/discord/sync-all-roles` - Sync all users' roles
- `POST /api/discord/ban/:userId` - Ban user from Discord

## File Structure

```
gcrp-website/
├── models/              # Database models
│   ├── User.js
│   ├── Role.js
│   └── Application.js
├── routes/              # API routes
│   ├── auth.js
│   ├── users.js
│   ├── applications.js
│   ├── admin.js
│   └── discord.js
├── middleware/          # Custom middleware
│   └── auth.js
├── services/           # External services
│   └── discord.js
├── uploads/            # File uploads
├── public/             # Static files
├── server.js           # Main server file
├── package.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please contact the development team or create an issue in the repository.

---

**Gold Coast RP Community Website** - Built with ❤️ for the GCRP community 

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

## Logo and Images
- Place your main logo as `gcrp-logo.png` in the project root.
- Place a Discord logo as `discord-logo.png` in the project root (for Join Discord buttons).
- For best appearance, add a city background image as `city-bg.jpg` in the project root.
- For department cards, use badge images named `lspd-badge.png`, `bcso-badge.png`, `lsfd-badge.png`, `sahp-badge.png`, `sacd-badge.png`, `civilian-badge.png` in the project root.
- You can use placeholder images if you don't have your own yet.

## Customization
- Update the Discord invite link in `index.html` to your real server.
- Update event and department info as needed. 