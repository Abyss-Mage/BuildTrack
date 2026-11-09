import ExcelJS from 'exceljs';
import { ApiError } from './ApiError.js';

// Matched after removing spaces and punctuation, so "Father's Name" and "fathers name" are the same.
// "Depature" is the spelling used in the company's template.
const COLUMNS = {
  name: ['name'],
  father_name: ['fathersname', 'fathername'],
  designation: ['designation'],
  uan: ['uan', 'uanno'],
  rate: ['rate'],
  monthly_salary: ['salary'],
  joining_date: ['joiningdate'],
  departure_date: ['depaturedate', 'departuredate'],
  days_present: ['totalpresent'],
  total_salary: ['totalsalary'],
  ta_up: ['taup'],
  ta_down: ['tadown'],
  salary_advance: ['salaryadvance'],
  pf_deduction: ['pfdeduction'],
  net_payable: ['netsalarypayable'],
  paid: ['paid'],
  phone: ['mobile', 'mobileno', 'mobilenumber', 'phone', 'phoneno'],
};
const REQUIRED = ['name', 'father_name', 'designation', 'net_payable'];
const NUMERIC = ['rate', 'monthly_salary', 'days_present', 'total_salary', 'ta_up', 'ta_down', 'salary_advance', 'pf_deduction', 'net_payable', 'paid'];
const HEADER_SEARCH_ROWS = 20;

const normalize = (text) => String(text ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const EXCEL_ERROR = Symbol('excel error');
const NO_RESULT = Symbol('no result');

/** The value Excel last calculated for a cell; formulas are never re-worked here. */
function cellValue(value) {
  if (value === null || typeof value !== 'object' || value instanceof Date) return value;
  if ('formula' in value || 'sharedFormula' in value) {
    return value.result === undefined ? NO_RESULT : cellValue(value.result);
  }
  if ('richText' in value) return value.richText.map((part) => part.text).join('');
  if ('error' in value) return EXCEL_ERROR;
  return value.text ?? String(value);
}

function findColumns(sheet) {
  const limit = Math.min(HEADER_SEARCH_ROWS, sheet.rowCount);
  for (let rowNumber = 1; rowNumber <= limit; rowNumber++) {
    const found = {};
    sheet.getRow(rowNumber).eachCell((cell, column) => {
      const label = normalize(cellValue(cell.value));
      for (const [key, aliases] of Object.entries(COLUMNS)) {
        if (aliases.includes(label)) found[key] = column;
      }
    });
    if (REQUIRED.every((key) => found[key])) return { columns: found, headerRow: rowNumber };
  }
  return null;
}

const asText = (value) => {
  if (value === EXCEL_ERROR || value === NO_RESULT || value === null || value === undefined) return '';
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).trim();
};

/** Reads the first sheet using the wage template. Any bad row rejects the whole file, so nothing half-imports. */
export async function parseWageSheet(buffer) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw ApiError.badRequest('This file could not be read. Upload a valid .xlsx Excel file.');
  }

  let sheet;
  let layout;
  for (const candidate of workbook.worksheets) {
    layout = findColumns(candidate);
    if (layout) {
      sheet = candidate;
      break;
    }
  }
  if (!sheet) {
    throw ApiError.badRequest("No wage sheet found. The file needs these headers: Name, Father's Name, Designation, Net Salary Payable.");
  }

  const rows = [];
  const problems = [];
  let rowsWithoutNetResult = 0;

  for (let rowNumber = layout.headerRow + 1; rowNumber <= sheet.rowCount; rowNumber++) {
    const read = (key) => (layout.columns[key] ? cellValue(sheet.getRow(rowNumber).getCell(layout.columns[key]).value) : null);
    const name = asText(read('name'));
    // Blank and total lines below the employee list are not employees
    if (!name || normalize(name).endsWith('total')) continue;

    const row = { name, father_name: asText(read('father_name')), designation: asText(read('designation')) };
    row.uan = asText(read('uan'));
    row.phone = asText(read('phone'));
    row.joining_date = asText(read('joining_date')).slice(0, 30);
    row.departure_date = asText(read('departure_date')).slice(0, 30);

    for (const key of NUMERIC) {
      const value = read(key);
      if (value === EXCEL_ERROR) {
        problems.push(`Row ${rowNumber}: ${key.replace(/_/g, ' ')} shows an Excel error`);
      } else if (value === NO_RESULT) {
        // shortcut: exceljs loses a saved result of 0 on shared formulas, so a blank result reads as 0; the all-rows check below catches files never calculated
        row[key] = 0;
        if (key === 'net_payable') rowsWithoutNetResult++;
      } else if (value === null || value === undefined || value === '') {
        if (key === 'net_payable') problems.push(`Row ${rowNumber}: Net Salary Payable is empty`);
        row[key] = 0;
      } else {
        const number = Number(String(value).replace(/,/g, ''));
        if (Number.isFinite(number)) row[key] = number;
        else problems.push(`Row ${rowNumber}: ${key.replace(/_/g, ' ')} is not a number ("${value}")`);
      }
    }
    rows.push(row);
  }

  if (problems.length > 0) {
    const shown = problems.slice(0, 5).join('; ');
    const more = problems.length > 5 ? ` and ${problems.length - 5} more` : '';
    throw ApiError.badRequest(`Fix these in Excel, save the file and upload again: ${shown}${more}.`);
  }
  if (rows.length === 0) {
    throw ApiError.badRequest('The wage sheet has no employee rows.');
  }
  if (rowsWithoutNetResult === rows.length) {
    throw ApiError.badRequest('The formulas in this file have not been calculated. Open it in Excel, save it and upload again.');
  }

  return { sheetName: sheet.name, rows };
}
