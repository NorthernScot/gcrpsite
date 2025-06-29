const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Gold Coast RP Website - Railway Deployment Helper\n');

// Check if Railway CLI is installed
try {
  execSync('railway --version', { stdio: 'ignore' });
  console.log('✅ Railway CLI is installed');
} catch (error) {
  console.log('❌ Railway CLI not found. Installing...');
  try {
    execSync('npm install -g @railway/cli', { stdio: 'inherit' });
    console.log('✅ Railway CLI installed successfully');
  } catch (installError) {
    console.log('❌ Failed to install Railway CLI. Please install manually:');
    console.log('   npm install -g @railway/cli');
    process.exit(1);
  }
}

// Check if user is logged in
try {
  execSync('railway whoami', { stdio: 'ignore' });
  console.log('✅ Logged into Railway');
} catch (error) {
  console.log('❌ Not logged into Railway. Please login:');
  console.log('   railway login');
  process.exit(1);
}

// Generate secrets if needed
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('\n🔐 Generating secure secrets...');
  execSync('node scripts/generate-secrets.js', { stdio: 'inherit' });
  console.log('\n📝 Please create a .env file with the generated secrets');
}

console.log('\n📋 Next steps:');
console.log('1. Create a new Railway project: railway init');
console.log('2. Set environment variables in Railway dashboard');
console.log('3. Deploy: railway up');
console.log('4. Get your domain: railway domain');

console.log('\n🎯 Your site will be live at: https://your-app-name.railway.app'); 