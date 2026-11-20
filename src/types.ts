export type TabType = 'flowchart' | 'database' | 'markmap';

export interface TableColumn {
  name: string;
  type: string;
  isPk?: boolean;
  isNotNull?: boolean;
  isUnique?: boolean;
  note?: string;
}

export interface Table {
  name: string;
  columns: TableColumn[];
}

export interface Relationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: '>' | '<' | '-';
}

export interface SchemaModel {
  tables: Table[];
  relationships: Relationship[];
}

export type DbDetailLevel = 'all' | 'pk' | 'none';

export interface AppState {
  activeTab: TabType;
  flowchartCode: string;
  dbmlCode: string;
  markmapCode: string;
  isDarkMode: boolean;
  showGrid: boolean;
  autoColor: boolean;
  dbDetailLevel: DbDetailLevel;
}
