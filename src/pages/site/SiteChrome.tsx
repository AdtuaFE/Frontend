import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { Link } from "react-router-dom";

const LOGO_FONT = "800 30px/1 'Bricolage Grotesque', sans-serif";

/** In-page anchor on the waitlist page, a route link (back to /) everywhere else. */
function SiteLink({ hash, onWaitlist, className, style, onClick, children }: {
  hash: string; onWaitlist: boolean; className?: string; style?: CSSProperties; onClick?: (e: MouseEvent) => void; children: ReactNode;
}) {
  return onWaitlist
    ? <a href={`#${hash}`} className={className} style={style} onClick={onClick}>{children}</a>
    : <Link to={`/#${hash}`} className={className} style={style}>{children}</Link>;
}

export function SiteNav({ navCls, onJoin }: { navCls: string; onJoin?: (e: MouseEvent) => void }) {
  const onWaitlist = !!onJoin;
  const linkStyle = { color: "#FFFFFF", textDecoration: "none" };
  return (
    <div className={`navwrap ${navCls}`}>
      <header className="pad navin" style={{ maxWidth: 1440, margin: "0 auto", padding: "24px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
        {onWaitlist
          ? <a href="#top" aria-label="Adtua home" style={{ color: "#FFFFFF", textDecoration: "none", font: LOGO_FONT }}>adtua</a>
          : <Link to="/" aria-label="Adtua home" style={{ color: "#FFFFFF", textDecoration: "none", font: LOGO_FONT }}>adtua</Link>}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {onWaitlist && (
            <nav className="navlinks" aria-label="Main" style={{ fontWeight: 500, fontSize: 15 }}>
              <a href="#screens" style={linkStyle}>Screens</a>
              <a href="#broadcasters" style={linkStyle}>How it works</a>
              <a href="#faq" style={linkStyle}>Questions</a>
            </nav>
          )}
          <SiteLink hash="join" onWaitlist={onWaitlist} onClick={onJoin} className="btn" style={{ minHeight: 44, padding: "0 18px", fontSize: 15, background: "#FFFFFF", color: "#3A47C2" }}>
            Join the waitlist
          </SiteLink>
        </div>
      </header>
    </div>
  );
}

type FooterTone = "tint" | "white" | "indigo";

export function SiteFooter({ tone, rv, onJoin }: { tone: FooterTone; rv: (key: string) => string; onJoin?: (e: MouseEvent) => void }) {
  const onWaitlist = !!onJoin;
  const dark = tone === "indigo";
  const bg = tone === "tint" ? "#F4F5FC" : dark ? "#3A47C2" : "#FFFFFF";
  const ink = dark ? "#FFFFFF" : "#15173A";
  const body = dark ? "#E3E6FB" : "#3A3D5C";
  const head = { fontSize: 16, fontWeight: 600, fontFamily: "'Instrument Sans', sans-serif" };
  const col = { display: "flex", flexDirection: "column" as const, gap: 14 };
  return (
    <footer className={dark ? "foot-dark" : undefined} style={{ background: bg, color: ink }}>
      <div className={`pad foot${tone === "tint" ? " foot-2up" : ""} rv ${rv("foot")}`} data-rv="foot"
        style={{ maxWidth: 1360, margin: "0 auto", padding: tone === "white" ? "0 48px 56px" : "24px 48px 56px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 340 }}>
          <Link to="/" aria-label="Adtua home" style={{ color: ink, textDecoration: "none", font: "800 32px/1 'Bricolage Grotesque', sans-serif" }}>adtua</Link>
          <p style={{ color: body, fontSize: 16 }}>The marketplace where local businesses book ads on screens people already look at.</p>
          {!dark && (
            <SiteLink hash="join" onWaitlist={onWaitlist} onClick={onJoin} className="btn" style={{ alignSelf: "flex-start", marginTop: 8, background: "#3A47C2", color: "#FFFFFF" }}>
              Join the waitlist
            </SiteLink>
          )}
        </div>
        <nav aria-label="Pages" style={col}>
          <h2 style={head}>Adtua</h2>
          <SiteLink hash="screens" onWaitlist={onWaitlist} className="fl">Screens</SiteLink>
          <SiteLink hash="broadcasters" onWaitlist={onWaitlist} className="fl">How it works</SiteLink>
          <SiteLink hash="faq" onWaitlist={onWaitlist} className="fl">Questions</SiteLink>
        </nav>
        <nav aria-label="Contact" style={col}>
          <h2 style={head}>Get in touch</h2>
          <Link to="/contact" className="fl">Contact us</Link>
          <Link to="/contact" className="fl">Advertising? Tell us</Link>
          <a href="mailto:hello@adtua.com" className="fl">hello@adtua.com</a>
        </nav>
        {/* Social links are placeholders in the design until the accounts exist. */}
        <nav aria-label="Social" style={col}>
          <h2 style={head}>Follow along</h2>
          <a href="#linkedin" className="fl">LinkedIn</a>
          <a href="#instagram" className="fl">Instagram</a>
          <a href="#x" className="fl">X</a>
        </nav>
      </div>
      <div className="pad" style={{ maxWidth: 1360, margin: "0 auto", padding: "24px 48px 40px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, fontSize: 15, color: body }}>
        <span>© 2026 Adtua. All rights reserved.</span>
        <span style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
          <Link to="/privacy" className="fl">Privacy policy</Link>
          {/* No Terms page yet; the design points this at the 404 for now. */}
          <Link to="/terms" className="fl">Terms</Link>
          <a href="#cookies" className="fl">Cookie settings</a>
        </span>
      </div>
    </footer>
  );
}
