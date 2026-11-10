// The rules that protect money: run with `npm test` (needs Node 22.5+ for the in-memory SQLite database).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ExcelJS from 'exceljs';

// Set before anything loads the config, so a developer's .env can never point these tests at a real database
Object.assign(process.env, {
  NODE_ENV: 'test',
  JWT_SECRET: 'test',
  DB_CLIENT: 'sqlite',
  SQLITE_FILE: ':memory:',
  INITIAL_ADMIN_PASSWORD: 'test',
  WHATSAPP_TOKEN: 'test',
  WHATSAPP_PHONE_NUMBER_ID: '1',
  WHATSAPP_TEMPLATE_NAME: 'wages',
});

const { default: db } = await import('../src/config/database.js');
const { initializeDatabase } = await import('../src/database/init.js');
const { UsersRepository } = await import('../src/modules/users/users.repository.js');
const { ProjectsRepository } = await import('../src/modules/projects/projects.repository.js');
const { ExpensesRepository } = await import('../src/modules/expenses/expenses.repository.js');
const { ExpensesService } = await import('../src/modules/expenses/expenses.service.js');
const { AccountsRepository } = await import('../src/modules/accounts/accounts.repository.js');
const { ApprovalsService } = await import('../src/modules/approvals/approvals.service.js');
const { AdvancesService } = await import('../src/modules/advances/advances.service.js');
const { PurchaseRequisitionsService } = await import('../src/modules/purchaseRequisitions/purchaseRequisitions.service.js');
const { WageSheetsService } = await import('../src/modules/wageSheets/wageSheets.service.js');
const { parseWageSheet } = await import('../src/utils/wageSheetParser.js');

await initializeDatabase();

const makeUser = (name, role) => UsersRepository.create({ name, email: `${name}@test.local`, password_hash: 'x', role });
const admin = await makeUser('admin2', 'admin');
const accountant = await makeUser('accountant', 'accountant');
const otherAccountant = await makeUser('accountant2', 'accountant');
const inCharge = await makeUser('incharge', 'site_in_charge');
const outsider = await makeUser('outsider', 'site_in_charge');

const makeProject = (code) =>
  ProjectsRepository.create(
    { name: `Site ${code}`, code, location: 'Pune', total_budget: 100000, po_number: 'PO-1', po_date: '2026-10-01' },
    admin.id
  );
const project = await makeProject('S1');
const { id: categoryId } = await db.getOne('SELECT id FROM categories LIMIT 1');

const expenseData = (amount, advance_id, status = 'pending') => ({
  project_id: project.id,
  category_id: categoryId,
  title: 'Cement',
  amount,
  expense_date: '2026-11-02',
  status,
  advance_id,
});
const voucher = (user, title = 'Cement') =>
  ExpensesRepository.create({ project_id: project.id, category_id: categoryId, title, amount: 100, expense_date: '2026-11-02' }, [], user.id);

const newAdvance = (amount, by = admin) =>
  AdvancesService.createAdvance(
    { project_id: project.id, site_in_charge_id: inCharge.id, amount, allocation_date: '2026-11-01', period_type: 'weekly', start_date: '2026-11-01', end_date: '2026-11-07' },
    by
  );

test('project keeps its PO details', () => {
  assert.equal(project.po_number, 'PO-1');
  assert.equal(project.po_date, '2026-10-01');
});

test('old Project Manager and Site Engineer accounts become Site In-Charge', async () => {
  const pm = await makeUser('oldpm', 'project_manager');
  const engineer = await makeUser('oldeng', 'site_engineer');
  await initializeDatabase();
  assert.equal((await UsersRepository.findById(pm.id)).role, 'site_in_charge');
  assert.equal((await UsersRepository.findById(engineer.id)).role, 'site_in_charge');
});

test('an accountant cannot approve their own voucher, another accountant can', async () => {
  const { id } = await voucher(accountant);
  await assert.rejects(ApprovalsService.approveExpense(id, accountant), { statusCode: 403 });
  assert.equal((await ApprovalsService.approveExpense(id, otherAccountant)).status, 'approved');
});

test('only one of two simultaneous approvals goes through', async () => {
  const { id } = await voucher(inCharge);
  const results = await Promise.allSettled([
    ApprovalsService.approveExpense(id, accountant),
    ApprovalsService.approveExpense(id, otherAccountant),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), ['fulfilled', 'rejected']);
  assert.equal((await ExpensesRepository.findById(id)).approvals.length, 1);
});

