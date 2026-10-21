import { useEffect, useRef, useState } from "react";
import "@/pages/site/site.css";
import { useSiteMotion } from "@/pages/site/useSiteMotion";
import { SiteFooter, SiteNav } from "@/pages/site/SiteChrome";

const ROUTES = [
  { title: "I have a screen to list", text: "Questions about listing a screen, setting your rate or how bookings work.", email: "screens@adtua.com" },
  { title: "I want to advertise", text: "Tell us what you'd like to advertise and where. We'll let you know when you can book screens.", email: "advertise@adtua.com" },
  { title: "Press and partnerships", text: "For interviews, partnerships or anything that doesn't fit above.", email: "hello@adtua.com" },
];

export default function Contact() {
  const { rootCls, navCls, rv } = useSiteMotion("Contact Adtua");
  const [copied, setCopied] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  // Click copies the address; if the clipboard isn't available, open the mail app instead.
  const copy = (i: number, email: string) => {
    const done = () => {
      setCopied(i);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 1600);
    };
    const fallback = () => { window.location.href = `mailto:${email}`; };
    try { navigator.clipboard.writeText(email).then(done, fallback); } catch { fallback(); }
  };

  return (
    <div className={rootCls}>
      <SiteNav navCls={navCls} />
      <section style={{ background: "#3A47C2", color: "#FFFFFF", overflow: "hidden" }}>
        <div className="pad" style={{ maxWidth: 1440, margin: "0 auto", padding: "40px 48px 112px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 28 }}>
          <h1 className="cond h1 load d1" style={{ fontSize: "clamp(56px, 11.6vw, 176px)", lineHeight: 0.86 }}>Talk to us</h1>
          <p className="load d2" style={{ fontSize: 20, lineHeight: 1.5, maxWidth: "30em", color: "#E3E6FB" }}>Pick the one closest to your question and email us directly.</p>
        </div>
      </section>

      <section className="pad" style={{ maxWidth: 1240, margin: "0 auto", padding: "72px 48px 120px" }}>
        {ROUTES.map((r, i) => (
          <div key={r.email} className={`route rv ${rv(`route${i}`)}`} data-rv={`route${i}`} style={{ transitionDelay: `${i * 0.08}s` }}>
            <h2 style={{ fontSize: 44, lineHeight: 1.05, fontWeight: 600, color: "#3A47C2" }}>{r.title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 19, color: "#3A3D5C" }}>{r.text}</p>
              <div>
                <button type="button" className="mailbtn" aria-label={`Copy ${r.email}`} onClick={() => copy(i, r.email)}>
                  {r.email}
                  <span className={`tip${copied === i ? " show" : ""}`} aria-hidden="true">{copied === i ? "Copied" : "Click to copy"}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      <p className="sr" role="status" aria-live="polite">{copied !== null ? "Email address copied" : ""}</p>
      <SiteFooter tone="white" rv={rv} />
    </div>
  );
}
