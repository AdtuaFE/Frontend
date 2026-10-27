import "@/pages/site/site.css";
import { useSiteMotion } from "@/pages/site/useSiteMotion";
import { SiteFooter, SiteNav } from "@/pages/site/SiteChrome";

const H2 = { fontSize: 32, lineHeight: 1.15, fontWeight: 600 };

// The dashed "Legal text needed" boxes and [DATE] are placeholders from the design: legal still has to write them.
export default function Privacy() {
  const { rootCls, navCls, rv } = useSiteMotion("Adtua privacy policy");

  const toc: [string, string][] = [
    ["short", "The short version"], ["collect", "What we collect"], ["use", "How we use it"],
    ["share", "Who we share it with"], ["keep", "How long we keep it"], ["choices", "Your choices"], ["contact", "Contact us"],
  ];

  return (
    <div className={rootCls} style={{ lineHeight: 1.65 }}>
      <SiteNav navCls={navCls} />
      <section style={{ background: "#3A47C2", color: "#FFFFFF", overflow: "hidden" }}>
        <div className="pad" style={{ maxWidth: 1440, margin: "0 auto", padding: "40px 48px 104px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 24 }}>
          <h1 className="cond h1 load d1" style={{ fontSize: "clamp(56px, 11.6vw, 176px)", lineHeight: 0.86 }}>Your data, plainly</h1>
          <p className="load d2" style={{ fontSize: 20, color: "#E3E6FB" }}>Privacy policy · Last updated [DATE]</p>
        </div>
      </section>

      <section className="pad doc" style={{ maxWidth: 1240, margin: "0 auto", padding: "96px 48px 128px" }}>
        <nav className={`rv ${rv("toc")} toc`} data-rv="toc" aria-label="On this page" style={{ display: "flex", flexDirection: "column", gap: 4, alignSelf: "start" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, fontFamily: "'Instrument Sans', sans-serif", marginBottom: 8 }}>On this page</h2>
          {toc.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={e => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }}>{label}</a>
          ))}
        </nav>

        <div style={{ display: "flex", flexDirection: "column", gap: 64, maxWidth: 720 }}>
          <div id="short" className={`rv ${rv("p_short")} sec`} data-rv="p_short">
            <h2 style={{ ...H2, color: "#3A47C2" }}>The short version</h2>
            <p style={{ fontSize: 21, lineHeight: 1.5 }}>When you join the waitlist, we keep your email address. We use it to tell you when Adtua opens and for nothing else.</p>
          </div>
          <div id="collect" className={`rv ${rv("p_collect")} sec`} data-rv="p_collect">
            <h2 style={H2}>What we collect</h2>
            <p>Your email address, when you type it into the waitlist form.</p>
            <p className="todo">Legal text needed: anything else the site collects, such as analytics, cookies or device data.</p>
          </div>
          <div id="use" className={`rv ${rv("p_use")} sec`} data-rv="p_use">
            <h2 style={H2}>How we use it</h2>
            <p>We send you launch news about Adtua. Every email has a link to unsubscribe.</p>
            <p className="todo">Legal text needed: the legal basis for processing and any other uses.</p>
          </div>
          <div id="share" className={`rv ${rv("p_share")} sec`} data-rv="p_share">
            <h2 style={H2}>Who we share it with</h2>
            <p className="todo">Legal text needed: the email service and any other providers that handle waitlist data.</p>
          </div>
          <div id="keep" className={`rv ${rv("p_keep")} sec`} data-rv="p_keep">
            <h2 style={H2}>How long we keep it</h2>
            <p className="todo">Legal text needed: how long waitlist emails are kept, and what happens after launch.</p>
          </div>
          <div id="choices" className={`rv ${rv("p_choices")} sec`} data-rv="p_choices">
            <h2 style={H2}>Your choices</h2>
            <p>You can unsubscribe from any email, or ask us to delete your address.</p>
            <p className="todo">Legal text needed: rights by region, such as GDPR and CCPA requests.</p>
          </div>
          <div id="contact" className={`rv ${rv("p_contact")} sec`} data-rv="p_contact">
            <h2 style={H2}>Contact us</h2>
            <p>Questions about your data go to <a href="mailto:hello@adtua.com" style={{ fontWeight: 600 }}>hello@adtua.com</a>.</p>
          </div>
        </div>
      </section>

      <SiteFooter tone="white" rv={rv} />
    </div>
  );
}
