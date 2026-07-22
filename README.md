# ReimburseMe

Track expenses, snap receipts, generate reimbursement reports. Runs **fully locally** — all data stays in a `data\` folder on the host PC (SQLite database + receipt photos). No cloud account needed.

## Run on a new PC (from zero)

1. Install **Node.js LTS** from [nodejs.org](https://nodejs.org) (accept all defaults).
2. Get this code onto the PC:
   ```bash
   git clone https://github.com/BonBon-lab/reimburse-me.git
   ```
   (or copy the project folder over on a USB stick — `node_modules` and `.next` can be skipped, they get rebuilt)
3. **Double-click `start.bat`** — it installs dependencies and builds on first run (5–10 min), then starts the server and prints the address to open on your phone.

That's it. Subsequent starts take a few seconds.

## Moving your data between PCs

All expenses, categories, reports, and receipt photos live in the **`data\` folder**:

| File | Contents |
|---|---|
| `data\reimburseme.db` | The database (expenses, categories, reports) |
| `data\receipts\` | Receipt photos, named by expense ID |

To move or back up: copy the `data\` folder. To start fresh: delete it (a new empty one is created on next launch).

## Using from your phone

The phone must be on the **same Wi-Fi** as the host PC. Open the `http://192.168.x.x:3000` address that `start.bat` prints. Receipt scanning uses the phone's camera directly.

## AI receipt scanning (optional)

By default receipts are read by the built-in offline OCR (free, works without internet, tuned for Indonesian receipts). For higher accuracy, add a Claude API key:

1. Copy `.env.example` to `.env.local`
2. Fill in `ANTHROPIC_API_KEY` (get one at [console.anthropic.com](https://console.anthropic.com))
3. Restart the server

Without a key everything still works — scanning silently falls back to offline OCR.

## Manual commands (what start.bat runs)

```bash
npm install     # once, after cloning or when dependencies change
npm run build   # once, after code changes
npm run start   # start the server (production mode — use this, not `npm run dev`)
```

`npm run dev` is for development only — it is slow and blocks phones on the network unless their IP is listed in `allowedDevOrigins` in `next.config.ts`.
