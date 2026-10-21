import { useEffect, useState, type MouseEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import "@/pages/site/site.css";
import { prefersReducedMotion, useSiteMotion } from "@/pages/site/useSiteMotion";
import { SiteFooter, SiteNav } from "@/pages/site/SiteChrome";
import { JoinForm, Joined } from "@/pages/site/JoinForm";
import { HeroCluster, OwnerPreviews, PayoutPreview } from "@/pages/site/Previews";
import billboard from "@/assets/site/billboard.jpg";
import storefront from "@/assets/site/storefront.jpg";
import cab from "@/assets/site/cab.jpg";
import lobby from "@/assets/site/lobby.jpg";
import stepPlug from "@/assets/site/step-plug.jpg";
import stepPair from "@/assets/site/step-pair.jpg";
import stepPaid from "@/assets/site/step-paid.jpg";

const SCREEN_CARDS = [
  { title: "Billboards and bus stops", text: "Highway billboards, bus shelter screens and stadium boards.", img: billboard, dark: true },
  { title: "Shops, cafés and restaurants", text: "Window displays, the screen by the register and the TV in the dining room.", img: storefront, dark: false },
  { title: "Cabs and rideshares", text: "Rooftop signs, rear windows and screens on the back of the seats.", img: cab, dark: true },
  { title: "Hotels, gyms and waiting rooms", text: "Lobby screens, TVs in guest rooms, gym TVs and waiting-room displays.", img: lobby, dark: false },
];

const OWNER_POINTS = [
  { title: "List your screen", text: "Add up to 10 photos, where it is and when it's free. Advertisers nearby find it when they search." },
  { title: "Set your hours and price", text: "Pick the hours ads can run and put a price on each window. Advertisers buy 15-second plays and pay their share of it." },
  { title: "Approve every ad", text: "Booking requests wait for your yes. You can also pitch your screen to advertisers whose campaigns are open." },
  { title: "Your first screen is free", text: "The free plan covers one screen. Add more whenever you're ready." },
];

const STEPS = [
  { title: "Plug in", text: "Open the Adtua app on your smart TV, or plug a small player into your screen.", img: stepPlug },
  { title: "Pair", text: "Type the code on your screen into your Adtua account. That links the two.", img: stepPair },
  { title: "Get paid", text: "Approve the ads you want. They play on your schedule and you earn from every booking.", img: stepPaid },
];

const FAQ = [
  { q: "Who decides which ads run on my screen?", a: "You do. Every booking request waits for your approval before it goes live." },
  { q: "What kind of screens can I list?", a: "Billboards, bus stop screens, window displays, hotel and gym screens, in-car screens and more. If people look at it, you can list it." },
  { q: "When and where does Adtua open?", a: "The launch date and cities aren't set yet. Everyone on the waitlist hears first, by email." },
  { q: "Where do the ads come from?", a: "Local businesses find your screen when they search Adtua and send you a booking request. You can also pitch your screen to campaigns that are open." },
  { q: "Does it cost anything?", a: "Joining the waitlist is free. When Adtua opens, the free plan covers your first screen and you keep 40% of every booking. Premium raises that to 55%." },
];

/** Plays on its own once the section is in view; hover or focus pauses it, a click jumps to a step. */
function SetupSteps() {
  const reduce = prefersReducedMotion();
  const [step, setStep] = useState(reduce ? 2 : 0);
  const [auto, setAuto] = useState(!reduce);
  const [runKey, setRunKey] = useState(0);

  const barCls = (i: number) =>
    i < step ? "full" : i === step ? (auto ? `run k${runKey % 2}` : "full") : "";
  const next = () => { if (auto) setStep(s => (s + 1) % 3); };

  return (
    <div className="sx-flow">
      <div className="sx-bars" aria-hidden="true">
        {STEPS.map((_, i) => <div key={i} className={`sx-seg ${barCls(i)}`}><i onAnimationEnd={next} /></div>)}
      </div>
      <div className="sx-rail">
        {STEPS.map((s, i) => (
          <button key={s.title} type="button" className={`sx-step${step === i ? " on" : ""}`} aria-pressed={step === i}
            onClick={() => { setStep(i); setAuto(!reduce); setRunKey(k => k + 1); }}>
            <div className="sx-vig" aria-hidden="true"><div className="sx-obj"><img src={s.img} alt="" width={600} height={400} loading="lazy" /></div></div>
            <div className="sx-txt"><h3>{s.title}</h3><p>{s.text}</p></div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
      {FAQ.map((item, i) => (
        <div key={item.q} className={`qa${open[i] ? " open" : ""}`}>
          <h3 style={{ margin: 0 }}>
            <button type="button" className="qa-q" aria-expanded={!!open[i]} aria-controls={`qa${i}`}
              onClick={() => setOpen(o => ({ ...o, [i]: !o[i] }))}>
              <span>{item.q}</span><span className="qa-i" aria-hidden="true" />
            </button>
          </h3>
          <div className="qa-a" id={`qa${i}`} role="region" aria-hidden={!open[i]}>
            <div className="qa-in"><p>{item.a}</p></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Signed-in users go straight to the app; everyone else sees the waitlist. */
export default function Waitlist() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <WaitlistPage />;
}

// Rendered only once content is on screen, so the reveal, drift and hash effects find their elements.
function WaitlistPage() {
  const { hash } = useLocation();
  const { js, rootCls, navCls, rv, revealed } = useSiteMotion("Adtua waitlist");
  const [joined, setJoined] = useState(false);

  // Links from the other pages arrive as /#faq etc.
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [hash]);

  // Hero previews drift slightly with scroll in the first 1400px.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-drift]"));
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        if (y > 1400) return;
        els.forEach(el => { el.style.transform = `translateY(${(y * parseFloat(el.dataset.drift ?? "0")).toFixed(1)}px)`; });
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  const goJoin = (e: MouseEvent) => {
    e.preventDefault();
    const reduce = prefersReducedMotion();
    document.getElementById("join")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    setTimeout(() => document.getElementById("email-top")?.focus({ preventScroll: true }), reduce ? 0 : 650);
  };

  return (
    <div id="top" className={rootCls}>
      <SiteNav navCls={navCls} onJoin={goJoin} />

      <section style={{ background: "#3A47C2", color: "#FFFFFF", overflow: "hidden" }}>
        <div className="pad load d1" style={{ maxWidth: 1440, margin: "0 auto", padding: "40px 48px 0", textAlign: "center" }}>
          <h1 className="cond h1" style={{ fontSize: "clamp(56px, 11.6vw, 176px)", lineHeight: 0.86 }}>Your screen is ad space</h1>
        </div>
        <div className="load d2">
          <div className="pad" id="join" style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 24, padding: "20px 48px 0" }}>
            <p style={{ fontSize: 20, lineHeight: 1.5, maxWidth: "32em", color: "#E3E6FB" }}>
              List the screen in your shop window or the TV in your waiting room. Local businesses book it for their ads, you approve each one and you get paid for every booking.
            </p>
            {joined ? <Joined /> : <JoinForm id="email-top" tone="onIndigo" onJoined={() => setJoined(true)} hint="Free to join. We'll email you the day sign-up opens." />}
          </div>
        </div>
        <HeroCluster />
      </section>

      <section id="screens" className="pad" style={{ maxWidth: 1360, margin: "0 auto", padding: "120px 48px 128px", display: "flex", flexDirection: "column", gap: 56 }}>
        <div className={`rv ${rv("shead")} screens-head`} data-rv="shead">
          <h2 className="h2" style={{ fontSize: 72, lineHeight: 1.04, fontWeight: 600, color: "#3A47C2" }}>If people look at it, it can run ads</h2>
          <p style={{ fontSize: 20, lineHeight: 1.5, maxWidth: "26em", color: "#3A3D5C" }}>Adtua has room for the billboard by the highway and the small TV behind the counter.</p>
        </div>
        <div className="cards">
          {SCREEN_CARDS.map((c, i) => (
            <div key={c.title} className={`rv ${rv(`card${i}`)}`} data-rv={`card${i}`}
              style={{ transitionDelay: `${i * 0.08}s`, background: c.dark ? "#3A47C2" : "#ECEEFB", color: c.dark ? "#FFFFFF" : "#15173A", borderRadius: 20, padding: "28px 24px 0", minHeight: 380, display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h3 style={{ fontSize: 24, lineHeight: 1.2, fontWeight: 700, color: c.dark ? undefined : "#3A47C2" }}>{c.title}</h3>
                <p style={{ color: c.dark ? "#E3E6FB" : "#3A3D5C" }}>{c.text}</p>
              </div>
              <div className="card-art"><img src={c.img} alt="" width={720} height={420} loading="lazy" /></div>
            </div>
          ))}
        </div>
        <p className={`rv ${rv("more")}`} data-rv="more" style={{ fontSize: 18, color: "#3A3D5C", marginTop: -24 }}>Have a different kind of screen? If people look at it, you can list it.</p>
      </section>

      <section id="broadcasters" className={`rv ${rv("owners")} inset`} data-rv="owners"
        style={{ margin: "0 24px", background: "#15173A", color: "#FFFFFF", borderRadius: 32, padding: "88px 64px 0", overflow: "hidden" }}>
        <div className="split" style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <h2 className="h2" style={{ fontSize: 64, lineHeight: 1.02, fontWeight: 500 }}>Earn from the screen you already own</h2>
            <a href="#join" onClick={goJoin} className="btn" style={{ alignSelf: "flex-start", background: "#FFFFFF", color: "#15173A" }}>Join the waitlist</a>
          </div>
          <div className="points">
            {OWNER_POINTS.map(p => (
              <div key={p.title} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h3 style={{ fontSize: 24, lineHeight: 1.2, fontWeight: 700 }}>{p.title}</h3>
                <p style={{ color: "#D3D6EE" }}>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
        <OwnerPreviews />
      </section>

      <section id="setup" className={`rv ${rv("setup")} pad${revealed("setup") || !js ? "" : " sx-wait"}`} data-rv="setup"
        style={{ maxWidth: 1240, margin: "0 auto", padding: "160px 48px 0" }}>
        <div className="split sx-head">
          <h2 className="h2" style={{ margin: 0, fontSize: 56, lineHeight: 1.02, fontWeight: 600, color: "#3A47C2" }}>From plugged in to paid</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
            <p style={{ fontSize: 20, lineHeight: 1.5, color: "#3A3D5C", maxWidth: "30em" }}>You need a screen that plays video and an internet connection. The rest takes a few minutes.</p>
          </div>
        </div>
        <SetupSteps />
      </section>

      <section id="paid" className={`rv ${rv("pay")} pad`} data-rv="pay" style={{ maxWidth: 1240, margin: "0 auto", padding: "160px 48px 0" }}>
        <div className="paywrap">
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <h2 className="h2" style={{ fontSize: 56, lineHeight: 1.02, fontWeight: 600, color: "#3A47C2" }}>Keep up to 55% of every booking</h2>
            <p style={{ fontSize: 20, lineHeight: 1.5, color: "#3A3D5C", maxWidth: "26em" }}>Your first screen is free and you keep 40% of what it earns. Go Premium to list more screens and keep 55%.</p>
          </div>
          <div className="paybox"><PayoutPreview /></div>
        </div>
      </section>

      <section id="faq" className={`rv ${rv("faq")} pad split`} data-rv="faq"
        style={{ maxWidth: 1240, margin: "0 auto", padding: "128px 64px 112px", width: 1144 }}>
        <h2 className="h2" style={{ fontSize: 56, lineHeight: 1.02, fontWeight: 600, color: "#3A47C2" }}>Questions people ask</h2>
        <Faq />
      </section>

      <section style={{ background: "#F4F5FC", overflow: "hidden" }}>
        <div className={`rv ${rv("banner")} pad`} data-rv="banner" style={{ maxWidth: 1440, margin: "0 auto", padding: "104px 48px 96px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 28 }}>
          <h2 className="cond" style={{ fontSize: "clamp(72px, 15vw, 232px)", lineHeight: 0.86, color: "#3A47C2", whiteSpace: "nowrap" }}>Get on the list</h2>
          <p style={{ fontSize: 20, maxWidth: "28em", color: "#3A3D5C" }}>Leave your email and we'll tell you the day you can list your screen.</p>
          {joined ? <Joined /> : <JoinForm id="email-end" tone="onTint" onJoined={() => setJoined(true)} />}
        </div>
      </section>

      <SiteFooter tone="tint" rv={rv} onJoin={goJoin} />
    </div>
  );
}
