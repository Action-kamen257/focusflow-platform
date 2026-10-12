const { onRequest } = require("firebase-functions/v2/https");
const app = require("./server/server");

/**
 * FocusFlow API Cloud Function
 * Serves all /api/** endpoints with SQLite & session authentication.
 */
exports.api = onRequest(
  {
    region: "us-central1",
    cors: true,
    maxInstances: 10,
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  app
);
