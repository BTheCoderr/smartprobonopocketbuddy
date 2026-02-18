#!/bin/bash
# Run app in iOS Simulator - no phone or network needed
cd "$(dirname "$0")/.."
npx expo start --ios
