const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BACKEND_PORT = 5000;
const FRONTEND_PORT = 3000;

let backendProcess;
let frontendProcess;
let backendTunnel;
let frontendTunnel;

let backendStarted = false;
let backendTunnelReady = false;
let frontendStarted = false;
let frontendTunnelReady = false;

console.log('🚀 Starting Mission Board Live Tunnel Orchestration...\n');

// Clean up processes on exit
function cleanup() {
  console.log('\n🛑 Stopping servers and closing tunnels...');
  if (backendProcess) backendProcess.kill();
  if (frontendProcess) frontendProcess.kill();
  if (backendTunnel) backendTunnel.kill();
  if (frontendTunnel) frontendTunnel.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start Backend Server
console.log('1. Starting local Backend Server...');
backendProcess = spawn('npm.cmd', ['run', 'dev'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'pipe',
  shell: true
});

backendProcess.stdout.on('data', (data) => {
  const output = data.toString().trim();
  console.log(`   [Backend]: ${output}`);
  
  const lowerOutput = output.toLowerCase();
  if ((lowerOutput.includes('server listening') || lowerOutput.includes('offline mock mode')) && !backendStarted) {
    backendStarted = true;
    console.log(`\n   ✓ Backend started successfully on port ${BACKEND_PORT}.`);
    startBackendTunnel();
  }
});

backendProcess.stderr.on('data', (data) => {
  console.error(`   [Backend Error]: ${data.toString().trim()}`);
});

backendProcess.on('error', (err) => {
  console.error('❌ Failed to start Backend Server:', err);
  cleanup();
});

// Start Backend Tunnel
function startBackendTunnel() {
  console.log('\n2. Exposing local Backend Server to the public internet via localtunnel...');
  backendTunnel = spawn('npx.cmd', ['localtunnel', '--port', String(BACKEND_PORT)], {
    stdio: 'pipe',
    shell: true
  });

  backendTunnel.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log(`   [Backend Tunnel]: ${output}`);
    
    const urlMatch = output.match(/your url is: (https:\/\/[a-z0-9.-]+)/i);
    if (urlMatch && !backendTunnelReady) {
      backendTunnelReady = true;
      const backendUrl = urlMatch[1];
      console.log(`\n   ✓ Backend is LIVE at: \x1b[36m${backendUrl}\x1b[0m\n`);
      
      // Configure frontend environment
      configureFrontend(backendUrl);
    }
  });

  backendTunnel.stderr.on('data', (data) => {
    console.error(`   [Backend Tunnel Error]: ${data.toString().trim()}`);
  });

  backendTunnel.on('error', (err) => {
    console.error('❌ Backend localtunnel failed:', err);
    cleanup();
  });
}

// Write .env.local for Frontend
let savedBackendUrl = '';
function configureFrontend(backendUrl) {
  savedBackendUrl = backendUrl;
  console.log('3. Writing backend URL to Next.js environment configurations...');
  const envPath = path.join(__dirname, 'frontend-app', '.env.local');
  fs.writeFileSync(envPath, `NEXT_PUBLIC_API_URL=${backendUrl}\n`);
  console.log('   ✓ Configured frontend-app/.env.local successfully.\n');
  
  startFrontendServer();
}

// Start Frontend Server
function startFrontendServer() {
  console.log('4. Starting local Next.js Frontend Server...');
  frontendProcess = spawn('npm.cmd', ['run', 'dev'], {
    cwd: path.join(__dirname, 'frontend-app'),
    stdio: 'pipe',
    shell: true
  });

  frontendProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log(`   [Frontend]: ${output}`);
    
    const lowerOutput = output.toLowerCase();
    if ((lowerOutput.includes('ready in') || lowerOutput.includes('local:') || lowerOutput.includes('ready -')) && !frontendStarted) {
      frontendStarted = true;
      console.log(`\n   ✓ Frontend ready locally on port ${FRONTEND_PORT}.`);
      startFrontendTunnel();
    }
  });

  frontendProcess.stderr.on('data', (data) => {
    console.error(`   [Frontend Error]: ${data.toString().trim()}`);
  });

  frontendProcess.on('error', (err) => {
    console.error('❌ Failed to start Frontend Server:', err);
    cleanup();
  });
}

// Start Frontend Tunnel
function startFrontendTunnel() {
  console.log('\n5. Exposing local Frontend Server to the public internet via localtunnel...');
  frontendTunnel = spawn('npx.cmd', ['localtunnel', '--port', String(FRONTEND_PORT)], {
    stdio: 'pipe',
    shell: true
  });

  frontendTunnel.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log(`   [Frontend Tunnel]: ${output}`);
    
    const urlMatch = output.match(/your url is: (https:\/\/[a-z0-9.-]+)/i);
    if (urlMatch && !frontendTunnelReady) {
      frontendTunnelReady = true;
      const frontendUrl = urlMatch[1];
      console.log('\n\x1b[32m========================================================\x1b[0m');
      console.log('\x1b[32m🎉 MISSION BOARD IS SUCCESSFULLY RUNNING LIVE ONLINE! 🎉\x1b[0m');
      console.log('\x1b[32m========================================================\x1b[0m');
      console.log(`\n👉 Access Frontend:  \x1b[1;35m${frontendUrl}\x1b[0m`);
      console.log(`👉 Access Backend:   \x1b[36m${savedBackendUrl}\x1b[0m`);
      console.log('\nPress Ctrl+C to terminate connections and shut down servers.');
    }
  });

  frontendTunnel.stderr.on('data', (data) => {
    console.error(`   [Frontend Tunnel Error]: ${data.toString().trim()}`);
  });

  frontendTunnel.on('error', (err) => {
    console.error('❌ Frontend localtunnel failed:', err);
    cleanup();
  });
}
