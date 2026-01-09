-- =============================================
-- THRIVE - Food Preparation Admin Dashboard
-- Database Schema for PostgreSQL
-- Version: 1.0
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUM TYPES
-- =============================================

CREATE TYPE location_status AS ENUM ('active', 'inactive');
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE order_status AS ENUM ('received', 'preparing', 'ready', 'delivered', 'cancelled');
CREATE TYPE menu_item_status AS ENUM ('draft', 'active');
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff', 'kitchen_staff');

-- =============================================
-- 1. LOCATIONS TABLE
-- Base entity - all location-dependent data references this
-- =============================================

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    currency VARCHAR(10) DEFAULT 'LKR',
    location_type VARCHAR(100),
    address TEXT,
    phone VARCHAR(50),
    status location_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 2. FOOD CATEGORIES TABLE
-- Categories appear as TABS on Ingredients page
-- Examples: Meat, Seafood, Vegetables, Dairy, Add Ons
-- =============================================

CREATE TABLE food_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_order INTEGER DEFAULT 0,
    show_specification BOOLEAN DEFAULT true,
    show_cook_type BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 3. FOOD TYPES TABLE
-- Types belong to Categories (shown in dropdowns)
-- Examples: Chicken, Beef -> Meat | Prawns, Fish -> Seafood
-- =============================================

CREATE TABLE food_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES food_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, name)
);

-- =============================================
-- 4. SPECIFICATIONS TABLE
-- Specs vary by Food Type
-- Examples: Chicken -> Breast, Thigh, Drumstick
--           Beef -> Steak, Mince, Cubes
-- =============================================

CREATE TABLE specifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    food_type_id UUID NOT NULL REFERENCES food_types(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(food_type_id, name)
);

-- =============================================
-- 5. COOK TYPES TABLE
-- Cooking methods vary by Category
-- Examples: Meat -> Grilled, Boiled, Pan-fried, etc.
-- =============================================

CREATE TABLE cook_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES food_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, name)
);

-- =============================================
-- 6. INGREDIENTS TABLE
-- Master list of ingredients
-- =============================================

CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    food_type_id UUID NOT NULL REFERENCES food_types(id) ON DELETE CASCADE,
    specification_id UUID REFERENCES specifications(id) ON DELETE SET NULL,
    cook_type_id UUID REFERENCES cook_types(id) ON DELETE SET NULL,
    name VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 7. INGREDIENT QUANTITIES TABLE
-- Quantity options with prices (100g, 250g, 300g, 400g)
-- =============================================

CREATE TABLE ingredient_quantities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity_value VARCHAR(50) NOT NULL,  -- e.g., '100g', '250g'
    quantity_grams INTEGER,               -- numeric value for sorting
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ingredient_id, quantity_value)
);

-- =============================================
-- 8. MENU ITEMS TABLE
-- Menu items per location (Location Dependent)
-- =============================================

CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    display_id VARCHAR(20),               -- e.g., '#001', '#002'
    name VARCHAR(255) NOT NULL,
    food_category_id UUID REFERENCES food_categories(id) ON DELETE SET NULL,
    food_type_id UUID REFERENCES food_types(id) ON DELETE SET NULL,
    quantity VARCHAR(100),
    specification_id UUID REFERENCES specifications(id) ON DELETE SET NULL,
    cook_type_id UUID REFERENCES cook_types(id) ON DELETE SET NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tags TEXT,                            -- comma-separated tags
    prep_workout VARCHAR(255),
    status menu_item_status DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 9. MENU ITEM PHOTOS TABLE
-- Multiple photos per menu item
-- =============================================

CREATE TABLE menu_item_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 10. MENU ITEM INGREDIENTS TABLE
-- Many-to-many: Menu items contain multiple ingredients
-- =============================================

CREATE TABLE menu_item_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    ingredient_quantity_id UUID REFERENCES ingredient_quantities(id) ON DELETE SET NULL,
    custom_quantity VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(menu_item_id, ingredient_id)
);

-- =============================================
-- 11. CUSTOMERS TABLE
-- Customer data per location (Location Dependent)
-- =============================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(50),
    address TEXT,
    account_status account_status DEFAULT 'active',
    total_preps INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(location_id, email)
);

-- =============================================
-- 12. USERS TABLE
-- Staff/Workers per location (Location Dependent)
-- =============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(50),
    role user_role DEFAULT 'staff',
    account_status account_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(location_id, email)
);

-- =============================================
-- 13. ORDERS TABLE
-- Orders/Preps per location (Location Dependent)
-- =============================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    order_number VARCHAR(50),             -- Human readable order ID
    status order_status DEFAULT 'received',
    total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 14. ORDER ITEMS TABLE
-- Items in each order
-- =============================================

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Location-based queries
CREATE INDEX idx_menu_items_location ON menu_items(location_id);
CREATE INDEX idx_customers_location ON customers(location_id);
CREATE INDEX idx_users_location ON users(location_id);
CREATE INDEX idx_orders_location ON orders(location_id);

-- Foreign key lookups
CREATE INDEX idx_food_types_category ON food_types(category_id);
CREATE INDEX idx_specifications_food_type ON specifications(food_type_id);
CREATE INDEX idx_cook_types_category ON cook_types(category_id);
CREATE INDEX idx_ingredients_food_type ON ingredients(food_type_id);
CREATE INDEX idx_ingredient_quantities_ingredient ON ingredient_quantities(ingredient_id);

-- Order queries
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Menu item queries
CREATE INDEX idx_menu_items_status ON menu_items(status);
CREATE INDEX idx_menu_item_ingredients_menu ON menu_item_ingredients(menu_item_id);

-- =============================================
-- TRIGGER: Auto-update updated_at timestamp
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_food_categories_updated_at BEFORE UPDATE ON food_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_food_types_updated_at BEFORE UPDATE ON food_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TRIGGER: Auto-generate menu item display_id
-- =============================================

CREATE OR REPLACE FUNCTION generate_menu_display_id()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(display_id FROM 2) AS INTEGER)), 0) + 1
    INTO next_num
    FROM menu_items
    WHERE location_id = NEW.location_id;
    
    NEW.display_id = '#' || LPAD(next_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_menu_item_display_id 
BEFORE INSERT ON menu_items 
FOR EACH ROW 
WHEN (NEW.display_id IS NULL)
EXECUTE FUNCTION generate_menu_display_id();

-- =============================================
-- TRIGGER: Update customer total_preps count
-- =============================================

CREATE OR REPLACE FUNCTION update_customer_total_preps()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE customers SET total_preps = total_preps + 1 WHERE id = NEW.customer_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE customers SET total_preps = total_preps - 1 WHERE id = OLD.customer_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customer_preps_on_order
AFTER INSERT OR DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_customer_total_preps();

