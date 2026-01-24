
import casperSdk from 'casper-js-sdk';
const { CasperClient } = casperSdk;

const NODE_URL = 'http://65.109.83.79:7777/rpc';
const CONTRACT_HASH = '7375d3d1d28854233133b882cd2ea15596ab8ab6c15277fa569c3c245f30cdcd';

const client = new CasperClient(NODE_URL);

async function main() {
    try {
        const stateRootHash = await client.nodeClient.getStateRootHash();

        const contractData = await client.nodeClient.getBlockState(
            stateRootHash,
            `hash-${CONTRACT_HASH}`,
            []
        );

        const keys = contractData.Contract.namedKeys; // camelCase
        console.log("Named Keys found:", keys.length);
        keys.forEach(k => {
            console.log(`Name: ${k.name}, Key: ${k.key}`);
        });

    } catch (e) {
        console.error("Error full:", e);
    }
}

main();
