/**
 * Google Apps Script REST API for Assets
 * 
 * This script provides a lightweight backend for the Intelligence Exchange app.
 * It stores asset data in a Google Sheet and exposes REST endpoints.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet (name it "Intelligence Exchange Assets")
 * 2. Open Extensions > Apps Script
 * 3. Paste this entire code into the script editor
 * 4. Deploy as a web app:
 *    - Click "Deploy" > "New deployment"
 *    - Choose type: "Web app"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (or "Anyone with Google account" for more security)
 *    - Click "Deploy"
 * 5. Copy the Web App URL and set it as VITE_ASSETS_API_BASE_URL in your .env file
 * AKfycbzXUh8cxQb8EGg1TDSQVO5etlca5Ibv1ZJizSuhrGG-PrerBNLPnFtDuUJZQ8kRF2aI
 * https://script.google.com/macros/s/AKfycbzXUh8cxQb8EGg1TDSQVO5etlca5Ibv1ZJizSuhrGG-PrerBNLPnFtDuUJZQ8kRF2aI/exec
 * SHEET STRUCTURE:
 * The script will automatically create a sheet with these columns:
 * - id, name, sku, brand, category, image, sizes (JSON), priceAnchors (JSON), 
 *   listingsSnapshot (JSON), volatility, defaultSize, lastUpdated
 */

// Configuration
const SHEET_ID = '1s0gCYoiFBCwD3bXD9sFjf2-xgOasB5PrPIATZxpuyek'; // Your Google Sheet ID
const SHEET_NAME = 'Assets'; // Name of the sheet tab
const HEADER_ROW = 1;

/**
 * Main doGet handler for GET requests
 */
function doGet(e) {
  return handleRequest(e, 'GET');
}

/**
 * Main doPost handler for POST requests
 */
function doPost(e) {
  return handleRequest(e, 'POST');
}

/**
 * Main doPut handler for PUT requests (via POST with _method=PUT)
 */
function doPut(e) {
  return handleRequest(e, 'PUT');
}

/**
 * Main doDelete handler for DELETE requests (via POST with _method=DELETE)
 */
function doDelete(e) {
  return handleRequest(e, 'DELETE');
}

/**
 * Handle OPTIONS requests (CORS preflight)
 */
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '3600'
    });
}

/**
 * Handle all HTTP requests
 */
function handleRequest(e, method) {
  try {
    // Enable CORS
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    
    // Get the sheet
    const sheet = getOrCreateSheet();
    
    // Parse the request
    // Google Apps Script automatically parses form-urlencoded data into e.parameter
    let params = {};
    if (e.parameter) {
      params = e.parameter;
      // Parse JSON string values (for nested objects/arrays)
      for (const key in params) {
        if (params[key] && typeof params[key] === 'string') {
          try {
            params[key] = JSON.parse(params[key]);
          } catch (e) {
            // Not JSON, keep as string
          }
        }
      }
    } else if (e.postData && e.postData.contents) {
      try {
        // Try to parse as JSON first (for backward compatibility)
        const data = JSON.parse(e.postData.contents);
        params = { ...params, ...data };
      } catch (err) {
        // If not JSON, e.parameter should have the form data
        params = e.parameter || {};
      }
    }
    
    // Handle different HTTP methods
    let result;
    if (method === 'GET') {
      if (params.id) {
        result = getAsset(sheet, parseInt(params.id));
      } else {
        result = getAllAssets(sheet);
      }
    } else if (method === 'POST') {
      // Check if it's actually a PUT or DELETE
      if (params._method === 'PUT') {
        result = updateAsset(sheet, params);
      } else if (params._method === 'DELETE') {
        result = deleteAsset(sheet, parseInt(params.id));
      } else {
        result = createAsset(sheet, params);
      }
    } else if (method === 'PUT') {
      result = updateAsset(sheet, params);
    } else if (method === 'DELETE') {
      result = deleteAsset(sheet, parseInt(params.id));
    }
    
    // Set CORS headers
    output.append(JSON.stringify({
      success: true,
      data: result
    }));
    
    // Add CORS headers to the response
    output.setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    
    return output;
  } catch (error) {
    const errorOutput = ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
    
    // Add CORS headers to error response too
    errorOutput.setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    
    return errorOutput;
  }
}

