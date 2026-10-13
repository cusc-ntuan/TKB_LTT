const PRESENCE_TIMEOUT_MS = 90 * 1000;
const clients = new Map();

function removeExpiredClients(now = Date.now()) {
  for (const [clientId, lastSeen] of clients) {
    if (now - lastSeen > PRESENCE_TIMEOUT_MS) clients.delete(clientId);
  }
}

function heartbeat(clientId) {
  if (!clientId || typeof clientId !== "string") {
    throw new Error("Thiếu mã phiên trực tuyến.");
  }

  const now = Date.now();
  removeExpiredClients(now);
  clients.set(clientId, now);
  return clients.size;
}

export { heartbeat, removeExpiredClients };