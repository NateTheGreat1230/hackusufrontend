import { DocumentReference, Timestamp } from 'firebase/firestore';

export interface Company {
  id?: string;
  description?: string;
  name?: string;
  tax_id?: number | string;
  time_created?: Timestamp | any;
  time_updated?: Timestamp | any;
}

export interface Address {
  city?: string;
  country?: string;
  state?: string;
  street_1?: string;
  street_2?: string;
  zip?: string;
}

export interface Customer {
  id: string;
  address?: Address;
  balance?: number;
  company?: DocumentReference | any;
  email?: string;
  first_name?: string;
  last_name?: string;
  notes?: string;
  phone?: string;
  projects?: DocumentReference[] | any[];
  tickets?: DocumentReference[] | any[];
  invoices?: DocumentReference[] | any[];
  time_created?: Timestamp | any;
  time_updated?: Timestamp | any;
  // Included to match fallback fields rendering UI logic
  name?: string;
  company_name?: string;
}

export interface Invoice {
  id: string;
  amount?: number;
  amount_due?: number;
  company?: DocumentReference | any;
  customer?: DocumentReference | any;
  line_items?: DocumentReference[] | any[];
  project?: DocumentReference | any;
  time_created?: Timestamp | any;
  time_updated?: Timestamp | any;
  timeline?: DocumentReference | any;
  transactions?: DocumentReference[] | any[];
  // Used in invoice pages
  number?: string | number;
  status?: string;
  total?: number;
}

export interface ProductInstance {
  id: string;
  batch?: string;
  company?: DocumentReference | any;
  note?: string;
  product?: DocumentReference | any;
  project?: DocumentReference | any;
  qty?: number;
  price?: number;
  status?: string;
  time_created?: Timestamp | any;
  time_updated?: Timestamp | any;
}

export interface BOMEntry {
  product: DocumentReference | any; // Reference to the component product
  qty: number;
  is_picked?: boolean;
}

export interface ManufacturingStepTemplate {
  description: string;
}

export interface Product {
  id: string;
  category?: string;
  company?: DocumentReference | any;
  cost?: number;
  description?: string;
  image?: string;
  model_number?: string;
  name?: string;
  price?: number;
  product_instances?: DocumentReference[] | any[];
  qty?: number;
  qty_avail?: number;
  sku?: string;
  time_created?: Timestamp | any;
  time_updated?: Timestamp | any;
  type?: string;
  upc?: number | string;
  
  // Manufacturing fields
  is_manufactured?: boolean;
  bom?: BOMEntry[]; 
  manufacturing_steps?: ManufacturingStepTemplate[];
  manufacturing_template_id?: string;
}

export interface Project {
  id: string;
  company?: DocumentReference | any;
  customer?: DocumentReference | any;
  invoices?: DocumentReference[] | any[];
  line_items?: DocumentReference[] | any[];
  number?: string | number;
  status?: string;
  ticket?: DocumentReference | any;
  time_created?: Timestamp | any;
  time_updated?: Timestamp | any;
  timeline?: DocumentReference | any;
  cost?: number; 
  token?: string;
  approved?: boolean;
  rejected?: boolean;
  manufacturing_orders?: DocumentReference[] | any[];
}

export interface Ticket {
  id: string;
  company?: DocumentReference | any;
  customer?: DocumentReference | any;
  number?: string | number;
  projects?: DocumentReference[] | any[];
  request?: string;
  status?: string;
  time_created?: Timestamp | any;
  time_updated?: Timestamp | any;
  timeline?: DocumentReference | any;
}

export interface TimelineEntry {
  id: string;
  company?: DocumentReference | any;
  generated_by?: DocumentReference | any;
  note?: string;
  time_created?: Timestamp | any;
  time_updated?: Timestamp | any;
  timeline?: DocumentReference | any;
  type?: string;
}

export interface Timeline {
  id: string;
  company?: DocumentReference | any;
  entries?: DocumentReference[] | any[];
  invoices?: DocumentReference[] | any[];
  projects?: DocumentReference[] | any[];
  ticket?: DocumentReference | any;
  time_created?: Timestamp | any;
  time_updated?: Timestamp | any;
}

export interface Transaction {
  id: string;
  amount?: number;
  company?: DocumentReference | any;
  customer?: DocumentReference | any;
  invoice?: DocumentReference | any;
  stripe_id?: string;
  time_created?: Timestamp | any;
  type?: string;
}

export interface ManufacturingStep {
  id: string;
  description: string;
  is_completed: boolean;
  notes?: string;
}

export interface ManufacturingOrder {
  id: string;
  project?: DocumentReference | any;
  product_name?: string;
  product_ref?: DocumentReference | any; // Reference to the actual Product
  status?: string;
  steps?: ManufacturingStep[];
  time_created?: Timestamp | any;
  time_updated?: Timestamp | any;
  number?: string | number;
  qty?: number;
  bom?: BOMEntry[]; 
}
