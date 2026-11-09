// The rules that protect money: run with `npm test` (needs Node 22.5+ for the in-memory SQLite database).
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Set before anything loads the config, so a developer's .env can never point these tests at a real database
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: 'test', DB_CLIENT: 'sqlite', SQLITE_FILE: ':memory:', INITIAL_ADMIN_PASSWORD: 'test' });

const { default: db } = await import('../src/config/database.js');
const { initializeDatabase } = await import('../src/database/init.js');
const { UsersRepository } = await import('../src/modules/users/users.repository.js');
const { ProjectsRepository } = await import('../src/modules/projects/projects.repository.js');
const { ExpensesRepository } = await import('../src/modules/expenses/expenses.repository.js');
const { AccountsRepository } = await import('../src/modules/accounts/accounts.repository.js');
const { ApprovalsService } = await import('../src/modules/approvals/approvals.service.js');
const { PayrollService } = await import('../src/modules/payroll/payroll.service.js');

await initializeDatabase();

const makeUser = (name, role) => UsersRepository.create({ name, email: `${name}@test.local`, password_hash: 'x', role });
const admin = await makeUser('admin2', 'admin');
const manager = await makeUser('manager', 'project_manager');
const otherManager = await makeUser('manager2', 'project_manager');
const accountant = await makeUser('accountant', 'accountant');
const engineer = await makeUser('engineer', 'site_engineer');
const project = await ProjectsRepository.create({ name: 'Site', code: 'S1', location: 'Pune', total_budget: 100000 }, admin.id);
const { id: categoryId } = await db.getOne('SELECT id FROM categories LIMIT 1');

const voucher = (user, title = 'Cement') =>
  ExpensesRepository.create({ project_id: project.id, category_id: categoryId, title, amount: 100, expense_date: '2026-11-02' }, [], user.id);

const wages = (start_date, end_date, extra = {}) =>
  PayrollService.createPayroll({ user_id: engineer.id, start_date, end_date, base_salary: 1000, allowances: 200, deductions: 50, ...extra }, accountant.id);

test('a manager cannot approve their own voucher, another manager can', async () => {
  const { id } = await voucher(manager);
  await assert.rejects(ApprovalsService.approveExpense(id, manager), { statusCode: 403 });
  assert.equal((await ApprovalsService.approveExpense(id, otherManager)).status, 'approved');
});

test('only one of two simultaneous approvals goes through', async () => {
  const { id } = await voucher(engineer);
  const results = await Promise.allSettled([
    ApprovalsService.approveExpense(id, manager),
    ApprovalsService.approveExpense(id, otherManager),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), ['fulfilled', 'rejected']);
  assert.equal((await ExpensesRepository.findById(id)).approvals.length, 1);
});

test('rejecting an approved voucher clears its approver', async () => {
  const { id } = await voucher(engineer);
  await ApprovalsService.approveExpense(id, manager);
  const rejected = await ApprovalsService.rejectExpense(id, accountant, 'Wrong site');
  assert.equal(rejected.approved_by, null);
  assert.equal(rejected.approved_at, null);
});

test('a voucher can only be paid once, and only after approval', async () => {
  const { id } = await voucher(engineer);
  assert.equal(await AccountsRepository.processPayout(id, accountant.id, {}), null);
  await ApprovalsService.approveExpense(id, manager);
  assert.equal((await AccountsRepository.processPayout(id, accountant.id, {})).status, 'processed');
  assert.equal(await AccountsRepository.processPayout(id, accountant.id, {}), null);
});

test('payout keeps a past payment date and ignores a future one', async () => {
  const pay = async (payment_date) => {
    const { id } = await voucher(engineer);
    await ApprovalsService.approveExpense(id, manager);
    return (await AccountsRepository.processPayout(id, accountant.id, { payment_date })).processed_at;
  };
  assert.match(await pay('2026-01-15'), /^2026-01-15 /);
  assert.ok(!(await pay('2999-01-01')).startsWith('2999'));
});

test('simultaneous vouchers get different numbers', async () => {
  const created = await Promise.all([1, 2, 3].map(() => voucher(engineer)));
  assert.equal(new Set(created.map((e) => e.reference_no)).size, 3);
});

test('net pay is base plus allowances minus deductions', async () => {
  assert.equal((await wages('2026-01-05', '2026-01-11')).net_salary, 1150);
});

test('editing wage dates updates the month and label and refuses overlaps', async () => {
  await wages('2026-02-02', '2026-02-08');
  const record = await wages('2026-02-09', '2026-02-15', { payroll_period: 'Site A' });
  assert.equal(record.payroll_period, 'Site A (2026-02-09 to 2026-02-15)');

  await assert.rejects(PayrollService.updatePayroll(record.id, { start_date: '2026-02-08' }, accountant), { statusCode: 409 });

  const moved = await PayrollService.updatePayroll(
    record.id,
    { start_date: '2026-03-02', end_date: '2026-03-08', payroll_period: record.payroll_period },
    accountant
  );
  assert.equal(moved.payroll_period, 'Site A (2026-03-02 to 2026-03-08)');
  assert.equal(moved.payroll_month, '2026-03');
});

test('paid wages are locked except for an admin, and cannot be paid twice', async () => {
  const { id } = await wages('2026-04-06', '2026-04-12');
  await PayrollService.markAsPaid(id, { payment_reference: 'UTR1' });

  await assert.rejects(PayrollService.markAsPaid(id, { payment_reference: 'UTR2' }), { statusCode: 400 });
  await assert.rejects(PayrollService.updatePayroll(id, { base_salary: 1 }, accountant), { statusCode: 403 });
  await assert.rejects(PayrollService.deletePayroll(id, accountant), { statusCode: 403 });

  assert.equal((await PayrollService.updatePayroll(id, { notes: 'Fixed' }, admin)).notes, 'Fixed');
});