/**
 * Get or create the Assets sheet
 */
function getOrCreateSheet() {
  // Open the spreadsheet by ID (works even if script is standalone)
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Set headers
    const headers = [
      'id', 'name', 'sku', 'brand', 'category', 'image', 
      'sizes', 'priceAnchors', 'listingsSnapshot', 
      'volatility', 'defaultSize', 'lastUpdated'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  
  return sheet;
}

/**
 * Get all assets
 */
function getAllAssets(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= HEADER_ROW) {
    return [];
  }
  
  const assets = [];
  for (let i = HEADER_ROW; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // If id exists
      assets.push(parseRowToAsset(row));
    }
  }
  
  return assets;
}

/**
 * Get a single asset by ID
 */
function getAsset(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = HEADER_ROW; i < data.length; i++) {
    const row = data[i];
    if (row[0] == id) {
      return parseRowToAsset(row);
    }
  }
  return null;
}

/**
 * Create a new asset
 */
function createAsset(sheet, assetData) {
  const data = sheet.getDataRange().getValues();
  let nextId = 1;
  
  // Find the highest ID
  for (let i = HEADER_ROW; i < data.length; i++) {
    if (data[i][0] && data[i][0] > nextId) {
      nextId = data[i][0];
    }
  }
  nextId = nextId + 1;
  
  // Prepare asset with ID
  const asset = {
    id: nextId,
    name: assetData.name || '',
    sku: assetData.sku || '',
    brand: assetData.brand || '',
    category: assetData.category || 'Sneakers',
    image: assetData.image || '',
    sizes: assetData.sizes || [],
    priceAnchors: assetData.priceAnchors || {},
    listingsSnapshot: assetData.listingsSnapshot || {},
    volatility: assetData.volatility || 'medium',
    defaultSize: assetData.defaultSize || '',
    lastUpdated: new Date().toISOString()
  };
  
  // Convert to row
  const row = assetToRow(asset);
  sheet.appendRow(row);
  
  return asset;
}

/**
 * Update an existing asset
 */
function updateAsset(sheet, assetData) {
  if (!assetData.id) {
    throw new Error('Asset ID is required for update');
  }
  
  const data = sheet.getDataRange().getValues();
  for (let i = HEADER_ROW; i < data.length; i++) {
    if (data[i][0] == assetData.id) {
      // Update the asset
      const updatedAsset = {
        ...parseRowToAsset(data[i]),
        ...assetData,
        id: assetData.id, // Ensure ID doesn't change
        lastUpdated: new Date().toISOString()
      };
      
      const row = assetToRow(updatedAsset);
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      
      return updatedAsset;
    }
  }
  
  throw new Error('Asset not found');
}

/**
 * Delete an asset
 */
function deleteAsset(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = HEADER_ROW; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return { id: id, deleted: true };
    }
  }
  
  throw new Error('Asset not found');
}

/**
 * Parse a sheet row to an Asset object
 */
function parseRowToAsset(row) {
  return {
    id: row[0] || null,
    name: row[1] || '',
    sku: row[2] || '',
    brand: row[3] || '',
    category: row[4] || 'Sneakers',
    image: row[5] || '',
    sizes: row[6] ? JSON.parse(row[6]) : [],
    priceAnchors: row[7] ? JSON.parse(row[7]) : {},
    listingsSnapshot: row[8] ? JSON.parse(row[8]) : {},
    volatility: row[9] || 'medium',
    defaultSize: row[10] || '',
    lastUpdated: row[11] || new Date().toISOString()
  };
}

/**
 * Convert an Asset object to a sheet row
 */
function assetToRow(asset) {
  return [
    asset.id || '',
    asset.name || '',
    asset.sku || '',
    asset.brand || '',
    asset.category || 'Sneakers',
    asset.image || '',
    JSON.stringify(asset.sizes || []),
    JSON.stringify(asset.priceAnchors || {}),
    JSON.stringify(asset.listingsSnapshot || {}),
    asset.volatility || 'medium',
    asset.defaultSize || '',
    asset.lastUpdated || new Date().toISOString()
  ];
}

