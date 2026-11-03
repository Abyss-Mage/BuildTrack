import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useUiStore } from '../store/uiStore';
import Modal from '../components/ui/Modal';
import {
  Tags,
  PlusCircle,
  Edit2,
  Check,
  X,
  Loader2,
  Search,
  Filter,
  RotateCcw,
} from 'lucide-react';

export function Categories() {
  const { showNotification } = useUiStore();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    is_active: '',
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: 'receipt',
    description: '',
    is_active: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.is_active !== '') params.is_active = filters.is_active;

      const res = await api.get('/categories', { params });
      setCategories(res.data.data || []);
    } catch (err) {
      showNotification('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCategories();
    }, 250);
    return () => clearTimeout(timer);
  }, [filters]);

  const resetFilters = () => {
    setFilters({ search: '', is_active: '' });
  };

  const hasActiveFilters = Boolean(filters.search || filters.is_active !== '');

  const openCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', icon: 'receipt', description: '', is_active: 1 });
    setIsModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      icon: cat.icon || 'receipt',
      description: cat.description || '',
      is_active: cat.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, formData);
        showNotification('Category updated successfully');
      } else {
        await api.post('/categories', formData);
        showNotification('New category created successfully');
      }
      setIsModalOpen(false);
      loadCategories();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to save category', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Tags className="w-6 h-6 text-brand-500" />
            <span>Construction Expense Categories</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Classify and tag vouchers by materials, labor, machinery, logistics, and site testing.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-8">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search category name, materials, labor, transport..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-4">
            <select
              value={filters.is_active}
              onChange={(e) => setFilters((prev) => ({ ...prev, is_active: e.target.value }))}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
            >
              <option value="">All Statuses (Active & Archived)</option>
              <option value="1">Active Only</option>
              <option value="0">Archived Only</option>
            </select>
          </div>
        </div>

        {/* Active Filters strip & Reset */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium">
            Showing <strong className="text-slate-900">{categories.length}</strong> categories
          </span>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors font-medium text-[11px]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Categories */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
          <p className="text-sm">Loading categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/80 p-8">
          <Tags className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No categories found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {hasActiveFilters ? 'Try adjusting your search filter' : 'Click "Add Category" to create a new category'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-brand-500/40 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      cat.is_active
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {cat.is_active ? 'Active' : 'Archived'}
                  </span>

                  <button
                    onClick={() => openEdit(cat)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Edit Category"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-2">{cat.name}</h3>

                {cat.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cat.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingCategory ? 'Edit Expense Category' : 'Create New Category'}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Scaffolding & Shuttering"
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Description / Scope
              </label>
              <textarea
                rows="2"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Items that belong to this category..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 mt-2">
                <input
                  type="checkbox"
                  checked={Boolean(formData.is_active)}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                  className="rounded text-brand-500 focus:ring-brand-500"
                />
                <span>Active (Available for field expense submissions)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{editingCategory ? 'Update Category' : 'Create Category'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default Categories;
