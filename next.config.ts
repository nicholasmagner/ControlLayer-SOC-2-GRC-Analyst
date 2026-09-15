import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // `next dev` otherwise auto-writes AGENTS.md/CLAUDE.md with a "managed
  // agent rules" block that tells an AI coding agent to read node_modules
  // internals and to commit the file "to keep the tree clean." We don't want
  // that generated, committed, or re-appearing every time the dev server
  // restarts - see node_modules/next/dist/server/lib/generate-agent-files.js.
  agentRules: false,
};

export default nextConfig;
