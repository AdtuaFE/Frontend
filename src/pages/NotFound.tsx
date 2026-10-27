import { Link } from "react-router-dom";
import "@/pages/site/site.css";
import { useSiteMotion } from "@/pages/site/useSiteMotion";
import { SiteFooter, SiteNav } from "@/pages/site/SiteChrome";
import tv404 from "@/assets/site/tv-404.jpg";

export default function NotFound() {
  const { rootCls, navCls, rv } = useSiteMotion("Adtua page not found");

  return (
    <div className={rootCls}>
      <SiteNav navCls={navCls} />
      <section style={{ background: "#3A47C2", color: "#FFFFFF", overflow: "hidden" }}>
        <div className="pad" style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 48px 112px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div className="load d1" style={{ width: "100%", maxWidth: 620 }}>
            <img src={tv404} alt="An unplugged TV showing 404" width={770} height={605} style={{ display: "block", width: "100%", height: "auto" }} />
          </div>
          <h1 className="cond load d2" style={{ marginTop: 40, fontSize: "clamp(48px, 7vw, 104px)", lineHeight: 0.9 }}>Nothing's booked on this screen</h1>
          <p className="load d3" style={{ marginTop: 24, fontSize: 20, lineHeight: 1.5, maxWidth: "30em", color: "#E3E6FB" }}>
            This page doesn't exist, or it moved somewhere else. The waitlist is right where you left it.
          </p>
          <div className="load d3" style={{ marginTop: 40, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
            <Link to="/" className="btn" style={{ background: "#FFFFFF", color: "#3A47C2" }}>Back to the waitlist</Link>
            <Link to="/contact" className="btn" style={{ background: "transparent", color: "#FFFFFF", border: "1px solid rgba(255,255,255,.6)" }}>Contact us</Link>
          </div>
        </div>
      </section>
      <SiteFooter tone="indigo" rv={rv} />
    </div>
  );
}
