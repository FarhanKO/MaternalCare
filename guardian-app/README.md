# Guardian app

The companion app for the people a mother nominates. It shows how she is
doing, what she may be struggling with and what they can do about it — and it
alarms them the moment she raises an SOS.

## Where it sits in the MVC architecture

The guardian app is a **third View** over the one shared Model layer. It holds
no domain logic of its own.

| Layer | Lives in | Notes |
|---|---|---|
| **Model** | `../models/guardianModel.js` | Decides what a guardian may see, derives her status, and writes the "what she may be facing / how to help" insight from her own vitals and logged symptoms. |
| **Controller** | `../controllers/api/guardianApiController.js` | Thin. Resolves the link token, returns 404 for anything unknown. Routed in `../routes/api.js`. |
| **View** | this folder | React. `src/lib/api.ts` is transport only — it carries what the Model decided and never interprets it. |

The other two Views are `../views` (EJS) and `../frontend` (the mother and
clinician SPA). All three read the same models and the same SQLite database.

## Access

A guardian never logs in. The mother sends each person a private link from
her SOS screen:

```
http://<guardian-host>/?t=<token>
```

The token is a 24-character random string stored on that guardian's row in
`emergency_contacts`. Opening the link stores it and strips it from the
address bar. It is a credential — anyone holding it can read her wellbeing
summary, so it is shown in the mother's app with that warning attached.

## The server address is not compiled in

Inside the APK, `localhost` means the phone. A baked-in address would
guarantee the app could never reach the server, so the address travels in
the pairing link instead:

```
http://<guardian-host>/?t=<token>&api=<http://host:3000/api>
```

It is stored next to the token, and falls back to the host the page was
served from. One APK therefore works against a laptop on the wifi, a
college server or a real deployment with no rebuild. If a link carries an
address the phone cannot see, the app's error screen has a field to
correct it.

## Testing on a real phone

Start the mother's frontend with the machine's wifi address, so the links
it generates point somewhere the phone can actually reach:

```bash
cd frontend && VITE_API_URL=http://192.168.0.249:3000/api npm run dev
```

Substitute your own address. The backend already accepts private-network
origins in development.

## Running it

```bash
npm install
npm run dev          # http://localhost:5174
```

The backend must be running on port 3000. In development the API accepts
requests from `localhost:5173`, `localhost:5174` and any private-network
address on those ports, so the app can be opened on a real phone.

## Building the Android APK

Needs a JDK and the Android SDK. Android Studio ships both:

```bash
npm run apk
```

The APK lands at `android/app/build/outputs/apk/debug/app-debug.apk` and is
copied to `../public/downloads/guardian.apk`, which the mother's SOS screen
links to.

To sign a release build you will need your own keystore; the debug build is
signed with the standard debug key and is fine for sideloading.

## What each platform can actually do

This matters more than usual, because a guardian relying on an alarm that
never sounds is worse off than one who knows to keep the app open.

| | Android APK | Android PWA | iPhone (installed PWA) |
|---|---|---|---|
| Dashboard, vitals, guidance | yes | yes | yes |
| Alarm while app is open | yes | yes | yes |
| Vibration | yes | yes | **no** — Safari has never implemented the Vibration API |
| Alarm while app is closed | yes | notification only | notification only, iOS 16.4+ |
| Wakes a locked screen | yes | no | no |
| **Rings through silent / Do Not Disturb** | **yes** | no | no |

The APK earns that last row with three native pieces:

- audio played on `STREAM_ALARM` with `USAGE_ALARM`, which Android exempts
  from the ringer switch and from Do Not Disturb
- a notification channel with `setBypassDnd(true)` and a **full-screen
  intent**, which wakes the device and shows `AlarmActivity` over the keyguard
- a foreground service (`SosWatchService`) polling every 20 seconds, because
  without Firebase there is no push channel and Android will not let a
  background app poll reliably

On iPhone none of that is possible from the web. Overriding the ringer needs
Apple's *critical alert* entitlement, which is only granted to a native
app on request. The app therefore leans on what iOS does allow — a
full-volume alarm while open, a full-screen flashing alert, and a screen wake
lock — and the capability panel on the dashboard says plainly which of those
this particular phone will do.

### iOS build

`npx cap add ios` generates an Xcode project, but compiling an `.ipa`
requires macOS with Xcode. It cannot be produced on Windows. Until then
iPhone guardians use the installable PWA: open the link in Safari, then
**Share → Add to Home Screen**.
