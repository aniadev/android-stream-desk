#!/usr/bin/env bash
set -euo pipefail

if ! command -v keytool &>/dev/null; then
  echo "Error: keytool not found. Install JDK and ensure it is in PATH." >&2
  exit 1
fi

echo "=== Android Stream Desk — Keystore Generator ==="
echo "Tạo keystore cho ký APK release. Giữ file này offline sau khi tạo."
echo

read -sp "Store password: " STORE_PASSWORD; echo
read -sp "Key password (Enter để dùng cùng store password): " KEY_PASSWORD; echo
KEY_PASSWORD="${KEY_PASSWORD:-$STORE_PASSWORD}"
read -p "Key alias [android-stream-desk]: " KEY_ALIAS
KEY_ALIAS="${KEY_ALIAS:-android-stream-desk}"

echo
echo "Điền thông tin DN (có thể để trống bằng Enter, nhập dấu chấm '.' để bỏ qua field):"
read -p "CN (Tên đầy đủ / tên tổ chức): " DN_CN
read -p "OU (Đơn vị): " DN_OU
read -p "O (Tổ chức): " DN_O
read -p "L (Thành phố): " DN_L
read -p "ST (Tỉnh/Bang): " DN_ST
read -p "C (Mã quốc gia, vd: VN): " DN_C

DNAME="CN=${DN_CN:-.}, OU=${DN_OU:-.}, O=${DN_O:-.}, L=${DN_L:-.}, ST=${DN_ST:-.}, C=${DN_C:-.}"
KEYSTORE_FILE="release.keystore"

echo
echo "Đang tạo keystore..."
keytool -genkeypair \
  -keystore "$KEYSTORE_FILE" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 9125 \
  -alias "$KEY_ALIAS" \
  -storepass "$STORE_PASSWORD" \
  -keypass "$KEY_PASSWORD" \
  -dname "$DNAME"

echo
echo "✓ Đã tạo $KEYSTORE_FILE"
echo
echo "Copy từng block dưới vào GitHub Settings → Secrets and variables → Actions:"
echo

echo "=== ANDROID_KEYSTORE_BASE64 ==="
base64 < "$KEYSTORE_FILE"
echo

echo "=== ANDROID_KEYSTORE_PASSWORD ==="
echo "$STORE_PASSWORD"
echo

echo "=== ANDROID_KEY_ALIAS ==="
echo "$KEY_ALIAS"
echo

echo "=== ANDROID_KEY_PASSWORD ==="
echo "$KEY_PASSWORD"
echo

echo "⚠  QUAN TRỌNG:"
echo "   1. Backup $KEYSTORE_FILE offline (USB, password manager)."
echo "   2. Mất keystore = không thể cập nhật app cùng package ID trên Play Store."
echo "   3. Xóa khỏi lịch sử shell: history -d \$(history 1 | awk '{print \$1}')"
