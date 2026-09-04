/**
 * Runs the service's Python with its virtualenv, from any shell.
 *
 *   node ml-service/run.js train.py
 *   node ml-service/run.js -m uvicorn app:app --port 8000
 *
 * npm executes scripts through cmd.exe on Windows, which refuses a
 * forward-slash command path, and through sh elsewhere, which refuses a
 * backslash one. Spelling the path here in Node avoids having two spellings of
 * every script — and gives a clear message when the virtualenv is missing,
 * rather than "not recognized as an internal or external command".
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const python = process.platform === 'win32'
  ? path.join(HERE, '.venv', 'Scripts', 'python.exe')
  : path.join(HERE, '.venv', 'bin', 'python');

if (!fs.existsSync(python)) {
  console.error(`
  No virtualenv at ml-service/.venv

  Create it once:
    python -m venv ml-service/.venv
    node ml-service/run.js -m pip install -r requirements.txt
    npm run ml:train
`);
  process.exit(1);
}

const { status } = spawnSync(python, process.argv.slice(2), {
  cwd: HERE,
  stdio: 'inherit',
});
process.exit(status ?? 1);
