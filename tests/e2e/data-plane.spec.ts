import { expect, test } from "@playwright/test";

test.describe("API data-plane regression (dev bypass)", () => {
  test("content admin CRUD works", async ({ request }) => {
    const list = await request.get("/api/admin/content");
    expect(list.status()).toBe(200);

    const create = await request.post("/api/admin/content", {
      data: {
        title: "Playwright Content",
        excerpt: "Seeded from test",
        body: "Playwright content body",
        type: "update",
        accessLevel: "partner",
        author: "QA Bot",
        tags: ["qa", "playwright"],
        status: "draft",
      },
    });
    expect(create.status()).toBe(201);
    const created = (await create.json()) as { item?: { id?: string; status?: string } };
    expect(created.item?.id).toBeTruthy();

    const contentId = created.item?.id as string;

    const publish = await request.patch(`/api/admin/content/${contentId}`, {
      data: { status: "published" },
    });
    expect(publish.status()).toBe(200);

    const remove = await request.delete(`/api/admin/content/${contentId}`);
    expect(remove.status()).toBe(200);
  });

  test("communications templates + send log flow works", async ({ request }) => {
    const create = await request.post("/api/admin/communications", {
      data: {
        channel: "email",
        name: "QA Template",
        subject: "Hello {{firstName}}",
        content: "Body {{date}}",
        status: "draft",
      },
    });

    expect(create.status()).toBe(201);
    const created = (await create.json()) as { template?: { id?: string } };
    const templateId = created.template?.id as string;
    expect(templateId).toBeTruthy();

    const activate = await request.patch(`/api/admin/communications/${templateId}`, {
      data: { status: "active" },
    });
    expect(activate.status()).toBe(200);

    const send = await request.put("/api/admin/communications", {
      data: { templateId },
    });
    expect(send.status()).toBe(200);

    const listing = await request.get("/api/admin/communications");
    expect(listing.status()).toBe(200);
    const payload = (await listing.json()) as { sendLog?: Array<{ templateId?: string }> };
    expect(payload.sendLog?.some((entry) => entry.templateId === templateId)).toBeTruthy();

    const remove = await request.delete(`/api/admin/communications/${templateId}`);
    expect(remove.status()).toBe(200);
  });

  test("support ticket user/admin flow works", async ({ request }) => {
    const createTicket = await request.post("/api/support", {
      data: {
        category: "technical",
        subject: "Playwright support request",
        message: "Need help from QA flow",
      },
    });
    expect(createTicket.status()).toBe(201);

    const created = (await createTicket.json()) as { ticket?: { id?: string } };
    const ticketId = created.ticket?.id as string;
    expect(ticketId).toBeTruthy();

    const listMine = await request.get("/api/support");
    expect(listMine.status()).toBe(200);

    const statusUpdate = await request.patch("/api/admin/support", {
      data: { ticketId, status: "in_progress" },
    });
    expect(statusUpdate.status()).toBe(200);

    const reply = await request.post("/api/admin/support", {
      data: { ticketId, message: "Staff reply from QA test" },
    });
    expect(reply.status()).toBe(200);

    const adminList = await request.get("/api/admin/support");
    expect(adminList.status()).toBe(200);
    const adminPayload = (await adminList.json()) as {
      tickets?: Array<{ id?: string; messages?: Array<{ sender?: string; message?: string }> }>;
    };
    const updatedTicket = adminPayload.tickets?.find((ticket) => ticket.id === ticketId);
    expect(updatedTicket).toBeTruthy();
    expect(updatedTicket?.messages?.some((msg) => msg.sender === "staff")).toBeTruthy();
  });

  test("one-time giving writes through and appears in admin/overview", async ({ request }) => {
    const createGift = await request.post("/api/giving/one-time", {
      data: {
        amount: 123,
        designation: "Where Most Needed",
        frequency: "monthly",
        note: "Playwright gift",
      },
    });

    expect(createGift.status()).toBe(201);
    const created = (await createGift.json()) as {
      gift?: { id?: string; source?: string; isRecurring?: boolean };
    };

    expect(created.gift?.id).toBeTruthy();
    expect(created.gift?.source).toBe("portal");
    expect(created.gift?.isRecurring).toBeTruthy();

    const gifts = await request.get("/api/admin/gifts");
    expect(gifts.status()).toBe(200);
    const giftsPayload = (await gifts.json()) as { gifts?: Array<{ id?: string }> };
    expect(giftsPayload.gifts?.some((gift) => gift.id === created.gift?.id)).toBeTruthy();

    const overview = await request.get("/api/admin/overview");
    expect(overview.status()).toBe(200);
    const overviewPayload = (await overview.json()) as { gifts?: Array<{ id?: string }> };
    expect(overviewPayload.gifts?.some((gift) => gift.id === created.gift?.id)).toBeTruthy();
  });

  test("admin users update endpoint works", async ({ request }) => {
    const usersResponse = await request.get("/api/admin/users");
    expect(usersResponse.status()).toBe(200);
    const usersPayload = (await usersResponse.json()) as {
      users?: Array<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        constituentType: string;
        isAdmin?: boolean;
      }>;
    };

    const target = usersPayload.users?.[0];
    expect(target).toBeTruthy();

    const updatedFirstName = `${target?.firstName}-qa`;

    const update = await request.patch(`/api/admin/users/${target?.id}`, {
      data: {
        firstName: updatedFirstName,
        lastName: target?.lastName,
        email: target?.email,
        constituentType: target?.constituentType,
        isAdmin: target?.isAdmin ?? false,
      },
    });
    expect(update.status()).toBe(200);

    const updatedPayload = (await update.json()) as { user?: { firstName?: string } };
    expect(updatedPayload.user?.firstName).toBe(updatedFirstName);
  });
});
