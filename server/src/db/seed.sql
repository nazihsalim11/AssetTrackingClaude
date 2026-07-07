-- Baseline reference data

INSERT INTO departments (name) VALUES
  ('IT'), ('Facilities'), ('Finance'), ('Human Resources'), ('Operations')
ON CONFLICT DO NOTHING;

INSERT INTO categories (name, type) VALUES
  ('Tables', 'office'), ('Chairs', 'office'), ('Cabinets', 'office'),
  ('AC Units', 'office'), ('Pantry Equipment', 'office'),
  ('Electrical Equipment', 'office'), ('Conference Room Equipment', 'office'),
  ('Miscellaneous Office Assets', 'office'),
  ('Laptops', 'it'), ('Desktops', 'it'), ('Monitors', 'it'),
  ('Keyboards', 'it'), ('Mouse', 'it'), ('Headsets', 'it'),
  ('Servers', 'it'), ('UPS', 'it'), ('Batteries', 'it'),
  ('Printers', 'it'), ('Network Equipment', 'it'), ('Storage Devices', 'it')
ON CONFLICT DO NOTHING;
