// Entry file for hosts (e.g. Hostinger Node Apps) that expect a CommonJS entry point.
// The server itself is an ES module, so load it with a dynamic import.
import("./server/src/server.js").catch((err) => {
  console.error("Startup failed:", err);
  process.exit(1);
});
