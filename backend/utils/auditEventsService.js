/**
 * Audit Events API Service for CasperCredIQ
 * 
 * Fetches and decodes events from the Odra __events dictionary
 * 
 * On-chain storage structure:
 * - __events: Dictionary with string index keys ("0", "1", etc.)
 * - __events_length: U32 count of total events
 * - Event values: List<U8> serialized event bytes
 */

import axios from 'axios';
import { decodeEvent, getAuditLogEvents, getEventsForCredential } from './eventDecoder.js';

// Configuration
const NODE_URL = process.env.CASPER_NODE_URL || 'http://65.109.83.79:7777/rpc';
const CONTRACT_HASH = '7375d3d1d28854233133b882cd2ea15596ab8ab6c15277fa569c3c245f30cdcd';

// Events dictionary URef (from your contract)
const EVENTS_UREF = 'uref-9a98a1bb70df1feeaac6afa21c034c1e84564c8bb3d3ad3f7b101a1165d98da3-007';
const EVENTS_LENGTH_UREF = 'uref-56d90a5b12e6f90adc13e3efb54e77fb8b7b7a47314f7cfa989f2c6fd2f9ff5e-007';

/**
 * Make an RPC call to the Casper node
 */
async function rpcCall(method, params) {
    const response = await axios.post(NODE_URL, {
        jsonrpc: '2.0',
        method,
        params,
        id: Date.now()
    }, { timeout: 30000 });

    if (response.data.error) {
        throw new Error(response.data.error.message);
    }

    return response.data.result;
}

/**
 * Get the current state root hash
 */
export async function getStateRootHash() {
    const result = await rpcCall('chain_get_state_root_hash', {});
    return result.state_root_hash;
}

/**
 * Get the total number of events
 */
export async function getEventsCount(stateRootHash) {
    const result = await rpcCall('state_get_item', {
        state_root_hash: stateRootHash,
        key: EVENTS_LENGTH_UREF,
        path: []
    });

    return result.stored_value.CLValue.parsed;
}

/**
 * Fetch a single event by index from the dictionary
 */
export async function fetchEventByIndex(stateRootHash, index) {
    const result = await rpcCall('state_get_dictionary_item', {
        state_root_hash: stateRootHash,
        dictionary_identifier: {
            URef: {
                seed_uref: EVENTS_UREF,
                dictionary_item_key: String(index)
            }
        }
    });

    const bytes = result.stored_value.CLValue.parsed;
    return decodeEvent(bytes);
}

/**
 * Fetch all events from the blockchain
 */
export async function fetchAllEvents() {
    console.log('📡 Fetching all events from blockchain...');

    const stateRootHash = await getStateRootHash();
    console.log(`   State root: ${stateRootHash.substring(0, 16)}...`);

    const eventsCount = await getEventsCount(stateRootHash);
    console.log(`   Total events: ${eventsCount}`);

    const events = [];

    for (let i = 0; i < eventsCount; i++) {
        try {
            const event = await fetchEventByIndex(stateRootHash, i);
            events.push({
                index: i,
                ...event
            });
        } catch (error) {
            console.log(`   ⚠️ Failed to fetch event ${i}: ${error.message}`);
            events.push({
                index: i,
                error: error.message
            });
        }
    }

    console.log(`✅ Fetched ${events.length} events`);
    return events;
}

/**
 * Fetch only audit log events
 */
export async function fetchAuditLogs() {
    const allEvents = await fetchAllEvents();
    return getAuditLogEvents(allEvents);
}

/**
 * Fetch audit logs for a specific credential
 */
export async function fetchAuditLogsForCredential(credentialId) {
    const allEvents = await fetchAllEvents();
    return getEventsForCredential(allEvents, credentialId)
        .filter(e => e.eventName === 'AuditLogCreated');
}

/**
 * Fetch events by type
 */
export async function fetchEventsByType(eventType) {
    const allEvents = await fetchAllEvents();
    return allEvents.filter(e => e.eventName === eventType);
}

/**
 * Get audit trail for a credential (combines multiple event types)
 */
export async function getCredentialAuditTrail(credentialId) {
    const allEvents = await fetchAllEvents();
    const credentialEvents = getEventsForCredential(allEvents, credentialId);

    // Sort by timestamp
    credentialEvents.sort((a, b) => {
        const timeA = a.data?.timestamp || 0;
        const timeB = b.data?.timestamp || 0;
        return timeA - timeB;
    });

    // Build audit trail
    return {
        credentialId,
        eventCount: credentialEvents.length,
        timeline: credentialEvents.map(e => ({
            eventType: e.eventName,
            action: e.data?.action || e.eventName,
            actor: e.data?.actor || e.data?.issuer || e.data?.verifier || e.data?.revoked_by,
            timestamp: e.data?.timestamp,
            timestamp_formatted: e.data?.timestamp_formatted,
            details: e.data
        }))
    };
}

/**
 * Get summary statistics for all events
 */
export async function getEventStats() {
    const allEvents = await fetchAllEvents();

    const stats = {
        totalEvents: allEvents.length,
        byType: {},
        auditLogs: {
            total: 0,
            byAction: {}
        },
        credentials: {
            issued: 0,
            revoked: 0,
            verified: 0
        }
    };

    for (const event of allEvents) {
        const type = event.eventName || 'Unknown';
        stats.byType[type] = (stats.byType[type] || 0) + 1;

        if (type === 'AuditLogCreated') {
            stats.auditLogs.total++;
            const action = event.data?.action || 'Unknown';
            stats.auditLogs.byAction[action] = (stats.auditLogs.byAction[action] || 0) + 1;
        }

        if (type === 'CredentialIssued') stats.credentials.issued++;
        if (type === 'CredentialRevoked') stats.credentials.revoked++;
        if (type === 'CredentialVerified') stats.credentials.verified++;
    }

    return stats;
}

export default {
    getStateRootHash,
    getEventsCount,
    fetchEventByIndex,
    fetchAllEvents,
    fetchAuditLogs,
    fetchAuditLogsForCredential,
    fetchEventsByType,
    getCredentialAuditTrail,
    getEventStats
};
