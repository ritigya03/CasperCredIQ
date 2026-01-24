/**
 * Odra Event Decoder for CasperCredIQ - FIXED VERSION
 * 
 * Decodes events stored in the Odra __events dictionary
 * Events are stored as List<U8> bytes with the following structure:
 * - First 4 bytes: event name length (U32 little-endian)
 * - Next N bytes: event name string (e.g., "event_AuditLogCreated")
 * - Remaining bytes: event data fields
 * 
 * IMPORTANT: Odra uses compact serialization:
 * - U256: Single byte for values 0-255, otherwise variable length
 * - Address: 1 byte tag + 32 bytes hash
 * - String: 4 bytes length + N bytes content
 */

// Event type definitions matching lib.rs
const EVENT_TYPES = {
    'event_AuditLogCreated': {
        decode: decodeAuditLogCreated
    },
    'event_CredentialIssued': {
        decode: decodeCredentialIssued
    },
    'event_CredentialRevoked': {
        decode: decodeCredentialRevoked
    },
    'event_CredentialVerified': {
        decode: decodeCredentialVerified
    },
    'event_AccessLevelChanged': {
        decode: decodeAccessLevelChanged
    },
    'event_SuspiciousActivity': {
        decode: decodeSuspiciousActivity
    },
    'event_OwnershipTransferred': {
        decode: decodeOwnershipTransferred
    },
    'event_ContractPaused': {
        decode: decodeContractPaused
    },
    'event_ContractUnpaused': {
        decode: decodeContractUnpaused
    }
};

/**
 * Read a U32 (little-endian) from bytes at offset
 */
function readU32(bytes, offset) {
    if (offset + 4 > bytes.length) return { value: 0, bytesRead: 0 };
    const value = bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24);
    return { value: value >>> 0, bytesRead: 4 }; // >>> 0 to make unsigned
}

/**
 * Read a U64 (little-endian) from bytes at offset
 */
function readU64(bytes, offset) {
    if (offset + 8 > bytes.length) return { value: 0, bytesRead: 0 };
    const low = (bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24)) >>> 0;
    const high = (bytes[offset + 4] |
        (bytes[offset + 5] << 8) |
        (bytes[offset + 6] << 16) |
        (bytes[offset + 7] << 24)) >>> 0;
    return { value: low + (high * 0x100000000), bytesRead: 8 };
}

/**
 * Read a U256 from bytes - Odra uses compact encoding
 * - Value 0: encoded as single byte [0]
 * - Value 1-255: encoded as [length=1, value]
 * - Larger values: [length, bytes...]
 */
function readU256Compact(bytes, offset) {
    if (offset >= bytes.length) return { value: 0, bytesRead: 0 };

    const firstByte = bytes[offset];

    // If first byte is 0, the value is 0
    if (firstByte === 0) {
        return { value: 0, bytesRead: 1 };
    }

    // Otherwise, first byte is the length of the value bytes
    const length = firstByte;

    if (offset + 1 + length > bytes.length) {
        // Not enough bytes, return what we can
        return { value: bytes[offset + 1] || 0, bytesRead: 1 + length };
    }

    // Read the value (little-endian)
    let value = 0;
    for (let i = 0; i < length && i < 8; i++) { // Only read up to 8 bytes for JS number safety
        value += bytes[offset + 1 + i] * Math.pow(256, i);
    }

    return { value, bytesRead: 1 + length };
}

/**
 * Read a String from bytes at offset
 * Returns { value: string, bytesRead: number }
 */
function readString(bytes, offset) {
    if (offset + 4 > bytes.length) return { value: '', bytesRead: 0 };

    const lengthResult = readU32(bytes, offset);
    const length = lengthResult.value;

    if (length > 10000 || offset + 4 + length > bytes.length) {
        // Invalid length, return empty
        return { value: '', bytesRead: 4 };
    }

    const strBytes = bytes.slice(offset + 4, offset + 4 + length);
    let value = '';
    try {
        value = String.fromCharCode(...strBytes);
        // Check if it's printable ASCII
        if (!/^[\x20-\x7E]*$/.test(value)) {
            // Contains non-printable chars, might be binary data
            value = Buffer.from(strBytes).toString('hex').substring(0, 20) + '...';
        }
    } catch (e) {
        value = 'decode_error';
    }
    return { value, bytesRead: 4 + length };
}

/**
 * Read an Address from bytes at offset
 * Address = 1 byte tag + 32 bytes hash
 * Returns { value: string, bytesRead: number }
 */
