# Gold Coast RP Website - Deployment Guide

## Quick Deploy Options

### Option 1: Railway (Recommended - Free & Easy)

1. **Sign up for Railway**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy your app**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will automatically detect it's a Node.js app

3. **Set environment variables**
   - Go to your project settings
   - Add these environment variables:
   ```
   NODE_ENV=production
   JWT_SECRET=your-super-secret-jwt-key-change-this
   SESSION_SECRET=your-session-secret-key-change-this
   FRONTEND_URL=https://your-railway-domain.railway.app
   ```

4. **Get your domain**
   - Railway provides a free `.railway.app` domain
   - You can also connect a custom domain

### Option 2: Render (Free Tier Available)

1. **Sign up for Render**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create a new Web Service**
   - Connect your GitHub repository
   - Set build command: `npm install`
   - Set start command: `npm start`

3. **Environment variables**
   ```
   NODE_ENV=production
   JWT_SECRET=your-super-secret-jwt-key-change-this
   SESSION_SECRET=your-session-secret-key-change-this
   FRONTEND_URL=https://your-app-name.onrender.com
   ```

### Option 3: Heroku (Paid)

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Deploy**
   ```bash
   heroku create your-app-name
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

3. **Set environment variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your-super-secret-jwt-key-change-this
   heroku config:set SESSION_SECRET=your-session-secret-key-change-this
   ```

### Option 4: Vercel (Free Tier)

1. **Sign up for Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Connect your GitHub repository

2. **Configure for Node.js**
   - Vercel will auto-detect your Node.js app
   - Set build command: `npm install`
   - Set output directory: `./`

3. **Environment variables**
   Add the same environment variables as above

## Local Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create .env file**
   ```bash
   cp env.example .env
   ```

3. **Update .env with your values**
   - Generate secure JWT_SECRET and SESSION_SECRET
   - Set your Discord bot token if using Discord integration

4. **Start the server**
   ```bash
   npm start
   ```

5. **Access your site**
   - Open http://localhost:3000

## Security Checklist

Before going live:

- [ ] Change default JWT_SECRET
- [ ] Change default SESSION_SECRET
- [ ] Set NODE_ENV=production
- [ ] Update FRONTEND_URL to your actual domain
- [ ] Configure CORS properly
- [ ] Set up SSL/HTTPS
- [ ] Configure rate limiting
- [ ] Set up proper error handling

## Custom Domain Setup

1. **Purchase a domain** (Namecheap, GoDaddy, etc.)
2. **Point DNS to your hosting provider**
3. **Configure SSL certificate** (usually automatic)
4. **Update FRONTEND_URL in environment variables**

## Monitoring & Maintenance

- Set up uptime monitoring (UptimeRobot, Pingdom)
- Configure error logging (Sentry, LogRocket)
- Set up automated backups
- Monitor server resources

## Troubleshooting

### Common Issues:

1. **Port binding errors**
   - Ensure PORT environment variable is set
   - Check if port is already in use

2. **Database issues**
   - Ensure database is properly initialized
   - Check file permissions for SQLite

3. **CORS errors**
   - Verify FRONTEND_URL is correct
   - Check CORS configuration in server.js

4. **Static files not loading**
   - Ensure express.static is configured
   - Check file paths are correct

### Getting Help:
- Check server logs for error messages
- Verify all environment variables are set
- Test locally before deploying
- Use deployment platform's built-in logging 