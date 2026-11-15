#!/usr/bin/env bash
# =====================================================================
# Script Tạo Tệp .DMG Cài Đặt Chuẩn macOS (Apple Silicon & Intel)
# Dự án: Vệ Binh Mật Khẩu (CyberSec Password Guardian) v3.0.0
# Đồng hành: Trường THCS Nguyễn Bỉnh Khiêm × SoftLab
# =====================================================================
set -e

echo "🍎 [macOS] Đang đóng gói ứng dụng CyberSecGame..."
npm run dist:mac

mkdir -p dist

# Kiểm tra công cụ tạo DMG
if command -v create-dmg &> /dev/null; then
    echo "📦 [macOS] Sử dụng create-dmg để tạo giao diện cài đặt kéo thả Applications..."
    
    # 1. Bản Apple Silicon (M1/M2/M3/M4)
    if [ -d "dist/CyberSecGame-darwin-arm64/CyberSecGame.app" ]; then
        echo "⚡ Đang tạo dist/CyberSecGame-macOS-arm64.dmg..."
        rm -f "dist/CyberSecGame-macOS-arm64.dmg"
        create-dmg \
          --volname "CyberSec Password Guardian (Apple Silicon)" \
          --window-pos 200 120 \
          --window-size 660 400 \
          --icon-size 100 \
          --icon "CyberSecGame.app" 180 180 \
          --hide-extension "CyberSecGame.app" \
          --app-drop-link 480 180 \
          "dist/CyberSecGame-macOS-arm64.dmg" \
          "dist/CyberSecGame-darwin-arm64/CyberSecGame.app" || true
    fi

    # 2. Bản Intel x64
    if [ -d "dist/CyberSecGame-darwin-x64/CyberSecGame.app" ]; then
        echo "⚡ Đang tạo dist/CyberSecGame-macOS-x64.dmg..."
        rm -f "dist/CyberSecGame-macOS-x64.dmg"
        create-dmg \
          --volname "CyberSec Password Guardian (Intel)" \
          --window-pos 200 120 \
          --window-size 660 400 \
          --icon-size 100 \
          --icon "CyberSecGame.app" 180 180 \
          --hide-extension "CyberSecGame.app" \
          --app-drop-link 480 180 \
          "dist/CyberSecGame-macOS-x64.dmg" \
          "dist/CyberSecGame-darwin-x64/CyberSecGame.app" || true
    fi
else
    echo "📦 [macOS] Sử dụng công cụ hdiutil mặc định của Apple..."
    
    if [ -d "dist/CyberSecGame-darwin-arm64/CyberSecGame.app" ]; then
        echo "⚡ Đang tạo dist/CyberSecGame-macOS-arm64.dmg qua hdiutil..."
        rm -f "dist/CyberSecGame-macOS-arm64.dmg"
        hdiutil create -volname "CyberSec Password Guardian" \
          -srcfolder "dist/CyberSecGame-darwin-arm64/CyberSecGame.app" \
          -ov -format UDZO "dist/CyberSecGame-macOS-arm64.dmg"
    fi

    if [ -d "dist/CyberSecGame-darwin-x64/CyberSecGame.app" ]; then
        echo "⚡ Đang tạo dist/CyberSecGame-macOS-x64.dmg qua hdiutil..."
        rm -f "dist/CyberSecGame-macOS-x64.dmg"
        hdiutil create -volname "CyberSec Password Guardian" \
          -srcfolder "dist/CyberSecGame-darwin-x64/CyberSecGame.app" \
          -ov -format UDZO "dist/CyberSecGame-macOS-x64.dmg"
    fi
fi

echo "🎉 [macOS] Đã hoàn tất! Các tệp DMG nằm trong thư mục dist/:"
ls -lh dist/*.dmg 2>/dev/null || true
