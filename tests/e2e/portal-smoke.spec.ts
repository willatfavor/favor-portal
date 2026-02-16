import { expect, test } from "@playwright/test";

const portalPaths = [
  "/login",
  "/dashboard",
  "/content",
  "/content/content-001",
  "/courses",
  "/courses/course-001",
  "/giving",
  "/giving/history",
  "/giving/impact",
  "/giving/recurring",
];

const adminPaths = [
  "/admin",
  "/admin/users",
  "/admin/courses",
  "/admin/content",
  "/admin/communications",
  "/admin/gifts",
  "/admin/support",
];

test.describe("Portal page smoke", () => {
  for (const path of portalPaths) {
    test(`loads ${path}`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: "networkidle" });
      expect(response).not.toBeNull();
      expect(response?.status()).toBeLessThan(400);
    });
  }
});

test.describe("Admin page smoke", () => {
  for (const path of adminPaths) {
    test(`loads ${path}`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: "networkidle" });
      expect(response).not.toBeNull();
      expect(response?.status()).toBeLessThan(400);
    });
  }
});

test("backend recurring + receipt endpoints work in dev bypass", async ({ request }) => {
  const recurringList = await request.get("/api/giving/recurring?userId=user-001");
  expect(recurringList.status()).toBe(200);

  const receiptJson = await request.get("/api/giving/receipt/gift-001?format=json");
  expect(receiptJson.status()).toBe(200);

  const createRecurring = await request.post("/api/giving/recurring?userId=user-001", {
    data: {
      amount: 75,
      frequency: "monthly",
      designation: "Where Most Needed",
    },
  });
  expect(createRecurring.status()).toBe(201);
  const createdGift = (await createRecurring.json()) as { gift?: { id?: string } };
  expect(createdGift.gift?.id).toBeTruthy();

  const recurringId = createdGift.gift?.id as string;
  const updateRecurring = await request.patch(`/api/giving/recurring/${recurringId}`, {
    data: { amount: 90 },
  });
  expect(updateRecurring.status()).toBe(200);

  const pauseRecurring = await request.patch(`/api/giving/recurring/${recurringId}/status`, {
    data: { status: "paused" },
  });
  expect(pauseRecurring.status()).toBe(200);

  const cancelRecurring = await request.post(`/api/giving/recurring/${recurringId}/cancel`);
  expect(cancelRecurring.status()).toBe(200);
});

test("protected backend endpoints enforce auth", async ({ request }) => {
  const givingHistory = await request.get("/api/giving/history");
  expect(givingHistory.status()).toBe(401);

  const lmsAnalytics = await request.get("/api/admin/lms/analytics");
  expect(lmsAnalytics.status()).toBe(401);

  const lmsCohorts = await request.get("/api/lms/cohorts?courseId=course-001");
  expect(lmsCohorts.status()).toBe(401);
});
