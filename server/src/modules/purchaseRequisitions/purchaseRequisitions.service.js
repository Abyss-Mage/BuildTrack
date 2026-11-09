import { PurchaseRequisitionsRepository } from './purchaseRequisitions.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { assertSiteAccess } from '../../utils/siteScope.js';

// Amount is always worked out here so a tampered form cannot change the total
const withAmounts = (items) =>
  items.map((item, index) => ({
    ...item,
    sr_no: index + 1,
    amount: item.rate === null ? 0 : Number((item.quantity * item.rate).toFixed(2)),
  }));

export class PurchaseRequisitionsService {
  static getAll(filters, user) {
    return PurchaseRequisitionsRepository.findAll(filters, user);
  }

  static async getById(id, user) {
    const requisition = await PurchaseRequisitionsRepository.findById(id);
    if (!requisition) throw ApiError.notFound('Purchase requisition not found');
    await assertSiteAccess(user, requisition.project_id);
    return requisition;
  }

  static async create(data, user) {
    await assertSiteAccess(user, data.project_id);
    return PurchaseRequisitionsRepository.create(data, withAmounts(data.items), user.id);
  }

  static async getEditable(id, user) {
    const requisition = await this.getById(id, user);
    if (user.role === 'site_in_charge' && requisition.created_by !== user.id) {
      throw ApiError.forbidden('You can only change requisitions you created.');
    }
    return requisition;
  }

  static async update(id, data, user) {
    await this.getEditable(id, user);
    await assertSiteAccess(user, data.project_id);
    return PurchaseRequisitionsRepository.update(id, data, withAmounts(data.items));
  }

  static async delete(id, user) {
    const requisition = await this.getEditable(id, user);
    await PurchaseRequisitionsRepository.delete(id);
    return requisition;
  }
}
