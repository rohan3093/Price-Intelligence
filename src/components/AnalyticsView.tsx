import React, { useState, useEffect } from "react";
import { analytics } from "../utils/analytics";

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export const AnalyticsView: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<Record<string, any>>({});

  useEffect(() => {
    loadAnalytics();
    // Refresh every 30 seconds
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAnalytics = () => {
    const allEvents = analytics.getAnalytics();
    const allUsers = analytics.getUsers();
    const allSessions = analytics.getSessions();

    setEvents(allEvents);

    // Calculate VC-friendly metrics
    const uniqueUsers = allUsers.length;
    const completedSessions = allSessions.filter((s: any) => s.duration !== null);
    const totalTimeSpent = completedSessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
    const avgSessionDuration = completedSessions.length > 0 
      ? Math.round(totalTimeSpent / completedSessions.length) 
      : 0;

    // User engagement
    const activeUsers = allUsers.filter((u: any) => {
      const lastSeen = new Date(u.lastSeen);
      const daysSinceLastSeen = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLastSeen <= 7; // Active in last 7 days
    }).length;

    // New vs returning users
    const newUsers = allUsers.filter((u: any) => {
      const firstSeen = new Date(u.firstSeen);
      const daysSinceFirstSeen = (Date.now() - firstSeen.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceFirstSeen <= 1; // New in last 24 hours
    }).length;
    const returningUsers = uniqueUsers - newUsers;

    // Engagement rate (users with > 5 events)
    const engagedUsers = allUsers.filter((u: any) => u.totalEvents > 5).length;
    const engagementRate = uniqueUsers > 0 ? Math.round((engagedUsers / uniqueUsers) * 100) : 0;

    // Most active users
    const topUsers = [...allUsers]
      .sort((a: any, b: any) => b.totalEvents - a.totalEvents)
      .slice(0, 10);

    // Event breakdown
    const pageViews = allEvents.filter((e: any) => e.event === "page_view").length;
    const assetViews = allEvents.filter((e: any) => e.event === "asset_view").length;
    const searches = allEvents.filter((e: any) => e.event === "search").length;

    // Average events per user
    const avgEventsPerUser = uniqueUsers > 0 
      ? Math.round(allEvents.length / uniqueUsers) 
      : 0;

    // Average sessions per user
    const avgSessionsPerUser = uniqueUsers > 0 
      ? Math.round(completedSessions.length / uniqueUsers) 
      : 0;

    // Search queries
    const searchQueries = allEvents
      .filter((e: any) => e.event === "search")
      .map((e: any) => e.properties?.query)
      .filter(Boolean);

    setMetrics({
      uniqueUsers,
      totalSessions: completedSessions.length,
      totalTimeSpent,
      avgSessionDuration,
      activeUsers,
      newUsers,
      returningUsers,
      engagementRate,
      engagedUsers,
      topUsers,
      pageViews,
      assetViews,
      searches,
      totalEvents: allEvents.length,
      avgEventsPerUser,
      avgSessionsPerUser,
      searchQueries: [...new Set(searchQueries)].slice(0, 10),
    });
  };

  const handleExport = () => {
    analytics.exportData();
  };

  const handleClear = () => {
    if (confirm("Clear all analytics data? This cannot be undone.")) {
      localStorage.removeItem("analytics_events");
      localStorage.removeItem("analytics_users");
      localStorage.removeItem("analytics_sessions");
      loadAnalytics();
    }
  };

  return (
    <div className="space-y-6">
      {/* VC-Focused Metrics */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-brand-black mb-1">
              User Engagement Metrics
            </h2>
            <p className="text-sm text-brand-black/60">
              Key metrics for investor presentation
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-accent text-terminal-bg text-sm font-medium hover:bg-accent/90 transition-all"
            >
              Export Data
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-down/40 text-down text-sm font-medium hover:border-down/40 transition-all"
            >
              Clear Data
            </button>
          </div>
        </div>

        {/* Primary Metrics - VC Care About */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="border border-brand-gray/20 p-5 bg-brand-white">
            <p className="text-xs text-brand-black/50 font-medium mb-1.5">Unique Users</p>
            <p className="text-2xl font-semibold text-brand-black">{metrics.uniqueUsers || 0}</p>
            <p className="text-xs text-brand-black/40 mt-1.5">
              {metrics.newUsers || 0} new, {metrics.returningUsers || 0} returning
            </p>
          </div>
          <div className="border border-brand-gray/20 p-5 bg-brand-white">
            <p className="text-xs text-brand-black/50 font-medium mb-1.5">Avg Session Duration</p>
            <p className="text-2xl font-semibold text-brand-black">
              {formatDuration(metrics.avgSessionDuration || 0)}
            </p>
            <p className="text-xs text-brand-black/40 mt-1.5">
              {metrics.totalSessions || 0} total sessions
            </p>
          </div>
          <div className="border border-brand-gray/20 p-5 bg-brand-white">
            <p className="text-xs text-brand-black/50 font-medium mb-1.5">Total Time Spent</p>
            <p className="text-2xl font-semibold text-brand-black">
              {formatDuration(metrics.totalTimeSpent || 0)}
            </p>
            <p className="text-xs text-brand-black/40 mt-1.5">
              Across all users
            </p>
          </div>
          <div className="border border-brand-gray/20 p-5 bg-brand-white">
            <p className="text-xs text-brand-black/50 font-medium mb-1.5">Engagement Rate</p>
            <p className="text-2xl font-semibold text-brand-black">{metrics.engagementRate || 0}%</p>
            <p className="text-xs text-brand-black/40 mt-1.5">
              {metrics.engagedUsers || 0} engaged users
            </p>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="border border-brand-gray/20 p-4 bg-brand-white">
            <p className="text-xs text-brand-black/50 font-medium mb-1">Active Users (7d)</p>
            <p className="text-xl font-semibold text-brand-black">{metrics.activeUsers || 0}</p>
          </div>
          <div className="border border-brand-gray/20 p-4 bg-brand-white">
            <p className="text-xs text-brand-black/50 font-medium mb-1">Avg Events/User</p>
            <p className="text-xl font-semibold text-brand-black">{metrics.avgEventsPerUser || 0}</p>
          </div>
          <div className="border border-brand-gray/20 p-4 bg-brand-white">
            <p className="text-xs text-brand-black/50 font-medium mb-1">Avg Sessions/User</p>
            <p className="text-xl font-semibold text-brand-black">{metrics.avgSessionsPerUser || 0}</p>
          </div>
          <div className="border border-brand-gray/20 p-4 bg-brand-white">
            <p className="text-xs text-brand-black/50 font-medium mb-1">Total Events</p>
            <p className="text-xl font-semibold text-brand-black">{metrics.totalEvents || 0}</p>
          </div>
        </div>

        {/* Interaction Breakdown */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="border border-brand-gray/20 p-4 bg-brand-white">
            <p className="text-xs text-brand-black/50 font-medium mb-1">Page Views</p>
            <p className="text-lg font-semibold text-brand-black">{metrics.pageViews || 0}</p>
          </div>
          <div className="border border-brand-gray/20 p-4 bg-brand-white">
            <p className="text-xs text-brand-black/50 font-medium mb-1">Asset Views</p>
            <p className="text-lg font-semibold text-brand-black">{metrics.assetViews || 0}</p>
          </div>
          <div className="border border-brand-gray/20 p-4 bg-brand-white">
            <p className="text-xs text-brand-black/50 font-medium mb-1">Searches</p>
            <p className="text-lg font-semibold text-brand-black">{metrics.searches || 0}</p>
          </div>
        </div>
      </div>

      {/* Most Active Users */}
      {metrics.topUsers && metrics.topUsers.length > 0 && (
        <div className="border border-brand-gray/20 p-5 bg-brand-white">
          <h3 className="text-sm font-semibold text-brand-black mb-4">
            Most Active Users
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-brand-black">
              <thead>
                <tr className="border-b border-brand-gray/15">
                  <th className="text-left py-2.5 font-medium text-brand-black/50 text-xs">User ID</th>
                  <th className="text-left py-2.5 font-medium text-brand-black/50 text-xs">First Seen</th>
                  <th className="text-left py-2.5 font-medium text-brand-black/50 text-xs">Last Seen</th>
                  <th className="text-right py-2.5 font-medium text-brand-black/50 text-xs">Sessions</th>
                  <th className="text-right py-2.5 font-medium text-brand-black/50 text-xs">Time Spent</th>
                  <th className="text-right py-2.5 font-medium text-brand-black/50 text-xs">Events</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topUsers.map((user: any, idx: number) => (
                  <tr key={idx} className="border-b border-brand-gray/10">
                    <td className="py-2.5 font-mono text-xs text-brand-black/60">{user.id.substring(0, 20)}...</td>
                    <td className="py-2.5 text-xs">{formatDate(user.firstSeen)}</td>
                    <td className="py-2.5 text-xs">{formatDate(user.lastSeen)}</td>
                    <td className="py-2.5 text-right text-xs">{user.totalSessions}</td>
                    <td className="py-2.5 text-right text-xs">{formatDuration(user.totalTimeSpent)}</td>
                    <td className="py-2.5 text-right font-semibold text-xs">{user.totalEvents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Search Queries */}
      {metrics.searchQueries && metrics.searchQueries.length > 0 && (
        <div className="border border-brand-gray/20 p-5 bg-brand-white">
          <h3 className="text-sm font-semibold text-brand-black mb-3">
            Top Search Queries
          </h3>
          <div className="flex flex-wrap gap-2">
            {metrics.searchQueries.map((query: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1.5 border border-brand-gray/15 text-xs text-brand-black bg-brand-gray/5"
              >
                {query}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Events (Collapsible) */}
      <div className="border border-brand-gray/20 p-5 bg-brand-white">
        <details>
          <summary className="text-sm font-semibold text-brand-black cursor-pointer mb-2">
            Recent Events ({events.length})
          </summary>
          <div className="max-h-96 overflow-y-auto space-y-2 mt-4">
            {events.length === 0 ? (
              <p className="text-sm text-brand-black/50 text-center py-8">
                No events tracked yet. User interactions will appear here.
              </p>
            ) : (
              events
                .slice()
                .reverse()
                .slice(0, 50)
                .map((event: any, idx: number) => (
                  <div
                    key={idx}
                    className="border border-brand-gray/15 p-3 bg-brand-white/80 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-brand-black">{event.event}</span>
                      <span className="text-brand-black/50">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {event.properties && Object.keys(event.properties).length > 0 && (
                      <pre className="text-[10px] text-brand-black/50 mt-1 overflow-x-auto">
                        {JSON.stringify(event.properties, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
            )}
          </div>
        </details>
      </div>
    </div>
  );
};