test('rejecting an approved voucher clears its approver', async () => {
  const { id } = await voucher(inCharge);
  await ApprovalsService.approveExpense(id, accountant);
  const rejected = await ApprovalsService.rejectExpense(id, accountant, 'Wrong site');
  assert.equal(rejected.approved_by, null);
  assert.equal(rejected.approved_at, null);
});

test('a voucher can only be paid once, and only after approval', async () => {
  const { id } = await voucher(inCharge);
  assert.equal(await AccountsRepository.processPayout(id, accountant.id, {}), null);
  await ApprovalsService.approveExpense(id, accountant);
  assert.equal((await AccountsRepository.processPayout(id, accountant.id, {})).status, 'processed');
  assert.equal(await AccountsRepository.processPayout(id, accountant.id, {}), null);
});

test('payout keeps a past payment date and ignores a future one', async () => {
  const pay = async (payment_date) => {
    const { id } = await voucher(inCharge);
    await ApprovalsService.approveExpense(id, accountant);
    return (await AccountsRepository.processPayout(id, accountant.id, { payment_date })).processed_at;
  };
  assert.match(await pay('2026-01-15'), /^2026-01-15 /);
  assert.ok(!(await pay('2999-01-01')).startsWith('2999'));
});

test('simultaneous vouchers get different numbers', async () => {
  const created = await Promise.all([1, 2, 3].map(() => voucher(inCharge)));
  assert.equal(new Set(created.map((e) => e.reference_no)).size, 3);
});

test('advance from an accountant needs Super Admin approval before it can be spent', async () => {
  const advance = await newAdvance(1000, accountant);
  assert.equal(advance.status, 'pending');
  await assert.rejects(ExpensesService.createExpense(expenseData(100, advance.id), [], inCharge), { statusCode: 400 });
  const approved = await AdvancesService.approveAdvance(advance.id, admin);
  assert.equal(approved.status, 'approved');
  assert.equal(approved.approved_by, admin.id);
  assert.ok(await ExpensesService.createExpense(expenseData(100, advance.id), [], inCharge));
});

test('balance matches the brief: 10,000 less 2,000, 3,000 and 3,000 leaves 2,000', async () => {
  const advance = await newAdvance(10000);
  for (const amount of [2000, 3000, 3000]) {
    await ExpensesService.createExpense(expenseData(amount, advance.id), [], inCharge);
  }
  const [row] = await AdvancesService.getAdvances({ siteInChargeId: inCharge.id }, inCharge);
  assert.equal(row.id, advance.id);
  assert.equal(row.spent, 8000);
  assert.equal(row.remaining, 2000);
});

test('an expense above the remaining balance is blocked; drafts and rejections do not use it', async () => {
  const advance = await newAdvance(1000);
  await assert.rejects(ExpensesService.createExpense(expenseData(1000.01, advance.id), [], inCharge), { statusCode: 400 });

  // A draft may be saved, but cannot be submitted past the balance
  const draft = await ExpensesService.createExpense(expenseData(5000, advance.id, 'draft'), [], inCharge);
  await assert.rejects(ExpensesService.submitExpense(draft.id, inCharge), { statusCode: 400 });

  const spent = await ExpensesService.createExpense(expenseData(1000, advance.id), [], inCharge);
  await ApprovalsService.rejectExpense(spent.id, accountant, 'No bill');
  const [row] = await AdvancesService.getAdvances({}, inCharge);
  assert.equal(row.id, advance.id);
  assert.equal(row.remaining, 1000);
});

test('advances and their totals filter by allocation date', async () => {
  await newAdvance(100);
  const inside = { startDate: '2026-11-01', endDate: '2026-11-01' };
  const outside = { startDate: '2026-11-02' };
  assert.ok((await AdvancesService.getAdvances(inside, admin)).length > 0);
  assert.equal((await AdvancesService.getAdvances(outside, admin)).length, 0);
  assert.equal((await AdvancesService.getSummary(admin, outside)).totalAllocated, 0);
  assert.ok((await AdvancesService.getSummary(admin, inside)).totalAllocated > 0);
});

test('an approved advance expense is settled and never reaches the payout queue', async () => {
  const advance = await newAdvance(500);
  const { id } = await ExpensesService.createExpense(expenseData(200, advance.id), [], inCharge);
  assert.equal((await ApprovalsService.approveExpense(id, accountant)).status, 'processed');
  const queue = await AccountsRepository.getPayoutQueue();
  assert.ok(!queue.some((e) => e.id === id));
});

