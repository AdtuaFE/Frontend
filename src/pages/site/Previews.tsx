// Static pictures of the app for the waitlist page. Each is one role="img" with a spoken description;
// nothing inside is interactive, and the names and numbers are examples.
import windowWide from "@/assets/site/window-wide.jpg";
import cafeDining from "@/assets/site/cafe-dining.jpg";
import windowImg from "@/assets/site/window.jpg";
import adSoda from "@/assets/site/ad-soda.jpg";

function UpArrow() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function Bars({ bars }: { bars: [number, string, boolean?][] }) {
  return (
    <span className="mbars" aria-hidden="true">
      {bars.map(([h, label, hi], i) => (
        <span className="mb" key={i}><i className={hi ? "hi" : ""} style={{ height: h }} /><em>{label}</em></span>
      ))}
    </span>
  );
}

export function HeroCluster() {
  return (
    <div className="cluster load d3">
      <div className="ui cl-main" role="img" aria-label="Preview of a space in Adtua: Limestone Lane Café, a café in downtown Bloomington with two screens. 1,248 dollars earned this month, 2,150 of 3,840 plays booked today and two booking requests worth 410 dollars waiting.">
        <span className="ui-sub" style={{ color: "#656972" }}>My spaces</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: -8 }}>
          <div className="ui-row" style={{ gap: 10 }}>
            <b style={{ fontSize: 22, lineHeight: "30px", fontWeight: 600 }}>Limestone Lane Café</b>
            <span className="tag green">Live</span>
          </div>
          <span className="ui-sub">Café · Downtown Bloomington, IN · 2 screens</span>
        </div>
        <div className="cl-photos">
          <img src={windowWide} alt="" style={{ objectPosition: "50% 50%" }} />
          <img src={cafeDining} alt="" style={{ objectPosition: "50% 20%" }} />
        </div>
        <div className="cl-metrics">
          <div className="mc">
            <span className="mc-l">Requests waiting</span>
            <div className="mc-row"><b className="mc-v">2</b><span className="tag amber">Needs your answer</span></div>
            <span className="mc-s">Worth <b style={{ color: "#1A1D25", fontWeight: 600 }}>$410</b> if you accept both</span>
          </div>
          <div className="mc">
            <span className="mc-l">Earned this month</span>
            <div className="mc-row">
              <b className="mc-v">$1,248</b>
              <Bars bars={[[27, "W1"], [30, "W2"], [32, "W3"], [36, "W4", true]]} />
            </div>
            <span className="mc-s good"><UpArrow />$238 more than September</span>
          </div>
          <div className="mc">
            <span className="mc-l">Plays booked today</span>
            <div className="mc-row"><b className="mc-v">2,150</b><span className="mc-of">of 3,840</span></div>
            <span className="mc-prog" aria-hidden="true"><i style={{ width: "56%" }} /></span>
            <span className="mc-s">56% of today's slots are sold</span>
          </div>
        </div>
        <div className="ui-row" style={{ gap: 8 }}><b className="ui-t" style={{ fontSize: 18 }}>Screens</b><span className="ui-sub">2 of 10</span></div>
        <div className="cl-scr">
          <div>
            <img src={windowImg} alt="" style={{ objectPosition: "27% 35%" }} />
            <span><b>Window screen</b> <span className="tag green">Online</span><br /><span className="ui-sub">55-inch · 1920×1080 landscape</span></span>
            <span className="cl-bar"><span className="ui-sub" style={{ color: "#1A1D25" }}>1,180 of 1,920 plays booked today</span><i><i style={{ width: "61%" }} /></i></span>
          </div>
          <div>
            <img src={cafeDining} alt="" style={{ objectPosition: "52% 14%" }} />
            <span><b>Dining room TV</b> <span className="tag green">Online</span><br /><span className="ui-sub">50-inch · 1920×1080 landscape</span></span>
            <span className="cl-bar"><span className="ui-sub" style={{ color: "#1A1D25" }}>970 of 1,920 plays booked today</span><i><i style={{ width: "51%" }} /></i></span>
          </div>
        </div>
      </div>

      <div className="ui cl-req" data-drift="-0.06" role="img" aria-label="Preview of a booking request in Adtua: Fieldline Soda wants the Window screen, Monday to Friday 11 AM to 3 PM, November 2 to 27, 240 plays a day. Booking total 250 dollars. Decline or Accept.">
        <div className="ui-row" style={{ justifyContent: "space-between" }}><b className="ui-t">Booking request</b><span className="tag amber">Needs your answer</span></div>
        <div className="ad" aria-hidden="true">
          <img src={adSoda} alt="" style={{ objectPosition: "50% 40%" }} />
          <span className="ad-t"><span className="ad-h">New flavors on ice</span><span className="ad-k">Fieldline Soda</span><span className="ad-s">In the cooler now</span></span>
        </div>
        <dl className="ui-dl">
          <div><dt>From</dt><dd>Fieldline Soda</dd></div>
          <div><dt>Screen</dt><dd>Window screen</dd></div>
          <div><dt>When</dt><dd>Mon–Fri, 11 AM–3 PM</dd></div>
          <div><dt>Dates</dt><dd>Nov 2 to Nov 27</dd></div>
          <div><dt>Plays</dt><dd>240 a day</dd></div>
        </dl>
        <div className="ui-total"><span>Booking total</span><b>$250.00</b></div>
        <div className="ui-row" style={{ gap: 8 }}><span className="ui-btn sec">Decline</span><span className="ui-btn pri">Accept</span></div>
      </div>

      <div className="ui cl-perf" data-drift="-0.03" role="img" aria-label="Preview of screen performance in Adtua for the Window screen over the last 7 days: 60 percent of plays booked, busiest on Friday at 78 percent.">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><b className="ui-t">Screen performance</b><span className="ui-sub">Window screen · Last 7 days</span></div>
        <div className="mc-row"><b className="mc-v">60%</b><span className="mc-of">of plays booked</span></div>
        <Bars bars={[[59, "M"], [54, "T"], [62, "W"], [69, "T"], [88, "F", true], [79, "S"], [65, "S"]]} />
        <span className="mc-s">Busiest on Friday, 78% booked. The Friday morning rush sold out.</span>
      </div>
    </div>
  );
}

