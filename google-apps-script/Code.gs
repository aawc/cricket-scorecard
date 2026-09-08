/**
 * Google Apps Script: Cricket Scorecard PWA Live Sync Backend
 * 
 * Provides a 100% free ($0.00 forever) storage backend on Google infrastructure.
 * 
 * Setup Instructions:
 * 1. Open https://script.google.com and create a new project named "Cricket Scorecard Sync".
 * 2. Paste this code into Code.gs.
 * 3. Click "Deploy" > "New Deployment" > Select type "Web app".
 * 4. Set "Execute as": "Me" (your Google account).
 * 5. Set "Who has access": "Anyone" (allows spectators to read and umpires to post).
 * 6. Click "Deploy" and copy the Web App URL (e.g. https://script.google.com/macros/s/.../exec).
 * 7. Pass this URL to GoogleSheetsStorageProvider in the PWA.
 */

const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000; // 2,419,200,000 ms

function hashWriteKey(key) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET handler for Spectator reads
function doGet(e) {
  try {
    const params = e.parameter || {};
    const matchId = params.matchId;

    if (!matchId) {
      return createJsonResponse({ success: false, error: "Missing matchId parameter" });
    }

    const props = PropertiesService.getScriptProperties();
    const rawData = props.getProperty(`match_${matchId}`);

    if (!rawData) {
      return createJsonResponse({ success: false, notFound: true, error: "Match not found" });
    }

    const packet = JSON.parse(rawData);

    // Enforce 4-week expiration
    if (packet.expiresAt && Date.now() > packet.expiresAt) {
      props.deleteProperty(`match_${matchId}`);
      return createJsonResponse({ success: false, expired: true, error: "Match record has expired (4-week retention ended)" });
    }

    return createJsonResponse({ success: true, packet: packet });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

// POST handler for Umpire writes
function doPost(e) {
  try {
    const postData = e.postData ? e.postData.contents : null;
    if (!postData) {
      return createJsonResponse({ success: false, error: "No payload received" });
    }

    const body = JSON.parse(postData);
    const matchId = body.matchId;
    const writeKey = body.writeKey;
    const incomingPacket = body.packet;

    if (!matchId || !writeKey || !incomingPacket) {
      return createJsonResponse({ success: false, error: "Missing required fields (matchId, writeKey, packet)" });
    }

    const incomingHash = hashWriteKey(writeKey);
    const props = PropertiesService.getScriptProperties();
    const existingRaw = props.getProperty(`match_${matchId}`);

    if (existingRaw) {
      try {
        const existingPacket = JSON.parse(existingRaw);
        if (existingPacket.writeKeyHash && existingPacket.writeKeyHash !== incomingHash) {
          return createJsonResponse({ success: false, error: "Unauthorized: Invalid write key" });
        }
      } catch (err) {
        // Allow overwrite
      }
    }

    // Ensure metadata
    incomingPacket.writeKeyHash = incomingHash;
    incomingPacket.ttlSeconds = 2419200;
    if (!incomingPacket.expiresAt) {
      incomingPacket.expiresAt = Date.now() + FOUR_WEEKS_MS;
    }

    props.setProperty(`match_${matchId}`, JSON.stringify(incomingPacket));

    return createJsonResponse({
      success: true,
      matchId: matchId,
      seq: incomingPacket.seq,
      expiresAt: incomingPacket.expiresAt
    });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}
