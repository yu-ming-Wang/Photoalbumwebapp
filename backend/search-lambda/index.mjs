import {
  LexRuntimeV2Client,
  RecognizeTextCommand,
} from "@aws-sdk/client-lex-runtime-v2";

import https from "https";

const lexClient = new LexRuntimeV2Client({ region: process.env.AWS_REGION });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Content-Type": "application/json",
};

// ------------------------------------------
// Simple OpenSearch HTTP request helper
// ------------------------------------------
function esRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${process.env.OPENSEARCH_ENDPOINT}${path}`);

    // Your OpenSearch master username & password
    const OS_USER = process.env.OS_USER;
    const OS_PASS = process.env.OS_PASS;
    
    // Encode to Base64 (Basic Auth requirement)
    const basicAuth = Buffer.from(`${OS_USER}:${OS_PASS}`).toString("base64");
 
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      port: 443,
      headers: {
        "Content-Type": "application/json",
        // Send the Basic Auth header correctly
        "Authorization": `Basic ${basicAuth}`
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on("error", reject);

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ------------------------------------------
// Lambda Handler
// ------------------------------------------
export const handler = async (event) => {
  try {
    console.log("Incoming event:", JSON.stringify(event));

    // Handle OPTIONS (CORS preflight)
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: "",
      };
    }

    // 1. Get the query
    const query = event.queryStringParameters?.q || "";
    if (!query.trim()) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ results: [] }),
      };
    }

    // ------------------------------------------
    // 2. Let Lex parse the input and extract slot: SearchQuery
    // ------------------------------------------
    let rawQueryFromLex = "";

    try {
      const lexResponse = await lexClient.send(
        new RecognizeTextCommand({
          botId: process.env.LEX_BOT_ID,
          botAliasId: process.env.LEX_BOT_ALIAS_ID,
          localeId: process.env.LEX_LOCALE_ID,
          sessionId: "user-session",
          text: query,
        })
      );

      console.log("LEX RESPONSE:", JSON.stringify(lexResponse));

      const slots = lexResponse.sessionState?.intent?.slots || {};
      rawQueryFromLex = slots.SearchQuery?.value?.interpretedValue || "";
    } catch (lexErr) {
      console.warn("Lex error, fallback to raw query:", lexErr);
    }

    // If Lex returns nothing, fall back to the original query
    const raw = (rawQueryFromLex || query).trim();
    if (!raw.trim()) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ results: [] }),
      };
    }

    // ------------------------------------------
    // 3. Tokenize → keywords = ["cat", "dog"]
    // ------------------------------------------
    const keywords = raw
      .toLowerCase()
      .split(/[, ]+and[, ]+|,|;/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log("Parsed keywords:", keywords);

    if (keywords.length === 0) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ results: [] }),
      };
    }

    // ------------------------------------------
    // 4. Query OpenSearch “photos”
    // ------------------------------------------
    const shouldClauses = keywords.map((k) => ({
      match: { labels: k },  // Let the analyzer handle casing
    }));
    
    const esQuery = {
      query: {
        bool: {
          should: shouldClauses,
          minimum_should_match: 1,
        },
      },
    };

    const indexName = process.env.OPENSEARCH_INDEX || "photos";

    const esResult = await esRequest(
      "POST",
      `/${indexName}/_search`,
      esQuery
    );

    console.log("ES Result:", JSON.stringify(esResult));

    const hits = esResult.hits?.hits || [];

    // Build S3 URL with bucket + objectKey to send back to the frontend
    const results = hits.map((hit) => {
      const src = hit._source || {};
      const bucket = src.bucket;
      const key = src.objectKey;

      const url =
        bucket && key
          ? `https://${bucket}.s3.amazonaws.com/${encodeURIComponent(key)}`
          : undefined;

      return {
        url,                 // Used by the frontend <PhotoGrid>
        labels: src.labels || [],
        objectKey: key,
        bucket,
        createdTimestamp: src.createdTimestamp,
      };
    });

    // ------------------------------------------
    // 5. Return results
    // ------------------------------------------
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ results }),
    };

  } catch (err) {
    console.error("LF2 error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
