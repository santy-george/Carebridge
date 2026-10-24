# @carebridge/wellness

Wellness App — Vite + React + TypeScript, Capacitor-wrapped (iOS + Android). Themed via `@carebridge/design-system` (`data-app="family"`).

## Commands (run from the repo root)

- `pnpm --filter @carebridge/wellness dev` — start the dev server
- `pnpm --filter @carebridge/wellness build` — production build
- `pnpm --filter @carebridge/wellness test` — run tests (Vitest + Testing Library)
- `pnpm --filter @carebridge/wellness lint` — lint (uses the shared root ESLint config, see `eslint.config.js`)

## Android

Debug builds are installed over USB; there is no Play Store build yet.

Toolchain (set up 2026-10-24): Android Studio (SDK platform 37 from the wizard; Gradle fetches 36), `brew install openjdk@21`. Android Studio's bundled JDK is 25, which the Android Gradle plugin (8.13) does not support, so point Gradle at JDK 21:

```sh
export ANDROID_HOME=$HOME/Library/Android/sdk
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH
```

Build and install (the web build must target the hosted Supabase: put the hosted `VITE_*` values in a temporary, gitignored `.env.production.local`, because `.env.local` always wins in Vite, then delete it after building):

```sh
pnpm --filter @carebridge/wellness build
npx cap sync android
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.carebridgehome.wellness/.MainActivity
```

Test device: Oppo A6X (CPH2783), ColorOS 16 / Android 16. USB mode must be File transfer and USB debugging on.
