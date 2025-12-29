import React from "react";

/**
 * Beginner cheat sheet based on the provided investing guide.
 * Keeps content concise and scannable inside the asset detail view.
 */
export const BeginnerGuideCard: React.FC = () => {
  return (
    <div className="border border-brand-gray/20 rounded-none p-3 md:p-4 bg-brand-white space-y-3 text-sm text-brand-black">
      <div>
        <p className="text-xs font-body font-normal text-brand-black">
          Why sneakers?
        </p>
        <p className="text-brand-black">
          Limited-supply asset class driven by scarcity, culture, and demand cycles.
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-body font-normal text-brand-black">
          Rule 1: Supply drives everything
        </p>
        <ul className="list-disc list-inside text-brand-black space-y-0.5">
          <li>India releases are limited; many pairs enter via resellers.</li>
          <li>Limited drops create natural price floors.</li>
        </ul>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-body font-normal text-brand-black">
          Rule 2: Demand signals
        </p>
        <ul className="list-disc list-inside text-brand-black space-y-0.5">
          <li>Culture moments, trends, nostalgia.</li>
          <li>Who's wearing it (celeb/influencer heat).</li>
          <li>Replacement rate (how often people rebuy).</li>
        </ul>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-body font-normal text-brand-black">
          Rule 3: Price anchors
        </p>
        <ul className="list-disc list-inside text-brand-black space-y-0.5">
          <li>Retail (India & global).</li>
          <li>Average India resell price.</li>
          <li>International trend anchors.</li>
          <li>Historical movement (if available).</li>
        </ul>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-body font-normal text-brand-black">
          Rule 4: Size matters (India)
        </p>
        <ul className="list-disc list-inside text-brand-black space-y-0.5">
          <li>UK 7–10 move fastest; UK 8/9 often most liquid.</li>
          <li>Smaller sizes = lower demand; larger sizes = slower movement.</li>
          <li>Liquidity &gt; rarity. Always check size sell-through speed.</li>
        </ul>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-body font-normal text-brand-black">
          Rule 5: Timeline strategy
        </p>
        <ul className="list-disc list-inside text-brand-black space-y-0.5">
          <li>Flip (0–30d): GR pairs, trend-driven colorways, post-release spikes.</li>
          <li>Hold (3–12m): Classics, high-demand silhouettes, cultural collabs.</li>
        </ul>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-body font-normal text-brand-black">
          Rule 6: Condition & authenticity
        </p>
        <ul className="list-disc list-inside text-brand-black space-y-0.5">
          <li>Biggest risk: fakes, damage, missing box/tags, wrong sizing, bad storage.</li>
          <li>Perfect condition, checked pairs keep value.</li>
        </ul>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-body font-normal text-brand-black">
          Rule 7: Where to research
        </p>
        <ul className="list-disc list-inside text-brand-black space-y-0.5">
          <li>Indian marketplaces (local liquidity).</li>
          <li>WhatsApp groups (real-time reseller sentiment).</li>
          <li>International platforms (trend anchors).</li>
          <li>Offline retail shortages (India scarcity).</li>
        </ul>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-body font-normal text-brand-black">
          Common beginner mistakes
        </p>
        <ul className="list-disc list-inside text-brand-black space-y-0.5">
          <li>Buying hype without data.</li>
          <li>Ignoring size-specific demand.</li>
          <li>Holding GR pairs too long.</li>
          <li>Not checking condition/authenticity.</li>
          <li>Blindly following international prices.</li>
          <li>Overpaying during spikes.</li>
        </ul>
      </div>
    </div>
  );
};

