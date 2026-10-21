import { useEffect, useState } from "react";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Shared page behaviour from the design: the nav hides on scroll down after 160px and comes back on
 * scroll up, and every [data-rv] element fades up once as it enters the viewport. Reveals only switch on
 * when an IntersectionObserver actually fires, so content never stays hidden.
 */
export function useSiteMotion(title: string) {
  const [navHidden, setNavHidden] = useState(false);
  const [js, setJs] = useState(false);
  const [seen, setSeen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => { document.title = previous; };
  }, [title]);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const d = y - last;
      if (Math.abs(d) < 8) return;
      setNavHidden(d > 0 && y > 160);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    let io: IntersectionObserver | undefined;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    if (!prefersReducedMotion() && "IntersectionObserver" in window) {
      let fired = false;
      io = new IntersectionObserver(entries => {
        fired = true;
        const shown = entries.filter(e => e.isIntersecting).map(e => {
          io!.unobserve(e.target);
          return e.target.getAttribute("data-rv") ?? "";
        });
        if (shown.length) setSeen(s => ({ ...s, ...Object.fromEntries(shown.map(k => [k, true])) }));
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      document.querySelectorAll("[data-rv]").forEach(el => io!.observe(el));
      setJs(true);
      fallback = setTimeout(() => { if (!fired) setJs(false); }, 1200);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      io?.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  return {
    js,
    rootCls: `wl${js ? " js" : ""}`,
    navCls: navHidden ? "hide" : "",
    revealed: (key: string) => !!seen[key],
    rv: (key: string) => (seen[key] ? "in" : ""),
  };
}
