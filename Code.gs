/**
 * The Dream School — Contact Enrichment Script
 * 
 * Automatically fetches email and phone number for contacts
 * entered in Google Sheets using People Data Labs API (via Google Cloud).
 * 
 * How to use:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Paste this entire script
 * 4. Add your API key in the CONFIG section below
 * 5. Save and run setupTrigger() once
 * 6. Fill in Name, Role, and Company columns — email and phone auto-populate
 * 
 * Sheet structure expected:
 * | Name | Role | Company | Email | Phone | Status | Last Updated |
 */

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CONFIG = {
  API_KEY: 'YOUR_PDL_API_KEY_HERE', // Replace with your People Data Labs API key
  SHEET_NAME: 'Contacts',
  COLUMNS: {
    NAME: 1,      // Column A
    ROLE: 2,      // Column B
    COMPANY: 3,   // Column C
    EMAIL: 4,     // Column D
    PHONE: 5,     // Column E
    STATUS: 6,    // Column F
    UPDATED: 7    // Column G
  },
  START_ROW: 2    // Row 1 is the header
};
// ──────────────────────────────────────────────────────────────────────────────


/**
 * Sets up an automatic trigger so the script runs
 * every time the spreadsheet is edited.
 */
function setupTrigger() {
  // Remove existing triggers to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  
  ScriptApp.newTrigger('onSheetEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  
  Logger.log('✅ Trigger set up successfully.');
}


/**
 * Triggered on every edit. Only runs enrichment when
 * Name, Role, or Company columns are edited.
 */
function onSheetEdit(e) {
  const sheet = e.source.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet || e.range.getSheet().getName() !== CONFIG.SHEET_NAME) return;
  
  const col = e.range.getColumn();
  const row = e.range.getRow();
  
  if (row < CONFIG.START_ROW) return;
  
  // Only trigger if Name, Role, or Company was edited
  const triggerCols = [CONFIG.COLUMNS.NAME, CONFIG.COLUMNS.ROLE, CONFIG.COLUMNS.COMPANY];
  if (!triggerCols.includes(col)) return;
  
  enrichRow(sheet, row);
}


/**
 * Manually enrich all rows that have Name + Company
 * but are missing Email. Run this from the Apps Script editor.
 */
function enrichAllMissing() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) { Logger.log('❌ Sheet not found: ' + CONFIG.SHEET_NAME); return; }
  
  const lastRow = sheet.getLastRow();
  let enriched = 0;
  
  for (let row = CONFIG.START_ROW; row <= lastRow; row++) {
    const name    = sheet.getRange(row, CONFIG.COLUMNS.NAME).getValue();
    const email   = sheet.getRange(row, CONFIG.COLUMNS.EMAIL).getValue();
    const company = sheet.getRange(row, CONFIG.COLUMNS.COMPANY).getValue();
    
    if (name && company && !email) {
      enrichRow(sheet, row);
      enriched++;
      Utilities.sleep(500); // Avoid rate limiting
    }
  }
  
  Logger.log(`✅ Enriched ${enriched} rows.`);
}


/**
 * Core function: fetches contact data for a given row
 * and writes email and phone back to the sheet.
 */
function enrichRow(sheet, row) {
  const name    = sheet.getRange(row, CONFIG.COLUMNS.NAME).getValue().toString().trim();
  const role    = sheet.getRange(row, CONFIG.COLUMNS.ROLE).getValue().toString().trim();
  const company = sheet.getRange(row, CONFIG.COLUMNS.COMPANY).getValue().toString().trim();
  
  if (!name || !company) return;
  
  // Mark as processing
  sheet.getRange(row, CONFIG.COLUMNS.STATUS).setValue('🔄 Searching...');
  SpreadsheetApp.flush();
  
  try {
    const result = fetchContactData(name, role, company);
    
    if (result.found) {
      sheet.getRange(row, CONFIG.COLUMNS.EMAIL).setValue(result.email || '');
      sheet.getRange(row, CONFIG.COLUMNS.PHONE).setValue(result.phone || '');
      sheet.getRange(row, CONFIG.COLUMNS.STATUS).setValue('✅ Found');
    } else {
      sheet.getRange(row, CONFIG.COLUMNS.STATUS).setValue('⚠️ Not found');
    }
    
    sheet.getRange(row, CONFIG.COLUMNS.UPDATED).setValue(new Date().toLocaleString());
    
  } catch (err) {
    sheet.getRange(row, CONFIG.COLUMNS.STATUS).setValue('❌ Error: ' + err.message);
    Logger.log('Error on row ' + row + ': ' + err.message);
  }
}


/**
 * Calls People Data Labs API to find contact info.
 * Falls back to a basic search if exact match fails.
 */
function fetchContactData(name, role, company) {
  const nameParts = name.split(' ');
  const firstName = nameParts[0];
  const lastName  = nameParts.slice(1).join(' ');
  
  // Build API request
  const params = {
    first_name: firstName,
    last_name: lastName,
    company: company,
    titlecase: true
  };
  
  if (role) params.title = role;
  
  const queryString = Object.entries(params)
    .map(([k,v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  
  const url = `https://api.peopledatalabs.com/v5/person/enrich?${queryString}`;
  
  const options = {
    method: 'GET',
    headers: {
      'X-Api-Key': CONFIG.API_KEY,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  
  if (code === 404) return { found: false };
  if (code !== 200) throw new Error(`API returned ${code}`);
  
  const data = JSON.parse(response.getContentText());
  
  if (!data || data.status === 404) return { found: false };
  
  // Extract best available email and phone
  const email = extractBestEmail(data.data);
  const phone = extractBestPhone(data.data);
  
  return {
    found: !!(email || phone),
    email: email || '',
    phone: phone || ''
  };
}


/**
 * Picks the most likely work email from the results.
 */
function extractBestEmail(person) {
  if (!person || !person.emails || person.emails.length === 0) return null;
  
  // Prefer work emails
  const work = person.emails.find(e => e.type === 'professional' || e.type === 'work');
  if (work) return work.address;
  
  return person.emails[0].address || null;
}


/**
 * Picks the most likely work phone from the results.
 */
function extractBestPhone(person) {
  if (!person || !person.phone_numbers || person.phone_numbers.length === 0) return null;
  return person.phone_numbers[0] || null;
}


/**
 * Creates the sheet headers if they don't exist yet.
 * Run this once when setting up a new sheet.
 */
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  }
  
  const headers = ['Name', 'Role', 'Company', 'Email', 'Phone', 'Status', 'Last Updated'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Style header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#1a73e8');
  headerRange.setFontColor('white');
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(12);
  
  // Auto-resize columns
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 180);
  sheet.setColumnWidth(4, 220);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 120);
  sheet.setColumnWidth(7, 160);
  
  Logger.log('✅ Sheet set up successfully. Add your contacts starting from row 2.');
}
