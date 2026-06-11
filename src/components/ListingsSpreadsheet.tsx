import React, { useState, useMemo } from "react";
import { Asset, PricePoint } from "../types";

interface ListingsSpreadsheetProps {
  asset: Asset;
  selectedSize: string | null;
  onUpdateListings: (
    channel: "whatsapp" | "marketplace" | "international",
    size: string,
    listings: PricePoint[]
  ) => void;
  onDeleteListing: (
    channel: "whatsapp" | "marketplace" | "international",
    size: string,
    listingIndex: number
  ) => void;
  onAddListing: (listing: PricePoint) => void;
}

interface ListingRow {
  id: string;
  channel: "whatsapp" | "marketplace" | "international";
  size: string;
  transactionType?: "buy" | "sell" | "both";
  price: number;
  listingCount: number;
  sellerName?: string;
  sellerLocation?: string;
  sellerContact?: string;
  marketplaceName?: string;
  url?: string;
  reshippingCost?: number;
  source?: string;
  lastSeen?: Date | string;
  originalIndex: number; // Index in the original channel array
}

export const ListingsSpreadsheet: React.FC<ListingsSpreadsheetProps> = ({
  asset,
  selectedSize,
  onUpdateListings,
  onDeleteListing,
  onAddListing,
}) => {
  // Flatten all listings into rows for the table
  const tableRows = useMemo(() => {
    if (!selectedSize) return [];

    const sizeVariant = asset.sizes?.find((s) => s.size === selectedSize);
    if (!sizeVariant) return [];

    const rows: ListingRow[] = [];
    const pricePoints = sizeVariant.pricePoints || sizeVariant.legacyPricePoints;
    if (!pricePoints) return [];

    // Get listings from all channels
    const channels: Array<{
      channel: "whatsapp" | "marketplace" | "international";
      listings: PricePoint[];
    }> = [];

    // WhatsApp
    if ("whatsapp" in pricePoints) {
      channels.push({ channel: "whatsapp", listings: pricePoints.whatsapp || [] });
    } else if ("b2b" in pricePoints) {
      channels.push({ channel: "whatsapp", listings: pricePoints.b2b || [] });
    }

    // Marketplace
    if ("marketplace" in pricePoints) {
      channels.push({ channel: "marketplace", listings: pricePoints.marketplace || [] });
    } else if ("endCustomer" in pricePoints) {
      channels.push({ channel: "marketplace", listings: pricePoints.endCustomer || [] });
    }

    // International
    if ("international" in pricePoints) {
      channels.push({ channel: "international", listings: pricePoints.international || [] });
    } else if ("stockxGoat" in pricePoints) {
      channels.push({ channel: "international", listings: pricePoints.stockxGoat || [] });
    }

    // Flatten into rows
    channels.forEach(({ channel, listings }) => {
      listings.forEach((point, index) => {
        rows.push({
          id: `${channel}-${selectedSize}-${index}`,
          channel,
          size: selectedSize,
          transactionType: point.transactionType,
          price: point.price,
          listingCount: point.listingCount,
          sellerName: point.sellerName,
          sellerLocation: point.sellerLocation,
          sellerContact: point.sellerContact,
          marketplaceName: point.marketplaceName,
          url: point.url,
          reshippingCost: point.reshippingCost,
          source: point.source,
          lastSeen: point.lastSeen,
          originalIndex: index,
        });
      });
    });

    // Sort by price (ascending)
    return rows.sort((a, b) => a.price - b.price);
  }, [asset, selectedSize]);

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editedRows, setEditedRows] = useState<Map<string, Partial<ListingRow>>>(new Map());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [channelFilter, setChannelFilter] = useState<Set<string>>(new Set(["whatsapp", "marketplace", "international"]));
  const [newRow, setNewRow] = useState<Partial<ListingRow> | null>(null);
  const [deleteConfirmRowId, setDeleteConfirmRowId] = useState<string | null>(null);

  // Filter rows by channel
  const filteredRows = useMemo(() => {
    return tableRows.filter((row) => channelFilter.has(row.channel));
  }, [tableRows, channelFilter]);

  const handleCellEdit = (rowId: string, field: keyof ListingRow, value: any) => {
    const updated = new Map(editedRows);
    const currentRow = updated.get(rowId) || tableRows.find((r) => r.id === rowId);
    if (currentRow) {
      updated.set(rowId, { ...currentRow, [field]: value });
      setEditedRows(updated);
    }
  };

  const handleSaveRow = (row: ListingRow) => {
    const editedRow = editedRows.get(row.id);
    if (!editedRow) return;

    const originalRow = tableRows.find((r) => r.id === row.id)!;
    const updatedListing: PricePoint = {
      ...originalRow,
      ...editedRow,
      lastSeen: originalRow.lastSeen || new Date(),
    } as PricePoint;

    // Get all listings for this channel and size
    const sizeVariant = asset.sizes?.find((s) => s.size === row.size);
    if (!sizeVariant) return;

    const pricePoints = sizeVariant.pricePoints || sizeVariant.legacyPricePoints;
    if (!pricePoints) return;

    let channelListings: PricePoint[] = [];
    if (row.channel === "whatsapp") {
      channelListings = ("whatsapp" in pricePoints ? pricePoints.whatsapp : pricePoints.b2b) || [];
    } else if (row.channel === "marketplace") {
      channelListings = ("marketplace" in pricePoints ? pricePoints.marketplace : pricePoints.endCustomer) || [];
    } else {
      channelListings = ("international" in pricePoints ? pricePoints.international : pricePoints.stockxGoat) || [];
    }

    // Update the specific listing
    const updatedListings = [...channelListings];
    updatedListings[row.originalIndex] = updatedListing;

    onUpdateListings(row.channel, row.size, updatedListings);

    // Clear edit state
    const updated = new Map(editedRows);
    updated.delete(row.id);
    setEditedRows(updated);
    setEditingRowId(null);
  };

  const handleCancelEdit = (rowId: string) => {
    const updated = new Map(editedRows);
    updated.delete(rowId);
    setEditedRows(updated);
    setEditingRowId(null);
  };

  const handleBulkPriceUpdate = (delta: number) => {
    selectedRows.forEach((rowId) => {
      const row = tableRows.find((r) => r.id === rowId);
      if (!row) return;

      const currentEdit = editedRows.get(rowId) || row;
      const currentPrice = currentEdit.price ?? row.price;
      handleCellEdit(rowId, "price", currentPrice + delta);
    });
  };

  const handleDeleteSelected = () => {
    if (selectedRows.size === 0) return;
    
    const confirm1 = confirm(`Are you sure you want to delete ${selectedRows.size} listing(s)?`);
    if (!confirm1) return;
    
    const confirm2 = confirm(`This action cannot be undone. Delete ${selectedRows.size} listing(s)?`);
    if (!confirm2) return;
    
    selectedRows.forEach((rowId) => {
      const row = tableRows.find((r) => r.id === rowId);
      if (!row) return;
      onDeleteListing(row.channel, row.size, row.originalIndex);
    });
    setSelectedRows(new Set());
  };

  const handleDeleteSingle = (rowId: string) => {
    const row = tableRows.find((r) => r.id === rowId);
    if (!row) return;
    
    if (deleteConfirmRowId === rowId) {
      // Second confirmation - proceed with delete
      onDeleteListing(row.channel, row.size, row.originalIndex);
      setDeleteConfirmRowId(null);
    } else {
      // First confirmation - show warning
      setDeleteConfirmRowId(rowId);
      // Reset after 3 seconds if not confirmed
      setTimeout(() => {
        setDeleteConfirmRowId((current) => current === rowId ? null : current);
      }, 3000);
    }
  };

  const handleStartNewRow = () => {
    if (!selectedSize) {
      alert("Please select a size first");
      return;
    }
    setNewRow({
      id: "new-row",
      channel: "whatsapp",
      size: selectedSize,
      price: 0,
      listingCount: 1,
      transactionType: "buy",
      source: "whatsapp-group",
    });
  };

  const handleSaveNewRow = () => {
    if (!newRow || !selectedSize) return;

    // Validate required fields
    if (!newRow.channel || !newRow.price || newRow.price <= 0 || !newRow.listingCount || newRow.listingCount <= 0) {
      alert("Please fill in required fields: Channel, Price, and Quantity");
      return;
    }

    // Get the correct marketplace/platform label
    let marketplaceLabel = newRow.marketplaceName;
    if (newRow.channel === 'marketplace' && newRow.source) {
      const selected = marketplaceOptions.find(opt => opt.value === newRow.source);
      marketplaceLabel = selected?.label || newRow.marketplaceName;
    } else if (newRow.channel === 'international' && newRow.source) {
      const selected = platformOptions.find(opt => opt.value === newRow.source);
      marketplaceLabel = selected?.label || newRow.marketplaceName;
    }

    const newListing: PricePoint = {
      price: newRow.price,
      listingCount: newRow.listingCount,
      channel: newRow.channel,
      size: selectedSize,
      transactionType: newRow.transactionType,
      sellerName: newRow.sellerName,
      sellerLocation: newRow.sellerLocation,
      sellerContact: newRow.sellerContact,
      marketplaceName: marketplaceLabel,
      url: newRow.url,
      reshippingCost: newRow.reshippingCost,
      source: newRow.source || (newRow.channel === "whatsapp" ? "whatsapp-group" : newRow.channel === "marketplace" ? "marketplace" : "stockx"),
      lastSeen: new Date(),
    };

    onAddListing(newListing);
    setNewRow(null);
  };

  const handleCancelNewRow = () => {
    setNewRow(null);
  };

  const handleNewRowFieldChange = (field: keyof ListingRow, value: any) => {
    setNewRow((prev) => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return "WhatsApp";
      case "marketplace":
        return "Marketplace";
      case "international":
        return "International";
      default:
        return channel;
    }
  };

  const marketplaceOptions = [
    { value: 'crepdogcrew', label: 'CrepdogCrew' },
    { value: 'mainstreet', label: 'Mainstreet Marketplace' },
    { value: 'culturecircle', label: 'Culture Circle' },
    { value: 'hypefly', label: 'Hypefly' },
    { value: 'dawntown', label: 'Dawntown' },
    { value: '10hillsstudio', label: '10 Hills Studio' },
    { value: 'hustleculture', label: 'Hustle Culture' },
    { value: 'findyourkicks', label: 'Find your Kicks' },
    { value: 'instagram', label: 'Instagram Seller' },
    { value: 'facebook', label: 'Facebook Marketplace' },
    { value: 'other', label: 'Other' },
  ];

  const platformOptions = [
    { value: 'stockx', label: 'StockX' },
    { value: 'goat', label: 'Goat' },
    { value: 'ebay', label: 'eBay' },
    { value: 'other', label: 'Other' },
  ];

  const columns = [
    { key: "channel", label: "Channel", width: "min-w-[120px]", editable: false },
    { key: "transactionType", label: "Type", width: "min-w-[80px]", editable: false },
    { key: "price", label: "Price (₹)", width: "min-w-[120px]", editable: true },
    { key: "listingCount", label: "Qty", width: "min-w-[80px]", editable: true },
    { key: "sellerName", label: "Seller", width: "min-w-[140px]", editable: true },
    { key: "sellerLocation", label: "Location", width: "min-w-[120px]", editable: true },
    { key: "sellerContact", label: "Contact", width: "min-w-[140px]", editable: true },
    { key: "marketplaceName", label: "Marketplace", width: "min-w-[160px]", editable: true },
    { key: "url", label: "URL", width: "min-w-[200px]", editable: true },
    { key: "reshippingCost", label: "Reship (₹)", width: "min-w-[120px]", editable: true },
  ];

  if (!selectedSize) {
    return (
      <div className="border border-brand-gray/30 bg-brand-white p-8 text-center">
        <p className="text-sm font-medium text-brand-black/60 mb-1">No Size Selected</p>
        <p className="text-xs text-brand-black/50">Select a size variant to view listings</p>
      </div>
    );
  }

  return (
    <div className="border border-brand-gray/30 bg-brand-white">
      {/* Toolbar */}
      <div className="border-b border-brand-gray/30 p-2 flex items-center justify-between gap-2 bg-brand-gray/5">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-brand-black uppercase tracking-wide">
            {filteredRows.length} listing{filteredRows.length !== 1 ? 's' : ''}
          </span>
          
          {/* Channel Filters */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-brand-black/60 uppercase tracking-wide">Filter:</span>
            {(["whatsapp", "marketplace", "international"] as const).map((channel) => (
              <button
                key={channel}
                onClick={() => {
                  const updated = new Set(channelFilter);
                  if (updated.has(channel)) {
                    updated.delete(channel);
                  } else {
                    updated.add(channel);
                  }
                  setChannelFilter(updated);
                }}
                className={`px-2 py-1 text-[10px] border uppercase tracking-wide transition ${
                  channelFilter.has(channel)
                    ? "border-brand-black bg-brand-black text-brand-white"
                    : "border-brand-gray/30 bg-brand-white text-brand-black hover:border-brand-black"
                }`}
              >
                {getChannelLabel(channel)}
              </button>
            ))}
          </div>

          {selectedRows.size > 0 && (
            <>
              <span className="text-xs text-brand-black/60">•</span>
              <span className="text-xs text-brand-black/60">
                {selectedRows.size} selected
              </span>
              <button
                onClick={() => handleBulkPriceUpdate(100)}
                className="px-2 py-1 text-[10px] border border-brand-gray/30 bg-brand-white text-brand-black hover:bg-brand-gray/10 transition uppercase tracking-wide"
              >
                +₹100
              </button>
              <button
                onClick={() => handleBulkPriceUpdate(-100)}
                className="px-2 py-1 text-[10px] border border-brand-gray/30 bg-brand-white text-brand-black hover:bg-brand-gray/10 transition uppercase tracking-wide"
              >
                -₹100
              </button>
              <button
                onClick={handleDeleteSelected}
                className="px-2 py-1 text-[10px] border border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/20 transition uppercase tracking-wide"
              >
                Delete
              </button>
            </>
          )}
        </div>
        <button
          onClick={() => setSelectedRows(selectedRows.size === filteredRows.length ? new Set() : new Set(filteredRows.map(r => r.id)))}
          className="px-2 py-1 text-[10px] border border-brand-gray/30 bg-brand-white text-brand-black hover:bg-brand-gray/10 transition uppercase tracking-wide"
        >
          {selectedRows.size === filteredRows.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed" style={{ minWidth: '1200px' }}>
          <thead>
            <tr className="border-b border-brand-gray/30 bg-brand-gray/10">
              <th className="p-1.5 text-left w-10">
                <input
                  type="checkbox"
                  checked={selectedRows.size === filteredRows.length && filteredRows.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(new Set(filteredRows.map(r => r.id)));
                    } else {
                      setSelectedRows(new Set());
                    }
                  }}
                  className="cursor-pointer"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`p-1.5 text-left text-[10px] font-semibold text-brand-black uppercase tracking-wide ${col.width}`}
                >
                  {col.label}
                </th>
              ))}
              <th className="p-1.5 text-left text-[10px] font-semibold text-brand-black uppercase tracking-wide min-w-[80px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 && !newRow ? (
              <tr>
                <td colSpan={columns.length + 2} className="p-8 text-center text-sm text-brand-black/60">
                  No listings found. Click "+ Add Row" to add a new listing.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const editedRow = editedRows.get(row.id) || row;
                const isEditing = editingRowId === row.id;
                const isSelected = selectedRows.has(row.id);

                return (
                  <tr
                    key={row.id}
                    className={`group border-b border-brand-gray/20 hover:bg-brand-gray/5 ${
                      isSelected ? "bg-brand-black/5" : ""
                    }`}
                  >
                    <td className="p-1.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const updated = new Set(selectedRows);
                          if (e.target.checked) {
                            updated.add(row.id);
                          } else {
                            updated.delete(row.id);
                          }
                          setSelectedRows(updated);
                        }}
                        className="cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    {columns.map((col, colIndex) => {
                      const rawValue = editedRow[col.key as keyof ListingRow];
                      const value = rawValue instanceof Date ? rawValue.toISOString() : rawValue;
                      const isEditable = col.editable && (col.key === 'price' || col.key === 'listingCount' || 
                        col.key === 'sellerName' || col.key === 'sellerLocation' || col.key === 'sellerContact' ||
                        col.key === 'marketplaceName' || col.key === 'url' || col.key === 'reshippingCost');

                      return (
                        <td
                          key={col.key}
                          className={`p-1.5 ${col.width}`}
                        >
                          {isEditing && isEditable ? (
                            <input
                              type={col.key === 'price' || col.key === 'listingCount' || col.key === 'reshippingCost' ? 'number' : 'text'}
                              value={value || ''}
                              onChange={(e) => {
                                const newValue = col.key === 'price' || col.key === 'listingCount' || col.key === 'reshippingCost'
                                  ? parseFloat(e.target.value) || 0
                                  : e.target.value;
                                handleCellEdit(row.id, col.key as keyof ListingRow, newValue);
                              }}
                              onBlur={() => {
                                handleSaveRow(row);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveRow(row);
                                  // Move to next row, same column
                                  const nextRowIndex = filteredRows.findIndex(r => r.id === row.id) + 1;
                                  if (nextRowIndex < filteredRows.length) {
                                    const nextRow = filteredRows[nextRowIndex];
                                    setEditingRowId(nextRow.id);
                                  }
                                } else if (e.key === 'Tab') {
                                  e.preventDefault();
                                  handleSaveRow(row);
                                  // Move to next column or next row
                                  if (colIndex < columns.length - 1) {
                                    // Stay in same row, move to next column
                                    // The blur will save, then we'll need to re-enter edit mode
                                    setTimeout(() => {
                                      setEditingRowId(row.id);
                                    }, 0);
                                  } else {
                                    // Move to next row, first column
                                    const nextRowIndex = filteredRows.findIndex(r => r.id === row.id) + 1;
                                    if (nextRowIndex < filteredRows.length) {
                                      const nextRow = filteredRows[nextRowIndex];
                                      setEditingRowId(nextRow.id);
                                    }
                                  }
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit(row.id);
                                }
                              }}
                              className="w-full border-0 border-b-2 border-brand-black px-1 py-0.5 text-xs focus:outline-none bg-transparent"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="text-xs text-brand-black block min-h-[20px] py-0.5">
                              {col.key === 'channel' 
                                ? getChannelLabel(value as string)
                                : col.key === 'transactionType'
                                ? (value === 'buy' ? 'Buy' : value === 'sell' ? 'Sell' : '—')
                                : col.key === 'price' || col.key === 'reshippingCost'
                                ? value ? `₹${Number(value).toLocaleString('en-IN')}` : '—'
                                : col.key === 'url' && value
                                ? <a href={value as string} target="_blank" rel="noopener noreferrer" className="text-brand-black/60 hover:text-brand-black underline" onClick={(e) => e.stopPropagation()}>View</a>
                                : value || '—'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-1.5">
                      <div className="flex gap-1">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveRow(row);
                              }}
                              className="px-1.5 py-0.5 text-[10px] border border-brand-black bg-brand-black text-brand-white hover:bg-brand-black/90 transition uppercase"
                              title="Save"
                            >
                              ✓
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEdit(row.id);
                              }}
                              className="px-1.5 py-0.5 text-[10px] border border-brand-gray/30 text-brand-black hover:bg-brand-gray/10 transition uppercase"
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingRowId(row.id);
                              }}
                              className="px-1.5 py-0.5 text-[10px] border border-brand-gray/30 text-brand-black hover:bg-brand-gray/10 transition uppercase"
                              title="Edit"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSingle(row.id);
                              }}
                              className={`px-1.5 py-0.5 text-[10px] border transition uppercase ${
                                deleteConfirmRowId === row.id
                                  ? "border-red-600 bg-red-600 text-white"
                                  : "border-red-500/30 text-red-600 hover:bg-red-500/10"
                              }`}
                              title={deleteConfirmRowId === row.id ? "Click again to confirm delete" : "Delete"}
                            >
                              {deleteConfirmRowId === row.id ? "Confirm" : "Del"}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            
            {/* Add Row Button (Plus Icon) - Notion Style */}
            {!newRow && (
              <tr 
                className="border-b border-brand-gray/20 hover:bg-brand-gray/5 cursor-pointer group"
                onClick={handleStartNewRow}
              >
                <td className="p-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-brand-black/60 group-hover:text-brand-black text-base font-normal leading-none">+</span>
                    <span className="text-[10px] text-brand-black/60 group-hover:text-brand-black uppercase tracking-wide">Add Row</span>
                  </div>
                </td>
                {columns.map((col) => (
                  <td key={col.key} className="p-1.5">
                    <div className="flex items-center h-5">
                      <span className="text-brand-black/20 text-[10px]">—</span>
                    </div>
                  </td>
                ))}
                <td className="p-1.5"></td>
              </tr>
            )}
            
            {/* New Row */}
            {newRow && (
              <tr className="border-b-2 border-brand-black bg-brand-black/5">
                <td className="p-1.5"></td>
                {columns.map((col, colIndex) => {
                  const rawNewValue = newRow[col.key as keyof ListingRow];
                  const value = rawNewValue instanceof Date ? rawNewValue.toISOString() : rawNewValue;
                  const isEditable = col.editable || col.key === 'channel' || col.key === 'transactionType';

                  return (
                    <td key={col.key} className={`p-1.5 ${col.width}`}>
                      {col.key === 'channel' ? (
                        <select
                          value={newRow.channel || 'whatsapp'}
                          onChange={(e) => {
                            const newChannel = e.target.value as "whatsapp" | "marketplace" | "international";
                            handleNewRowFieldChange('channel', newChannel);
                            // Reset source based on channel
                            if (newChannel === 'marketplace') {
                              handleNewRowFieldChange('source', 'crepdogcrew');
                            } else if (newChannel === 'international') {
                              handleNewRowFieldChange('source', 'stockx');
                            } else {
                              handleNewRowFieldChange('source', 'whatsapp-group');
                            }
                            // Clear marketplaceName when channel changes
                            handleNewRowFieldChange('marketplaceName', undefined);
                          }}
                          className="w-full border-0 border-b-2 border-brand-black px-1 py-0.5 text-xs focus:outline-none bg-transparent"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="whatsapp">WhatsApp</option>
                          <option value="marketplace">Marketplace</option>
                          <option value="international">International</option>
                        </select>
                      ) : col.key === 'transactionType' ? (
                        newRow.channel === 'whatsapp' ? (
                          <select
                            value={newRow.transactionType || 'buy'}
                            onChange={(e) => handleNewRowFieldChange('transactionType', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Tab') {
                                e.preventDefault();
                                // Focus next field
                                const nextCol = columns[colIndex + 1];
                                if (nextCol) {
                                  // Will be handled by tab navigation
                                }
                              }
                            }}
                            className="w-full border-0 border-b-2 border-brand-black px-1 py-0.5 text-xs focus:outline-none bg-transparent"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="buy">Buy</option>
                            <option value="sell">Sell</option>
                          </select>
                        ) : (
                          <span className="text-xs text-brand-black/40 block min-h-[20px] py-0.5">—</span>
                        )
                      ) : col.key === 'marketplaceName' ? (
                        (newRow.channel === 'marketplace' || newRow.channel === 'international') ? (
                          <select
                            value={newRow.source || (newRow.channel === 'marketplace' ? 'crepdogcrew' : 'stockx')}
                            onChange={(e) => {
                              const selected = newRow.channel === 'marketplace' 
                                ? marketplaceOptions.find(opt => opt.value === e.target.value)
                                : platformOptions.find(opt => opt.value === e.target.value);
                              handleNewRowFieldChange('marketplaceName', selected?.label || e.target.value);
                              // Also update source
                              handleNewRowFieldChange('source', e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Tab') {
                                e.preventDefault();
                                // Focus next field
                              }
                            }}
                            className="w-full border-0 border-b-2 border-brand-black px-1 py-0.5 text-xs focus:outline-none bg-transparent"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {(newRow.channel === 'marketplace' ? marketplaceOptions : platformOptions).map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-brand-black/40 block min-h-[20px] py-0.5">—</span>
                        )
                      ) : isEditable ? (
                        <input
                          type={col.key === 'price' || col.key === 'listingCount' || col.key === 'reshippingCost' ? 'number' : 'text'}
                          value={value || ''}
                          onChange={(e) => {
                            const newValue = col.key === 'price' || col.key === 'listingCount' || col.key === 'reshippingCost'
                              ? parseFloat(e.target.value) || 0
                              : e.target.value;
                            handleNewRowFieldChange(col.key as keyof ListingRow, newValue);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveNewRow();
                            } else if (e.key === 'Tab') {
                              // Let tab work naturally to move to next field
                              if (colIndex === columns.length - 1) {
                                // Last column, save and stay
                                e.preventDefault();
                                handleSaveNewRow();
                              }
                            } else if (e.key === 'Escape') {
                              handleCancelNewRow();
                            }
                          }}
                          className="w-full border-0 border-b-2 border-brand-black px-1 py-0.5 text-xs focus:outline-none bg-transparent"
                          placeholder={col.key === 'price' ? '0' : col.key === 'listingCount' ? '1' : ''}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus={colIndex === 0}
                        />
                      ) : (
                        <span className="text-xs text-brand-black/40">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="p-1.5">
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveNewRow();
                      }}
                      className="px-1.5 py-0.5 text-[10px] border border-brand-black bg-brand-black text-brand-white hover:bg-brand-black/90 transition uppercase"
                      title="Save (Enter)"
                    >
                      ✓
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelNewRow();
                      }}
                      className="px-1.5 py-0.5 text-[10px] border border-brand-gray/30 text-brand-black hover:bg-brand-gray/10 transition uppercase"
                      title="Cancel (Esc)"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

