import React from "react";
import { UserProfile, InvestmentOpportunity, Asset } from "../types";

interface BeginnerRecommendationsProps {
  profile: UserProfile;
  onBack: () => void;
  assets: Asset[]; // use real app assets, not mock data
}

export const BeginnerRecommendations: React.FC<BeginnerRecommendationsProps> = ({
  profile,
  onBack,
  assets,
}) => {
  // Generate recommendations based on profile
  const safeAsset = assets[1] ?? assets[0]; // e.g. something liquid / lower entry
  const growthAsset = assets[0] ?? assets[1]; // e.g. something with more upside

  const baseRecommendations: InvestmentOpportunity[] = assets.length === 0 ? [] : [
    {
      id: 1,
      asset: safeAsset,
      whyGoodForBeginners: [
        'High liquidity - easy to buy and sell',
        'Stable price history with consistent demand',
        'Lower entry point (₹9,500-₹12,500)',
        'Popular size range means quick turnover',
      ],
      riskLevel: 'low',
      minimumInvestment: 10000,
      expectedReturn: '10-15% in 3-6 months',
      timeHorizon: '3-6 months',
      liquidity: 'Very High',
      learningValue: 'Learn market dynamics with lower risk',
    },
    {
      id: 2,
      asset: growthAsset,
      whyGoodForBeginners: [
        'Strong brand recognition (Nike/Jordan)',
        'Proven track record of appreciation',
        'Multiple size options for flexibility',
        'Good balance of risk and reward',
      ],
      riskLevel: 'medium',
      minimumInvestment: 25000,
      expectedReturn: '15-25% in 6-12 months',
      timeHorizon: '6-12 months',
      liquidity: 'Medium-High',
      learningValue: 'Understand premium sneaker market',
    },
  ];

  const recommendations = baseRecommendations.filter(
    rec => rec.minimumInvestment <= (profile.budget || 0)
  );

  return (
    <div className="space-y-6">
      <div className="border border-brand-gray/20 rounded-none p-6 bg-brand-white">
        <h2 className="text-xl md:text-2xl font-heading font-normal text-brand-black mb-2">
          Recommended Starting Points
        </h2>
        <p className="text-xs text-brand-black mb-4">
          Based on your {profile.experienceLevel} level, ₹{profile.budget?.toLocaleString('en-IN')} budget, and {profile.riskTolerance} risk tolerance
        </p>

        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="border border-brand-gray/20 rounded-none p-4 bg-brand-white hover:border-brand-black transition"
            >
              <div className="flex items-start gap-4 mb-3">
                <div className="h-16 w-16 rounded-none bg-brand-gray/10 overflow-hidden flex-shrink-0">
                  <img
                    src={rec.asset.image}
                    alt={rec.asset.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-heading font-normal text-brand-black">
                      {rec.asset.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      rec.riskLevel === 'low' 
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : rec.riskLevel === 'medium'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {rec.riskLevel.toUpperCase()} RISK
                    </span>
                  </div>
                  <p className="text-xs text-brand-black mb-2">
                    {rec.asset.brand} · Entry: ₹{rec.minimumInvestment.toLocaleString('en-IN')}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-brand-black">
                    <span>Expected: {rec.expectedReturn}</span>
                    <span>•</span>
                    <span>Liquidity: {rec.liquidity}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-brand-gray/20 pt-3 mt-3">
                <p className="text-xs text-brand-black mb-2 font-medium">
                  Why this is good for beginners:
                </p>
                <ul className="space-y-1">
                  {rec.whyGoodForBeginners.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-brand-black">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-brand-gray/20 pt-3 mt-3">
                <p className="text-xs text-brand-black mb-1">
                  <span className="font-medium">What you'll learn:</span> {rec.learningValue}
                </p>
              </div>

              <button className="mt-3 w-full py-2 rounded-none border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20">
                View Details & Add to Watchlist
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps */}
      <div className="border border-brand-gray/20 rounded-none p-6 bg-brand-white">
        <h3 className="text-xs font-heading font-normal text-brand-black mb-3">
          🎯 Your Next Steps
        </h3>
        <ol className="space-y-3 text-xs text-brand-black">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-medium">
              1
            </span>
            <div>
              <p className="font-medium text-brand-black">Research the recommended sneakers</p>
              <p className="text-xs text-brand-black mt-1">Check size availability, price trends, and market sentiment</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-medium">
              2
            </span>
            <div>
              <p className="font-medium text-brand-black">Set up price alerts</p>
              <p className="text-xs text-brand-black mt-1">Get notified when prices drop to your target range</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-medium">
              3
            </span>
            <div>
              <p className="font-medium text-brand-black">Start with one pair</p>
              <p className="text-xs text-brand-black mt-1">Don't go all-in. Buy one pair, learn the process, then scale</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-medium">
              4
            </span>
            <div>
              <p className="font-medium text-brand-black">Track your investment</p>
              <p className="text-xs text-brand-black mt-1">Use our portfolio tracker to monitor performance</p>
            </div>
          </li>
        </ol>
      </div>

      <button
        onClick={onBack}
        className="w-full md:w-auto px-6 py-3 rounded-none border border-brand-gray/20 text-brand-black font-medium text-xs hover:bg-brand-gray/10"
      >
        ← Back to Calculator
      </button>
    </div>
  );
};

