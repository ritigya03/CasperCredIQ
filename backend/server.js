// server.js — FINAL FIXED VERSION (Node 22 + ESM)

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import casperSdk from 'casper-js-sdk';
const {
  CasperClient,
  CasperServiceByJsonRPC,
  DeployUtil
} = casperSdk;

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

/**
 * RPC node (same network as your deployed contract)
 */
const RPC_URL = 'http://65.109.83.79:7777/rpc';

/**
 * Casper clients
 */
const casperClient = new CasperClient(RPC_URL);
const rpcClient = new CasperServiceByJsonRPC(RPC_URL);

console.log('✅ Backend connected to Casper RPC');
console.log('   RPC:', RPC_URL);

/**
 * -------------------------
 * RPC Health Check
 * -------------------------
 */
async function checkConnection() {
  try {
    const status = await rpcClient.getStatus();
    console.log('✅ RPC connection successful');
    console.log('   Chain:', status.chainspec_name);
    console.log('   API Version:', status.api_version);
    console.log('   Peers:', status.peers.length);
  } catch (err) {
    console.error('❌ RPC connection failed:', err.message);
  }
}

checkConnection();

/**
 * -------------------------
 * Submit Deploy
 * -------------------------
 */
app.post('/submit-deploy', async (req, res) => {
  try {
    const { deploy } = req.body;

    if (!deploy) {
      return res.status(400).json({ error: 'No deploy provided' });
    }

    const parsed = DeployUtil.deployFromJson(deploy);
    if (parsed.err) {
      return res.status(400).json({
        error: 'Invalid deploy JSON',
        details: parsed.err.toString()
      });
    }

    const deployObject = parsed.val;

    if (!DeployUtil.validateDeploy(deployObject)) {
      return res.status(400).json({
        error: 'Deploy validation failed'
      });
    }

    console.log('🚀 Submitting deploy...');
    console.log('   Account:', deployObject.header.account.toHex());
    console.log('   Chain:', deployObject.header.chainName);

    const deployHash = await casperClient.putDeploy(deployObject);

    console.log('✅ Deploy submitted:', deployHash);

    res.json({
      status: 'success',
      hash: deployHash
    });

  } catch (err) {
    console.error('❌ Deploy submission failed:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'Deploy failed'
    });
  }
});

/**
 * -------------------------
 * Health Endpoint
 * -------------------------
 */
app.get('/health', async (_req, res) => {
  try {
    const status = await rpcClient.getStatus();
    res.json({
      status: 'ok',
      chain: status.chainspec_name,
      apiVersion: status.api_version,
      peers: status.peers.length,
      rpc: RPC_URL
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

/**
 * -------------------------
 * Deploy Status
 * -------------------------
 */
app.get('/deploy-status/:hash', async (req, res) => {
  try {
    const info = await rpcClient.getDeployInfo(req.params.hash);
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * -------------------------
 * Start Server
 * -------------------------
 */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
  console.log('🔧 Endpoints:');
  console.log('   POST /submit-deploy');
  console.log('   GET  /health');
  console.log('   GET  /deploy-status/:hash');
});
