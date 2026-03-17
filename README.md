# The Dream School — Contact Enrichment Script 📊

A **Google Apps Script** that automatically enriches contact data in Google Sheets by fetching email addresses and phone numbers from the People Data Labs API (via Google Cloud), built during my work as Student Integration Specialist at The Dream School.

## About the Project

During my role at The Dream School (Mar–Dec 2023), I managed 80+ admission interviews across 4 enrollment cycles. To streamline the outreach process, I built this automation that allowed me to:

1. Type a candidate's **name**, **role**, and **company** into a Google Sheet
2. Have the script **automatically fetch their email and phone** via Google Cloud / People Data Labs API
3. See the results appear directly in the sheet — without leaving the spreadsheet

This eliminated the need to manually search for contact information, allowing the team to focus on personalized outreach and interviews rather than data gathering.

## Technologies

- Google Apps Script (JavaScript)
- Google Sheets API
- People Data Labs API (contact enrichment)
- Google Cloud

## Features

- ✅ Auto-triggers on sheet edit — no need to run manually
- ✅ Fetches email and phone for any contact with name + company
- ✅ Prioritizes professional/work emails
- ✅ Status column shows real-time feedback (🔄 Searching / ✅ Found / ⚠️ Not found)
- ✅ `enrichAllMissing()` function to batch-process the entire sheet
- ✅ `setupSheet()` helper creates and styles the sheet automatically
- ✅ Rate-limit protection with automatic delays on batch processing

## How to Use

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Paste the contents of `Code.gs`
4. Replace `YOUR_PDL_API_KEY_HERE` with your [People Data Labs API key](https://www.peopledatalabs.com/)
5. Run `setupSheet()` once to create headers
6. Run `setupTrigger()` once to enable auto-enrichment on edit
7. Start typing contacts — email and phone will populate automatically

## Sheet Structure

| Name | Role | Company | Email | Phone | Status | Last Updated |
|------|------|---------|-------|-------|--------|--------------|
| João Silva | Marketing Manager | Empresa XYZ | joao@empresa.com | +55 11 9999-9999 | ✅ Found | 01/06/2023 |

## Impact

- Supported **80+ admission interviews** over 9 months
- Contributed to a **46% increase in enrollment** across 4 intake cycles
- Reduced contact research time significantly, enabling more personalized outreach

## Context

Built during my role as **Student Integration Specialist** at The Dream School.

**Period:** March – December 2023  
**Location:** Remote  
