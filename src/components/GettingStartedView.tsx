import React, { useState } from "react";
import { Asset, UserProfile } from "../types";
import { InvestmentCalculator } from "./InvestmentCalculator";
import { BeginnerRecommendations } from "./BeginnerRecommendations";

interface GettingStartedViewProps {
  assets?: Asset[];
}

export const GettingStartedView: React.FC<GettingStartedViewProps> = ({ assets = [] }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});

  const handleProfileUpdate = (updates: Partial<UserProfile>) => {
    setProfile({ ...profile, ...updates });
  };

  return (
    <main className="flex-1 min-h-0 bg-brand-white px-2 py-2 md:px-3 md:py-3 pb-20 md:pb-4 w-full max-w-8xl mx-auto overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-heading font-normal text-brand-black mb-2">
          Start Your Sneaker Investing Journey
        </h1>
        <p className="text-sm text-brand-black/60">
          We'll help you understand the market, assess your goals, and find the right opportunities
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <button
              onClick={() => setStep(s as 1 | 2 | 3)}
              className={`flex-1 py-2 px-4 rounded-none border text-xs font-body font-medium transition ${
                step === s
                  ? "border-terminal-border-strong bg-terminal-surface-raised text-terminal-text"
                  : step > s
                  ? "border-brand-gray/30 bg-brand-gray/5 text-brand-black"
                  : "border-brand-gray/20 bg-brand-white text-brand-black"
              }`}
            >
              {s === 1 && "Assess Your Goals"}
              {s === 2 && "Calculate Potential"}
              {s === 3 && "Get Recommendations"}
            </button>
            {s < 3 && (
              <div
                className={`h-0.5 w-8 ${
                  step > s ? "bg-accent" : "bg-brand-gray/20"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      {step === 1 && (
        <ProfileAssessment
          profile={profile}
          onUpdate={handleProfileUpdate}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <InvestmentCalculator
          profile={profile as UserProfile}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <BeginnerRecommendations
          profile={profile as UserProfile}
          onBack={() => setStep(2)}
          assets={assets}
        />
      )}
    </main>
  );
};

// Step 1: Profile Assessment
const ProfileAssessment: React.FC<{
  profile: Partial<UserProfile>;
  onUpdate: (updates: Partial<UserProfile>) => void;
  onNext: () => void;
}> = ({ profile, onUpdate, onNext }) => {
  const [budget, setBudget] = useState(profile.budget || 0);

  return (
    <div className="space-y-6">
      <div className="border border-brand-gray/20 rounded-none p-6 bg-brand-white">
        <h2 className="text-xl md:text-2xl font-heading font-normal text-brand-black mb-4">
          Tell us about yourself
        </h2>

        {/* Experience Level */}
        <div className="mb-6">
          <label className="block text-xs font-body text-brand-black mb-3">
            What's your experience with sneaker investing?
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
              <button
                key={level}
                onClick={() => onUpdate({ experienceLevel: level })}
                className={`py-3 px-4 rounded-none border text-xs font-body font-medium transition ${
                  profile.experienceLevel === level
                    ? "border-terminal-border-strong bg-terminal-surface-raised text-terminal-text"
                    : "border-brand-gray/20 hover:border-terminal-border-strong text-brand-black"
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div className="mb-6">
          <label className="block text-xs font-body text-brand-black mb-3">
            How much are you looking to invest initially? (₹)
          </label>
          <input
            type="number"
            value={budget || ""}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 0;
              setBudget(value);
              onUpdate({ budget: value });
            }}
            placeholder="e.g., 50000"
            className="w-full bg-brand-white border border-brand-gray/20 rounded-none py-2.5 px-4 text-xs font-body text-brand-black placeholder:text-brand-gray focus:outline-none focus:border-terminal-border-strong"
          />
          <div className="mt-2 flex gap-2">
            {[10000, 25000, 50000, 100000].map((amount) => (
              <button
                key={amount}
                onClick={() => {
                  setBudget(amount);
                  onUpdate({ budget: amount });
                }}
                className={`px-3 py-1 rounded-none text-xs border font-body ${
                  budget === amount
                    ? "border-terminal-border-strong bg-terminal-surface-raised text-terminal-text"
                    : "border-brand-gray/20 text-brand-black hover:border-terminal-border-strong"
                }`}
              >
                ₹{amount.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        </div>

        {/* Risk Tolerance */}
        <div className="mb-6">
          <label className="block text-xs font-body text-brand-black mb-3">
            What's your risk tolerance?
          </label>
          <div className="space-y-2">
            {([
              { value: 'conservative' as const, label: 'Conservative', desc: 'Slow, steady gains' },
              { value: 'moderate' as const, label: 'Moderate', desc: 'Balanced risk/reward' },
              { value: 'aggressive' as const, label: 'Aggressive', desc: 'Higher risk, higher reward' },
            ]).map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => onUpdate({ riskTolerance: value })}
                className={`w-full py-3 px-4 rounded-none border text-left transition font-body ${
                  profile.riskTolerance === value
                    ? "border-terminal-border-strong bg-terminal-surface-raised text-terminal-text"
                    : "border-brand-gray/20 hover:border-terminal-border-strong"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${
                    profile.riskTolerance === value ? "text-brand-white" : "text-brand-black"
                    }`}
                  >
                    {label}
                  </span>
                  {profile.riskTolerance === value && (
                    <span className="text-brand-white">✓</span>
                  )}
                </div>
                <p className="text-xs mt-1 text-brand-black">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Investment Goals */}
        <div>
          <label className="block text-xs font-body text-brand-black mb-3">
            What are your goals? (Select all that apply)
          </label>
          <div className="space-y-2">
            {([
              'Learn about sneaker investing',
              'Make some extra income',
              'Build a long-term portfolio',
              'Flip sneakers quickly',
              'Collect rare pieces',
            ]).map((goal) => (
              <label
                key={goal}
                className="flex items-center gap-3 p-3 rounded-none border border-brand-gray/20 hover:border-terminal-border-strong cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={profile.investmentGoals?.includes(goal) || false}
                  onChange={(e) => {
                    const goals = profile.investmentGoals || [];
                    if (e.target.checked) {
                      onUpdate({ investmentGoals: [...goals, goal] });
                    } else {
                      onUpdate({ investmentGoals: goals.filter(g => g !== goal) });
                    }
                  }}
                  className="h-4 w-4 rounded border-brand-gray/30 bg-brand-white"
                />
                <span className="text-xs font-body text-brand-black">{goal}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!profile.experienceLevel || !profile.budget || !profile.riskTolerance}
        className="w-full md:w-auto px-6 py-3 rounded-none bg-accent text-terminal-bg font-body font-medium text-xs hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue to Calculator →
      </button>
    </div>
  );
};

