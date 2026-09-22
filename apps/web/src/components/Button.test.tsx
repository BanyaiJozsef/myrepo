import { render, screen } from "@testing-library/react";
import userEventModule from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("meets the 44x44px minimum touch target via its min-h/min-w classes", () => {
    render(<Button>Mentés</Button>);
    const button = screen.getByRole("button", { name: "Mentés" });
    expect(button.className).toContain("min-h-11");
    expect(button.className).toContain("min-w-11");
  });

  it("calls onClick when activated", async () => {
    const onClick = vi.fn();
    const user = userEventModule.setup();
    render(<Button onClick={onClick}>Törlés</Button>);
    await user.click(screen.getByRole("button", { name: "Törlés" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled and non-interactive when disabled is set", () => {
    render(<Button disabled>Mentés</Button>);
    expect(screen.getByRole("button", { name: "Mentés" })).toBeDisabled();
  });
});
