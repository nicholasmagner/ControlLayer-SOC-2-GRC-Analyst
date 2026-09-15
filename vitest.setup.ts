import { config } from 'dotenv';

// Load .env so importing modules that construct a PrismaClient (which reads
// DATABASE_URL at construction time) doesn't blow up during unit tests that
// never actually issue a query.
config();
