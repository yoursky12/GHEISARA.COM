import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";
import { AppRoutes } from "./router";

test("navigates from the Gallery to the Studio layout", async () => {
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AppRoutes />
    </MemoryRouter>,
  );

  expect(screen.getByRole("heading", { name: "Galeri" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: "Studio" }));
  expect(
    await screen.findByRole("heading", { name: "Studio" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Studio" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
