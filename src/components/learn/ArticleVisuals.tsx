import React from "react";

/* ─── Reusable building blocks ─── */

export const TipCard: React.FC<{
  type?: "tip" | "warning" | "info";
  title: string;
  children: React.ReactNode;
}> = ({ type = "tip", title, children }) => {
  const styles = {
    tip: "bg-up/10 border-up/40 text-up",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
    info: "bg-blue-50 border-blue-200 text-blue-900",
  };
  const icons = {
    tip: (
      <svg className="w-4 h-4 text-up flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    warning: (
      <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    info: (
      <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className={`my-6 p-4 border rounded-lg ${styles[type]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icons[type]}
        <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
      </div>
      <div className="text-[13px] leading-relaxed">{children}</div>
    </div>
  );
};

export const StatGrid: React.FC<{
  stats: { label: string; value: string; sub?: string }[];
}> = ({ stats }) => (
  <div className="my-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
    {stats.map((s) => (
      <div
        key={s.label}
        className="bg-terminal-surface border border-brand-gray/20 p-3 rounded-lg text-center"
      >
        <p className="text-lg sm:text-xl font-bold font-mono text-brand-black mb-0.5">
          {s.value}
        </p>
        <p className="text-[10px] font-semibold text-brand-black/50 uppercase tracking-wider">
          {s.label}
        </p>
        {s.sub && (
          <p className="text-[10px] text-brand-black/40 mt-0.5">{s.sub}</p>
        )}
      </div>
    ))}
  </div>
);

export const PriceTierBars: React.FC<{
  tiers: { label: string; price: string; width: string; color: string; tag?: string }[];
}> = ({ tiers }) => (
  <div className="my-6 bg-terminal-surface border border-brand-gray/20 rounded-lg p-4">
    <p className="text-[10px] font-bold text-brand-black/50 uppercase tracking-wider mb-3">
      Price comparison (same sneaker)
    </p>
    <div className="space-y-3">
      {tiers.map((t) => (
        <div key={t.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-brand-black">{t.label}</span>
            <div className="flex items-center gap-2">
              {t.tag && (
                <span className="text-[9px] px-1.5 py-0.5 bg-terminal-text/5 text-brand-black/50 rounded">
                  {t.tag}
                </span>
              )}
              <span className="text-xs font-bold font-mono text-brand-black">{t.price}</span>
            </div>
          </div>
          <div className="h-3 bg-brand-gray/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${t.color}`}
              style={{ width: t.width }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const FlowDiagram: React.FC<{
  steps: { icon: string; label: string; sub: string }[];
  title?: string;
}> = ({ steps, title }) => (
  <div className="my-6 bg-terminal-surface border border-brand-gray/20 rounded-lg p-4 overflow-x-auto">
    {title && (
      <p className="text-[10px] font-bold text-brand-black/50 uppercase tracking-wider mb-4">
        {title}
      </p>
    )}
    <div className="flex items-center gap-2 min-w-max">
      {steps.map((step, i) => (
        <React.Fragment key={step.label}>
          <div className="flex flex-col items-center text-center w-24 flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-terminal-surface-raised border border-brand-gray/20 flex items-center justify-center text-lg mb-1.5">
              {step.icon}
            </div>
            <p className="text-[11px] font-semibold text-brand-black leading-tight">
              {step.label}
            </p>
            <p className="text-[9px] text-brand-black/50 leading-tight mt-0.5">
              {step.sub}
            </p>
          </div>
          {i < steps.length - 1 && (
            <svg className="w-5 h-5 text-brand-black/20 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);

export const AllocationBar: React.FC<{
  segments: { label: string; pct: number; color: string }[];
  title?: string;
}> = ({ segments, title }) => (
  <div className="my-6 bg-terminal-surface border border-brand-gray/20 rounded-lg p-4">
    {title && (
      <p className="text-[10px] font-bold text-brand-black/50 uppercase tracking-wider mb-3">
        {title}
      </p>
    )}
    <div className="h-6 rounded-full overflow-hidden flex">
      {segments.map((s) => (
        <div
          key={s.label}
          className={`${s.color} flex items-center justify-center`}
          style={{ width: `${s.pct}%` }}
        >
          <span className="text-[9px] font-bold text-white drop-shadow-sm">
            {s.pct}%
          </span>
        </div>
      ))}
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
      {segments.map((s) => (
        <div key={s.label} className="flex items-center gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-sm ${s.color}`} />
          <span className="text-[10px] text-brand-black/70">{s.label}</span>
        </div>
      ))}
    </div>
  </div>
);

export const ComparisonCard: React.FC<{
  title: string;
  items: { label: string; a: string; b: string }[];
  colA: string;
  colB: string;
  accentA?: string;
  accentB?: string;
}> = ({ title, items, colA, colB, accentA = "text-down", accentB = "text-up" }) => (
  <div className="my-6 bg-terminal-surface border border-brand-gray/20 rounded-lg overflow-hidden">
    <div className="px-4 py-2.5 bg-terminal-surface-raised border-b border-brand-gray/15">
      <p className="text-[10px] font-bold text-brand-black/50 uppercase tracking-wider">
        {title}
      </p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-brand-gray/15">
            <th className="text-left px-4 py-2 text-[10px] font-bold text-brand-black/40 uppercase tracking-wider w-1/3" />
            <th className={`text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${accentA}`}>
              {colA}
            </th>
            <th className={`text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${accentB}`}>
              {colB}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.label} className="border-b border-brand-gray/10 last:border-0">
              <td className="px-4 py-2 font-medium text-brand-black">{item.label}</td>
              <td className={`px-3 py-2 text-center ${accentA}`}>{item.a}</td>
              <td className={`px-3 py-2 text-center ${accentB}`}>{item.b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const PortfolioCard: React.FC<{
  items: { name: string; size: string; price: string; target: string; risk: string }[];
  total: string;
}> = ({ items, total }) => (
  <div className="my-6 bg-terminal-surface border border-brand-gray/20 rounded-lg overflow-hidden">
    <div className="px-4 py-2.5 bg-terminal-surface-raised border-b border-brand-gray/15 flex items-center justify-between">
      <p className="text-[10px] font-bold text-brand-black/50 uppercase tracking-wider">
        Sample Starter Portfolio
      </p>
      <p className="text-xs font-bold font-mono text-brand-black">{total}</p>
    </div>
    <div className="divide-y divide-brand-gray/10">
      {items.map((item) => (
        <div key={item.name} className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-brand-black truncate">{item.name}</p>
            <p className="text-[10px] text-brand-black/50">Size {item.size}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[12px] font-bold font-mono text-brand-black">{item.price}</p>
            <p className="text-[10px] text-up">Target: {item.target}</p>
          </div>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
            item.risk === "Low" ? "bg-up/10 text-up" :
            item.risk === "Medium" ? "bg-yellow-100 text-yellow-700" :
            "bg-down/10 text-down"
          }`}>
            {item.risk}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export const SignalCards: React.FC<{
  sell: string[];
  hold: string[];
}> = ({ sell, hold }) => (
  <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div className="border border-up/40 bg-up/50 rounded-lg p-4">
      <div className="flex items-center gap-1.5 mb-2.5">
        <div className="w-2 h-2 rounded-full bg-up" />
        <p className="text-[10px] font-bold text-up uppercase tracking-wider">Sell Signals</p>
      </div>
      <ul className="space-y-1.5">
        {sell.map((s) => (
          <li key={s} className="text-[12px] text-up flex items-start gap-1.5">
            <span className="text-up mt-0.5">&#10003;</span> {s}
          </li>
        ))}
      </ul>
    </div>
    <div className="border border-down/40 bg-down/50 rounded-lg p-4">
      <div className="flex items-center gap-1.5 mb-2.5">
        <div className="w-2 h-2 rounded-full bg-down" />
        <p className="text-[10px] font-bold text-down uppercase tracking-wider">Hold / Wait</p>
      </div>
      <ul className="space-y-1.5">
        {hold.map((h) => (
          <li key={h} className="text-[12px] text-down flex items-start gap-1.5">
            <span className="text-down mt-0.5">&#10007;</span> {h}
          </li>
        ))}
      </ul>
    </div>
  </div>
);

export const LandedCostWaterfall: React.FC = () => {
  const items = [
    { label: "Base Price", value: "₹15,000", width: "44%", color: "bg-terminal-text" },
    { label: "+ Platform Fees (12%)", value: "₹1,800", width: "5%", color: "bg-terminal-text/70" },
    { label: "+ Shipping", value: "₹3,500", width: "10%", color: "bg-terminal-text/50" },
    { label: "+ Customs (42%)", value: "₹8,526", width: "25%", color: "bg-down" },
    { label: "+ GST (18%)", value: "₹5,189", width: "15%", color: "bg-down" },
  ];
  return (
    <div className="my-6 bg-terminal-surface border border-brand-gray/20 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-brand-black/50 uppercase tracking-wider">
          Landed cost breakdown — importing to India
        </p>
        <p className="text-xs font-bold font-mono text-brand-black">= ₹34,015</p>
      </div>
      <div className="h-5 rounded-full overflow-hidden flex">
        {items.map((it) => (
          <div
            key={it.label}
            className={`${it.color} h-full`}
            style={{ width: it.width }}
            title={`${it.label}: ${it.value}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-sm ${it.color}`} />
            <span className="text-[9px] text-brand-black/60">
              {it.label} <span className="font-mono font-semibold">{it.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const RiskMatrix: React.FC = () => {
  const risks = [
    { name: "Counterfeits", likelihood: "High", impact: "High", color: "bg-down" },
    { name: "Price Drop", likelihood: "Medium", impact: "High", color: "bg-orange-500" },
    { name: "Liquidity", likelihood: "Medium", impact: "Medium", color: "bg-yellow-500" },
    { name: "Storage Damage", likelihood: "Low", impact: "Medium", color: "bg-yellow-400" },
    { name: "Market Saturation", likelihood: "Low", impact: "High", color: "bg-orange-400" },
  ];
  return (
    <div className="my-6 bg-terminal-surface border border-brand-gray/20 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-terminal-surface-raised border-b border-brand-gray/15">
        <p className="text-[10px] font-bold text-brand-black/50 uppercase tracking-wider">
          Risk assessment matrix
        </p>
      </div>
      <div className="divide-y divide-brand-gray/10">
        {risks.map((r) => (
          <div key={r.name} className="px-4 py-2.5 flex items-center justify-between">
            <span className="text-[12px] font-medium text-brand-black">{r.name}</span>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[9px] text-brand-black/40 uppercase">Likelihood</p>
                <p className="text-[11px] font-semibold text-brand-black">{r.likelihood}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-brand-black/40 uppercase">Impact</p>
                <p className="text-[11px] font-semibold text-brand-black">{r.impact}</p>
              </div>
              <div className={`w-3 h-3 rounded-full ${r.color}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Per-article visual enhancement maps ─── */

type VisualInsert = { after: string; component: React.ReactNode };

const articleVisuals: Record<string, { hero?: React.ReactNode; inserts: VisualInsert[] }> = {
  "what-is-sneaker-investing": {
    hero: (
      <>
        <StatGrid
          stats={[
            { label: "Avg Holding", value: "3-6 mo", sub: "per pair" },
            { label: "Target ROI", value: "20-30%", sub: "per trade" },
            { label: "Entry Cost", value: "₹10K+", sub: "starting capital" },
            { label: "Risk Level", value: "Medium", sub: "with diversification" },
          ]}
        />
        <FlowDiagram
          title="How sneaker prices are discovered"
          steps={[
            { icon: "💬", label: "WhatsApp B2B", sub: "Lowest price" },
            { icon: "🛒", label: "Marketplace", sub: "Mid price" },
            { icon: "🌐", label: "StockX / GOAT", sub: "Global price" },
            { icon: "📊", label: "Sentria", sub: "All-in-one" },
          ]}
        />
      </>
    ),
    inserts: [
      {
        after: "The Indian Market Context",
        component: (
          <PriceTierBars
            tiers={[
              { label: "B2B (WhatsApp)", price: "₹12,000", width: "48%", color: "bg-up", tag: "Lowest" },
              { label: "Marketplace (B2C)", price: "₹15,000", width: "64%", color: "bg-blue-500", tag: "Mid" },
              { label: "StockX / GOAT", price: "₹22,000", width: "92%", color: "bg-terminal-text", tag: "+customs" },
            ]}
          />
        ),
      },
      {
        after: "Risks to Consider",
        component: (
          <TipCard type="warning" title="Key Risk">
            The sneaker market can be volatile. A pair worth ₹25,000 today could drop 30% if a restock is announced.
            Always set a stop-loss and never invest money you can't afford to lose.
          </TipCard>
        ),
      },
    ],
  },

  "how-to-buy-sneakers-india": {
    hero: (
      <StatGrid
        stats={[
          { label: "Channels", value: "3+", sub: "price sources" },
          { label: "B2B Discount", value: "15-25%", sub: "vs marketplace" },
          { label: "Import Tax", value: "~60%", sub: "customs + GST" },
          { label: "Auth Cost", value: "₹500-1K", sub: "per check" },
        ]}
      />
    ),
    inserts: [
      {
        after: "Calculating Landed Cost",
        component: <LandedCostWaterfall />,
      },
      {
        after: "Authentication Checklist",
        component: (
          <TipCard type="tip" title="Pro Tip">
            For high-value pairs (₹20K+), always use a professional authentication service.
            The ₹500-1,000 cost is negligible compared to the risk of buying a fake.
          </TipCard>
        ),
      },
      {
        after: "Red Flags to Avoid",
        component: (
          <TipCard type="warning" title="Golden Rule">
            If the price is significantly below market, something is wrong. Legitimate sellers
            don't leave money on the table. Verify, verify, verify.
          </TipCard>
        ),
      },
    ],
  },

  "when-to-sell-sneakers": {
    hero: (
      <SignalCards
        sell={[
          "Price up 20%+ in 30 days",
          "Price plateaued for 2-3 months",
          "Mass restock announced",
          "Capital better deployed elsewhere",
        ]}
        hold={[
          "Upcoming collaboration or release",
          "Price dip is temporary",
          "Strong cultural moment ahead",
          "Liquidity still increasing",
        ]}
      />
    ),
    inserts: [
      {
        after: "Exit Strategies",
        component: (
          <ComparisonCard
            title="Exit Strategy Comparison"
            colA="Pros"
            colB="Cons"
            accentA="text-up"
            accentB="text-down"
            items={[
              { label: "Profit Target", a: "Emotion-free", b: "May miss upside" },
              { label: "Time-Based", a: "Prevents holding", b: "Ignores trends" },
              { label: "Technical", a: "Data-driven", b: "Complex" },
              { label: "Rebalancing", a: "Balanced portfolio", b: "Taxes on gains" },
            ]}
          />
        ),
      },
      {
        after: "Tax Considerations",
        component: (
          <TipCard type="info" title="India Tax Note">
            If you trade regularly (10+ transactions/month), you may be classified as a business.
            Consult a CA before your annual revenue exceeds ₹20 lakhs — GST registration may be required.
          </TipCard>
        ),
      },
    ],
  },

  "understanding-price-ranges": {
    hero: (
      <PriceTierBars
        tiers={[
          { label: "B2B Market (WhatsApp)", price: "₹12,000", width: "44%", color: "bg-up", tag: "Best buy" },
          { label: "End Customer (Marketplace)", price: "₹15,500", width: "60%", color: "bg-blue-500", tag: "Best sell" },
          { label: "StockX/GOAT (International)", price: "₹22,000", width: "84%", color: "bg-purple-500", tag: "+customs" },
          { label: "StockX Landed (to India)", price: "₹34,000", width: "100%", color: "bg-terminal-text", tag: "Total" },
        ]}
      />
    ),
    inserts: [
      {
        after: "Price Spread Analysis",
        component: (
          <div className="my-6 bg-terminal-surface border border-brand-gray/20 rounded-lg p-4">
            <p className="text-[10px] font-bold text-brand-black/50 uppercase tracking-wider mb-3">
              Spread = Your profit margin
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-center p-3 bg-up/10 border border-up/40 rounded-lg">
                <p className="text-[10px] text-up font-semibold uppercase">Buy (B2B)</p>
                <p className="text-lg font-bold font-mono text-up">₹12,000</p>
              </div>
              <svg className="w-6 h-6 text-brand-black/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <div className="flex-1 text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-[10px] text-blue-600 font-semibold uppercase">Sell (B2C)</p>
                <p className="text-lg font-bold font-mono text-blue-700">₹15,000</p>
              </div>
              <div className="flex-1 text-center p-3 bg-terminal-surface-raised text-terminal-text rounded-lg">
                <p className="text-[10px] font-semibold uppercase opacity-70">Spread</p>
                <p className="text-lg font-bold font-mono">₹3,000</p>
                <p className="text-[10px] opacity-70">25% margin</p>
              </div>
            </div>
          </div>
        ),
      },
      {
        after: "Fair Value Range",
        component: (
          <TipCard type="tip" title="How to read Fair Value">
            Fair value is the range where a sneaker is currently trading across channels. A price
            <strong> below</strong> the range is cheaper than the market; <strong>above</strong> is dearer.
            Sentria calculates the range automatically from cross-channel data — what you do with it is your call.
          </TipCard>
        ),
      },
    ],
  },

  "risk-management-strategies": {
    hero: <RiskMatrix />,
    inserts: [
      {
        after: "Position Sizing",
        component: (
          <AllocationBar
            title="Recommended portfolio allocation"
            segments={[
              { label: "Safe Bets (proven models)", pct: 40, color: "bg-up" },
              { label: "Growth Plays (emerging)", pct: 40, color: "bg-blue-500" },
              { label: "Speculative (high risk)", pct: 20, color: "bg-down" },
            ]}
          />
        ),
      },
      {
        after: "When to Cut Losses",
        component: (
          <TipCard type="warning" title="Hard Rule">
            If a pair drops 30%+ with no recovery signs, sell it. A ₹7,500 loss today is better than
            a ₹15,000 loss next month. Reinvest that capital in something with better prospects.
          </TipCard>
        ),
      },
    ],
  },

  "building-first-portfolio": {
    hero: (
      <>
        <AllocationBar
          title="The 60-30-10 Rule"
          segments={[
            { label: "Core Holdings — Safe Bets", pct: 60, color: "bg-up" },
            { label: "Growth — Emerging Trends", pct: 30, color: "bg-blue-500" },
            { label: "Speculative — High Risk", pct: 10, color: "bg-orange-500" },
          ]}
        />
        <StatGrid
          stats={[
            { label: "Starting Capital", value: "₹50K-1L" },
            { label: "Pairs", value: "2-3", sub: "to start" },
            { label: "Target Return", value: "20-25%", sub: "over 4-6 months" },
            { label: "Best Sizes", value: "UK 8-10", sub: "highest demand" },
          ]}
        />
      </>
    ),
    inserts: [
      {
        after: "Sample First Portfolio",
        component: (
          <PortfolioCard
            total="₹75,000"
            items={[
              { name: "Jordan 1 Low", size: "UK 9", price: "₹25,000", target: "+25% in 4mo", risk: "Low" },
              { name: "New Balance 550", size: "UK 8", price: "₹20,000", target: "+30% in 6mo", risk: "Medium" },
              { name: "Dunk Low", size: "UK 10", price: "₹30,000", target: "+20% in 3mo", risk: "Low" },
            ]}
          />
        ),
      },
      {
        after: "Key Metrics to Track",
        component: (
          <TipCard type="info" title="Track Everything">
            Use Sentria's portfolio tracker to monitor your positions. Seeing your win rate, average holding period,
            and profit margin over time helps you refine your strategy and make better decisions.
          </TipCard>
        ),
      },
    ],
  },
};

export function getArticleVisuals(slug: string) {
  return articleVisuals[slug] || { inserts: [] };
}
