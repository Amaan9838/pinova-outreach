const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config({ path: 'c:/CODING PHP/htdocs/pinova-outreach/.env' });
const { MongoClient } = require('mongodb');
const ExcelJS = require('exceljs');
const path = require('path');

async function exportLinkedInData() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("No MONGODB_URI found in env");
    return;
  }

  const client = new MongoClient(uri);

  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    const db = client.db();

    console.log("Fetching LinkedIn leads...");
    const leads = await db.collection('linkedinleads').find({}).sort({ createdAt: -1 }).toArray();
    console.log(`Found ${leads.length} leads.`);

    // Find the maximum number of conversations any lead has
    let maxConvos = 0;
    for (const lead of leads) {
      const count = Array.isArray(lead.conversations) ? lead.conversations.length : 0;
      if (count > maxConvos) maxConvos = count;
    }
    console.log(`Max conversations per lead: ${maxConvos}`);

    const workbook = new ExcelJS.Workbook();

    // ── Sheet 1: One row per lead, messages as horizontal columns ──
    const sheet = workbook.addWorksheet('LinkedIn Leads');

    // Build columns: lead info + dynamic message columns
    const columns = [
      { header: 'S.No', key: 'sno', width: 6 },
      { header: 'First Name', key: 'firstName', width: 16 },
      { header: 'Last Name', key: 'lastName', width: 16 },
      { header: 'City', key: 'city', width: 14 },
      { header: 'LinkedIn URL', key: 'linkedInUrl', width: 35 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Owner', key: 'owner', width: 20 },
      { header: 'Next Follow-Up', key: 'nextFollowUp', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Total Messages', key: 'totalMessages', width: 14 },
      { header: 'Outbound Count', key: 'outboundCount', width: 14 },
      { header: 'Inbound Count', key: 'inboundCount', width: 14 },
    ];

    // Add dynamic message columns
    for (let i = 1; i <= maxConvos; i++) {
      columns.push({ header: `Msg ${i} Direction`, key: `msg${i}_direction`, width: 14 });
      columns.push({ header: `Msg ${i} Date`, key: `msg${i}_date`, width: 20 });
      columns.push({ header: `Msg ${i} By`, key: `msg${i}_by`, width: 18 });
      columns.push({ header: `Msg ${i} Content`, key: `msg${i}_content`, width: 40 });
    }

    sheet.columns = columns;

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.height = 30;

    // Color headers: lead info = dark blue, message cols cycle colors
    const leadInfoColor = '1F4E79';    // dark blue
    const msgColors = ['2E75B6', '548235', 'BF8F00', 'C55A11']; // blue, green, gold, orange

    for (let c = 1; c <= columns.length; c++) {
      const cell = headerRow.getCell(c);
      if (c <= 12) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: leadInfoColor } };
      } else {
        // Each message group of 4 cols gets a rotating color
        const msgGroupIndex = Math.floor((c - 13) / 4);
        const color = msgColors[msgGroupIndex % msgColors.length];
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      }
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    }

    // Populate rows
    leads.forEach((lead, idx) => {
      const conversations = Array.isArray(lead.conversations) ? lead.conversations : [];
      // Sort conversations by timestamp ascending
      conversations.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));

      const outbound = conversations.filter(c => c.direction === 'outbound').length;
      const inbound = conversations.filter(c => c.direction === 'inbound').length;

      const rowData = {
        sno: idx + 1,
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        city: lead.city || '',
        linkedInUrl: lead.linkedInUrl || '',
        status: (lead.status || '').toUpperCase(),
        owner: lead.owner || '',
        nextFollowUp: lead.nextFollowUp ? new Date(lead.nextFollowUp).toLocaleDateString('en-IN') : '',
        createdAt: lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-IN') : '',
        totalMessages: conversations.length,
        outboundCount: outbound,
        inboundCount: inbound,
      };

      conversations.forEach((conv, ci) => {
        const n = ci + 1;
        rowData[`msg${n}_direction`] = (conv.direction || '').toUpperCase();
        rowData[`msg${n}_date`] = conv.timestamp ? new Date(conv.timestamp).toLocaleString('en-IN') : '';
        rowData[`msg${n}_by`] = conv.loggedBy || '';
        rowData[`msg${n}_content`] = conv.message || '';
      });

      const row = sheet.addRow(rowData);
      row.alignment = { vertical: 'top', wrapText: true };

      // Alternate row shading
      if (idx % 2 === 0) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } };
        });
      }

      // Color-code status
      const statusCell = row.getCell('status');
      const statusColors = {
        'REPLIED': '00B050',
        'MESSAGED': '4472C4',
        'NEW': '808080',
        'CONVERSATION': '7030A0',
        'INTERESTED': '00B0F0',
        'DEMO': 'FFC000',
        'CLOSED_WON': '00B050',
        'CLOSED_LOST': 'FF0000',
        'NOT_INTERESTED': 'FF6600',
      };
      const sColor = statusColors[rowData.status];
      if (sColor) {
        statusCell.font = { bold: true, color: { argb: sColor } };
      }
    });

    // Freeze the header row + lead info columns
    sheet.views = [{ state: 'frozen', xSplit: 6, ySplit: 1 }];

    // Auto-filter
    sheet.autoFilter = { from: 'A1', to: sheet.getCell(1, columns.length).address };

    // ── Sheet 2: Status Summary ──
    const summarySheet = workbook.addWorksheet('Status Summary');
    summarySheet.columns = [
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Count', key: 'count', width: 12 },
      { header: '% of Total', key: 'percent', width: 12 },
    ];
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E79' } };

    const statusCounts = {};
    for (const lead of leads) {
      const s = (lead.status || 'unknown').toUpperCase();
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }
    const sortedStatuses = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
    for (const [status, count] of sortedStatuses) {
      summarySheet.addRow({
        status,
        count,
        percent: ((count / leads.length) * 100).toFixed(1) + '%',
      });
    }

    // Save
    const timestamp = new Date().toISOString().slice(0,10);
    const exportPath = path.join(__dirname, `LinkedIn_Outreach_${timestamp}.xlsx`);
    console.log(`Writing to ${exportPath}...`);
    await workbook.xlsx.writeFile(exportPath);
    console.log(`\nExport complete! ${leads.length} leads exported.`);
    console.log(`File: ${exportPath}`);

  } catch (error) {
    console.error("Error during export:", error);
  } finally {
    await client.close();
  }
}

exportLinkedInData();