export function OwnerPreviews() {
  return (
    <div className="ow-grid">
      <div className="ui ui-wk" style={{ height: 320 }} role="img" aria-label="Preview of time slots and prices in Adtua. Monday to Friday: 7 to 11 AM at 60 dollars a day, 72 percent booked, and 11 AM to 3 PM at 50 dollars a day, 48 percent booked. Saturday and Sunday: 8 AM to 2 PM at 90 dollars a day, 65 percent booked. No ads at other times.">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><b className="ui-t" style={{ fontSize: 18 }}>Time slots and prices</b><span className="ui-sub">Both screens use the same slots. Times are Eastern Time.</span></div>
        <div className="wk-r">
          <span className="wk-d">Mon–Fri</span>
          <div className="wk-tr">
            <div className="seg off" style={{ flex: 7 }}><i>12–7 AM</i>No ads</div>
            <div className="seg on" style={{ flex: 4 }}><i>7–11 AM</i>$60<u>72% booked</u></div>
            <div className="seg on" style={{ flex: 4 }}><i>11 AM–3 PM</i>$50<u>48% booked</u></div>
            <div className="seg off" style={{ flex: 9 }}><i>3 PM–12 AM</i>No ads</div>
          </div>
        </div>
        <div className="wk-r">
          <span className="wk-d">Sat, Sun</span>
          <div className="wk-tr">
            <div className="seg off" style={{ flex: 8 }}><i>12–8 AM</i>No ads</div>
            <div className="seg on" style={{ flex: 6 }}><i>8 AM–2 PM</i>$90<u>65% booked</u></div>
            <div className="seg off" style={{ flex: 10 }}><i>2 PM–12 AM</i>No ads</div>
          </div>
        </div>
        <span className="ui-sub">Prices are per day. Advertisers buy 15-second plays and pay their share.</span>
      </div>
      <div className="ui ui-earn" style={{ height: 357 }} role="img" aria-label="Preview of earnings in Adtua: 1,248 dollars earned in October, up from 1,010 dollars in September. Monthly earnings from May to October: 310, 540, 720, 860, 1,010 and 1,248 dollars. The window screen earned 742 dollars and the dining room TV 506 dollars.">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><b className="ui-t" style={{ fontSize: 18 }}>Earnings</b><span className="ui-sub">October · both screens</span></div>
        <div className="mc-row"><b className="mc-v" style={{ fontSize: 32, lineHeight: "40px" }}>$1,248</b><span className="mc-s good"><UpArrow />$238 more than September</span></div>
        <Bars bars={[[24, "May"], [42, "Jun"], [55, "Jul"], [66, "Aug"], [78, "Sep"], [96, "Oct", true]]} />
        <div className="earn-split"><div><span>Window screen</span><b>$742</b></div><div><span>Dining room TV</span><b>$506</b></div></div>
      </div>
    </div>
  );
}

export function PayoutPreview() {
  return (
    <div className="ui pay-ui" role="img" aria-label="Example October payout in Adtua for Limestone Lane Café on the Premium plan: you earn 1,248 dollars from 12 bookings across 2 screens. The window screen earned 742 dollars from 7 bookings and its morning rush sold out. The dining room TV earned 506 dollars from 5 bookings and its Friday lunch slot sold out. Bookings totaled 2,270 dollars and Adtua's fee was 1,022 dollars.">
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><b className="ui-t">Payout · October</b><span className="ui-sub">Limestone Lane Café · 2 screens · Premium plan</span></div>
      <div className="pay-hero">
        <span className="ui-sub" style={{ color: "#1A1D25", fontWeight: 500 }}>You earn</span>
        <b>$1,248.00</b>
        <span className="ui-sub">from 12 bookings across 2 screens in one café</span>
      </div>
      <div className="pay-scr">
        <div><span className="ps-n"><b>Window screen</b><span className="ui-sub">7 bookings</span></span><span className="tag green">Morning rush sold out</span><b className="ps-v">$742.00</b></div>
        <div><span className="ps-n"><b>Dining room TV</b><span className="ui-sub">5 bookings</span></span><span className="tag green">Friday lunch sold out</span><b className="ps-v">$506.00</b></div>
      </div>
      <div className="pay-rows">
        <div><span>Bookings total</span><b>$2,270.00</b></div>
        <div><span>Adtua fee</span><b>$1,022.00</b></div>
      </div>
    </div>
  );
}
