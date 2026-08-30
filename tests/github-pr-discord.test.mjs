import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import handleGitHubPullRequestNotification from "../netlify/functions/github-pr-discord.ts";

const secret = "test-webhook-secret";
const discordUrl = "https://discord.com/api/webhooks/123/token/github";
const originalFetch = globalThis.fetch;

async function signatureFor(body) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );

  return `sha256=${Buffer.from(signature).toString("hex")}`;
}

async function requestFor(action, { event = "pull_request", signature = true } = {}) {
  const body = JSON.stringify({ action, pull_request: { number: 42 } });
  const headers = {
    "Content-Type": "application/json",
    "X-GitHub-Event": event,
  };

  if (signature) {
    headers["X-Hub-Signature-256"] = await signatureFor(body);
  }

  return new Request("https://psake.dev/.netlify/functions/github-pr-discord", {
    body,
    headers,
    method: "POST",
  });
}

beforeEach(() => {
  process.env.GITHUB_WEBHOOK_SECRET = secret;
  process.env.DISCORD_GITHUB_WEBHOOK_URL = discordUrl;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("GitHub pull-request Discord relay", () => {
  test.each(["opened", "ready_for_review"])(
    "forwards %s pull requests unchanged",
    async (action) => {
      const calls = [];
      globalThis.fetch = async (url, init) => {
        calls.push({ init, url });
        return new Response(null, { status: 204 });
      };
      const request = await requestFor(action);
      const body = await request.clone().text();

      const response = await handleGitHubPullRequestNotification(request);

      expect(response.status).toBe(202);
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe(discordUrl);
      expect(new TextDecoder().decode(calls[0].init.body)).toBe(body);
      expect(calls[0].init).toMatchObject({
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Event": "pull_request",
        },
        method: "POST",
      });
    },
  );

  test("acknowledges excluded pull-request actions without forwarding", async () => {
    const fetchCalls = [];
    globalThis.fetch = async (...args) => {
      fetchCalls.push(args);
      return new Response(null, { status: 204 });
    };

    const response = await handleGitHubPullRequestNotification(await requestFor("closed"));

    expect(response.status).toBe(204);
    expect(fetchCalls).toHaveLength(0);
  });

  test("rejects unsigned deliveries without forwarding", async () => {
    const fetchCalls = [];
    globalThis.fetch = async (...args) => {
      fetchCalls.push(args);
      return new Response(null, { status: 204 });
    };

    const response = await handleGitHubPullRequestNotification(
      await requestFor("opened", { signature: false }),
    );

    expect(response.status).toBe(401);
    expect(fetchCalls).toHaveLength(0);
  });
  test("acknowledges PR comment events without forwarding", async () => {
    const fetchCalls = [];
    globalThis.fetch = async (...args) => {
      fetchCalls.push(args);
      return new Response(null, { status: 204 });
    };

    const response = await handleGitHubPullRequestNotification(
      await requestFor("created", { event: "issue_comment" }),
    );

    expect(response.status).toBe(204);
    expect(fetchCalls).toHaveLength(0);
  });
  test("rejects incorrectly signed deliveries without forwarding", async () => {
    const fetchCalls = [];
    globalThis.fetch = async (...args) => {
      fetchCalls.push(args);
      return new Response(null, { status: 204 });
    };
    const response = await handleGitHubPullRequestNotification(
      new Request("https://psake.dev/.netlify/functions/github-pr-discord", {
        body: JSON.stringify({ action: "opened" }),
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Event": "pull_request",
          "X-Hub-Signature-256": `sha256=${"0".repeat(64)}`,
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(fetchCalls).toHaveLength(0);
  });

  test("acknowledges Discord failures after logging them", async () => {
    const errors = [];
    const originalConsoleError = console.error;
    console.error = (...args) => errors.push(args);
    globalThis.fetch = async () => new Response(null, { status: 503 });

    const response = await handleGitHubPullRequestNotification(await requestFor("opened"));

    console.error = originalConsoleError;
    expect(response.status).toBe(202);
    expect(errors).toHaveLength(1);
  });
});
