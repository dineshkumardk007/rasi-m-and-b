import { describe, expect, it } from "vitest";
import {
  ageInMonths,
  daysToBirthday,
  formatAge,
  isBirthdayMonth,
  isInClub,
  isValidDob,
  milestoneForAge,
  milestoneForDob,
  nextMilestone,
} from "@/lib/baby";

const at = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
};

describe("ageInMonths()", () => {
  it("counts by calendar anniversary, not 30-day blocks", () => {
    // Born 15 Jan; on 14 Feb still 0 months, on 15 Feb exactly 1.
    expect(ageInMonths("2025-01-15", at("2025-02-14"))).toBe(0);
    expect(ageInMonths("2025-01-15", at("2025-02-15"))).toBe(1);
  });

  it("handles short months without drifting", () => {
    // Born 31 Jan: 28 Feb has not reached the 31st, so still 0 months.
    expect(ageInMonths("2025-01-31", at("2025-02-28"))).toBe(0);
    expect(ageInMonths("2025-01-31", at("2025-03-31"))).toBe(2);
  });

  it("spans years", () => {
    expect(ageInMonths("2023-06-10", at("2025-06-10"))).toBe(24);
    expect(ageInMonths("2023-06-10", at("2025-08-09"))).toBe(25);
  });

  it("is not shifted by UTC parsing", () => {
    // A bare YYYY-MM-DD parsed as UTC reads back a day early east of Greenwich,
    // which would make this 1 instead of 2 at the boundary.
    expect(ageInMonths("2025-01-01", at("2025-03-01"))).toBe(2);
  });

  it("returns null for future dates and junk", () => {
    expect(ageInMonths("2030-01-01", at("2025-01-01"))).toBeNull();
    expect(ageInMonths("not-a-date")).toBeNull();
    expect(ageInMonths("2025-02-31")).toBeNull(); // impossible day
  });
});

describe("milestoneForAge()", () => {
  it("maps the catalogue's age bands at their boundaries", () => {
    expect(milestoneForAge(0)).toBe("newborn");
    expect(milestoneForAge(2)).toBe("newborn");
    expect(milestoneForAge(3)).toBe("infant"); // band flips at 3
    expect(milestoneForAge(11)).toBe("infant");
    expect(milestoneForAge(12)).toBe("toddler"); // and at 12
    expect(milestoneForAge(36)).toBe("toddler");
  });

  it("returns null once the child outgrows the catalogue", () => {
    expect(milestoneForAge(37)).toBeNull();
    expect(milestoneForAge(null)).toBeNull();
  });
});

describe("milestoneForDob()", () => {
  it("derives the band from a stored date", () => {
    expect(milestoneForDob("2025-01-01", at("2025-02-01"))).toBe("newborn");
    expect(milestoneForDob("2024-01-01", at("2025-01-01"))).toBe("toddler");
  });
});

describe("nextMilestone()", () => {
  it("reports the upcoming band and the wait", () => {
    expect(nextMilestone("2025-01-01", at("2025-02-01"))).toEqual({
      milestone: "infant",
      inMonths: 2,
    });
    expect(nextMilestone("2025-01-01", at("2025-07-01"))).toEqual({
      milestone: "toddler",
      inMonths: 6,
    });
  });

  it("has nothing after toddler", () => {
    expect(nextMilestone("2023-01-01", at("2025-01-01"))).toBeNull();
  });
});

describe("isBirthdayMonth()", () => {
  it("is true through the whole birth month", () => {
    expect(isBirthdayMonth("2024-07-15", at("2025-07-01"))).toBe(true);
    expect(isBirthdayMonth("2024-07-15", at("2025-07-31"))).toBe(true);
    expect(isBirthdayMonth("2024-07-15", at("2025-08-01"))).toBe(false);
  });

  it("is false before the baby is born", () => {
    expect(isBirthdayMonth("2026-07-15", at("2025-07-10"))).toBe(false);
  });
});

describe("daysToBirthday()", () => {
  it("is 0 on the day", () => {
    expect(daysToBirthday("2024-07-15", at("2025-07-15"))).toBe(0);
  });

  it("counts forward within the year", () => {
    expect(daysToBirthday("2024-07-15", at("2025-07-10"))).toBe(5);
  });

  it("rolls over to next year once the date has passed", () => {
    expect(daysToBirthday("2024-01-10", at("2025-01-11"))).toBe(364);
  });
});

describe("formatAge()", () => {
  it("reads naturally in English", () => {
    expect(formatAge(1)).toBe("1 month");
    expect(formatAge(5)).toBe("5 months");
    expect(formatAge(12)).toBe("1 year");
    expect(formatAge(14)).toBe("1 year 2 months");
    expect(formatAge(24)).toBe("2 years");
  });

  it("reads naturally in Tamil", () => {
    expect(formatAge(5, "ta")).toBe("5 மாதம்");
    expect(formatAge(24, "ta")).toBe("2 வயது");
  });
});

describe("isInClub()", () => {
  it("covers babies inside the catalogue range", () => {
    expect(isInClub("2025-01-01", at("2025-06-01"))).toBe(true);
  });

  it("excludes missing, invalid and outgrown dates", () => {
    expect(isInClub(null)).toBe(false);
    expect(isInClub("")).toBe(false);
    expect(isInClub("2020-01-01", at("2025-01-01"))).toBe(false); // 5 years old
  });
});

describe("isValidDob()", () => {
  it("accepts real past dates and rejects the rest", () => {
    expect(isValidDob("2025-01-01", at("2025-06-01"))).toBe(true);
    expect(isValidDob("2030-01-01", at("2025-06-01"))).toBe(false);
    expect(isValidDob("2025-13-01", at("2025-06-01"))).toBe(false);
    expect(isValidDob(null)).toBe(false);
  });
});
