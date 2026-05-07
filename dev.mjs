import { createServer } from 'vite';

const REGISTER_BASE = 'http://localhost:4444/api';
const AGENT_NAME = 'cryptostream-frontend';

async function claimPort(desiredPort, agentName, reason, ttlMinutes = 60) {
  // 1. Check
  const check = await fetch(`${REGISTER_BASE}/ports/check/${desiredPort}`).then(r => r.json());
  let finalPort = desiredPort;
  if (!check.available) {
    const suggest = await fetch(`${REGISTER_BASE}/suggest?min=5000&max=9999`).then(r => r.json());
    if (suggest.error) throw new Error(`No free ports available: ${suggest.error}`);
    finalPort = suggest.port;
  }

  // 2. Register
  const reg = await fetch(`${REGISTER_BASE}/ports/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port: finalPort, agent: agentName, reason, ttlMinutes }),
  }).then(r => r.json());

  if (reg.error) throw new Error(`Port registration failed: ${reg.error}`);
  console.log(`✓ Registered port ${finalPort} for "${agentName}"`);
  return finalPort;
}

async function releasePort(port, agentName) {
  await fetch(`${REGISTER_BASE}/ports/${port}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent: agentName }),
  });
  console.log(`✓ Released port ${port}`);
}

async function start() {
    let port = 5180; // Default for cryptostream
    try {
        port = await claimPort(port, AGENT_NAME, 'Cryptostream Ambient Investor Dashboard');
        
        const server = await createServer({
            server: {
                port: port,
                strictPort: true,
                host: true
            }
        });
        await server.listen();
        server.printUrls();

        async function cleanup() {
            await releasePort(port, AGENT_NAME);
            await server.close();
            process.exit(0);
        }
        
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('exit', () => releasePort(port, AGENT_NAME));

    } catch (e) {
        console.error('Failed to start Vite:', e);
        process.exit(1);
    }
}

start();
