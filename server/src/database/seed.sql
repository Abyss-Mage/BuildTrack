-- ========================================================
-- Construction Expense Tracker - Initial Seed Data
-- ========================================================

-- Default Categories for Construction Projects
INSERT IGNORE INTO categories (id, name, icon, description, is_active) VALUES
(1, 'Materials (Cement, Steel, Aggregates)', 'brick-wall', 'Raw building materials including cement, TMT steel, sand, stone, bricks', 1),
(2, 'Labor & Daily Wages', 'hard-hat', 'Direct site labor wages, contractor labor bills, attendance payouts', 1),
(3, 'Equipment & Machinery', 'tractor', 'Crane/JCB rental, concrete mixers, generator fuel, machine maintenance', 1),
(4, 'Transportation & Logistics', 'truck', 'Delivery of materials, freight transport, site vehicle fuel', 1),
(5, 'Subcontractor Payments', 'users', 'Electrical, plumbing, painting, fabrication, and HVAC specialists', 1),
(6, 'Permits, Testing & Legal', 'file-text', 'Municipal approvals, soil/concrete lab tests, compliance & safety inspections', 1),
(7, 'Safety Equipment & PPE', 'shield-check', 'Helmets, boots, vests, safety harnesses, scaffolding nets', 1),
(8, 'Site Utilities & Electricity', 'zap', 'Site power connections, diesel generators, water supply tankers', 1),
(9, 'Miscellaneous & Petty Cash', 'wallet', 'Urgent site purchases, printing drawings, snacks/tea, office supplies', 1);
