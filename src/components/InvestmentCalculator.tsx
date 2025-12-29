import React, { useState } from "react";
import { UserProfile } from "../types";

interface InvestmentCalculatorProps {
  profile: UserProfile;
  onBack: () => void;
  onNext: () => void;
}

export const InvestmentCalculator: React.FC<InvestmentCalculatorProps> = ({
  profile,
  onBack,
  onNext,
}) => {
  const [investmentAmount, setInvestmentAmount] = useState(profile.budget || 50000);
  const [timeHorizon, setTimeHorizon] = useState(6); // months
  const [expectedReturn, setExpectedReturn] = useState(15); // percentage

  // Calculate potential returns
  const calculateReturns = () => {
    const monthlyReturn = expectedReturn / 100 / 12;
    const finalValue = investmentAmount * Math.pow(1 + monthlyReturn, timeHorizon);
    const profit = finalValue - investmentAmount;
    const roi = (profit / investmentAmount) * 100;

    return {
      finalValue,
      profit,
      roi,
      monthlyProfit: profit / timeHorizon,
    };
  };

  const returns = calculateReturns();

  // Risk-adjusted scenarios
  const scenarios = [
    {
      label: 'Conservative',
      return: expectedReturn * 0.6,
      color: 'text-blue-400',
    },
    {
      label: 'Expected',
      return: expectedReturn,
      color: 'text-emerald-400',
    },
    {
      label: 'Optimistic',
      return: expectedReturn * 1.4,
      color: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border border-brand-gray/20 rounded-none p-6 bg-brand-white">
        <h2 className="text-3xl md:text-4xl font-heading font-normal text-brand-black mb-4">
          Calculate Your Potential Returns
        </h2>

        {/* Investment Amount */}
        <div className="mb-6">
          <label className="block text-xs text-brand-black mb-2">
            Investment Amount (₹)
          </label>
          <input
            type="number"
            value={investmentAmount}
            onChange={(e) => setInvestmentAmount(parseInt(e.target.value) || 0)}
            className="w-full bg-brand-white border border-brand-gray/20 rounded-none py-2.5 px-4 text-xs text-brand-black focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Time Horizon */}
        <div className="mb-6">
          <label className="block text-xs text-brand-black mb-2">
            Time Horizon: {timeHorizon} months
          </label>
          <input
            type="range"
            min="1"
            max="24"
            value={timeHorizon}
            onChange={(e) => setTimeHorizon(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-brand-black mt-1">
            <span>1 month</span>
            <span>12 months</span>
            <span>24 months</span>
          </div>
        </div>

        {/* Expected Return */}
        <div className="mb-6">
          <label className="block text-xs text-brand-black mb-2">
            Expected Annual Return: {expectedReturn}%
          </label>
          <input
            type="range"
            min="5"
            max="50"
            value={expectedReturn}
            onChange={(e) => setExpectedReturn(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-brand-black mt-1">
            <span>5%</span>
            <span>25%</span>
            <span>50%</span>
          </div>
          <p className="text-xs text-brand-black mt-2">
            Based on your {profile.riskTolerance} risk profile, we estimate 10-20% annual returns
          </p>
        </div>

        {/* Results */}
        <div className="border-t border-brand-gray/20 pt-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="border border-brand-gray/20 rounded-none p-4">
              <p className="text-xs text-brand-black mb-1">Initial Investment</p>
              <p className="text-lg font-semibold text-brand-black">
                ₹{investmentAmount.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="border border-brand-gray/20 rounded-none p-4">
              <p className="text-xs text-brand-black mb-1">Final Value</p>
              <p className="text-lg font-semibold text-green-500">
                ₹{returns.finalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="border border-brand-gray/20 rounded-none p-4">
              <p className="text-xs text-brand-black mb-1">Total Profit</p>
              <p className={`text-lg font-semibold ${
                returns.profit > 0 ? "text-green-500" : returns.profit < 0 ? "text-red-500" : "text-brand-black"
              }`}>
                ₹{returns.profit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="border border-brand-gray/20 rounded-none p-4">
              <p className="text-xs text-brand-black mb-1">ROI</p>
              <p className={`text-lg font-semibold ${
                returns.roi > 0 ? "text-green-500" : returns.roi < 0 ? "text-red-500" : "text-brand-black"
              }`}>
                {returns.roi > 0 ? "+" : ""}{returns.roi.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Scenarios */}
          <div className="border border-brand-gray/20 rounded-none p-4 bg-brand-gray/10">
            <p className="text-xs font-body font-normal text-brand-black mb-3">
              Different Scenarios
            </p>
            <div className="space-y-2">
              {scenarios.map((scenario) => {
                const scenarioReturn = (investmentAmount * (scenario.return / 100 / 12) * timeHorizon);
                return (
                  <div key={scenario.label} className="flex items-center justify-between">
                    <span className="text-xs text-brand-black">{scenario.label}:</span>
                    <span className={`text-xs font-medium ${scenario.color}`}>
                      ₹{scenarioReturn.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="border border-brand-gray/20 rounded-none p-6 bg-brand-white">
        <h3 className="text-xs font-heading font-normal text-brand-black mb-3">
          💡 Key Insights
        </h3>
        <ul className="space-y-2 text-xs text-brand-black">
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">•</span>
            <span>Average monthly profit: ₹{returns.monthlyProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">•</span>
            <span>This assumes you reinvest profits and maintain consistent returns</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400">⚠</span>
            <span>Remember: Past performance doesn't guarantee future results. Start small and learn as you go.</span>
          </li>
        </ul>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-none border border-brand-gray/20 text-brand-black font-medium text-xs hover:bg-brand-gray/10"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 px-6 py-3 rounded-none bg-emerald-500 text-brand-white font-medium text-xs hover:bg-emerald-400"
        >
          Get Recommendations →
        </button>
      </div>
    </div>
  );
};