test('a Site In-Charge must use their own advance and only sees their own expenses', async () => {
  const advance = await newAdvance(100);
  await assert.rejects(ExpensesService.createExpense(expenseData(10, undefined), [], inCharge), { statusCode: 400 });
  await assert.rejects(ExpensesService.createExpense(expenseData(10, advance.id), [], outsider), { statusCode: 403 });

  // Any site is open, but another person's expense is not
  const other = await makeProject('S2');
  const hidden = await ExpensesRepository.create({ ...expenseData(10), project_id: other.id }, [], admin.id);
  await assert.rejects(ExpensesService.getExpenseById(hidden.id, inCharge), { statusCode: 403 });
  assert.ok(!(await ExpensesService.getAllExpenses({}, inCharge)).some((e) => e.id === hidden.id));
  assert.ok((await ExpensesService.getAllExpenses({}, admin)).some((e) => e.id === hidden.id));
});

test('purchase requisition numbers follow the financial year and amounts are worked out on the server', async () => {
  const data = {
    pr_date: '2026-10-24',
    project_id: project.id,
    priority: 'Normal',
    requested_by: inCharge.id,
    items: [
      { item: 'WD 40', unit: 'Nos', quantity: 24, rate: 12.5 },
      { item: 'Hylomar', unit: 'Nos', quantity: 20, rate: null },
    ],
  };
  const first = await PurchaseRequisitionsService.create(data, inCharge);
  const second = await PurchaseRequisitionsService.create({ ...data, pr_date: '2027-02-01' }, inCharge);
  assert.equal(first.pr_no, 'SSPSPL/PR/26-27/10/001');
  assert.equal(first.document_no, 'PR/SPS/26-27/001');
  assert.equal(second.pr_no, 'SSPSPL/PR/26-27/02/002');
  assert.deepEqual(first.items.map((i) => i.amount), [300, 0]);

  const edited = await PurchaseRequisitionsService.update(first.id, { ...data, items: [data.items[0]] }, inCharge);
  assert.equal(edited.items.length, 1);
  // Another Site In-Charge can raise one for the same site but cannot open or list this one
  await PurchaseRequisitionsService.create(data, outsider);
  await assert.rejects(PurchaseRequisitionsService.getById(first.id, outsider), { statusCode: 403 });
  assert.ok(!(await PurchaseRequisitionsService.getAll({}, outsider)).some((pr) => pr.id === first.id));

  // A typed number is kept as-is, must be unique, and odd endings do not break auto-numbering
  const typed = await PurchaseRequisitionsService.create({ ...data, pr_no: 'SSPSPL/PR/26-27/10/MANUAL' }, inCharge);
  assert.equal(typed.pr_no, 'SSPSPL/PR/26-27/10/MANUAL');
  await assert.rejects(PurchaseRequisitionsService.create({ ...data, pr_no: typed.pr_no }, inCharge), { statusCode: 409 });
  assert.equal((await PurchaseRequisitionsService.create(data, inCharge)).pr_no, 'SSPSPL/PR/26-27/10/004');

  await assert.rejects(PurchaseRequisitionsService.update(first.id, { ...data, pr_no: typed.pr_no }, inCharge), { statusCode: 409 });
  assert.equal((await PurchaseRequisitionsService.getById(first.id, inCharge)).items.length, 1);
  const renamed = await PurchaseRequisitionsService.update(first.id, { ...data, pr_no: 'PR-77' }, inCharge);
  assert.equal(renamed.pr_no, 'PR-77');
});

async function workbook(fill) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  ws.getRow(1).values = ['Wages Sheet'];
  ws.getRow(5).values = ['Sr no.', 'Name', "Father's Name", 'Designation', 'UAN', 'Rate', 'Total Present', 'Total Salary', 'TA UP', 'PF Deduction', 'Net Salary Payable', 'Paid', 'Mobile'];
  fill(ws);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
const employeeLine = (ws, row, name, net) => {
  ws.getRow(row).values = [row - 5, name, 'Father', 'Fitter', `UAN${name}`, 1000, 10, { formula: 'F6*G6', result: 10000 }, 100, 50, { formula: 'H6+I6-J6', result: net }, null, '9876543210'];
};

