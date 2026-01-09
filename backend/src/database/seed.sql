-- =============================================
-- THRIVE - Seed Data
-- Default Food Categories, Types, Specifications, Cook Types
-- =============================================

-- =============================================
-- 1. FOOD CATEGORIES
-- These appear as TABS on the Ingredients page
-- =============================================

INSERT INTO food_categories (name, display_order, show_specification, show_cook_type) VALUES
    ('Meat', 1, true, true),
    ('Seafood', 2, true, true),
    ('Vegetables', 3, false, true),      -- No specifications for vegetables
    ('Dairy', 4, true, false),           -- No cook type for dairy (or "No Cooking")
    ('Add Ons', 5, true, true);

-- =============================================
-- 2. FOOD TYPES
-- Types belong to Categories
-- =============================================

-- Meat Types
INSERT INTO food_types (category_id, name) 
SELECT id, 'Chicken' FROM food_categories WHERE name = 'Meat';
INSERT INTO food_types (category_id, name) 
SELECT id, 'Beef' FROM food_categories WHERE name = 'Meat';
INSERT INTO food_types (category_id, name) 
SELECT id, 'Lamb' FROM food_categories WHERE name = 'Meat';
INSERT INTO food_types (category_id, name) 
SELECT id, 'Turkey' FROM food_categories WHERE name = 'Meat';

-- Seafood Types
INSERT INTO food_types (category_id, name) 
SELECT id, 'Fish' FROM food_categories WHERE name = 'Seafood';
INSERT INTO food_types (category_id, name) 
SELECT id, 'Prawns' FROM food_categories WHERE name = 'Seafood';
INSERT INTO food_types (category_id, name) 
SELECT id, 'Cuttle Fish' FROM food_categories WHERE name = 'Seafood';

-- Vegetable Types
INSERT INTO food_types (category_id, name) 
SELECT id, 'Potatoes' FROM food_categories WHERE name = 'Vegetables';
INSERT INTO food_types (category_id, name) 
SELECT id, 'Broccoli' FROM food_categories WHERE name = 'Vegetables';
INSERT INTO food_types (category_id, name) 
SELECT id, 'Carrots' FROM food_categories WHERE name = 'Vegetables';
INSERT INTO food_types (category_id, name) 
SELECT id, 'Spinach' FROM food_categories WHERE name = 'Vegetables';

-- Dairy Types
INSERT INTO food_types (category_id, name) 
SELECT id, 'Cheese' FROM food_categories WHERE name = 'Dairy';
INSERT INTO food_types (category_id, name) 
SELECT id, 'Yogurt' FROM food_categories WHERE name = 'Dairy';

-- Add Ons Types
INSERT INTO food_types (category_id, name) 
SELECT id, 'Sauces' FROM food_categories WHERE name = 'Add Ons';
INSERT INTO food_types (category_id, name) 
SELECT id, 'Spices' FROM food_categories WHERE name = 'Add Ons';

-- =============================================
-- 3. SPECIFICATIONS
-- Vary by Food Type
-- =============================================

-- Chicken Specifications
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Breast' FROM food_types WHERE name = 'Chicken';
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Thigh' FROM food_types WHERE name = 'Chicken';
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Drumstick' FROM food_types WHERE name = 'Chicken';

-- Beef Specifications
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Steak' FROM food_types WHERE name = 'Beef';
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Mince' FROM food_types WHERE name = 'Beef';
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Cubes' FROM food_types WHERE name = 'Beef';

-- Lamb Specifications
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Steak' FROM food_types WHERE name = 'Lamb';
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Mince' FROM food_types WHERE name = 'Lamb';
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Cubes' FROM food_types WHERE name = 'Lamb';

-- Turkey Specifications
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Breast' FROM food_types WHERE name = 'Turkey';
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Thigh' FROM food_types WHERE name = 'Turkey';

-- Fish Specifications
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Fillet' FROM food_types WHERE name = 'Fish';
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Steak' FROM food_types WHERE name = 'Fish';
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Whole' FROM food_types WHERE name = 'Fish';

-- Prawns Specifications
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Peeled' FROM food_types WHERE name = 'Prawns';
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Whole' FROM food_types WHERE name = 'Prawns';

-- Cuttle Fish Specifications
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Rings' FROM food_types WHERE name = 'Cuttle Fish';
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Whole' FROM food_types WHERE name = 'Cuttle Fish';

