import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("associates the label with the input for screen readers", () => {
    render(<TextField label="Név" />);
    expect(screen.getByLabelText("Név")).toBeInTheDocument();
  });

  it("shows a validation message with role=alert and links it via aria-describedby", () => {
    render(<TextField label="E-mail" hiba="Érvénytelen e-mail cím." />);
    const input = screen.getByLabelText("E-mail");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Érvénytelen e-mail cím.");
    expect(input).toHaveAttribute("aria-describedby", alert.id);
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});
