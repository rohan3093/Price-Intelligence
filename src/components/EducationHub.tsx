import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Guide } from "../types";
import { guides, guideCategories } from "../data/guides";

export const EducationHub: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);

  const filteredGuides =
    selectedCategory === "all"
      ? guides
      : guides.filter((g) => g.category === selectedCategory);

  if (selectedGuide) {
    return (
      <main className="flex-1 min-h-0 bg-brand-background px-2 py-2 md:px-3 md:py-3 pb-20 md:pb-4 w-full max-w-8xl mx-auto overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setSelectedGuide(null)}
            className="px-3 py-2 text-xs font-medium text-brand-black border border-brand-gray/30 bg-white hover:border-brand-black flex items-center gap-1.5 transition leading-tight"
            style={{ borderRadius: "6px" }}
          >
            ← Back to Guides
          </button>
        </div>
        <article
          className="border border-brand-gray/20 p-4 md:p-6 bg-white shadow-sm"
          style={{ borderRadius: "12px" }}
        >
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-brand-gray/20">
            <span
              className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wide leading-tight ${
                selectedGuide.difficulty === "beginner"
                  ? "bg-green-500/10 text-green-700 border border-green-500/30"
                  : selectedGuide.difficulty === "intermediate"
                    ? "bg-yellow-500/10 text-yellow-700 border border-yellow-500/30"
                    : "bg-brand-gray/10 text-brand-black border border-brand-gray/30"
              }`}
              style={{ borderRadius: "4px" }}
            >
              {selectedGuide.difficulty}
            </span>
            <span className="text-[10px] text-brand-black/60 uppercase tracking-wide leading-tight">
              {selectedGuide.estimatedTime}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-heading font-normal text-brand-black mb-2 leading-tight">
            {selectedGuide.title}
          </h1>
          <p className="text-xs text-brand-black/70 mb-4 leading-tight">
            {selectedGuide.description}
          </p>
          <div className="prose prose-sm max-w-none text-xs font-body text-brand-black leading-snug">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => (
                  <h2 className="text-base font-semibold text-brand-black mt-4 mb-2 uppercase tracking-wide leading-tight">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold text-brand-black mt-3 mb-1.5 leading-tight">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-xs text-brand-black leading-snug mb-2.5">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-2.5 space-y-1 text-xs text-brand-black ml-3">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-2.5 space-y-1 text-xs text-brand-black ml-3">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-xs text-brand-black leading-snug">
                    {children}
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-brand-black">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-brand-black">{children}</em>
                ),
                code: ({ children }) => (
                  <code className="bg-brand-gray/10 px-1 py-0.5 text-[10px] font-mono text-brand-black leading-tight">
                    {children}
                  </code>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-brand-black pl-3 py-1.5 my-2.5 bg-brand-gray/5 text-xs text-brand-black leading-snug [&>p]:mb-0">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="my-3 overflow-x-auto border border-brand-gray/20 rounded-lg bg-white">
                    <table className="w-full text-[11px] leading-snug">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-brand-black/[0.03] border-b border-brand-gray/20">{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="px-2.5 py-2 text-left text-[9px] font-bold text-brand-black/60 uppercase tracking-wider">{children}</th>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-brand-gray/10">{children}</tbody>
                ),
                tr: ({ children }) => <tr>{children}</tr>,
                td: ({ children }) => (
                  <td className="px-2.5 py-2 text-[11px] text-brand-black/80">{children}</td>
                ),
              }}
            >
              {selectedGuide.content}
            </ReactMarkdown>
          </div>
        </article>
      </main>
    );
  }

  return (
    <main className="flex-1 min-h-0 bg-brand-background px-2 py-2 md:px-3 md:py-3 pb-20 md:pb-4 w-full max-w-8xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-heading font-normal text-brand-black mb-2">
              Education Hub
            </h1>
            <p className="text-sm text-brand-black/60">
              Learn everything you need to know about sneaker investing in India
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-brand-black/50 uppercase tracking-wider mb-1">
              Total Guides
            </p>
            <p className="text-2xl font-mono-numeric font-bold text-brand-black">
              {guides.length}
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-4">
        <label className="block text-xs text-brand-black/60 uppercase tracking-wide mb-2 font-semibold leading-tight">
          Categories
        </label>
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
              style={{ borderRadius: "20px" }}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Guides Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredGuides.map((guide) => (
          <button
            key={guide.id}
            onClick={() => setSelectedGuide(guide)}
            className="border border-brand-gray/20 p-4 bg-white hover:border-brand-black hover:shadow-md shadow-sm text-left transition-all"
            style={{ borderRadius: "8px" }}
          >
            <div className="flex items-start justify-between mb-2">
              <span
                className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wide leading-tight ${
                  guide.difficulty === "beginner"
                    ? "bg-green-500/10 text-green-700 border border-green-500/30"
                    : guide.difficulty === "intermediate"
                      ? "bg-yellow-500/10 text-yellow-700 border border-yellow-500/30"
                      : "bg-brand-gray/10 text-brand-black border border-brand-gray/30"
                }`}
                style={{ borderRadius: "4px" }}
              >
                {guide.difficulty}
              </span>
              <span className="text-[10px] text-brand-black/60 uppercase tracking-wide leading-tight">
                {guide.estimatedTime}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-brand-black mb-1 leading-tight">
              {guide.title}
            </h3>
            <p className="text-xs text-brand-black/70 leading-snug">
              {guide.description}
            </p>
          </button>
        ))}
      </div>
    </main>
  );
};