function readAddress(bytes, offset) {
    if (offset + 33 > bytes.length) return { value: 'unknown', bytesRead: 0 };

    const tag = bytes[offset];
    const hashBytes = bytes.slice(offset + 1, offset + 33);
    const hash = Buffer.from(hashBytes).toString('hex');

    // Tag 0 = Account hash, Tag 1 = Contract hash
    const prefix = tag === 0 ? 'account-hash-' : 'hash-';
    return { value: `${prefix}${hash}`, bytesRead: 33 };
}

/**
 * Read an Address without tag (32 bytes only)
 */
function readAddressNoTag(bytes, offset) {
    if (offset + 32 > bytes.length) return { value: 'unknown', bytesRead: 0 };

    const hashBytes = bytes.slice(offset, offset + 32);
    const hash = Buffer.from(hashBytes).toString('hex');
    return { value: hash, bytesRead: 32 };
}

/**
 * Read a U8 from bytes at offset
 */
function readU8(bytes, offset) {
    if (offset >= bytes.length) return { value: 0, bytesRead: 0 };
    return { value: bytes[offset], bytesRead: 1 };
}

/**
 * Read a bool from bytes at offset
 */
function readBool(bytes, offset) {
    if (offset >= bytes.length) return { value: false, bytesRead: 0 };
    return { value: bytes[offset] !== 0, bytesRead: 1 };
}

/**
 * Decode the event name from bytes
 */
function decodeEventName(bytes) {
    const lengthResult = readU32(bytes, 0);
    const length = lengthResult.value;

    if (length > 100 || length > bytes.length - 4) {
        return { eventName: 'unknown', dataOffset: 4 };
    }

    const nameBytes = bytes.slice(4, 4 + length);
    const eventName = String.fromCharCode(...nameBytes);
    return { eventName, dataOffset: 4 + length };
}

/**
 * Decode AuditLogCreated event
 * Structure: credential_id (U256), action (String), actor (Address), timestamp (U64), audit_count (U32)
 */
function decodeAuditLogCreated(bytes, offset) {
    let pos = offset;
    const result = {};

    // credential_id: U256 (compact - 1 byte for small values)
    const credIdResult = readU256Compact(bytes, pos);
    result.credential_id = credIdResult.value;
    pos += credIdResult.bytesRead;

    // action: String
    const actionResult = readString(bytes, pos);
    result.action = actionResult.value;
    pos += actionResult.bytesRead;

    // actor: Address (tag + 32 bytes)
    const actorResult = readAddress(bytes, pos);
    result.actor = actorResult.value;
    pos += actorResult.bytesRead;

    // timestamp: U64
    const timestampResult = readU64(bytes, pos);
    result.timestamp = timestampResult.value;
    result.timestamp_formatted = timestampResult.value > 0
        ? new Date(timestampResult.value).toISOString()
        : 'Unknown';
    pos += timestampResult.bytesRead;

    // audit_count: U32
    const auditCountResult = readU32(bytes, pos);
    result.audit_count = auditCountResult.value;

    return result;
}

/**
 * Decode CredentialIssued event
 * Structure: credential_id, holder, issuer, issuer_did, holder_did, ai_confidence, credential_hash, ipfs_hash, timestamp
 */
function decodeCredentialIssued(bytes, offset) {
    let pos = offset;
    const result = {};

    // credential_id: U256 (compact)
    const credIdResult = readU256Compact(bytes, pos);
    result.credential_id = credIdResult.value;
    pos += credIdResult.bytesRead;

    // holder: Address
    const holderResult = readAddress(bytes, pos);
    result.holder = holderResult.value;
    pos += holderResult.bytesRead;

    // issuer: Address
    const issuerResult = readAddress(bytes, pos);
    result.issuer = issuerResult.value;
    pos += issuerResult.bytesRead;

    // issuer_did: String
    const issuerDidResult = readString(bytes, pos);
    result.issuer_did = issuerDidResult.value;
    pos += issuerDidResult.bytesRead;

    // holder_did: String
    const holderDidResult = readString(bytes, pos);
    result.holder_did = holderDidResult.value;
    pos += holderDidResult.bytesRead;

    // ai_confidence: U8
    const aiConfResult = readU8(bytes, pos);
    result.ai_confidence = aiConfResult.value;
    pos += aiConfResult.bytesRead;

    // credential_hash: String
    const hashResult = readString(bytes, pos);
    result.credential_hash = hashResult.value;
    pos += hashResult.bytesRead;

    // ipfs_hash: String
    const ipfsResult = readString(bytes, pos);
    result.ipfs_hash = ipfsResult.value;
    pos += ipfsResult.bytesRead;

    // timestamp: U64
    const timestampResult = readU64(bytes, pos);
    result.timestamp = timestampResult.value;
    result.timestamp_formatted = timestampResult.value > 0
        ? new Date(timestampResult.value).toISOString()
        : 'Unknown';

    return result;
}

