import { CategoriesRepository } from './categories.repository.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { logAudit } from '../../utils/auditLogger.js';

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await CategoriesRepository.findAll(req.query);
  res.status(200).json({ success: true, data: categories });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, icon, description } = req.body;
  if (!name) throw ApiError.badRequest('Category name is required');
  const cat = await CategoriesRepository.create({ name, icon, description });

  await logAudit(req, {
    action: 'CATEGORY_CREATE',
    entityType: 'category',
    entityId: cat.id,
    details: { name: cat.name },
  });

  res.status(201).json({ success: true, message: 'Category created', data: cat });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { name, icon, description, is_active } = req.body;
  const cat = await CategoriesRepository.update(req.params.id, {
    name,
    icon,
    description,
    is_active: is_active !== undefined ? is_active : 1,
  });

  await logAudit(req, {
    action: 'CATEGORY_UPDATE',
    entityType: 'category',
    entityId: cat.id,
    details: { name, is_active },
  });

  res.status(200).json({ success: true, message: 'Category updated', data: cat });
});
