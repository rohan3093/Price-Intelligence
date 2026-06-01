import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { SignInModal } from "../components/SignInModal";
import { analytics } from "../utils/analytics";

interface LandingPageProps {
  onSignInClick: () => void;
  showSignInModal: boolean;
  onCloseSignIn: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ showSignInModal, onCloseSignIn }) => {
  const navigate = useNavigate();
  const [localShowSignIn, setLocalShowSignIn] = useState(false);
  const showModal = showSignInModal || localShowSignIn;

  const handleGetStarted = () => {
    analytics.track("landing_cta_get_started");
    setLocalShowSignIn(true);
  };

  const handleExplore = () => {
    analytics.track("landing_cta_explore");
    navigate("/app");
  };

  const handleCloseSignIn = () => {
    setLocalShowSignIn(false);
    onCloseSignIn();
  };

  return (
    <div className="min-h-screen bg-brand-background text-brand-black overflow-x-hidden">
      {/* Inline keyframes for floating animations */}
      <style>{`
        @keyframes float-slow { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes float-med  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes float-fast { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes pulse-soft { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes slide-in-left { from { opacity:0; transform:translateX(-20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .float-slow { animation: float-slow 6s ease-in-out infinite; }
        .float-med  { animation: float-med 4.5s ease-in-out infinite; }
        .float-fast { animation: float-fast 3.5s ease-in-out infinite; }
        .pulse-soft { animation: pulse-soft 3s ease-in-out infinite; }
        .slide-in   { animation: slide-in-left 0.6s ease-out forwards; }
        .ticker-scroll { animation: ticker 25s linear infinite; }
      `}</style>

      {/* Navigation */}
      <nav className="border-b border-brand-gray/30 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <img src="/sentria-logo.svg" alt="Sentria" className="h-5 sm:h-6" />
          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              to="/learn"
              className="px-3 sm:px-4 py-1.5 text-xs font-semibold text-brand-black/70 hover:text-brand-black transition-colors"
            >
              Learn
            </Link>
            <button
              onClick={handleExplore}
              className="px-3 sm:px-4 py-1.5 text-xs font-semibold text-brand-black hover:text-brand-black/70 transition-colors hidden sm:inline-block"
            >
              See Live Data
            </button>
            <button
              onClick={handleGetStarted}
              className="px-3 sm:px-4 py-1.5 text-xs font-semibold bg-brand-black text-white hover:bg-brand-black/90 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background: subtle dot grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #00000008 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-background/90 via-white/80 to-transparent" />

        {/* Floating data cards - desktop only */}
        <div className="hidden lg:block absolute right-[8%] top-24 float-slow" style={{ animationDelay: '0s' }}>
          <div className="bg-white border border-brand-gray/30 shadow-lg p-3 w-44">
            <p className="text-[9px] text-brand-black/40 uppercase tracking-wider mb-1">Dunk Low Cacao</p>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold font-mono text-brand-black">&#8377;8,550</span>
              <span className="text-[10px] font-semibold text-green-600">+3.1%</span>
            </div>
            <div className="flex gap-1 mt-1.5">
              <span className="text-[8px] px-1 py-0.5 bg-brand-black/5 text-brand-black/50">B2B &#8377;8,100</span>
              <span className="text-[8px] px-1 py-0.5 bg-brand-black/5 text-brand-black/50">MKT &#8377;8,550</span>
            </div>
          </div>
        </div>
        <div className="hidden lg:block absolute right-[3%] top-56 float-med" style={{ animationDelay: '1.5s' }}>
          <div className="bg-white border border-green-200 shadow-md p-2.5 w-40">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-soft" />
              <p className="text-[9px] font-semibold text-green-700 uppercase">Arbitrage Found</p>
            </div>
            <p className="text-[10px] text-brand-black/60">Samba OG &middot; <span className="font-semibold text-green-600">+&#8377;1,204</span></p>
          </div>
        </div>
        <div className="hidden lg:block absolute right-[14%] top-[340px] float-fast" style={{ animationDelay: '0.8s' }}>
          <div className="bg-white border border-brand-gray/30 shadow-md p-2.5 w-36">
            <p className="text-[9px] text-brand-black/40 uppercase tracking-wider mb-0.5">Market Health</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-green-600">72</span>
              <span className="text-[9px] text-green-600 font-medium">Healthy</span>
            </div>
            <div className="w-full bg-brand-gray/30 h-1 mt-1.5">
              <div className="bg-green-500 h-1" style={{ width: '72%' }} />
            </div>
          </div>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 sm:pt-24 sm:pb-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-brand-gray/30 shadow-sm mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-soft" />
              <span className="text-[10px] font-semibold text-brand-black/60 uppercase tracking-wider">Live market data &middot; Updated daily</span>
            </div>
            <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-brand-black leading-[0.9] mb-6">
              STOP GUESSING.{" "}
              <span className="text-brand-black/25">START KNOWING.</span>
            </h1>
            <p className="text-base sm:text-lg text-brand-black/70 max-w-xl leading-relaxed mb-8">
              You&apos;re already checking WhatsApp groups, CrepdogCrew, Mainstreet, StockX,
              and GOAT before every trade. Sentria puts all of it in one place &mdash;
              so you can see the real price, find the margin, and move faster than everyone else.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleGetStarted}
                className="group px-6 py-3 text-sm font-semibold bg-brand-black text-white hover:bg-brand-black/90 transition-all flex items-center justify-center gap-2"
              >
                Get Started &mdash; It&apos;s Free
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
              <button
                onClick={handleExplore}
                className="px-6 py-3 text-sm font-semibold border border-brand-black/20 text-brand-black hover:border-brand-black hover:bg-white transition-all"
              >
                See Live Market Data
              </button>
            </div>

            {/* Mobile data cards — replaces floating cards on small screens */}
            <div className="flex gap-2.5 mt-8 overflow-x-auto pb-2 -mx-4 px-4 lg:hidden snap-x snap-mandatory">
              <div className="bg-white border border-brand-gray/30 shadow-sm p-3 min-w-[140px] snap-start flex-shrink-0">
                <p className="text-[9px] text-brand-black/40 uppercase tracking-wider mb-1">Dunk Low Cacao</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold font-mono text-brand-black">&#8377;8,550</span>
                  <span className="text-[10px] font-semibold text-green-600">+3.1%</span>
                </div>
                <div className="flex gap-1 mt-1.5">
                  <span className="text-[8px] px-1 py-0.5 bg-brand-black/5 text-brand-black/50">B2B &#8377;8,100</span>
                  <span className="text-[8px] px-1 py-0.5 bg-brand-black/5 text-brand-black/50">StockX &#8377;9,800</span>
                </div>
              </div>
              <div className="bg-white border border-green-200 shadow-sm p-3 min-w-[140px] snap-start flex-shrink-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[9px] text-green-700 font-semibold uppercase">Arbitrage</span>
                </div>
                <p className="text-[10px] text-brand-black font-semibold">AJ1 Low Travis</p>
                <p className="text-xs font-bold text-green-600 font-mono">+&#8377;2,400</p>
              </div>
              <div className="bg-white border border-brand-gray/30 shadow-sm p-3 min-w-[140px] snap-start flex-shrink-0">
                <p className="text-[9px] text-brand-black/40 uppercase tracking-wider mb-0.5">Market Health</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-green-600">72</span>
                  <span className="text-[9px] text-green-600 font-medium">Healthy</span>
                </div>
                <div className="w-full bg-brand-gray/30 h-1 mt-1.5">
                  <div className="bg-green-500 h-1" style={{ width: '72%' }} />
                </div>
              </div>
              <div className="bg-white border border-brand-gray/30 shadow-sm p-3 min-w-[140px] snap-start flex-shrink-0">
                <p className="text-[9px] text-brand-black/40 uppercase tracking-wider mb-1">Jordan 4 Bred</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold font-mono text-brand-black">&#8377;24,500</span>
                  <span className="text-[10px] font-semibold text-red-500">-1.2%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Ticker */}
      <div className="border-y border-brand-gray/30 bg-white overflow-hidden py-2.5">
        <div className="flex ticker-scroll whitespace-nowrap">
          {[...Array(2)].map((_, setIdx) => (
            <div key={setIdx} className="flex items-center gap-6 px-3">
              {[
                { name: "Yeezy Slide Resin", price: "7,998", change: "+14.3%", up: true },
                { name: "Samba OG", price: "7,695", change: "-30.0%", up: false, deal: true },
                { name: "Air Force 1 Low", price: "22,952", change: "+53.1%", up: true },
                { name: "Dunk Low Cacao", price: "8,550", change: "+3.1%", up: true },
                { name: "Jordan 1 Low", price: "8,207", change: "-8.8%", up: false },
                { name: "Foam RNR", price: "8,998", change: "-0.0%", up: false },
                { name: "Cloud All White", price: "13,499", change: "-6.9%", up: false },
                { name: "Dunk Low Medium", price: "11,571", change: "+5.2%", up: true },
                { name: "Adizero", price: "12,498", change: "-21.9%", up: false, deal: true },
              ].map((item, i) => (
                <div key={`${setIdx}-${i}`} className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] font-medium text-brand-black/70">{item.name}</span>
                  <span className="text-[11px] font-mono font-semibold text-brand-black">&#8377;{item.price}</span>
                  <span className={`text-[10px] font-semibold ${item.up ? 'text-green-600' : 'text-red-500'}`}>{item.change}</span>
                  {item.deal && <span className="text-[8px] font-bold px-1 py-0.5 bg-green-100 text-green-700 uppercase">Deal</span>}
                  <span className="text-brand-black/10 mx-1">&middot;</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Product Preview */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl text-brand-black mb-2">
              SEE THE ENTIRE MARKET IN ONE VIEW
            </h2>
            <p className="text-sm text-brand-black/50 max-w-md mx-auto">Every price. Every channel. Every size. Updated daily.</p>
          </div>

          <div className="border border-brand-gray/40 bg-white shadow-2xl overflow-hidden relative">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-black/5 via-transparent to-brand-black/5 blur-xl -z-10" />

            {/* Browser chrome */}
            <div className="border-b border-brand-gray/30 bg-brand-gray-light/50 px-4 py-2 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-brand-black/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-brand-black/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-brand-black/10" />
              </div>
              <div className="flex-1 mx-8">
                <div className="bg-white border border-brand-gray/30 text-[10px] text-brand-black/40 px-3 py-1 text-center max-w-xs mx-auto flex items-center justify-center gap-1">
                  <svg className="w-2.5 h-2.5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10"/></svg>
                  sentria.app/app
                </div>
              </div>
            </div>

            <div className="flex min-h-[340px] sm:min-h-[440px]">
              {/* Left panel */}
              <div className="w-[35%] border-r border-brand-gray/20 hidden sm:block">
                <div className="border-b border-brand-gray/20 p-2.5">
                  <div className="bg-brand-gray-light/50 h-7 flex items-center px-2.5 border border-brand-gray/20">
                    <svg className="w-3 h-3 text-brand-black/25 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <span className="text-[9px] text-brand-black/30">Search by name or SKU...</span>
                  </div>
                </div>
                {[
                  { name: "Air Jordan 1 Low SE", brand: "Nike", price: "8,207", change: "-8.8%", up: false, selected: true },
                  { name: "Dunk Low Cacao Wow", brand: "Nike", price: "8,550", change: "+3.1%", up: true },
                  { name: "Samba OG", brand: "Adidas", price: "7,695", change: "-30.0%", up: false, deal: true },
                  { name: "Yeezy Slide Resin", brand: "Adidas", price: "7,998", change: "+14.3%", up: true },
                  { name: "Air Force 1 Low", brand: "Nike", price: "22,952", change: "+53.1%", up: true },
                  { name: "Dunk Low Medium Olive", brand: "Nike", price: "11,571", change: "+5.2%", up: true },
                  { name: "Cloud 5 All White", brand: "On Running", price: "13,499", change: "-6.9%", up: false },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-2.5 px-3 py-2.5 border-b border-brand-gray/10 transition-colors ${item.selected ? 'bg-brand-black/[0.03] border-l-2 border-l-brand-black' : 'hover:bg-brand-gray-light/30'}`}>
                    <div className="w-8 h-8 bg-brand-gray-light flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-[10px] font-medium text-brand-black truncate">{item.name}</p>
                        {item.deal && <span className="text-[7px] font-bold px-1 py-0.5 bg-green-100 text-green-700 flex-shrink-0">DEAL</span>}
                      </div>
                      <p className="text-[8px] text-brand-black/40">{item.brand}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] font-mono font-semibold text-brand-black">&#8377;{item.price}</p>
                      <p className={`text-[9px] font-semibold ${item.up ? 'text-green-600' : 'text-red-500'}`}>{item.change}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right panel */}
              <div className="flex-1 p-4 sm:p-5 overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm sm:text-base font-semibold text-brand-black">Air Jordan 1 Low SE</h3>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 bg-brand-black text-white uppercase">Nike</span>
                    </div>
                    <p className="text-[10px] text-brand-black/40">FZ4178-200 &middot; UK 3 - UK 17</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg sm:text-xl font-bold font-mono text-brand-black">&#8377;8,207</p>
                    <p className="text-xs font-semibold text-red-500">-8.8% <span className="text-brand-black/30 font-normal text-[10px]">30d</span></p>
                  </div>
                </div>

                {/* Price channels */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { channel: "WhatsApp B2B", price: "7,800", best: true, count: "4 sellers" },
                    { channel: "Marketplace", price: "8,499", best: false, count: "CrepdogCrew" },
                    { channel: "StockX + Ship", price: "9,230", best: false, count: "incl. &#8377;1,100 ship" },
                  ].map((ch) => (
                    <div key={ch.channel} className={`border p-2.5 ${ch.best ? 'border-green-300 bg-green-50/50' : 'border-brand-gray/20'}`}>
                      <p className="text-[8px] text-brand-black/40 uppercase tracking-wider mb-0.5">{ch.channel}</p>
                      <p className="text-xs font-mono font-bold text-brand-black">
                        &#8377;{ch.price}
                        {ch.best && <span className="ml-1.5 text-[8px] font-bold text-green-600 uppercase">Best</span>}
                      </p>
                      <p className="text-[8px] text-brand-black/30 mt-0.5" dangerouslySetInnerHTML={{ __html: ch.count }} />
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div className="border border-brand-gray/20 p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] text-brand-black/40 uppercase tracking-wider">Price History</p>
                    <div className="flex gap-2">
                      {["7d", "30d", "90d"].map((t, i) => (
                        <span key={t} className={`text-[8px] font-semibold px-1.5 py-0.5 cursor-pointer ${i === 1 ? 'bg-brand-black text-white' : 'text-brand-black/40 hover:text-brand-black/70'}`}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <svg viewBox="0 0 300 60" className="w-full h-12 sm:h-16">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polyline points="0,15 20,14 40,12 60,18 80,16 100,20 130,22 160,25 190,24 220,30 250,28 280,38 300,42" fill="url(#chartGrad)" stroke="none" />
                    <polyline points="0,15 20,14 40,12 60,18 80,16 100,20 130,22 160,25 190,24 220,30 250,28 280,38 300,42" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="300" cy="42" r="3" fill="#ef4444" className="pulse-soft" />
                  </svg>
                </div>

                {/* Arbitrage callout */}
                <div className="bg-green-50 border border-green-200/60 p-3 flex items-start gap-2.5">
                  <div className="w-7 h-7 bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-green-800 mb-0.5">Arbitrage Opportunity Detected</p>
                    <p className="text-[10px] text-green-700/80">
                      Buy B2B at &#8377;7,800 &rarr; Sell on marketplace at &#8377;8,499
                    </p>
                    <p className="text-[11px] font-bold text-green-700 mt-1">
                      Est. profit: &#8377;699 <span className="font-normal text-[9px] text-green-600/70">&middot; 8.9% margin &middot; Medium confidence</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-[11px] text-brand-black/30 mt-3">Live product interface &mdash; this is what you get</p>
        </div>
      </section>

      {/* Before / After */}
      <section className="py-16 sm:py-24 bg-white border-y border-brand-gray/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl text-brand-black mb-3">
              BEFORE SENTRIA VS. AFTER
            </h2>
            <p className="text-sm text-brand-black/50 max-w-lg mx-auto">The difference between guessing and knowing.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
            {/* Before */}
            <div className="border border-red-200/60 bg-gradient-to-br from-red-50/40 to-white p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-100/30 blur-2xl" />
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-5 relative">Without Sentria</p>
              <ul className="space-y-3.5 relative">
                {[
                  "Scroll through 10+ WhatsApp groups to find B2B prices",
                  "Manually check CrepdogCrew, Mainstreet, Culture Circle one by one",
                  "Convert StockX USD prices + estimate fees in your head",
                  "No idea if you're buying at a good price or overpaying",
                  "Miss arbitrage because you can't compare fast enough",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm text-brand-black/70 leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* After */}
            <div className="border border-green-200/60 bg-gradient-to-br from-green-50/40 to-white p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-100/30 blur-2xl" />
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-5 relative">With Sentria</p>
              <ul className="space-y-3.5 relative">
                {[
                  "Every price from every channel on one screen, per size",
                  "See which channel has the lowest price instantly",
                  "StockX & GOAT prices auto-converted with platform fees included",
                  "Fair value ranges tell you if it's a good deal or not",
                  "Arbitrage flagged automatically with margin estimates",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-brand-black/70 leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features with inline visuals */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl text-brand-black">
              BUILT FOR HOW YOU ACTUALLY TRADE
            </h2>
          </div>

          <div className="space-y-4 md:space-y-6 max-w-5xl mx-auto">
            {/* Feature 1: Price Channels - with mini visual */}
            <div className="border border-brand-gray/20 bg-white p-5 sm:p-7 hover:border-brand-black/20 transition-colors group">
              <div className="flex flex-col md:flex-row md:items-start gap-5">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-brand-black/5 flex items-center justify-center text-brand-black/60 group-hover:bg-brand-black group-hover:text-white transition-all flex-shrink-0">
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                    </div>
                    <h3 className="text-sm font-semibold text-brand-black">Prices from WhatsApp, Marketplaces & International</h3>
                  </div>
                  <p className="text-sm text-brand-black/55 leading-relaxed ml-12">
                    B2B prices from reseller groups. Consumer prices from CrepdogCrew, Mainstreet, Culture Circle, Hypefly.
                    International prices from StockX and GOAT with platform fees baked in. All per size.
                  </p>
                </div>
                {/* Mini visual: channel price comparison */}
                <div className="md:w-52 flex-shrink-0 space-y-1.5 ml-12 md:ml-0">
                  {[
                    { ch: "B2B", price: "7,800", w: "65%", best: true },
                    { ch: "MKT", price: "8,499", w: "78%", best: false },
                    { ch: "INTL", price: "9,230", w: "92%", best: false },
                  ].map((bar) => (
                    <div key={bar.ch} className="flex items-center gap-2">
                      <span className="text-[9px] font-medium text-brand-black/40 w-7">{bar.ch}</span>
                      <div className="flex-1 bg-brand-gray-light h-4 relative overflow-hidden">
                        <div className={`h-full ${bar.best ? 'bg-green-500/20' : 'bg-brand-black/5'}`} style={{ width: bar.w }} />
                        <span className="absolute inset-0 flex items-center px-1.5 text-[9px] font-mono font-semibold text-brand-black/70">
                          &#8377;{bar.price} {bar.best && <span className="text-green-600 ml-1">Best</span>}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature 2: Arbitrage */}
            <div className="border border-brand-gray/20 bg-white p-5 sm:p-7 hover:border-brand-black/20 transition-colors group">
              <div className="flex flex-col md:flex-row md:items-start gap-5">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-brand-black/5 flex items-center justify-center text-brand-black/60 group-hover:bg-brand-black group-hover:text-white transition-all flex-shrink-0">
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                    <h3 className="text-sm font-semibold text-brand-black">Arbitrage Opportunities, Automatically</h3>
                  </div>
                  <p className="text-sm text-brand-black/55 leading-relaxed ml-12">
                    The platform compares prices across every channel and flags when there&apos;s a margin to be made.
                    Buy price, sell price, estimated profit, and risk level &mdash; without doing any math.
                  </p>
                </div>
                {/* Mini visual: arbitrage example */}
                <div className="md:w-52 flex-shrink-0 ml-12 md:ml-0">
                  <div className="border border-green-200 bg-green-50/50 p-3">
                    <div className="flex items-center justify-between text-[9px] text-brand-black/40 mb-2">
                      <span>Buy B2B</span>
                      <span>&rarr;</span>
                      <span>Sell MKT</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-bold text-brand-black">&#8377;7,800</span>
                      <span className="text-[11px] font-mono font-bold text-brand-black">&#8377;8,499</span>
                    </div>
                    <div className="border-t border-green-200 pt-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-green-700">+&#8377;699 profit</span>
                      <span className="text-[9px] text-green-600">8.9%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3: Portfolio */}
            <div className="border border-brand-gray/20 bg-white p-5 sm:p-7 hover:border-brand-black/20 transition-colors group">
              <div className="flex flex-col md:flex-row md:items-start gap-5">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-brand-black/5 flex items-center justify-center text-brand-black/60 group-hover:bg-brand-black group-hover:text-white transition-all flex-shrink-0">
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <h3 className="text-sm font-semibold text-brand-black">Portfolio & Inventory Tracking</h3>
                  </div>
                  <p className="text-sm text-brand-black/55 leading-relaxed ml-12">
                    Add positions with cost basis. See live P&L as market prices change.
                    Know exactly what your inventory is worth at any moment.
                  </p>
                </div>
                {/* Mini visual: portfolio summary */}
                <div className="md:w-52 flex-shrink-0 ml-12 md:ml-0">
                  <div className="border border-brand-gray/20 p-3">
                    <p className="text-[9px] text-brand-black/40 uppercase tracking-wider mb-2">Portfolio</p>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-[10px] text-brand-black/50">Value</span>
                      <span className="text-sm font-mono font-bold text-brand-black">&#8377;1,24,500</span>
                    </div>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-[10px] text-brand-black/50">Cost</span>
                      <span className="text-[11px] font-mono text-brand-black/60">&#8377;1,08,200</span>
                    </div>
                    <div className="border-t border-brand-gray/20 pt-1.5 flex items-baseline justify-between">
                      <span className="text-[10px] text-brand-black/50">P&L</span>
                      <span className="text-[11px] font-mono font-bold text-green-600">+&#8377;16,300 (+15.1%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 4: Market Health */}
            <div className="border border-brand-gray/20 bg-white p-5 sm:p-7 hover:border-brand-black/20 transition-colors group">
              <div className="flex flex-col md:flex-row md:items-start gap-5">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-brand-black/5 flex items-center justify-center text-brand-black/60 group-hover:bg-brand-black group-hover:text-white transition-all flex-shrink-0">
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <h3 className="text-sm font-semibold text-brand-black">Market Health & Price History</h3>
                  </div>
                  <p className="text-sm text-brand-black/55 leading-relaxed ml-12">
                    30-day and 90-day price trends. Volatility indicators. Market health scores.
                    See if the market is moving up or down before you commit capital.
                  </p>
                </div>
                {/* Mini visual: market indicators */}
                <div className="md:w-52 flex-shrink-0 ml-12 md:ml-0">
                  <div className="border border-brand-gray/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-brand-black/40">Health</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 bg-brand-gray/30 h-1.5"><div className="bg-green-500 h-1.5" style={{ width: '72%' }} /></div>
                        <span className="text-[10px] font-bold text-green-600">72</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-brand-black/40">30d Avg</span>
                      <span className="text-[10px] font-mono font-semibold text-green-600">+2.4%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-brand-black/40">Sentiment</span>
                      <span className="text-[10px] font-medium text-brand-black/60">28 &#8593; / 22 &#8595;</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 5: Drops */}
            <div className="border border-brand-gray/20 bg-white p-5 sm:p-7 hover:border-brand-black/20 transition-colors group">
              <div className="flex flex-col md:flex-row md:items-start gap-5">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-brand-black/5 flex items-center justify-center text-brand-black/60 group-hover:bg-brand-black group-hover:text-white transition-all flex-shrink-0">
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <h3 className="text-sm font-semibold text-brand-black">Drops Calendar & Watchlist</h3>
                  </div>
                  <p className="text-sm text-brand-black/55 leading-relaxed ml-12">
                    Upcoming releases from Nike SNKRS India, Superkicks, and more.
                    Watchlist any asset to track it over time.
                  </p>
                </div>
                {/* Mini visual: upcoming drop */}
                <div className="md:w-52 flex-shrink-0 ml-12 md:ml-0">
                  <div className="border border-brand-gray/20 p-3">
                    <p className="text-[9px] text-brand-black/40 uppercase tracking-wider mb-1.5">Upcoming Drop</p>
                    <p className="text-[11px] font-semibold text-brand-black mb-0.5">Air Max 1 &apos;86 OG</p>
                    <p className="text-[9px] text-brand-black/50 mb-1.5">Mar 15, 10:00 AM &middot; SNKRS India</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-brand-black/40">Retail</span>
                      <span className="text-[10px] font-mono font-semibold text-brand-black">&#8377;12,795</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-16 sm:py-20 bg-white border-y border-brand-gray/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl text-brand-black mb-10">
            BUILT FOR INDIA&apos;S RESALE COMMUNITY
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-3xl mx-auto">
            {[
              {
                who: "Resellers",
                emoji: "&#128176;",
                what: "Find the best buy prices across B2B channels and know your margins before you commit.",
              },
              {
                who: "Investors",
                emoji: "&#128200;",
                what: "Track market trends, build a portfolio, and make data-backed decisions on what to hold or sell.",
              },
              {
                who: "Beginners",
                emoji: "&#127891;",
                what: "Understand the market with guided onboarding, education resources, and an investment calculator.",
              },
            ].map((persona) => (
              <div key={persona.who} className="border border-brand-gray/20 p-5 sm:p-6 text-left hover:border-brand-black/20 hover:shadow-md transition-all">
                <p className="text-2xl mb-2" dangerouslySetInnerHTML={{ __html: persona.emoji }} />
                <p className="text-xs font-semibold text-brand-black uppercase tracking-wider mb-2">{persona.who}</p>
                <p className="text-sm text-brand-black/60 leading-relaxed">{persona.what}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-24 bg-brand-black text-white relative overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #ffffff06 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-3">
            THE MARKET ISN&apos;T WAITING.
          </h2>
          <h3 className="font-heading text-2xl sm:text-3xl md:text-4xl text-white/25 mb-6">
            WHY ARE YOU?
          </h3>
          <p className="text-sm sm:text-base text-white/50 max-w-md mx-auto mb-8 leading-relaxed">
            Free to use. No credit card. See every price from every channel in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleGetStarted}
              className="group px-8 py-3 text-sm font-semibold bg-white text-brand-black hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
            >
              Get Started Free
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
            <button
              onClick={handleExplore}
              className="px-8 py-3 text-sm font-semibold border border-white/30 text-white hover:border-white hover:bg-white/10 transition-all"
            >
              See Live Market Data
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-brand-gray/30 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <img src="/sentria-logo.svg" alt="Sentria" className="h-4 opacity-40" />
          <div className="flex items-center gap-4">
            <Link to="/learn" className="text-xs text-brand-black/40 hover:text-brand-black/70 transition-colors">
              Learn
            </Link>
            <p className="text-xs text-brand-black/40">
              &copy; {new Date().getFullYear()} Sentria. Intelligence for secondary markets.
            </p>
          </div>
        </div>
      </footer>

      {/* Sign In Modal */}
      {showModal && (
        <SignInModal
          onClose={handleCloseSignIn}
          onSignIn={(user) => {
            handleCloseSignIn();
            analytics.track("user_signed_in_landing", {
              method: user.providerData[0]?.providerId || "unknown"
            });
          }}
        />
      )}
    </div>
  );
};

export default LandingPage;
