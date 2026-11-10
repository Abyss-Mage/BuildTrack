import { AdvancesRepository } from './advances.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { istNow } from '../../utils/time.js';
import { UsersRepository } from '../users/users.repository.js';

const rupees = (value) => `₹${Number(value).toLocaleString('en-IN')}`;

export class AdvancesService {
  static getAdvances(filters, user) {
    return AdvancesRepository.findAll(filters, user);
  }

  static async getSummary(user, filters = {}) {
    const approved = await AdvancesRepository.findAll({ ...filters, status: 'approved' }, user);
    const totalAllocated = approved.reduce((sum, a) => sum + Number(a.amount), 0);
    const totalSubmitted = approved.reduce((sum, a) => sum + a.spent, 0);
    return {
      totalAllocated,
      totalSubmitted,
      remaining: Number((totalAllocated - totalSubmitted).toFixed(2)),
    };
  }

  static async createAdvance(data, user) {
    if (data.start_date > data.end_date) {
      throw ApiError.badRequest('Period start cannot be after period end');
    }
    const person = await UsersRepository.findById(data.site_in_charge_id);
    if (person?.role !== 'site_in_charge' || !person.is_active) {
      throw ApiError.badRequest('Select an active Site In-Charge.');
    }

    // Only a Super Admin can approve, so their own allocation needs no second step
    const isAdmin = user.role === 'admin';
    const id = await AdvancesRepository.create(
      data,
      isAdmin ? 'approved' : 'pending',
      isAdmin ? user.id : null,
      isAdmin ? istNow() : null,
      user.id
    );
    return AdvancesRepository.findById(id);
  }

  static async approveAdvance(id, user) {
    const advance = await this.requireAdvance(id);
    if (advance.status !== 'pending') {
      throw ApiError.badRequest(`Cannot approve an advance in '${advance.status}' status.`);
    }
    await this.applyStatus(advance, 'approved', user.id, istNow());
    return AdvancesRepository.findById(id);
  }

  static async rejectAdvance(id) {
    const advance = await this.requireAdvance(id);
    if (advance.status === 'rejected') {
      throw ApiError.badRequest('This advance is already rejected.');
    }
    if ((await AdvancesRepository.spentOn(id)) > 0) {
      throw ApiError.badRequest('Expenses are already recorded against this advance, so it cannot be rejected.');
    }
    await this.applyStatus(advance, 'rejected', null, null);
    return AdvancesRepository.findById(id);
  }

  static async requireAdvance(id) {
    const advance = await AdvancesRepository.findById(id);
    if (!advance) throw ApiError.notFound('Advance not found');
    return advance;
  }

  static async applyStatus(advance, toStatus, approverId, approvedAt) {
    const changed = await AdvancesRepository.setStatus(advance.id, advance.status, toStatus, approverId, approvedAt);
    if (changed === 0) {
      throw ApiError.conflict('This advance was just changed by someone else. Refresh and try again.');
    }
  }

  /**
   * Checks an expense may be linked to this advance. Drafts do not spend the balance, so they skip that check.
   * shortcut: two submissions in the same instant could both pass the balance check; fine for one person per advance, use a row lock if advances are ever shared.
   */
  static async assertLinkable({ advanceId, projectId, amount, status, excludeExpenseId }, user) {
    const advance = await AdvancesRepository.findById(advanceId);
    if (!advance || advance.status !== 'approved') {
      throw ApiError.badRequest('Select an approved advance for this expense.');
    }
    if (advance.project_id !== Number(projectId)) {
      throw ApiError.badRequest('This advance belongs to a different site.');
    }
    if (user.role === 'site_in_charge' && advance.site_in_charge_id !== user.id) {
      throw ApiError.forbidden('This advance is not allocated to you.');
    }
    if (status === 'draft') return;

    const remaining = Number((advance.amount - (await AdvancesRepository.spentOn(advanceId, excludeExpenseId))).toFixed(2));
    if (Number(amount) > remaining) {
      throw ApiError.badRequest(
        `This expense of ${rupees(amount)} is more than the ${rupees(remaining)} left on the advance. Ask for a new advance first.`
      );
    }
  }

  /** Every expense rule that depends on the site and advance, shared by create, edit and submit. */
  static async assertExpenseAllowed({ projectId, advanceId, amount, status, excludeExpenseId = 0 }, user) {
    if (user.role === 'site_in_charge' && !advanceId && status !== 'draft') {
      throw ApiError.badRequest('Select the advance this expense is paid from.');
    }
    if (advanceId) {
      await this.assertLinkable({ advanceId, projectId, amount, status, excludeExpenseId }, user);
    }
  }
}
