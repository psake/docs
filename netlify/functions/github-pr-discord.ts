const allowedActions = new Set(["opened", "ready_for_review"]);

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

async function hasValidSignature(
  body: ArrayBuffer,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (signature === null || !signature.startsWith("sha256=")) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const expected = `sha256=${toHex(await crypto.subtle.sign("HMAC", key, body))}`;

  return timingSafeEqual(expected, signature);
}

export default async function handleGitHubPullRequestNotification(
  request: Request,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      headers: { Allow: "POST" },
      status: 405,
    });
  }

  const signingSecret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!signingSecret) {
    console.error("GITHUB_WEBHOOK_SECRET is not configured");
    return new Response("Server misconfigured", { status: 500 });
  }

  const body = await request.arrayBuffer();
  const signature = request.headers.get("X-Hub-Signature-256");
  if (!(await hasValidSignature(body, signature, signingSecret))) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: { action?: unknown };
  try {
    payload = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const event = request.headers.get("X-GitHub-Event");
  if (event !== "pull_request" || !allowedActions.has(String(payload.action))) {
    return new Response(null, { status: 204 });
  }

  const discordWebhookUrl = process.env.DISCORD_GITHUB_WEBHOOK_URL;
  if (!discordWebhookUrl) {
    console.error("DISCORD_GITHUB_WEBHOOK_URL is not configured");
    return new Response(null, { status: 202 });
  }

  if (process.env.DEBUG_PR_RELAY === "true")
    console.info("[DEBUG-pr-relay] forwarding eligible delivery", {
      action: String(payload.action),
      delivery: request.headers.get("X-GitHub-Delivery"),
    });
  try {
    const response = await fetch(discordWebhookUrl, {
      body,
      headers: {
        "Content-Type": "application/json",
        "X-GitHub-Event": "pull_request",
      },
      method: "POST",
    });
    if (process.env.DEBUG_PR_RELAY === "true")
      console.info("[DEBUG-pr-relay] Discord response", {
        delivery: request.headers.get("X-GitHub-Delivery"),
        status: response.status,
      });
    if (!response.ok) {
      console.error(
        "Discord rejected GitHub pull-request notification",
        response.status,
      );
    }
  } catch (error) {
    console.error("Failed to forward GitHub pull-request notification to Discord", error);
  }

  return new Response(null, { status: 202 });
}
