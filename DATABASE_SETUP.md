# 🗄️ Database Setup Guide for GreenHeaven

## Database Options for Your Plant E-commerce Site

### 1. **Recommended Database Solutions**

#### **Option A: Supabase (Recommended for Beginners)**
- ✅ **Free tier available** (up to 500MB)
- ✅ **Built-in authentication** with social logins
- ✅ **Real-time subscriptions**
- ✅ **Instant APIs** with row-level security
- ✅ **Easy deployment**

#### **Option B: MongoDB Atlas**
- ✅ **Free tier** (512MB)
- ✅ **Cloud hosted**
- ✅ **Flexible document structure**
- ✅ **Great for rapid development**

#### **Option C: PostgreSQL (Self-hosted)**
- ✅ **Completely free**
- ✅ **Most robust**
- ✅ **Full control**
- ❌ **Requires server management**

#### **Option D: MySQL/MariaDB**
- ✅ **Widely supported**
- ✅ **Many hosting options**
- ✅ **Good performance**

---

## 🚀 Quick Setup with Supabase (Recommended)

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up and create a new project
3. Wait for database to initialize (2-3 minutes)
4. Get your project URL and anon key

### Step 2: Install Dependencies
```bash
npm install @supabase/supabase-js
npm install --save-dev @types/bcryptjs bcryptjs
```

### Step 3: Environment Variables
Create `.env` file in your root directory:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

---

## 📊 Database Schema Design

### Users Table
```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### User Addresses Table
```sql
CREATE TABLE user_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  address_type VARCHAR(50) DEFAULT 'shipping', -- 'shipping', 'billing'
  street_address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) DEFAULT 'India',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Payment Methods Table
