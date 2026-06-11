import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { guides, guideCategories } from "../data/guides";

const LearnIndex: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredGuides =
    selectedCategory === "all"
      ? guides
      : guides.filter((g) => g.category === selectedCategory);

  return (
    <div className="min-h-screen bg-brand-background text-brand-black">
      <Helmet>
        <title>Learn Sneaker Investing in India — Free Guides | Sentria</title>
        <meta
          name="description"
          content="Free guides on sneaker investing in India. Learn how to buy, sell, spot arbitrage, manage risk, and build a profitable sneaker portfolio using B2B WhatsApp groups, marketplaces, and StockX."
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="Learn Sneaker Investing in India — Free Guides | Sentria"
        />
        <meta
          property="og:description"
          content="Free guides on sneaker investing in India. Learn how to buy, sell, manage risk, and build a profitable portfolio."
        />
        <meta property="og:site_name" content="Sentria" />
        <link rel="canonical" href="https://sentria.co/learn" />
      </Helmet>

      {/* Navigation */}
      <nav className="border-b border-brand-gray/30 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/">
            <img src="/sentria-logo.svg" alt="Sentria" className="h-5 sm:h-6" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/learn"
              className="px-4 py-1.5 text-xs font-semibold text-brand-black/70 border-b-2 border-brand-black"
            >
              Learn
            </Link>
            <Link
              to="/app"
              className="px-4 py-1.5 text-xs font-semibold bg-brand-black text-white hover:bg-brand-black/90 transition-colors"
            >
              Open App
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <h1 className="font-heading text-4xl sm:text-5xl text-brand-black leading-[0.95] mb-3">
          LEARN SNEAKER INVESTING
        </h1>
        <p className="text-sm sm:text-base text-brand-black/60 max-w-2xl leading-relaxed">
          Everything you need to know about buying, selling, and profiting from
          sneakers in India&apos;s resale market. From your first pair to a
          diversified portfolio.
        </p>
      </header>

      {/* Category Filter */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex flex-wrap gap-2">
          {guideCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? "bg-brand-black text-white"
                  : "border border-brand-gray/30 bg-white text-brand-black hover:border-brand-black"
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Guides Grid */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGuides.map((guide) => (
            <Link
              key={guide.id}
              to={`/learn/${guide.slug}`}
              className="group border border-brand-gray/20 p-5 bg-white hover:border-brand-black text-left transition-all block"
            >
              <div className="flex items-start justify-between mb-3">
                <span
                  className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wide leading-tight ${
                    guide.difficulty === "beginner"
                      ? "bg-green-500/10 text-green-700 border border-green-500/30"
                      : guide.difficulty === "intermediate"
                        ? "bg-yellow-500/10 text-yellow-700 border border-yellow-500/30"
                        : "bg-brand-gray/10 text-brand-black border border-brand-gray/30"
                  }`}
                >
                  {guide.difficulty}
                </span>
                <span className="text-[10px] text-brand-black/60 uppercase tracking-wide leading-tight">
                  {guide.estimatedTime}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-brand-black mb-1.5 leading-tight group-hover:text-brand-black/80 transition-colors">
                {guide.title}
              </h2>
              <p className="text-xs text-brand-black/60 leading-snug">
                {guide.description}
              </p>
              <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-brand-black/40 uppercase tracking-wider group-hover:text-brand-black/70 transition-colors">
                Read guide
                <svg
                  className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-brand-gray/30 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link to="/">
            <img
              src="/sentria-logo.svg"
              alt="Sentria"
              className="h-4 opacity-40"
            />
          </Link>
          <p className="text-xs text-brand-black/40">
            &copy; {new Date().getFullYear()} Sentria. Intelligence for
            secondary markets.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LearnIndex;
