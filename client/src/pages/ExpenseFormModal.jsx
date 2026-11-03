import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import { useUiStore } from '../store/uiStore';
import { UploadCloud, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';

export function ExpenseFormModal({ isOpen, onClose, onSuccess, initialExpense = null }) {
  const { showNotification } = useUiStore();

  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    project_id: '',
    category_id: '',
    title: '',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    payment_method: 'cash',
    status: 'pending',
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    const loadMeta = async () => {
      try {
        setLoadingInitial(true);
        const [projRes, catRes] = await Promise.all([
          api.get('/projects'),
          api.get('/categories'),
        ]);
        setProjects(projRes.data.data || []);
        setCategories(catRes.data.data?.filter((c) => c.is_active) || []);

        if (initialExpense) {
          setFormData({
            project_id: initialExpense.project_id || '',
            category_id: initialExpense.category_id || '',
            title: initialExpense.title || '',
            description: initialExpense.description || '',
            amount: initialExpense.amount || '',
            expense_date: initialExpense.expense_date || new Date().toISOString().split('T')[0],
            vendor_name: initialExpense.vendor_name || '',
            payment_method: initialExpense.payment_method || 'cash',
            status: initialExpense.status || 'pending',
          });
        } else if (projRes.data.data?.length > 0) {
          setFormData((prev) => ({
            ...prev,
            project_id: projRes.data.data[0].id,
            category_id: catRes.data.data?.[0]?.id || '',
          }));
        }
      } catch (err) {
        showNotification(err.response?.data?.message || 'Failed to load form options', 'error');
      } finally {
        setLoadingInitial(false);
      }
    };

    loadMeta();
  }, [isOpen, initialExpense]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 5) {
      showNotification('Maximum 5 receipts allowed per expense entry', 'error');
      return;
    }

    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);

    // Generate previews
    const previews = newFiles.map((f) => ({
      name: f.name,
      size: (f.size / 1024).toFixed(1) + ' KB',
      isImage: f.type.startsWith('image/'),
      url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    }));
    setFilePreviews(previews);
  };

  const removeFile = (idx) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== idx);
    setSelectedFiles(updatedFiles);
    setFilePreviews(updatedFiles.map((f) => ({
      name: f.name,
      size: (f.size / 1024).toFixed(1) + ' KB',
      isImage: f.type.startsWith('image/'),
      url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    })));
  };

  const handleSubmit = async (e, forcedStatus = null) => {
    e.preventDefault();

    if (!formData.project_id || !formData.category_id) {
      showNotification('Please select both a Project and a Category', 'error');
      return;
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
      showNotification('Please enter a valid expense amount', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const data = new FormData();
      data.append('project_id', formData.project_id);
      data.append('category_id', formData.category_id);
      data.append('title', formData.title);
      data.append('description', formData.description || '');
      data.append('amount', formData.amount);
      data.append('expense_date', formData.expense_date);
      data.append('vendor_name', formData.vendor_name || '');
      data.append('payment_method', formData.payment_method);
      data.append('status', forcedStatus || formData.status || 'pending');

      selectedFiles.forEach((file) => {
        data.append('receipts', file);
      });

      if (initialExpense) {
        await api.put(`/expenses/${initialExpense.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showNotification('Expense entry updated successfully');
      } else {
        await api.post('/expenses', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showNotification('Expense created and queued for review');
      }

      onSuccess();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to save expense', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialExpense ? 'Edit Expense Record' : 'Record New Site Expense'}
      maxWidth="max-w-3xl"
    >
      {loadingInitial ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
          <p className="text-sm">Loading project information...</p>
        </div>
      ) : (
        <form onSubmit={(e) => handleSubmit(e, 'pending')} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Project */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Project / Construction Site *
              </label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                <option value="" disabled>Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.code}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Expense Category *
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                <option value="" disabled>Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Expense Title / Item Description *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. 500 Bags UltraTech Cement for 4th Slab Casting"
              required
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Total Amount (INR ₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-medium">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                  className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none font-semibold text-slate-900"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Expense Date *
              </label>
              <input
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
              </input>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Payment Method
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                <option value="cash">Cash / Petty Cash</option>
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="cheque">Cheque</option>
                <option value="credit_card">Company Card</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Vendor */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Vendor / Supplier Name
              </label>
              <input
                type="text"
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                placeholder="e.g. Apex Building Materials Ltd"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Bill / Invoice No or Reference Note
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Inv #8402, delivered at Site Yard"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          {/* Receipt Upload Zone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Attach Receipt / Bill Photos (Max 5, Auto-Compressed)
            </label>
            <label className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-brand-50/20">
              <UploadCloud className="w-8 h-8 text-slate-400 mb-1" />
              <span className="text-xs font-medium text-slate-700">
                Click to browse or take photo from site
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                Supports JPG, PNG, WEBP and PDF invoices (auto-compressed)
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* Selected File Thumbnails */}
            {filePreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
                {filePreviews.map((f, i) => (
                  <div
                    key={i}
                    className="relative group rounded-xl border border-slate-200 overflow-hidden bg-white p-1 text-center shadow-sm"
                  >
                    {f.isImage ? (
                      <img
                        src={f.url}
                        alt="preview"
                        className="h-20 w-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="h-20 w-full bg-slate-100 rounded-lg flex flex-col items-center justify-center">
                        <FileText className="w-6 h-6 text-slate-500" />
                        <span className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">PDF</span>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-700 font-medium truncate mt-1 px-1">
                      {f.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'draft')}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Save as Draft
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-slate-950 bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{initialExpense ? 'Update Expense' : 'Submit for Approval'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default ExpenseFormModal;
