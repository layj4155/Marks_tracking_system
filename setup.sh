#!/bin/bash

echo "🚀 Setting up Student & Teacher Performance Tracker..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "🔧 Setting up environment..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    cat > .env << EOF
PORT=3000
MONGODB_URI=mongodb://localhost:27017/marks_tracking_system
JWT_SECRET=$(openssl rand -base64 32)
NODE_ENV=development
EOF
    echo "✅ Created .env file with random JWT secret"
else
    echo "⚠️  .env file already exists, skipping creation"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Make sure MongoDB is running on your system"
echo "   2. Run 'npm run dev' to start the development server"
echo "   3. Open http://localhost:3000 in your browser"
echo ""
echo "📚 For detailed instructions, see README.md"
