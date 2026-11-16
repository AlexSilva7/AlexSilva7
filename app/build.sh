#!/usr/bin/env bash
# Gera o APK sem Gradle: aapt + javac + dx + zipalign + apksigner
# Dependências (Ubuntu/Debian): sudo apt-get install aapt apksigner zipalign dalvik-exchange openjdk-17-jdk
set -euo pipefail
cd "$(dirname "$0")"

ANDROID_JAR="${ANDROID_JAR:-$HOME/.cache/android-34/android.jar}"
if [ ! -f "$ANDROID_JAR" ]; then
  mkdir -p "$(dirname "$ANDROID_JAR")"
  curl -fsSL -o "$ANDROID_JAR" https://raw.githubusercontent.com/Sable/android-platforms/master/android-34/android.jar
fi

DX=$(command -v dalvik-exchange || command -v dx)
OUT=build
rm -rf "$OUT" && mkdir -p "$OUT/gen" "$OUT/classes"

echo "> recursos"
aapt package -f -m -J "$OUT/gen" -M AndroidManifest.xml -S res -A assets -I "$ANDROID_JAR" -F "$OUT/app.unsigned.apk"

echo "> java"
javac -nowarn -Xlint:-options -source 8 -target 8 -encoding UTF-8 -bootclasspath "$ANDROID_JAR" \
  -d "$OUT/classes" $(find src "$OUT/gen" -name '*.java')

echo "> dex"
"$DX" --dex --output="$OUT/classes.dex" "$OUT/classes"
(cd "$OUT" && aapt add -f app.unsigned.apk classes.dex >/dev/null)

echo "> assinatura"
zipalign -f 4 "$OUT/app.unsigned.apk" "$OUT/app.aligned.apk"
KS=keystore/meutreino.jks
if [ ! -f "$KS" ]; then
  mkdir -p keystore
  keytool -genkeypair -keystore "$KS" -storepass meutreino -keypass meutreino -alias meutreino \
    -keyalg RSA -keysize 2048 -validity 20000 -dname "CN=Meu Treino" >/dev/null 2>&1
fi
apksigner sign --ks "$KS" --ks-pass pass:meutreino --key-pass pass:meutreino --out "$OUT/MeuTreino.apk" "$OUT/app.aligned.apk"
apksigner verify "$OUT/MeuTreino.apk"
ls -la "$OUT/MeuTreino.apk"
