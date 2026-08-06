import { describe, expect, it } from "vitest";

import { attachBearerToRequest } from "./apiAuth";

describe("attachBearerToRequest", () => {
  it("preserves a JSON body while adding Authorization", async () => {
    const payload = {
      name: "Algorithms",
      cards: [{ question: "Q", answer: "A" }],
    };
    const original = new Request("http://localhost/api/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const next = await attachBearerToRequest(original, async () => "test-token");

    expect(next.headers.get("Authorization")).toBe("Bearer test-token");
    expect(next.headers.get("Content-Type")).toMatch(/application\/json/);
    expect(await next.json()).toEqual(payload);
  });

  it("preserves FormData (CSV upload / merge) while adding Authorization", async () => {
    const form = new FormData();
    form.append("deckName", "Imported");
    form.append("discoverable", "false");
    form.append(
      "file",
      new Blob(["q,a\nWhat is git?,A VCS\n"], { type: "text/csv" }),
      "deck.csv",
    );

    const original = new Request("http://localhost/api/decks/upload", {
      method: "POST",
      body: form,
    });

    const next = await attachBearerToRequest(original, async () => "upload-token");
    const nextForm = await next.formData();

    expect(next.headers.get("Authorization")).toBe("Bearer upload-token");
    expect(nextForm.get("deckName")).toBe("Imported");
    expect(nextForm.get("discoverable")).toBe("false");
    expect(nextForm.get("file")).toBeInstanceOf(Blob);
  });

  it("does not overwrite an existing Authorization header", async () => {
    const original = new Request("http://localhost/api/me", {
      headers: { Authorization: "Bearer already" },
    });

    const next = await attachBearerToRequest(original, async () => "other");
    expect(next.headers.get("Authorization")).toBe("Bearer already");
  });

  it("leaves the request alone when there is no token", async () => {
    const original = new Request("http://localhost/api/me");
    const next = await attachBearerToRequest(original, async () => null);
    expect(next).toBe(original);
    expect(next.headers.get("Authorization")).toBeNull();
  });
});
