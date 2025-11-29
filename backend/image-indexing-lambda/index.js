// index.js - Node.js 22 Lambda for image indexing & (optional) API Gateway CORS

const AWS = require("aws-sdk");
const https = require("https");
const { URL } = require("url");

// ---- Env vars ----
const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT;
const OPENSEARCH_INDEX =
  process.env.OPENSEARCH_INDEX || "photos";
const OPENSEARCH_REGION =
  process.env.OPENSEARCH_REGION || process.env.AWS_REGION || "us-east-1";
const OS_USER = process.env.OS_USER;
const OS_PASS = process.env.OS_PASS;

// ---- AWS SDK clients ----
AWS.config.update({ region: OPENSEARCH_REGION });

const s3 = new AWS.S3();
const rekognition = new AWS.Rekognition();

// ---- CORS headers (for API Gateway HTTP responses) ----
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type,x-amz-meta-customLabels,Authorization,X-Requested-With",
  "Access-Control-Allow-Methods": "OPTIONS,GET,PUT,POST",
};

/**
 * Load x-amz-meta-customLabels inside the S3 metadata
 */
async function getCustomLabels(bucket, key) {
  const head = await s3
    .headObject({
      Bucket: bucket,
      Key: key,
    })
    .promise();

  const metadata = head.Metadata || {};
  const raw = metadata.customlabels || ""; // S3 turns metadata key into lowercases

  if (!raw) return [];

  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Rekognition.detectLabels to get the image labels
 */
async function getRekognitionLabels(bucket, key) {
  const resp = await rekognition
    .detectLabels({
      Image: {
        S3Object: {
          Bucket: bucket,
          Name: key,
        },
      },
      MaxLabels: 50,
      MinConfidence: 70,
    })
    .promise();

  return (resp.Labels || []).map((label) => label.Name);
}

/**
 * Write the doc to OpenSearch / Elasticsearch (uses Basic Auth)
 */
function indexDocumentToES(doc) {
  if (!OPENSEARCH_ENDPOINT) {
    throw new Error("OPENSEARCH_ENDPOINT env var is not set");
  }

  if (!OS_USER || !OS_PASS) {
    throw new Error("OS_USER / OS_PASS env vars are not set");
  }

  const endpoint = new URL(OPENSEARCH_ENDPOINT);
  const body = JSON.stringify(doc);

  // ES data-plane path：/<index>/_doc
  const indexPath = `/${OPENSEARCH_INDEX}/_doc`;

  const path =
    (endpoint.pathname === "/" ? "" : endpoint.pathname.replace(/\/$/, "")) +
    indexPath;

  // Basic Auth header
  const basicAuth = Buffer.from(`${OS_USER}:${OS_PASS}`).toString("base64");

  const requestOptions = {
    hostname: endpoint.hostname,
    port: 443,
    path,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
      Authorization: `Basic ${basicAuth}`,
    },
  };

  console.log("Indexing to ES:", {
    host: requestOptions.hostname,
    path: requestOptions.path,
    index: OPENSEARCH_INDEX,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(requestOptions, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        console.log("ES response status:", res.statusCode);
        console.log("ES response body:", data);

        if (res.statusCode >= 300) {
          return reject(
            new Error(
              `Failed to index document into ES: status=${res.statusCode} body=${data}`
            )
          );
        }

        resolve();
      });
    });

    req.on("error", (err) => {
      console.error("Error sending request to ES:", err);
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

/**
 * Main handler
 * - If this is an API Gateway preflight (OPTIONS), return CORS OK
 * - If this is an S3 ObjectCreated event, index each record
 */
exports.handler = async (event, context) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  // ---------- 1. API Gateway CORS preflight (OPTIONS) ----------
  if (event && event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  // ---------- 2. Normal S3 event processing ----------
  try {
    const records = event.Records || [];

    for (const record of records) {
      try {
        const eventName = record.eventName;
        console.log("Processing eventName:", eventName);

        const bucket = record.s3.bucket.name;
        const rawKey = record.s3.object.key; // URL encoded
        const key = decodeURIComponent(rawKey.replace(/\+/g, " "));
        const createdTimestamp = record.eventTime; // ISO 8601 String

        console.log(
          `Bucket=${bucket}, Key=${key}, CreatedAt=${createdTimestamp}`
        );

        // 1. Rekognition labels
        const rekLabels = await getRekognitionLabels(bucket, key);
        console.log("Rekognition labels:", rekLabels);

        // 2. Custom labels
        const customLabels = await getCustomLabels(bucket, key);
        console.log("Custom labels:", customLabels);

        // 3. Merge and dedupe
        const labelSet = new Set([
          ...(rekLabels || []),
          ...(customLabels || []),
        ]);
        const allLabels = Array.from(labelSet)
          .map((s) => s.toLowerCase())  // Normalize to lowercase
          .sort();

        console.log("All labels:", allLabels);

        // 4. Build the expected JSON schema
        const doc = {
          objectKey: key,
          bucket: bucket,
          createdTimestamp: createdTimestamp,
          labels: allLabels,
        };

        console.log("Document to index:", JSON.stringify(doc));

        // 5. Write into ES
        await indexDocumentToES(doc);
      } catch (err) {
        console.error("Error processing single record:", err);
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Indexed all records" }),
    };
  } catch (err) {
    console.error("Handler level error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal error while indexing" }),
    };
  }
};