test('wage sheet import keeps the values Excel calculated and totals them', async () => {
  const file = await workbook((ws) => {
    employeeLine(ws, 6, 'Asha', 10050);
    employeeLine(ws, 7, 'Ravi', 9000);
    ws.getRow(9).values = [null, 'Total', null, null, null, null, null, null, null, null, { formula: 'SUM(K6:K7)', result: 19050 }];
  });
  const meta = { project_id: project.id, period_type: 'monthly', start_date: '2026-09-01', end_date: '2026-09-30' };
  const result = await WageSheetsService.importSheet({ buffer: file, originalname: 'wages.xlsx' }, meta, accountant);
  assert.equal(result.employees, 2);
  assert.equal(result.net, 19050);

  const { rows, totals } = await WageSheetsService.getRows({ sheetId: result.sheetId });
  assert.equal(rows[0].total_salary, 10000);
  assert.equal(rows[0].net_payable, 10050);
  assert.deepEqual(totals, { employees: 2, net: 19050, paid: 0, balance: 19050 });

  await assert.rejects(WageSheetsService.importSheet({ buffer: file, originalname: 'wages.xlsx' }, meta, accountant), { statusCode: 409 });

  await WageSheetsService.markPaid(result.sheetId);
  assert.equal((await WageSheetsService.getRows({ sheetId: result.sheetId })).totals.balance, 0);
});

test('a wage sheet with an Excel error or no calculated results is refused whole', async () => {
  const errorRow = await workbook((ws) => {
    employeeLine(ws, 6, 'Asha', 10050);
    employeeLine(ws, 7, 'Ravi', 9000);
    ws.getCell('K7').value = { formula: 'H7+I7', result: { error: '#VALUE!' } };
  });
  await assert.rejects(parseWageSheet(errorRow), /Row 7: net payable shows an Excel error/);

  const neverCalculated = await workbook((ws) => {
    employeeLine(ws, 6, 'Asha', 10050);
    ws.getCell('K6').value = { formula: 'H6+I6' };
  });
  await assert.rejects(parseWageSheet(neverCalculated), /have not been calculated/);

  await assert.rejects(parseWageSheet(Buffer.from('not excel')), /could not be read/);

  const wrong = new ExcelJS.Workbook();
  wrong.addWorksheet('x').getRow(1).values = ['Item', 'Qty'];
  await assert.rejects(parseWageSheet(Buffer.from(await wrong.xlsx.writeBuffer())), /No wage sheet found/);
});

test('WhatsApp sends once per employee, records failures and retries only those', async (t) => {
  const file = await workbook((ws) => {
    employeeLine(ws, 6, 'Meena', 500);
    employeeLine(ws, 7, 'Bad Number', 600);
    ws.getCell('M7').value = '123';
  });
  const { sheetId } = await WageSheetsService.importSheet(
    { buffer: file, originalname: 'w.xlsx' },
    { project_id: project.id, period_type: 'weekly', start_date: '2026-08-03', end_date: '2026-08-09' },
    accountant
  );

  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push(JSON.parse(options.body));
    return new Response('{}', { status: 200 });
  });

  assert.deepEqual(await WageSheetsService.sendWhatsApp(sheetId), { sent: 1, failed: 1, alreadySent: 0 });
  assert.equal(calls[0].to, '919876543210');
  assert.equal(calls[0].template.components[0].parameters[0].text, 'Meena');

  assert.deepEqual(await WageSheetsService.sendWhatsApp(sheetId), { sent: 0, failed: 1, alreadySent: 1 });
  assert.equal(calls.length, 1);
});


test('list exports total money columns and refuse unknown formats', async () => {
  const { tableToExcel, tableToPdf, sendTable } = await import('../src/utils/tableExport.js');
  const columns = [
    { header: 'Name', value: (r) => r.name, width: 10 },
    { header: 'Amount', value: (r) => r.amount, width: 10, money: true },
  ];
  const rows = [{ name: 'A', amount: 100.5 }, { name: 'B', amount: '49.5' }];

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await tableToExcel('Test', columns, rows));
  const sheet = wb.worksheets[0];
  assert.deepEqual(sheet.getRow(4).values.slice(1), ['TOTAL', 150]);

  const pdf = await tableToPdf('Test', columns, rows);
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  await assert.rejects(sendTable({}, 'csv', 'Test', columns, rows), { statusCode: 400 });
});
