import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';
const DEPLOY_HASH = 'fe3ce95f95a717528a3e674063f2e9e13049bdde3a7a75578c285273bdb41ba1';

async function testDeployVerification() {
    console.log('🧪 Testing Deploy Hash Verification...\n');
    console.log(`Deploy Hash: ${DEPLOY_HASH}\n`);

    try {
        const response = await fetch(`${API_URL}/api/verify/deploy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ deployHash: DEPLOY_HASH })
        });

        const data = await response.json();

        console.log('📊 Response:');
        console.log(JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('\n✅ Verification successful!');
            console.log(`   Status: ${data.status.isValid ? 'VALID' : 'INVALID'}`);
            console.log(`   Revoked: ${data.status.isRevoked}`);
            console.log(`   Expired: ${data.status.isExpired}`);
            console.log(`   Issuer DID: ${data.credential.issuerDid}`);
            console.log(`   Holder DID: ${data.credential.holderDid}`);
            console.log(`   AI Confidence: ${data.credential.aiConfidence}%`);
            console.log(`   IPFS Hash: ${data.credential.ipfsHash}`);
            console.log(`   Dictionary Key: ${data.dictionaryKey}`);
        } else {
            console.log('\n❌ Verification failed:');
            console.log(`   Error: ${data.error}`);
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    }
}

testDeployVerification();
