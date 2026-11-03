import ExcelJS from 'exceljs';

export async function generateExpenseExcelReport(expenses, metadata = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Construction Expense Platform';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Expense Report', {
    views: [{ showGridLines: true }],
  });

  // Title Row
  worksheet.mergeCells('A1:H1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'CONSTRUCTION EXPENSE REPORT';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 35;

  // Metadata block
  worksheet.getCell('A3').value = 'Generated:';
  worksheet.getCell('B3').value = new Date().toLocaleString('en-IN');
  worksheet.getCell('D3').value = 'Project:';
  worksheet.getCell('E3').value = metadata.projectName || 'All Projects';
  worksheet.getCell('G3').value = 'Status:';
  worksheet.getCell('H3').value = metadata.status || 'All Statuses';

  // Table Column Headers
  const headerRow = worksheet.getRow(5);
  headerRow.values = [
    'Ref No',
    'Date',
    'Project Code',
    'Project Name',
    'Category',
    'Title / Description',
    'Vendor',
    'Payment Method',
    'Status',
    'Amount (INR)',
  ];

  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Data rows
  let rowIdx = 6;
  let totalAmount = 0;

  expenses.forEach((item) => {
    const row = worksheet.getRow(rowIdx);
    row.values = [
      item.reference_no,
      item.expense_date,
      item.project_code || '',
      item.project_name || '',
      item.category_name || '',
      item.title,
      item.vendor_name || '-',
      (item.payment_method || '').toUpperCase(),
      (item.status || '').toUpperCase(),
      Number(item.amount),
    ];

    // Format currency cell
    const amountCell = row.getCell(10);
    amountCell.numFmt = '₹ #,##0.00';
    amountCell.alignment = { horizontal: 'right' };

    totalAmount += Number(item.amount);
    rowIdx++;
  });

  // Summary Row
  const totalRow = worksheet.getRow(rowIdx + 1);
  totalRow.getCell(9).value = 'TOTAL:';
  totalRow.getCell(9).font = { name: 'Arial', size: 11, bold: true };
  totalRow.getCell(9).alignment = { horizontal: 'right' };

  const totalAmountCell = totalRow.getCell(10);
  totalAmountCell.value = totalAmount;
  totalAmountCell.numFmt = '₹ #,##0.00';
  totalAmountCell.font = { name: 'Arial', size: 11, bold: true };
  totalAmountCell.alignment = { horizontal: 'right' };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' },
  };

  // Set column widths
  worksheet.columns = [
    { width: 18 }, // Ref No
    { width: 14 }, // Date
    { width: 16 }, // Project Code
    { width: 28 }, // Project Name
    { width: 25 }, // Category
    { width: 35 }, // Title
    { width: 22 }, // Vendor
    { width: 18 }, // Payment Method
    { width: 14 }, // Status
    { width: 20 }, // Amount
  ];

  return workbook.xlsx.writeBuffer();
}
