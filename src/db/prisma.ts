import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import dns from 'node:dns/promises';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

/**
 * Parse a PostgreSQL connection string into its components.
 */
function parseConnectionString(url: string) {
  const parsed = new URL(url);
  return {
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname,
    port: parseInt(parsed.port || '5432', 10),
    database: parsed.pathname.slice(1),
  };
}

/**
 * Resolve a hostname to a single IPv4 address.
 *
 * Node.js v22 has a bug where multi-address DNS results (especially mixed
 * IPv4+IPv6, with unreachable IPv6) cause TLS connection attempts to time out.
 * By resolving to a single IPv4 address ourselves, we bypass this entirely.
 */
async function resolveIPv4(hostname: string): Promise<string> {
  const addresses = await dns.resolve4(hostname);
  if (!addresses.length) throw new Error(`No IPv4 address found for ${hostname}`);
  // Pick a random address for basic load distribution
  return addresses[Math.floor(Math.random() * addresses.length)];
}

/**
 * Create the connection pool, resolving DNS to an explicit IPv4 address
 * while preserving the original hostname for TLS SNI routing.
 */
async function createPool(
  config: ReturnType<typeof parseConnectionString>,
): Promise<Pool> {
  const ipv4 = await resolveIPv4(config.host);

  return new Pool({
    host: ipv4,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: {
      // SNI is required — Neon uses it to route connections to the right project.
      servername: config.host,
      rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 15_000,
  });
}

// ----- lazy singleton --------------------------------------------------

let prismaPromise: Promise<PrismaClient> | undefined;

async function getPrismaClient(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  const config = parseConnectionString(url);

  const pool = globalForPrisma.pool ?? (await createPool(config));
  if (process.env.NODE_ENV !== 'production') globalForPrisma.pool = pool;

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client;
  return client;
}

/**
 * A Proxy that lazily initialises PrismaClient on first property access.
 *
 * Every property access / method call is forwarded to the real PrismaClient
 * once the async initialisation (DNS resolution → Pool → PrismaClient)
 * completes. Because the proxy intercepts at the property level, callsites
 * like `prisma.product.findMany()` work transparently — the outer `prisma`
 * resolves synchronously, and the chained method call awaits as usual.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    // $connect, $disconnect, product, category, …
    if (!prismaPromise) prismaPromise = getPrismaClient();

    // Return a thenable so `await prisma` works too
    if (prop === 'then') {
      return (resolve: (v: PrismaClient) => void, reject: (e: unknown) => void) =>
        prismaPromise!.then(resolve, reject);
    }

    // For everything else, return a proxy that awaits the client first
    return new Proxy(function () {}, {
      get(_t, innerProp) {
        return (...args: unknown[]) =>
          prismaPromise!.then((client) => {
            const model = (client as unknown as Record<string, unknown>)[prop as string];
            if (model && typeof model === 'object') {
              const fn = (model as Record<string, unknown>)[innerProp as string];
              if (typeof fn === 'function') return fn.apply(model, args);
            }
            throw new Error(`prisma.${String(prop)}.${String(innerProp)} is not a function`);
          });
      },
      apply(_t, _thisArg, args) {
        return prismaPromise!.then((client) => {
          const fn = (client as unknown as Record<string, (...a: unknown[]) => unknown>)[prop as string];
          if (typeof fn === 'function') return fn.apply(client, args);
          throw new Error(`prisma.${String(prop)} is not a function`);
        });
      },
    });
  },
});
