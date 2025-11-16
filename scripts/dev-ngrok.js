#!/usr/bin/env node
const ngrok = require('ngrok');
const { spawn } = require('child_process');
const path = require('path');

(async function main() {
  const port = Number(process.env.PORT) || 5173;
  try {
    console.log(`Starting ngrok tunnel for local port ${port}...`);
    const rawUrl = await ngrok.connect({ addr: port, bind_tls: true, authtoken: process.env.NGROK_AUTHTOKEN || undefined });
    if (!rawUrl) throw new Error('ngrok did not return a public URL');

    // Remove trailing slash to avoid mismatches
    const url = rawUrl.replace(/\/$/, '');
    console.log(`ngrok public url: ${url}`);

    // derive host and protocol
    const parsed = new URL(url);
    const host = parsed.host; // includes port if present
    const isHttps = parsed.protocol === 'https:';

    // Prepare env for vite child
    const env = Object.assign({}, process.env, {
      VITE_BASE_URL: url,
      VITE_HMR_HOST: host,
      VITE_HMR_CLIENT_PORT: isHttps ? '443' : ''
    });

    // Print expected HMR websocket target to help debugging
    const wsProtocol = isHttps ? 'wss' : 'ws';
    const wsPortPart = env.VITE_HMR_CLIENT_PORT ? `:${env.VITE_HMR_CLIENT_PORT}` : '';
    console.log(`Expected HMR websocket target: ${wsProtocol}://${host}${wsPortPart}`);

    console.log('Launching Vite with environment:');
    console.log(`  VITE_BASE_URL=${env.VITE_BASE_URL}`);
    console.log(`  VITE_HMR_HOST=${env.VITE_HMR_HOST}`);
    if (env.VITE_HMR_CLIENT_PORT) console.log(`  VITE_HMR_CLIENT_PORT=${env.VITE_HMR_CLIENT_PORT}`);

    // Resolve vite binary
    const viteBin = path.join(__dirname, '..', 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite');

    const child = spawn(viteBin, [], { env, stdio: 'inherit' });

    // Forward signals to child and cleanup ngrok on exit
    const cleanup = async () => {
      try {
        if (!child.killed) child.kill('SIGINT');
      } catch (e) {}
      try {
        await ngrok.disconnect();
        await ngrok.kill();
      } catch (e) {}
      process.exit();
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);

    child.on('exit', async (code, signal) => {
      try {
        await ngrok.disconnect();
        await ngrok.kill();
      } catch (e) {}
      if (signal) process.exit(1);
      process.exit(code || 0);
    });

  } catch (err) {
    console.error('Failed to start ngrok + vite:', err);
    try { await ngrok.kill(); } catch (e) {}
    process.exit(1);
  }
})();
