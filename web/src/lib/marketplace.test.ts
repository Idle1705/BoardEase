import { describe, expect, it } from "vitest";
import { canMove, isComplete, isFresh, looksLikeSpam, normalizePhMobile, publicationChecklist, roomSpaces } from "./marketplace";

describe("roomSpaces: availability never counts a taken bed as free", () => {
  it("shared rooms are per bed", () => {
    expect(roomSpaces("shared", 3, 0)).toEqual({ basis: "bed", total: 3, free: 3 });
    expect(roomSpaces("shared", 3, 2)).toEqual({ basis: "bed", total: 3, free: 1 });
    expect(roomSpaces("shared", 3, 3).free).toBe(0);
  });
  it("taken is clamped: more tenancies than beds still means zero free, never negative", () => {
    expect(roomSpaces("shared", 2, 5).free).toBe(0);
    expect(roomSpaces("shared", 2, -1).free).toBe(2);
  });
  it("a single room is one space", () => {
    expect(roomSpaces("single", 1, 0)).toEqual({ basis: "room", total: 1, free: 1 });
    expect(roomSpaces("single", 1, 1).free).toBe(0);
  });
  it("a whole unit is one space, taken as soon as anyone holds it", () => {
    expect(roomSpaces("unit", 4, 0)).toEqual({ basis: "unit", total: 1, free: 1 });
    expect(roomSpaces("unit", 4, 1)).toEqual({ basis: "unit", total: 1, free: 0 });
  });
});

const complete = {
  title: "Quiet rooms near UM",
  description: "Clean shared rooms on a quiet street, five minutes' walk to the university gate.",
  type: "boarding-house",
  street: "MacArthur Highway",
  district: "Matina",
  rooms: [{ rentCents: 250000 }],
  photos: 2,
};

describe("publicationChecklist", () => {
  it("passes a complete listing", () => expect(isComplete(complete)).toBe(true));
  it.each([
    ["description", { description: "Too short" }],
    ["photos", { photos: 1 }],
    ["rooms", { rooms: [] }],
    ["rooms", { rooms: [{ rentCents: 0 }] }],
    ["location", { district: " " }],
    ["title", { title: "Hi" }],
  ])("flags missing %s", (key, change) => {
    const items = publicationChecklist({ ...complete, ...change });
    expect(items.find((i) => i.key === key)?.ok).toBe(false);
    expect(isComplete({ ...complete, ...change })).toBe(false);
  });
});

describe("lifecycle", () => {
  it("owners submit, publish, pause and archive", () => {
    expect(canMove("draft", "submitted", "owner")).toBe(true);
    expect(canMove("approved", "published", "owner")).toBe(true);
    expect(canMove("published", "paused", "owner")).toBe(true);
    expect(canMove("paused", "published", "owner")).toBe(true);
  });
  it("owners can't approve or skip review", () => {
    expect(canMove("submitted", "approved", "owner")).toBe(false);
    expect(canMove("draft", "published", "owner")).toBe(false);
    expect(canMove("rejected", "published", "owner")).toBe(false);
  });
  it("admins review but never publish for the owner", () => {
    expect(canMove("submitted", "approved", "admin")).toBe(true);
    expect(canMove("submitted", "rejected", "admin")).toBe(true);
    expect(canMove("approved", "published", "admin")).toBe(false);
    expect(canMove("published", "paused", "admin")).toBe(true);
  });
});

describe("freshness", () => {
  const now = new Date("2026-11-12T00:00:00Z");
  it("30 days counts, 31 doesn't, never-confirmed doesn't", () => {
    expect(isFresh(new Date("2026-10-13T00:00:00Z"), now)).toBe(true);
    expect(isFresh(new Date("2026-10-11T00:00:00Z"), now)).toBe(false);
    expect(isFresh(null, now)).toBe(false);
  });
});

describe("inquiry input", () => {
  it("normalises Philippine mobile numbers", () => {
    expect(normalizePhMobile("0917 123 4567")).toBe("09171234567");
    expect(normalizePhMobile("+63 917-123-4567")).toBe("09171234567");
    expect(normalizePhMobile("639171234567")).toBe("09171234567");
    expect(normalizePhMobile("12345")).toBeNull();
    expect(normalizePhMobile("08171234567")).toBeNull();
  });
  it("refuses links in first messages", () => {
    expect(looksLikeSpam("visit http://x.example now")).toBe(true);
    expect(looksLikeSpam("cheap loans at bestloans.com")).toBe(true);
    expect(looksLikeSpam("Is the bedspace near the UM gate still free in June?")).toBe(false);
  });
});
