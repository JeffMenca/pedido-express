#!/usr/bin/env bash
set -euo pipefail

platform="${1:?usage: mobile.sh ios|android}"
cd "$(dirname "$0")/../app-cliente"

case "$platform" in
  ios)
    simulator="${IOS_SIMULATOR:-iPhone 17 Pro}"
    api_url="${API_URL:-http://localhost:3000/api}"
    find_udid() { xcrun simctl list devices | grep -F "$simulator (" | grep -oE '[0-9A-F]{8}(-[0-9A-F]{4}){3}-[0-9A-F]{12}' | head -1; }
    udid="$(find_udid)"
    [ -n "$udid" ] || { echo "Simulator '$simulator' not found. Set IOS_SIMULATOR to one from: xcrun simctl list devices" >&2; exit 1; }
    xcrun simctl bootstatus "$udid" -b >/dev/null
    open -a Simulator
    device="$udid"
    ;;
  android)
    # The Android emulator reaches the host machine through 10.0.2.2
    api_url="${API_URL:-http://10.0.2.2:3000/api}"
    device="${ANDROID_DEVICE:-android}"
    ;;
  *)
    echo "Unknown platform: $platform" >&2
    exit 1
    ;;
esac

exec flutter run -d "$device" --dart-define=API_URL="$api_url"
