import { Parser, ModelExporter } from '@dbml/core';

export function parseSQLToDBML(sql: string): string {
  if (!sql || typeof sql !== 'string') {
    return '';
  }

  try {
    // Parser converts SQL string into a DBML AST Database Object
    const db = Parser.parse(sql, 'mysql');
    // ModelExporter converts the AST Database Object back into a DBML string
    return ModelExporter.export(db, 'dbml', false);
  } catch (e) {
    console.error('Error parsing SQL via @dbml/core:', e);
    throw e;
  }
}

export function parseDBMLToSQL(dbml: string): string {
  if (!dbml || typeof dbml !== 'string') {
    return '';
  }

  try {
    const db = Parser.parse(dbml, 'dbml');
    return ModelExporter.export(db, 'mysql', false);
  } catch (e) {
    console.error('Error compiling DBML to SQL via @dbml/core:', e);
    throw e;
  }
}
