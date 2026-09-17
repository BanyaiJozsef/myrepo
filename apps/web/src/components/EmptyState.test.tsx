import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the title and description", () => {
    render(<EmptyState cim="Nincs adat" leiras="Adj hozzá egy elemet a kezdéshez." />);
    expect(screen.getByRole("heading", { name: "Nincs adat" })).toBeInTheDocument();
    expect(screen.getByText("Adj hozzá egy elemet a kezdéshez.")).toBeInTheDocument();
  });
});
