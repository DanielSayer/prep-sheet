import { createHmac, randomUUID } from "node:crypto";
import { Polar } from "@polar-sh/sdk";
import type { CustomerState } from "@polar-sh/sdk/models/components/customerstate";
import type { CustomerStateSubscription } from "@polar-sh/sdk/models/components/customerstatesubscription";
import { ResourceNotFound } from "@polar-sh/sdk/models/errors/resourcenotfound";
import { db } from "@prep-sheet/db";
import { user } from "@prep-sheet/db/schema/auth";
import { billingAccount } from "@prep-sheet/db/schema/billing";
import { eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { productId, secret } = vi.hoisted(() => {
  const productId = "11111111-1111-4111-8111-111111111111";
  const secret = "test-polar-webhook-secret";
  vi.stubEnv("POLAR_ACCESS_TOKEN", "test-token");
  vi.stubEnv("POLAR_PRO_PRODUCT_ID", productId);
  vi.stubEnv("POLAR_WEBHOOK_SECRET", secret);
  return { productId, secret };
});
const userId = randomUUID();
// Import after setting test-only configuration. Never contact Polar during tests.
const { handlePolarWebhook, syncBilling, hasUnfinishedSubscription } =
  await import("./polar");
const customerId = randomUUID();
const now = new Date();
const subscription: CustomerStateSubscription = {
  id: randomUUID(),
  createdAt: now,
  modifiedAt: now,
  metadata: {},
  status: "active",
  amount: 0,
  currency: "usd",
  recurringInterval: "month",
  currentPeriodStart: now,
  currentPeriodEnd: new Date(Date.now() + 86400000),
  trialStart: null,
  trialEnd: null,
  cancelAtPeriodEnd: false,
  canceledAt: null,
  startedAt: now,
  endsAt: null,
  productId,
  discountId: null,
  meters: [],
};
const state: CustomerState = {
  id: customerId,
  createdAt: now,
  modifiedAt: null,
  metadata: {},
  externalId: userId,
  email: `${userId}@example.test`,
  emailVerified: true,
  type: "individual",
  name: "Billing test",
  billingName: null,
  billingAddress: null,
  taxId: null,
  organizationId: randomUUID(),
  deletedAt: null,
  avatarUrl: null,
  activeSubscriptions: [],
  grantedBenefits: [],
  activeMeters: [],
};
const customerPrototype = Object.getPrototypeOf(
  new Polar({ accessToken: "test-token" }).customers,
);
function request(timestamp = Math.floor(Date.now() / 1000), invalid = false) {
  const data = {
    id: customerId,
    created_at: now.toISOString(),
    modified_at: null,
    metadata: {},
    external_id: userId,
    email: state.email,
    email_verified: true,
    type: "individual",
    name: "Billing test",
    billing_name: null,
    billing_address: null,
    tax_id: null,
    organization_id: state.organizationId,
    deleted_at: null,
    avatar_url: null,
    active_subscriptions: [],
    granted_benefits: [],
    active_meters: [],
  };
  const body = JSON.stringify({
    type: "customer.state_changed",
    timestamp: now.toISOString(),
    data,
  });
  const id = randomUUID();
  const signature = createHmac("sha256", invalid ? "wrong-secret" : secret)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return new Request("http://localhost/api/polar/webhooks", {
    method: "POST",
    headers: {
      "webhook-id": id,
      "webhook-timestamp": String(timestamp),
      "webhook-signature": `v1,${signature}`,
    },
    body,
  });
}

describe("Polar synchronization and signed webhooks", () => {
  it("blocks unresolved billing even when no active benefits remain", async () => {
    const prototype = Object.getPrototypeOf(
      new Polar({ accessToken: "test-token" }).subscriptions,
    );
    for (const status of [
      "active",
      "trialing",
      "past_due",
      "unpaid",
      "paused",
      "incomplete",
      "canceled",
      "incomplete_expired",
    ]) {
      const spy = vi.spyOn(prototype, "list").mockResolvedValue(
        (async function* () {
          yield { result: { items: [{ status }] } };
        })(),
      );
      expect(await hasUnfinishedSubscription(userId)).toBe(
        !["canceled", "incomplete_expired"].includes(status),
      );
      spy.mockRestore();
    }
  });
  beforeAll(async () => {
    await db
      .insert(user)
      .values({ id: userId, name: "Billing test", email: state.email });
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    vi.unstubAllEnvs();
    await db.delete(user).where(eq(user.id, userId));
    await db.$client.end();
  });
  it("keeps first-time customers on Free when Polar has no customer yet", async () => {
    const request = new Request(
      "https://sandbox-api.polar.sh/v1/customers/external/test/state",
    );
    const body = JSON.stringify({
      error: "ResourceNotFound",
      detail: "Not found",
    });
    const response = new Response(body, { status: 404 });
    vi.spyOn(customerPrototype, "getStateExternal").mockRejectedValue(
      new ResourceNotFound(
        {
          error: "ResourceNotFound",
          detail: "Not found",
        },
        { request, response, body },
      ),
    );
    const account = await db.transaction((tx) => syncBilling(tx, userId));
    expect(account).toMatchObject({
      status: "free",
      customerId: null,
      trialUsed: false,
    });
  });
  it("rejects forged and expired signatures before calling the API", async () => {
    const fetch = vi
      .spyOn(customerPrototype, "getStateExternal")
      .mockResolvedValue(state);
    expect((await handlePolarWebhook(request(undefined, true))).status).toBe(
      403,
    );
    expect((await handlePolarWebhook(request(1))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("accepts verified events, grants discounted Pro and ignores stale payload state", async () => {
    vi.spyOn(customerPrototype, "getStateExternal").mockResolvedValue({
      ...state,
      activeSubscriptions: [{ ...subscription, cancelAtPeriodEnd: true }],
    });
    const event = request();
    expect((await handlePolarWebhook(event.clone())).status).toBe(200);
    expect((await handlePolarWebhook(event)).status).toBe(200);
    const [account] = await db
      .select()
      .from(billingAccount)
      .where(eq(billingAccount.userId, userId));
    expect(account).toMatchObject({
      status: "active",
      customerId,
      cancelAtPeriodEnd: true,
      trialUsed: true,
    });
  });
  it("removes access from authoritative state and ignores unrelated products", async () => {
    vi.spyOn(customerPrototype, "getStateExternal").mockResolvedValue({
      ...state,
      activeSubscriptions: [{ ...subscription, productId: randomUUID() }],
    });
    const account = await db.transaction((tx) => syncBilling(tx, userId));
    expect(account?.status).toBe("free");
    expect(account?.trialUsed).toBe(true);
  });
  it("returns a retryable failure without overwriting state on an API outage", async () => {
    vi.spyOn(customerPrototype, "getStateExternal").mockRejectedValue(
      new Error("Polar unavailable"),
    );
    expect((await handlePolarWebhook(request())).status).toBe(503);
  });
});
