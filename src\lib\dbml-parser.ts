import { SchemaModel, Table, TableColumn, Relationship } from '../types';

import { Parser } from '@dbml/core';

export function parseDBML(input: string): SchemaModel {
  if (!input || typeof input !== 'string') {
    return { tables: [], relationships: [] };
  }

  const tables: Table[] = [];
  const relationships: Relationship[] = [];

  try {
    const db = Parser.parse(input, 'dbml');
    const schema = db.schemas[0];

    // Build Tables
    for (const table of schema.tables) {
      const columns: TableColumn[] = [];
      for (const field of table.fields) {
        columns.push({
          name: field.name,
          // Extract just the base type name safely
          type: field.type?.type_name || 'unknown',
          isPk: field.pk || false,
          isNotNull: field.not_null || false,
          isUnique: field.unique || false,
          note: field.note || undefined
        });
      }
      tables.push({ name: table.name, columns });
    }

    // Build Relationships
    for (const ref of schema.refs) {
      if (!ref.endpoints || ref.endpoints.length < 2) continue;

      const ep1 = ref.endpoints[0];
      const ep2 = ref.endpoints[1];

      let type: '>' | '<' | '-' = '-';
      if (ep1.relation === '1' && ep2.relation === '*') type = '<';
      else if (ep1.relation === '*' && ep2.relation === '1') type = '>';

      relationships.push({
        fromTable: ep1.tableName,
        fromColumn: ep1.fieldNames[0],
        toTable: ep2.tableName,
        toColumn: ep2.fieldNames[0],
        type
      });
    }

  } catch (e) {
    console.error('Error parsing DBML with @dbml/core AST:', e);
  }

  return { tables, relationships };
}

export function generateMermaidER(model: SchemaModel, detailLevel: 'all' | 'pk' | 'none'): string {
  let mermaid = 'erDiagram\n';

  for (const table of model.tables) {
    const hasColumns = detailLevel !== 'none' && table.columns.length > 0;

    if (hasColumns) {
      mermaid += `    ${table.name} {\n`;
      for (const col of table.columns) {
        if (detailLevel === 'pk' && !col.isPk) continue;
        // Mermaid ER expects: type name
        // We sanitize type and name to be alphanumeric
        const safeType = col.type.replace(/[^a-zA-Z0-9]/g, '');
        const safeName = col.name.replace(/[^a-zA-Z0-9]/g, '');
        const pkLabel = col.isPk ? ' PK' : '';
        mermaid += `        ${safeType || 'text'} ${safeName || 'column'}${pkLabel}\n`;
      }
      mermaid += `    }\n`;
    } else {
      mermaid += `    ${table.name}\n`;
    }
  }

  for (const rel of model.relationships) {
    const marker = rel.type === '>' ? '}|--||' : rel.type === '<' ? '||--|{' : '||--||';
    // Labels in ER diagrams should be simple
    const label = `${rel.fromColumn}_to_${rel.toColumn}`.replace(/[^a-zA-Z0-9_]/g, '');
    mermaid += `    ${rel.fromTable} ${marker} ${rel.toTable} : "${label}"\n`;
  }

  return mermaid;
}
