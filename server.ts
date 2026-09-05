import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import whatsappRouter from "./src/server/whatsappRouter.js";

// Load local environmental secrets
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware with expanded capacity for base64 payloads if needed
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // API Routes MUST be mounted FIRST before Vite middleware
  app.use("/api", whatsappRouter);

  // Simple Health Check Endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      service: "LedgerBox Backend & Bookkeeping Worker",
      timestamp: new Date().toISOString(),
    });
  });

  // Explicit catch-all for unmatched /api/* routes so they never fall through to Vite SPA index.html
  app.all("/api/*", (req, res) => {
    res.status(404).json({
      error: `API route not found: ${req.method} ${req.originalUrl}`,
      status: "error",
    });
  });

  // Integration of Vite Middleware for development OR static serving for production
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting LedgerBox server in DEVELOPMENT mode with Vite Middleware...");
    
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        // The hosted preview does not proxy Vite's HMR WebSocket reliably.
        // Disable it here as well as in vite.config.ts because middleware
        // mode supplies this server configuration directly.
        hmr: false,
      },
      appType: "spa",
    });
    
    app.use(vite.middlewares);
  } else {
    console.log("Starting LedgerBox server in PRODUCTION mode...");
    
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static client bundles
    app.use(express.static(distPath));
    
    // Fallback all SPA navigation requests to index.html
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`=======================================================`);
    console.log(` LedgerBox Full-Stack Server listening on port ${PORT}`);
    console.log(` Webhook URL: http://localhost:${PORT}/api/whatsapp-webhook`);
    console.log(`=======================================================`);
  });
}

// Boot up full-stack engine
startServer().catch((error) => {
  console.error("FATAL: Failed to initialize full-stack application server:", error);
  process.exit(1);
});
