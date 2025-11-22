// Vercel Serverless Function wrapper for Express backend
import { app } from '../backend/src/server.js';

// Export the Express app for Vercel
// Vercel will automatically route /api/* requests to this handler
export default app;
