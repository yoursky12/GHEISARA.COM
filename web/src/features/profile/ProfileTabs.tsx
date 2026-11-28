import type { KeyboardEvent, ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { profileCopy, type ProfileTab } from "./profile-copy";

export function ProfileTabs({
  owner,
  draftCount,
  renderPanel,
}: {
  owner: boolean;
  draftCount?: number;
  renderPanel: (tab: ProfileTab) => ReactNode;
}) {
  const [search, setSearch] = useSearchParams();
  const allowed: ProfileTab[] = owner
    ? ["karya", "kolaborasi", "koleksi", "draf"]
    : ["karya", "kolaborasi"];
  const active = allowed.find((tab) => tab === search.get("tab")) ?? "karya";

  function activate(tab: ProfileTab) {
    if (tab === active) return;
    const params = new URLSearchParams(search);
    params.set("tab", tab);
    params.delete("page");
    setSearch(params, { preventScrollReset: true });
  }

  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    const current = allowed.indexOf(active);
    const target = {
      Home: 0,
      End: allowed.length - 1,
      ArrowLeft: (current + allowed.length - 1) % allowed.length,
      ArrowRight: (current + 1) % allowed.length,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    event.currentTarget.querySelectorAll("button")[target]?.focus();
    activate(allowed[target]);
  }

  return (
    <>
      <div
        className="flex gap-2 overflow-x-auto border-b border-stone-200"
        role="tablist"
        aria-label={profileCopy.tabsLabel}
        onKeyDown={moveFocus}
      >
        {allowed.map((tab) => (
          <button
            className="shrink-0 border-b-2 border-transparent px-3 py-3 text-sm aria-selected:border-orange-600 aria-selected:font-semibold"
            id={`profile-tab-${tab}`}
            role="tab"
            aria-selected={active === tab}
            aria-controls={`profile-panel-${tab}`}
            tabIndex={active === tab ? 0 : -1}
            type="button"
            key={tab}
            onClick={() => activate(tab)}
          >
            {profileCopy.tabs[tab]}
            {tab === "draf" && draftCount !== undefined && (
              <span
                className="ml-2 rounded-full bg-stone-100 px-2 py-0.5"
                aria-label={`${draftCount} ${profileCopy.privateDrafts}`}
              >
                {draftCount}
              </span>
            )}
          </button>
        ))}
      </div>
      {allowed.map((tab) => (
        <section
          key={tab}
          id={`profile-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`profile-tab-${tab}`}
          tabIndex={0}
          hidden={active !== tab}
        >
          {active === tab ? renderPanel(tab) : null}
        </section>
      ))}
    </>
  );
}
