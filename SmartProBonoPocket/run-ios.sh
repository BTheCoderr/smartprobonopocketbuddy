#!/bin/bash
# Fix for "Invalid device or device pair" - use a valid simulator
cd "$(dirname "$0")"
echo "Starting Expo with iPhone 16 simulator..."
EXPO_IOS_SIMULATOR_DEVICE_NAME="iPhone 16" npx expo start --ios
