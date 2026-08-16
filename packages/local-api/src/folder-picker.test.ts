import { describe, expect, it } from "vitest";
import { interpretPickerOutput, normalizePickedPath } from "./folder-picker.js";

describe("folder picker output", () => {
  it("strips trailing slashes from picked paths", () => {
    expect(normalizePickedPath("/Users/me/dev/app/\n")).toBe(
      "/Users/me/dev/app",
    );
    expect(normalizePickedPath("C:\\Users\\me\\app\\\r\n")).toBe(
      "C:\\Users\\me\\app",
    );
    expect(normalizePickedPath("/")).toBe("/");
    expect(normalizePickedPath("C:\\")).toBe("C:\\");
  });

  it("treats a successful stdout path as a pick", () => {
    expect(
      interpretPickerOutput({
        code: 0,
        stdout: "/Users/me/dev/app/\n",
        stderr: "",
      }),
    ).toEqual({ status: "picked", path: "/Users/me/dev/app" });
  });

  it("treats user cancel as cancelled, not an error", () => {
    expect(
      interpretPickerOutput({
        code: 1,
        stdout: "",
        stderr: "execution error: User canceled. (-128)\n",
      }),
    ).toEqual({ status: "cancelled" });
    expect(
      interpretPickerOutput({
        code: 1,
        stdout: "",
        stderr: "",
      }),
    ).toEqual({ status: "cancelled" });
  });

  it("fails closed when the picker process errors", () => {
    expect(
      interpretPickerOutput({
        code: 2,
        stdout: "",
        stderr: "osascript: can't continue",
      }),
    ).toMatchObject({ status: "unavailable" });
  });
});
