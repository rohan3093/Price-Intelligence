import React from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getGuideBySlug, guides } from "../data/guides";
import { getArticleVisuals } from "../components/learn/ArticleVisuals";

const LearnArticle: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const guide = slug ? getGuideBySlug(slug) : undefined;

  if (!guide) {
    return <Navigate to="/learn" replace />;
  }

  const currentIndex = guides.findIndex((g) => g.slug === guide.slug);
  const prevGuide = currentIndex > 0 ? guides[currentIndex - 1] : null;
  const nextGuide =
    currentIndex < guides.length - 1 ? guides[currentIndex + 1] : null;

  const { hero, inserts } = getArticleVisuals(guide.slug);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.seoDescription,
    author: { "@type": "Organization", name: "Sentria" },
    publisher: { "@type": "Organization", name: "Sentria" },
    mainEntityOfPage: `https://sentria.co/learn/${guide.slug}`,
  };

  // Split content into sections by ## headings for visual insertion
  const sections = splitBySections(guide.content);

  return (
    <div className="min-h-screen bg-brand-background text-brand-black">
      <Helmet>
        <title>{guide.seoTitle}</title>
        <meta name="description" content={guide.seoDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={guide.seoTitle} />
        <meta property="og:description" content={guide.seoDescription} />
        <meta property="og:site_name" content="Sentria" />
        <link rel="canonical" href={`https://sentria.co/learn/${guide.slug}`} />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      {/* Navigation */}
      <nav className="border-b border-brand-gray/30 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/">
            <img src="/sentria-logo.svg" alt="Sentria" className="h-5 sm:h-6" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/learn"
              className="px-4 py-1.5 text-xs font-semibold text-brand-black/70 hover:text-brand-black transition-colors"
            >
              All Guides
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

      {/* Breadcrumb */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <nav className="flex items-center gap-1.5 text-[11px] text-brand-black/40">
          <Link to="/learn" className="hover:text-brand-black transition-colors">
            Learn
          </Link>
          <span>/</span>
          <span className="text-brand-black/60">
            {guide.category.charAt(0).toUpperCase() + guide.category.slice(1)}
          </span>
        </nav>
      </div>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center gap-2 mb-4">
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
            <span className="text-[10px] text-brand-black/50 uppercase tracking-wide">
              {guide.estimatedTime}
            </span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl text-brand-black leading-[0.95] mb-3">
            {guide.title.toUpperCase()}
          </h1>
          <p className="text-sm sm:text-base text-brand-black/60 leading-relaxed max-w-xl">
            {guide.description}
          </p>
        </header>

        {/* Hero visual */}
        {hero}

        {/* Content with interspersed visuals */}
        <div className="article-content">
          {sections.map((section, idx) => {
            const visual = inserts.find(
              (v) => section.heading && section.heading === v.after
            );
            return (
              <React.Fragment key={idx}>
                <MarkdownSection content={section.content} />
                {visual && visual.component}
              </React.Fragment>
            );
          })}
        </div>

        {/* CTA */}
        <div
          className="mt-12 p-6 bg-brand-black text-white"
        >
          <h3 className="text-sm font-semibold mb-1.5">
            Ready to put this into practice?
          </h3>
          <p className="text-xs text-white/60 mb-4">
            Sentria aggregates prices from WhatsApp groups, Indian marketplaces,
            and StockX/GOAT — so you can see the real market price and find
            opportunities.
          </p>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-white text-brand-black hover:bg-white/90 transition-colors"
          >
            Open Sentria
            <svg
              className="w-3.5 h-3.5"
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
          </Link>
        </div>

        {/* Prev / Next */}
        <nav className="mt-8 grid grid-cols-2 gap-4">
          {prevGuide ? (
            <Link
              to={`/learn/${prevGuide.slug}`}
              className="group p-4 border border-brand-gray/20 bg-white hover:border-brand-black transition-colors text-left"
            >
              <span className="text-[10px] text-brand-black/40 uppercase tracking-wider">
                Previous
              </span>
              <p className="text-xs font-semibold text-brand-black mt-1 leading-tight group-hover:text-brand-black/80 transition-colors">
                {prevGuide.title}
              </p>
            </Link>
          ) : (
            <div />
          )}
          {nextGuide ? (
            <Link
              to={`/learn/${nextGuide.slug}`}
              className="group p-4 border border-brand-gray/20 bg-white hover:border-brand-black transition-colors text-right"
            >
              <span className="text-[10px] text-brand-black/40 uppercase tracking-wider">
                Next
              </span>
              <p className="text-xs font-semibold text-brand-black mt-1 leading-tight group-hover:text-brand-black/80 transition-colors">
                {nextGuide.title}
              </p>
            </Link>
          ) : (
            <div />
          )}
        </nav>
      </article>

      {/* Footer */}
      <footer className="border-t border-brand-gray/30 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link to="/">
            <img src="/sentria-logo.svg" alt="Sentria" className="h-4 opacity-40" />
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

/* ─── Markdown renderer with table + callout support ─── */

const MarkdownSection: React.FC<{ content: string }> = ({ content }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      h2: ({ children }) => (
        <h2 className="text-xl font-heading text-brand-black mt-12 mb-4 uppercase tracking-wide leading-tight">
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-base font-semibold text-brand-black mt-8 mb-2.5 leading-tight">
          {children}
        </h3>
      ),
      p: ({ children }) => (
        <p className="text-[14px] text-brand-black/80 leading-[1.75] mb-4">
          {children}
        </p>
      ),
      ul: ({ children }) => (
        <ul className="list-disc list-outside mb-4 space-y-2 text-[14px] text-brand-black/80 ml-5 leading-[1.65]">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="list-decimal list-outside mb-4 space-y-2 text-[14px] text-brand-black/80 ml-5 leading-[1.65]">
          {children}
        </ol>
      ),
      li: ({ children }) => (
        <li className="text-[14px] text-brand-black/80 leading-[1.65]">
          {children}
        </li>
      ),
      strong: ({ children }) => (
        <strong className="font-semibold text-brand-black">{children}</strong>
      ),
      blockquote: ({ children }) => (
        <div className="my-5 pl-4 py-3 pr-4 border-l-4 border-brand-black bg-brand-black/[0.02] rounded-r-lg">
          <div className="text-[13px] text-brand-black/80 leading-relaxed [&>p]:mb-0">
            {children}
          </div>
        </div>
      ),
      table: ({ children }) => (
        <div className="my-6 overflow-x-auto border border-brand-gray/20 rounded-lg bg-white">
          <table className="w-full text-[12px] leading-relaxed">{children}</table>
        </div>
      ),
      thead: ({ children }) => (
        <thead className="bg-brand-black/[0.03] border-b border-brand-gray/20">
          {children}
        </thead>
      ),
      th: ({ children }) => (
        <th className="px-3 py-2.5 text-left text-[10px] font-bold text-brand-black/60 uppercase tracking-wider">
          {children}
        </th>
      ),
      tbody: ({ children }) => (
        <tbody className="divide-y divide-brand-gray/10">{children}</tbody>
      ),
      tr: ({ children }) => <tr className="hover:bg-brand-black/[0.01]">{children}</tr>,
      td: ({ children }) => (
        <td className="px-3 py-2.5 text-[12px] text-brand-black/80">{children}</td>
      ),
      hr: () => (
        <hr className="my-8 border-brand-gray/20" />
      ),
    }}
  >
    {content}
  </ReactMarkdown>
);

/* ─── Content section splitter ─── */

type Section = { heading: string | null; content: string };

function splitBySections(md: string): Section[] {
  const lines = md.split("\n");
  const sections: Section[] = [];
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  for (const line of lines) {
    const match = line.match(/^## (.+)$/);
    if (match) {
      if (buffer.length > 0) {
        sections.push({ heading: currentHeading, content: buffer.join("\n") });
        buffer = [];
      }
      currentHeading = match[1];
      buffer.push(line);
    } else {
      buffer.push(line);
    }
  }
  if (buffer.length > 0) {
    sections.push({ heading: currentHeading, content: buffer.join("\n") });
  }

  return sections;
}

export default LearnArticle;
