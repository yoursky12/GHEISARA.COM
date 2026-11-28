import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { expect, test } from "vitest";
import { ProfileTabs } from "./ProfileTabs";

function Position() {
  const location = useLocation();
  return <output aria-label="URL">{location.search}</output>;
}

function mount(owner: boolean, url: string) {
  render(
    <MemoryRouter
      initialEntries={[url]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ProfileTabs owner={owner} draftCount={3} renderPanel={(tab) => tab} />
      <Position />
    </MemoryRouter>,
  );
}

test("opens a tab from the URL and updates it using the arrow keys", async () => {
  mount(true, "/u/nadia?tab=kolaborasi&page=2&sort=lama");
  const current = screen.getByRole("tab", { name: "Kolaborasi" });
  expect(current).toHaveAttribute("aria-selected", "true");
  current.focus();
  fireEvent.keyDown(current, { key: "ArrowRight" });
  expect(await screen.findByRole("tabpanel")).toHaveTextContent("koleksi");
  expect(screen.getByLabelText("URL")).toHaveTextContent(
    "?tab=koleksi&sort=lama",
  );
  expect(screen.getByRole("tab", { name: "Koleksi tersimpan" })).toHaveFocus();
});

test("never renders private tabs or their panels for a visitor", () => {
  mount(false, "/u/nadia?tab=draf");
  expect(screen.queryByRole("tab", { name: /draf/i })).toBeNull();
  expect(screen.queryByRole("tab", { name: /koleksi/i })).toBeNull();
  expect(document.getElementById("profile-panel-draf")).toBeNull();
  expect(screen.getByRole("tabpanel")).toHaveTextContent("karya");
});