-- Cheese Specifications
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Mozzarella' FROM food_types WHERE name = 'Cheese';
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Cheddar' FROM food_types WHERE name = 'Cheese';

-- Yogurt Specifications
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Plain' FROM food_types WHERE name = 'Yogurt';
INSERT INTO specifications (food_type_id, name)
SELECT id, 'Low Fat' FROM food_types WHERE name = 'Yogurt';

-- =============================================
-- 4. COOK TYPES
-- Vary by Food Category
-- =============================================

-- Meat Cook Types
INSERT INTO cook_types (category_id, name)
SELECT id, 'Grilled' FROM food_categories WHERE name = 'Meat';
INSERT INTO cook_types (category_id, name)
SELECT id, 'Boiled' FROM food_categories WHERE name = 'Meat';
INSERT INTO cook_types (category_id, name)
SELECT id, 'Pan-fried' FROM food_categories WHERE name = 'Meat';
INSERT INTO cook_types (category_id, name)
SELECT id, 'Air-fried' FROM food_categories WHERE name = 'Meat';
INSERT INTO cook_types (category_id, name)
SELECT id, 'Steamed' FROM food_categories WHERE name = 'Meat';
INSERT INTO cook_types (category_id, name)
SELECT id, 'Roasted' FROM food_categories WHERE name = 'Meat';

-- Seafood Cook Types
INSERT INTO cook_types (category_id, name)
SELECT id, 'Grilled' FROM food_categories WHERE name = 'Seafood';
INSERT INTO cook_types (category_id, name)
SELECT id, 'Pan-fried' FROM food_categories WHERE name = 'Seafood';
INSERT INTO cook_types (category_id, name)
SELECT id, 'Steamed' FROM food_categories WHERE name = 'Seafood';
INSERT INTO cook_types (category_id, name)
SELECT id, 'Baked' FROM food_categories WHERE name = 'Seafood';

-- Vegetables Cook Types
INSERT INTO cook_types (category_id, name)
SELECT id, 'Steamed' FROM food_categories WHERE name = 'Vegetables';
INSERT INTO cook_types (category_id, name)
SELECT id, 'Stir-fried' FROM food_categories WHERE name = 'Vegetables';
INSERT INTO cook_types (category_id, name)
SELECT id, 'Roasted' FROM food_categories WHERE name = 'Vegetables';
INSERT INTO cook_types (category_id, name)
SELECT id, 'Raw' FROM food_categories WHERE name = 'Vegetables';

-- Dairy Cook Types (No Cooking)
INSERT INTO cook_types (category_id, name)
SELECT id, 'No Cooking' FROM food_categories WHERE name = 'Dairy';

-- Add Ons Cook Types
INSERT INTO cook_types (category_id, name)
SELECT id, 'No Cooking' FROM food_categories WHERE name = 'Add Ons';
INSERT INTO cook_types (category_id, name)
SELECT id, 'Heated' FROM food_categories WHERE name = 'Add Ons';

-- =============================================
-- 5. SAMPLE LOCATION
-- =============================================

INSERT INTO locations (name, currency, location_type, status) VALUES
    ('One Galle Face', 'LKR', 'Restaurant', 'active');

-- =============================================
-- 6. SAMPLE ADMIN USER
-- Password: admin123 (you should change this!)
-- Note: In production, use bcrypt hash
-- =============================================

INSERT INTO users (location_id, email, password_hash, name, role, account_status)
SELECT 
    id,
    'admin@thrive.lk',
    '$2b$10$example.hash.replace.with.real.bcrypt.hash',  -- Replace with real bcrypt hash
    'Admin User',
    'admin',
    'active'
FROM locations WHERE name = 'One Galle Face';

-- =============================================
-- Verification Queries (Optional - run to verify)
-- =============================================

-- SELECT * FROM food_categories ORDER BY display_order;
-- SELECT fc.name as category, ft.name as type FROM food_types ft JOIN food_categories fc ON ft.category_id = fc.id ORDER BY fc.display_order, ft.name;
-- SELECT ft.name as food_type, s.name as specification FROM specifications s JOIN food_types ft ON s.food_type_id = ft.id ORDER BY ft.name, s.name;
-- SELECT fc.name as category, ct.name as cook_type FROM cook_types ct JOIN food_categories fc ON ct.category_id = fc.id ORDER BY fc.display_order, ct.name;

