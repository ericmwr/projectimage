import React, { useEffect, useState } from "react";
import { Editor } from "./Editor";
import { JobsList } from "./JobsList";

const readRoute = () => {
  const m = window.location.hash.match(/^#\/job\/(.+)$/);
  return m ? { page: "job" as const, id: decodeURIComponent(m[1]) } : { page: "list" as const };
};

export const go = (to: string) => {
  window.location.hash = to;
};

export const App: React.FC = () => {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return (
    <>
      <header className="topbar">
        <a href="#/" className="brand">
          <span className="brand-dot" /> Callout Studio
        </a>
        <span className="topbar-note">Runs only on this PC. To stop it, close its black window.</span>
      </header>
      <main>
        {route.page === "job" ? <Editor key={route.id} id={route.id} /> : <JobsList />}
      </main>
    </>
  );
};
