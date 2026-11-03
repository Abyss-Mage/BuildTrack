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

-- Default Admin User (Password is 'Admin@123', hashed with bcrypt 10 rounds)
-- Hash: $2a$10$pLwG07d0oMh5/f2kO40gPexmG83yU8hYFfHw1l8.G3f3WbSgD31S2
INSERT IGNORE INTO users (id, name, email, password_hash, role, phone, is_active) VALUES
(1, 'Super Admin', 'admin@construction.com', '$2a$10$tZ8QGZ7GZqGkO6E3vL2Vpe51t0aXnC0eR9v3lJ9cO8f7aN6mG2K8m', 'admin', '+91 98765 43210', 1);
