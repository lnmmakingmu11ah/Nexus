# Run and deploy your NEXUS app

## Web (local)

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Copy `.env.example` → `.env.local` and set `GROQ_API_KEY`
3. Run: `npm run dev` → http://localhost:3000

## Android (Capacitor)

1. Build & sync: `npm run cap:sync`
2. Open in Android Studio: `npm run cap:open`  
   **Or open the `android/` folder** (not the repo root) in Android Studio.
3. Start the API on your PC: `npm run dev`
4. USB debug: `adb reverse tcp:3000 tcp:3000`
5. Select your phone in the device dropdown → press **Run ▶**

AI provider defaults to **Groq** (`openai/gpt-oss-120b`).
