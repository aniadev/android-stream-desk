#!/bin/bash
# Android Stream Desk Companion macOS Quick Launcher

# Clear screen
clear

echo "🚀 ==============================================="
echo "   Khởi chạy Android Stream Desk Companion trên macOS..."
echo "   ==============================================="
echo ""

# Check for pnpm installation
if ! command -v pnpm &> /dev/null
then
    echo "❌ Error: pnpm chưa được cài đặt. Vui lòng cài đặt thông qua npm: npm install -g pnpm"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Đang cài đặt frontend dependencies..."
    pnpm install
fi

# Run dynamic macOS tauri application
echo "⚡ Khởi chạy dev server..."
pnpm dev:mac
