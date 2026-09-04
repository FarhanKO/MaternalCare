/**
 * Network API Controller — where this server can be reached from.
 *
 * The guardian pairing link carries the API address, because inside the
 * installed APK "localhost" is the phone rather than the laptop. But the
 * mother builds that link in a browser that only knows the origin *it* used,
 * which on the development machine is http://localhost:3000 — an address no
 * other device can reach. Every guardian therefore got a link that could not
 * work until they typed the right address in by hand.
 *
 * Only the server knows its own LAN addresses, so it answers with them. No
 * domain data is involved, which is why this reads an OS interface list
 * directly rather than going through a model.
 */
const os = require('os');

/** True for the 10/8, 172.16/12 and 192.168/16 blocks. */
function isPrivate(ip) {
  const [a, b] = ip.split('.').map(Number);
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

/**
 * Virtual adapters (WSL, Docker, Hyper-V, VirtualBox) hand out addresses that
 * are real but unreachable from a phone, and they sort ahead of the wifi one
 * often enough to matter. Rank the interfaces most-likely-first instead.
 */
function rank(name) {
  const n = name.toLowerCase();
  if (/wi-?fi|wlan|wireless/.test(n)) return 0;
  if (/ethernet|eth|en\d/.test(n)) return 1;
  if (/vethernet|virtualbox|vmware|docker|wsl|loopback/.test(n)) return 9;
  return 5;
}

exports.index = (req, res) => {
  const port = req.socket.localPort || process.env.PORT || 3000;
  const found = [];

  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      if (!isPrivate(a.address)) continue;
      found.push({ name, address: a.address, rank: rank(name) });
    }
  }

  found.sort((x, y) => x.rank - y.rank || x.address.localeCompare(y.address));

  res.json({
    data: {
      port,
      /** origins another device on the same network can actually reach */
      origins: found.map((f) => `http://${f.address}:${port}`),
      interfaces: found.map((f) => ({ name: f.name, address: f.address })),
    },
  });
};
