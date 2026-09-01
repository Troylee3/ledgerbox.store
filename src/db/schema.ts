import { pgTable, text, numeric, boolean } from 'drizzle-orm/pg-core';

// Categories Table
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
});

// Products Table
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  barcode: text('barcode').notNull(),
  category: text('category').references(() => categories.id).notNull(),
  costPrice: numeric('cost_price').notNull(),
  sellingPrice: numeric('selling_price').notNull(),
  stock: numeric('stock').notNull(),
  minStock: numeric('min_stock').notNull(),
  imageUrl: text('image_url').notNull(),
  createdAt: text('created_at').notNull(),
});

// Customers Table
export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  debt: numeric('debt').notNull(),
  notes: text('notes').notNull(),
  createdAt: text('created_at').notNull(),
});

// Transactions Table
export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  subtotal: numeric('subtotal').notNull(),
  discount: numeric('discount').notNull(),
  total: numeric('total').notNull(),
  paymentMethod: text('payment_method').notNull(),
  customerId: text('customer_id').references(() => customers.id),
  receivedAmount: numeric('received_amount').notNull(),
  changeAmount: numeric('change_amount').notNull(),
  timestamp: text('timestamp').notNull(),
  cashierName: text('cashier_name').notNull(),
  receiptNumber: text('receipt_number').notNull(),
});

// Transaction Items (normalized list of products checked out per transaction)
export const transactionItems = pgTable('transaction_items', {
  id: text('id').primaryKey(), // unique item checkout entry ID
  transactionId: text('transaction_id').references(() => transactions.id, { onDelete: 'cascade' }).notNull(),
  productId: text('product_id').references(() => products.id).notNull(),
  quantity: numeric('quantity').notNull(),
  customPrice: numeric('custom_price'), // optional custom rate applied
});

// Debt Logs Table
export const debtLogs = pgTable('debt_logs', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(), // 'BORROW' | 'PAYMENT'
  amount: numeric('amount').notNull(),
  note: text('note').notNull(),
  timestamp: text('timestamp').notNull(),
  receiptId: text('receipt_id'),
});

// Stock Logs Table
export const stockLogs = pgTable('stock_logs', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(), // 'IN' | 'OUT' | 'SALE' | 'ADJUST'
  quantity: numeric('quantity').notNull(),
  note: text('note').notNull(),
  timestamp: text('timestamp').notNull(),
});

// Staff Users Table
export const staffUsers = pgTable('staff_users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(), // 'ADMIN' | 'CASHIER'
  pin: text('pin').notNull(),
  createdAt: text('created_at').notNull(),
  canSell: boolean('can_sell').default(true).notNull(),
  canViewCostPrice: boolean('can_view_cost_price').default(true).notNull(),
  canViewReports: boolean('can_view_reports').default(true).notNull(),
  canManageInventory: boolean('can_manage_inventory').default(true).notNull(),
  canManageCustomers: boolean('can_manage_customers').default(true).notNull(),
  canManageSettings: boolean('can_manage_settings').default(true).notNull(),
});

// Store Settings Table
export const storeSettings = pgTable('store_settings', {
  id: text('id').primaryKey(), // 'default'
  storeName: text('store_name').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  receiptGreeting: text('receipt_greeting').notNull(),
  currencySymbol: text('currency_symbol').notNull(),
  taxPercent: numeric('tax_percent').notNull(),
});