/**
 * Decode CredentialRevoked event
 * Structure: credential_id, revoked_by, reason, timestamp, was_already_revoked
 */
function decodeCredentialRevoked(bytes, offset) {
    let pos = offset;
    const result = {};

    // credential_id: U256 (compact)
    const credIdResult = readU256Compact(bytes, pos);
    result.credential_id = credIdResult.value;
    pos += credIdResult.bytesRead;

    // revoked_by: Address
    const revokedByResult = readAddress(bytes, pos);
    result.revoked_by = revokedByResult.value;
    pos += revokedByResult.bytesRead;

    // reason: String
    const reasonResult = readString(bytes, pos);
    result.reason = reasonResult.value;
    pos += reasonResult.bytesRead;

    // timestamp: U64
    const timestampResult = readU64(bytes, pos);
    result.timestamp = timestampResult.value;
    result.timestamp_formatted = timestampResult.value > 0
        ? new Date(timestampResult.value).toISOString()
        : 'Unknown';
    pos += timestampResult.bytesRead;

    // was_already_revoked: bool
    const wasRevokedResult = readBool(bytes, pos);
    result.was_already_revoked = wasRevokedResult.value;

    return result;
}

/**
 * Decode CredentialVerified event
 */
function decodeCredentialVerified(bytes, offset) {
    let pos = offset;
    const result = {};

    // credential_id: U256 (compact)
    const credIdResult = readU256Compact(bytes, pos);
    result.credential_id = credIdResult.value;
    pos += credIdResult.bytesRead;

    // verifier: Address
    const verifierResult = readAddress(bytes, pos);
    result.verifier = verifierResult.value;
    pos += verifierResult.bytesRead;

    // is_valid: bool
    const isValidResult = readBool(bytes, pos);
    result.is_valid = isValidResult.value;
    pos += isValidResult.bytesRead;

    // verification_type: String
    const typeResult = readString(bytes, pos);
    result.verification_type = typeResult.value;
    pos += typeResult.bytesRead;

    // timestamp: U64
    const timestampResult = readU64(bytes, pos);
    result.timestamp = timestampResult.value;
    result.timestamp_formatted = timestampResult.value > 0
        ? new Date(timestampResult.value).toISOString()
        : 'Unknown';

    return result;
}

/**
 * Decode AccessLevelChanged event
 */
function decodeAccessLevelChanged(bytes, offset) {
    let pos = offset;
    const result = {};

    // user: Address
    const userResult = readAddress(bytes, pos);
    result.user = userResult.value;
    pos += userResult.bytesRead;

    // old_level: U8
    const oldLevelResult = readU8(bytes, pos);
    result.old_level = oldLevelResult.value;
    pos += oldLevelResult.bytesRead;

    // new_level: U8
    const newLevelResult = readU8(bytes, pos);
    result.new_level = newLevelResult.value;
    pos += newLevelResult.bytesRead;

    // changed_by: Address
    const changedByResult = readAddress(bytes, pos);
    result.changed_by = changedByResult.value;
    pos += changedByResult.bytesRead;

    // timestamp: U64
    const timestampResult = readU64(bytes, pos);
    result.timestamp = timestampResult.value;
    result.timestamp_formatted = timestampResult.value > 0
        ? new Date(timestampResult.value).toISOString()
        : 'Unknown';

    return result;
}

/**
 * Decode SuspiciousActivity event
 */
function decodeSuspiciousActivity(bytes, offset) {
    let pos = offset;
    const result = {};

    // actor: Address
    const actorResult = readAddress(bytes, pos);
    result.actor = actorResult.value;
    pos += actorResult.bytesRead;

    // action: String
    const actionResult = readString(bytes, pos);
    result.action = actionResult.value;
    pos += actionResult.bytesRead;

    // severity: U8
    const severityResult = readU8(bytes, pos);
    result.severity = severityResult.value;
    pos += severityResult.bytesRead;

    // timestamp: U64
    const timestampResult = readU64(bytes, pos);
    result.timestamp = timestampResult.value;
    result.timestamp_formatted = timestampResult.value > 0
        ? new Date(timestampResult.value).toISOString()
        : 'Unknown';

    return result;
}

