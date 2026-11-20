import { TabType } from './types';

export const DEFAULT_FLOWCHART = `%% Plotline Studio - Flowchart Example
flowchart TD
    classDef default fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef startend fill:#d4d4d8,stroke:#52525b,stroke-width:2px;
    classDef process fill:#e0f2fe,stroke:#0284c7,stroke-width:2px;
    classDef decision fill:#fef08a,stroke:#ca8a04,stroke-width:2px,shape:diamond;
    classDef database fill:#dcfce7,stroke:#16a34a,stroke-width:2px,shape:cylinder;

    START([User Login]):::startend --> VERIFY{Valid Credentials?}:::decision
    
    VERIFY -- No --> ERROR[Show Error Message]:::process
    ERROR --> START
    
    VERIFY -- Yes --> FETCH[Fetch User Profile]:::process
    FETCH --> DB[(User Database)]:::database
    DB -.-> LOAD[Load Dashboard]:::process
    
    LOAD --> ACTION{User Action}:::decision
    ACTION -- View Reports --> REP[Generate Analytics]:::process
    ACTION -- Manage Settings --> SET[Update Account]:::process
    ACTION -- Logout --> END([End Session]):::startend
    
    REP --> END
    SET --> END`;

export const DEFAULT_DBML = `// Plotline Studio - E-Commerce Schema Example
Table users {
  id integer [primary key]
  username varchar
  email varchar [unique]
  password_hash varchar
  created_at timestamp
}

Table products {
  id integer [primary key]
  name varchar
  description text
  price decimal
  stock integer
  category_id integer
}

Table categories {
  id integer [primary key]
  name varchar [unique]
  parent_id integer
}

Table orders {
  id integer [primary key]
  user_id integer
  status varchar
  total_amount decimal
  created_at timestamp
}

Table order_items {
  order_id integer
  product_id integer
  quantity integer
  price_at_time decimal
}

Ref: products.category_id > categories.id
Ref: categories.parent_id - categories.id
Ref: orders.user_id > users.id
Ref: order_items.order_id > orders.id
Ref: order_items.product_id > products.id`;

export const DEFAULT_MARKMAP = `# 🚀 Plotline Studio

## 💡 Core Features
- **Visual Mindmapping**
  - Native markdown parsing
  - Zoom & Pan controls
  - Interactive folding branches
- **Flowchart Engine**
  - Powered by Mermaid.js
  - Auto-coloring system
  - Complex routing
- **Database Modeler**
  - DBML syntax support
  - SQL code generation
  - ER visualization

## 🎨 Export Engine
- High-res PNG & JPG
- Scalable Vector Graphics (SVG)
- Transparent, Light, and Dark backgrounds
- SQL Scripts

## ⚡ Tech Stack
- Frontend: React + TypeScript
- Styling: Tailwind CSS
- Tooling: Vite`;

export const STORAGE_KEY = 'diagram_studio_state';
