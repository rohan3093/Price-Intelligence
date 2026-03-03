import React from "react";

export const TableRowSkeleton: React.FC = () => {
  return (
    <tr className="border-t border-brand-gray animate-pulse">
      <td className="px-3 py-3.5 align-middle">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-brand-gray-light border border-brand-gray"></div>
          <div className="flex-1">
            <div className="h-3 bg-brand-gray-light mb-2 w-3/4"></div>
            <div className="h-3 bg-brand-gray-light w-1/2"></div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3.5 align-middle">
        <div className="h-3 bg-brand-gray-light w-20"></div>
      </td>
      <td className="px-3 py-3.5 align-middle">
        <div className="h-3 bg-brand-gray-light w-16"></div>
      </td>
      <td className="px-3 py-3.5 align-middle text-right">
        <div className="h-3 bg-brand-gray-light w-12 ml-auto"></div>
      </td>
      <td className="px-3 py-3.5 align-middle text-right">
        <div className="h-3 bg-brand-gray-light w-20 ml-auto"></div>
      </td>
      <td className="px-3 py-3.5 align-middle text-right">
        <div className="h-3 bg-brand-gray-light w-24 ml-auto"></div>
      </td>
      <td className="px-3 py-3.5 align-middle text-right">
        <div className="h-3 bg-brand-gray-light w-28 ml-auto"></div>
      </td>
      <td className="px-3 py-3.5 align-middle text-right">
        <div className="h-3 bg-brand-gray-light w-24 ml-auto"></div>
      </td>
      <td className="px-3 py-3.5 align-middle text-center">
        <div className="h-8 bg-brand-gray-light w-24 mx-auto"></div>
      </td>
    </tr>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="border border-brand-gray p-3.5 bg-brand-white shadow-soft animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-4 flex items-center gap-3">
          <div className="h-14 w-14 bg-brand-gray-light border border-brand-gray"></div>
          <div className="flex-1">
            <div className="h-4 bg-brand-gray-light mb-2 w-3/4"></div>
            <div className="h-3 bg-brand-gray-light w-1/2"></div>
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="h-3 bg-brand-gray-light mb-2 w-16"></div>
          <div className="h-4 bg-brand-gray-light w-20"></div>
        </div>
        <div className="md:col-span-2">
          <div className="h-3 bg-brand-gray-light mb-2 w-16"></div>
          <div className="h-4 bg-brand-gray-light w-24"></div>
        </div>
        <div className="md:col-span-1">
          <div className="h-3 bg-brand-gray-light mb-2 w-8"></div>
          <div className="h-4 bg-brand-gray-light w-12"></div>
        </div>
        <div className="md:col-span-1">
          <div className="h-3 bg-brand-gray-light mb-2 w-16"></div>
          <div className="h-4 bg-brand-gray-light w-12"></div>
        </div>
        <div className="md:col-span-2 flex justify-end">
          <div className="h-8 bg-brand-gray-light w-20"></div>
        </div>
      </div>
    </div>
  );
};

export const PortfolioTableSkeleton: React.FC = () => {
  return (
    <div className="border border-brand-gray bg-brand-white overflow-x-auto shadow-soft">
      <table className="min-w-full">
        <thead className="bg-brand-gray-light border-b border-brand-gray">
          <tr>
            <th className="text-left px-3 py-3 text-xs font-semibold text-brand-gray-dark uppercase tracking-wide">
              Instrument
            </th>
            <th className="text-left px-3 py-3 text-xs font-semibold text-brand-gray-dark uppercase tracking-wide">
              Brand
            </th>
            <th className="text-left px-3 py-3 text-xs font-semibold text-brand-gray-dark uppercase tracking-wide">
              Default Size
            </th>
            <th className="text-right px-3 py-3 text-xs font-semibold text-brand-gray-dark uppercase tracking-wide">
              Qty
            </th>
            <th className="text-right px-3 py-3 text-xs font-semibold text-brand-gray-dark uppercase tracking-wide">
              Buy Price
            </th>
            <th className="text-right px-3 py-3 text-xs font-semibold text-brand-gray-dark uppercase tracking-wide">
              Best Price
            </th>
            <th className="text-right px-3 py-3 text-xs font-semibold text-brand-gray-dark uppercase tracking-wide">
              Position Value
            </th>
            <th className="text-right px-3 py-3 text-xs font-semibold text-brand-gray-dark uppercase tracking-wide">
              P&L
            </th>
            <th className="text-center px-3 py-3 text-xs font-semibold text-brand-gray-dark uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <TableRowSkeleton />
          <TableRowSkeleton />
          <TableRowSkeleton />
        </tbody>
      </table>
    </div>
  );
};

export const WatchlistSkeleton: React.FC = () => {
  return (
    <div className="space-y-2">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
};