```sql
CREATE TABLE payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  payment_type VARCHAR(50) NOT NULL, -- 'card', 'upi', 'bank_transfer'
  card_last_four VARCHAR(4), -- Last 4 digits only (NEVER store full card numbers)
  card_brand VARCHAR(50), -- 'visa', 'mastercard', etc.
  upi_id VARCHAR(255),
  bank_name VARCHAR(255),
  account_holder_name VARCHAR(255),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Orders Table
```sql
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  shipping_address JSONB NOT NULL,
  billing_address JSONB,
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  payment_method VARCHAR(50),
  payment_details JSONB, -- Store encrypted payment reference (NOT card details)
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Order Items Table
```sql
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  plant_id VARCHAR(255) NOT NULL,
  plant_name VARCHAR(255) NOT NULL,
  plant_image_url TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Plants Table (Enhanced)
```sql
CREATE TABLE plants (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  category VARCHAR(100) NOT NULL,
  images TEXT[] DEFAULT '{}',
  stock_quantity INTEGER DEFAULT 0,
  features TEXT[] DEFAULT '{}',
  care_level VARCHAR(50) DEFAULT 'Medium',
  sunlight_requirement VARCHAR(50) DEFAULT 'Medium',
  watering_frequency VARCHAR(50) DEFAULT 'Medium',
  pet_friendly BOOLEAN DEFAULT false,
  low_maintenance BOOLEAN DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  trending BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  in_stock BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Shopping Cart Table
```sql
CREATE TABLE shopping_cart (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plant_id VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, plant_id)
);
```

---

## 🔒 Security Best Practices

### ⚠️ NEVER Store These in Database:
- ❌ Full credit card numbers
- ❌ CVV codes
- ❌ Plain text passwords
- ❌ Bank account numbers

### ✅ DO Store These Securely:
- ✅ Hashed passwords (using bcrypt)
- ✅ Last 4 digits of cards only
- ✅ Payment gateway transaction IDs
- ✅ Encrypted UPI IDs (if needed)

### Password Security
```javascript
// Hash password before storing
const bcrypt = require('bcryptjs');
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

// Verify password
const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};
```

---

## 🏗️ Implementation Steps

### 1. Set up Supabase Connection
```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### 2. Update Server Routes
Replace in-memory storage with database calls:
```javascript
// Instead of: const users = new Map();
// Use: Database queries with Supabase

// Example: Create user
const createUser = async (userData) => {
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select()
  
  if (error) throw error
  return data[0]
}
```

### 3. Migrate Existing Data
Create migration scripts to move your current in-memory data to the database.

---

## 📱 MCP Integration for Database Management

For easier database management, I recommend connecting to:

1. **Supabase MCP Server** - Direct database management
2. **Prisma MCP Server** - If using Prisma ORM
3. **Neon MCP Server** - For Neon PostgreSQL

You can connect these by clicking [Open MCP popover](#open-mcp-popover) in your interface.

---

## 🔄 Migration Timeline

1. **Week 1**: Set up database and basic tables
2. **Week 2**: Migrate user authentication 
3. **Week 3**: Move order and payment data
4. **Week 4**: Full testing and optimization

---

## 💡 Additional Features to Consider

- **Order Tracking**: Add tracking numbers and delivery updates
- **Inventory Management**: Real-time stock updates
- **Analytics**: Track user behavior and sales
- **Reviews System**: Customer reviews and ratings
- **Wishlist**: Save plants for later
- **Notifications**: Email/SMS order confirmations

---

## 🆘 Need Help?

1. **Supabase Documentation**: [docs.supabase.com](https://docs.supabase.com)
2. **Database Design Tools**: [dbdiagram.io](https://dbdiagram.io)
3. **Security Guide**: Follow OWASP guidelines for e-commerce security

Remember: Start with Supabase for easiest setup, then scale to dedicated hosting if needed!
Commit at 2024-12-17T13:15:56
Commit at 2026-02-03T04:02:44
Commit at 2023-09-29T17:25:37
Commit at 2026-01-11T07:54:34
Commit at 2025-12-30T02:28:22
Commit at 2026-01-15T07:35:42
Commit at 2023-06-26T12:35:34
Commit at 2023-11-13T12:35:30
Commit at 2023-02-19T09:51:20
Commit at 2025-11-13T22:02:04
Commit at 2026-02-06T17:19:11
Commit at 2023-03-20T11:13:59
Commit at 2023-10-27T13:36:02
Commit at 2024-03-01T09:46:28
Commit at 2023-08-20T01:56:17
Commit at 2025-05-10T15:24:02
Commit at 2023-12-26T09:54:37
Commit at 2023-06-03T06:36:15
Commit at 2024-05-31T21:00:47
Commit at 2023-07-30T22:36:11
Commit at 2024-09-13T17:45:04
Commit at 2026-02-03T21:26:15
Commit at 2024-06-17T04:21:45
Commit at 2025-04-03T06:40:01
Commit at 2025-09-19T16:35:14
Commit at 2026-01-11T11:33:45
Commit at 2023-06-03T03:30:21
Commit at 2023-11-19T11:15:13
Commit at 2023-04-10T22:08:35
Commit at 2024-01-11T17:11:17
Commit at 2026-01-08T08:51:12
Commit at 2023-07-22T03:48:08
Commit at 2024-09-29T11:47:41
Commit at 2025-04-27T14:18:12
Commit at 2025-10-07T11:59:07
Commit at 2025-07-30T20:15:18
Commit at 2026-02-07T01:25:49
Commit at 2023-01-22T19:51:01
Commit at 2023-12-11T07:07:32
Commit at 2024-05-01T03:44:47
Commit at 2023-06-28T20:05:41
Commit at 2026-01-04T02:36:19
Commit at 2024-01-28T13:10:20
Commit at 2026-01-29T21:25:49
Commit at 2025-02-02T18:55:34
Commit at 2025-07-18T02:10:50
Commit at 2025-12-30T02:57:54
Commit at 2023-10-24T03:53:36
Commit at 2025-09-29T22:46:14
Commit at 2025-05-24T08:51:07
Commit at 2023-07-28T12:34:02
Commit at 2024-09-17T06:35:45
Commit at 2025-03-06T20:24:53
Commit at 2023-11-24T15:49:39
Commit at 2024-01-30T19:21:10
Commit at 2026-01-29T04:13:50
Commit at 2025-12-23T13:54:41
Commit at 2024-04-09T17:37:26
Commit at 2026-01-04T07:15:36
Commit at 2026-01-10T23:01:47
Commit at 2026-01-22T08:18:06
Commit at 2025-03-18T06:34:01
Commit at 2023-03-27T06:15:01
Commit at 2026-01-14T18:21:44
Commit at 2023-04-03T07:59:33
Commit at 2024-08-16T07:53:16
Commit at 2024-04-26T17:54:45
Commit at 2025-06-06T22:29:11
Commit at 2024-02-03T15:44:10
Commit at 2024-11-22T05:12:55
Commit at 2025-03-04T00:59:10
Commit at 2026-01-27T12:08:30
Commit at 2023-03-09T06:23:50
Commit at 2024-05-24T00:48:17
Commit at 2025-08-04T16:05:23
Commit at 2024-04-03T06:00:00
Commit at 2026-01-27T17:18:41