/**
 * Decode OwnershipTransferred event
 */
function decodeOwnershipTransferred(bytes, offset) {
    let pos = offset;
    const result = {};

    // previous_owner: Address
    const prevOwnerResult = readAddress(bytes, pos);
    result.previous_owner = prevOwnerResult.value;
    pos += prevOwnerResult.bytesRead;

    // new_owner: Address
    const newOwnerResult = readAddress(bytes, pos);
    result.new_owner = newOwnerResult.value;
    pos += newOwnerResult.bytesRead;

    // timestamp: U64
    const timestampResult = readU64(bytes, pos);
    result.timestamp = timestampResult.value;
    result.timestamp_formatted = timestampResult.value > 0
        ? new Date(timestampResult.value).toISOString()
        : 'Unknown';

    return result;
}

/**
 * Decode ContractPaused event
 */
function decodeContractPaused(bytes, offset) {
    let pos = offset;
    const result = {};

    // paused_by: Address
    const pausedByResult = readAddress(bytes, pos);
    result.paused_by = pausedByResult.value;
    pos += pausedByResult.bytesRead;

    // timestamp: U64
    const timestampResult = readU64(bytes, pos);
    result.timestamp = timestampResult.value;
    result.timestamp_formatted = timestampResult.value > 0
        ? new Date(timestampResult.value).toISOString()
        : 'Unknown';

    return result;
}

/**
 * Decode ContractUnpaused event
 */
function decodeContractUnpaused(bytes, offset) {
    let pos = offset;
    const result = {};

    // unpaused_by: Address
    const unpausedByResult = readAddress(bytes, pos);
    result.unpaused_by = unpausedByResult.value;
    pos += unpausedByResult.bytesRead;

    // timestamp: U64
    const timestampResult = readU64(bytes, pos);
    result.timestamp = timestampResult.value;
    result.timestamp_formatted = timestampResult.value > 0
        ? new Date(timestampResult.value).toISOString()
        : 'Unknown';

    return result;
}

/**
 * Main function to decode an event from raw bytes
 * @param {number[]} bytes - The parsed bytes array from the CLValue
 * @returns {object} Decoded event with type and data
 */
export function decodeEvent(bytes) {
    try {
        if (!bytes || bytes.length < 5) {
            return { error: 'Invalid event bytes', raw: bytes };
        }

        // Decode event name
        const { eventName, dataOffset } = decodeEventName(bytes);

        // Find the event type handler
        const eventType = EVENT_TYPES[eventName];

        if (!eventType) {
            return {
                eventName: eventName.replace('event_', ''),
                eventType: eventName,
                data: { raw_bytes: bytes.length + ' bytes' },
                error: `Unknown event type: ${eventName}`
            };
        }

        // Decode the event data
        const data = eventType.decode(bytes, dataOffset);

        return {
            eventName: eventName.replace('event_', ''),
            eventType: eventName,
            data
        };
    } catch (error) {
        return {
            error: `Failed to decode event: ${error.message}`,
            raw: bytes ? bytes.slice(0, 50) : null
        };
    }
}

/**
 * Decode multiple events from an array of raw byte arrays
 */
export function decodeEvents(eventsArray) {
    return eventsArray.map((bytes, index) => ({
        index,
        ...decodeEvent(bytes)
    }));
}

/**
 * Filter events by type
 */
export function filterEventsByType(decodedEvents, eventType) {
    return decodedEvents.filter(e =>
        e.eventName === eventType || e.eventType === `event_${eventType}`
    );
}

/**
 * Get all audit log events
 */
export function getAuditLogEvents(decodedEvents) {
    return filterEventsByType(decodedEvents, 'AuditLogCreated');
}

/**
 * Get all credential issued events
 */
export function getCredentialIssuedEvents(decodedEvents) {
    return filterEventsByType(decodedEvents, 'CredentialIssued');
}

/**
 * Get events for a specific credential ID
 */
export function getEventsForCredential(decodedEvents, credentialId) {
    return decodedEvents.filter(e =>
        e.data && e.data.credential_id === credentialId
    );
}

export default {
    decodeEvent,
    decodeEvents,
    filterEventsByType,
    getAuditLogEvents,
    getCredentialIssuedEvents,
    getEventsForCredential,
    EVENT_TYPES
};
