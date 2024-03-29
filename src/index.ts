import { defaultEntities, defaultRules, defaultStmts } from './parse/default-rules'
import { parse } from './parse'
import { preprocess } from './preprocess'
import { DtSqlParserPostgresqlPluginSettings, InsertCaretPlaceholderConfig } from './types'
import { defaultPreprocessorList } from './preprocess/default-preprocessor'
import { insertCaret } from './caret'
import { PostgresSQL } from 'dt-sql-parser'

export class DtSqlParserPostgresqlPlugin {
  private settings: DtSqlParserPostgresqlPluginSettings = {}

  constructor (settings?: DtSqlParserPostgresqlPluginSettings) {
    this.settings = settings || {}
  }

  public parse (sql: string, caret?: InsertCaretPlaceholderConfig) {
    const sqlAfterInsertCaret = insertCaret(sql, caret)
    const sqlAfterPreprocess = preprocess(sqlAfterInsertCaret, this.settings.preprocessor || defaultPreprocessorList)
    const sqlParseResult = parse(
      sqlAfterPreprocess,
      this.settings.parse?.parser || new PostgresSQL(),
      this.settings.parse?.stmts || defaultStmts,
      this.settings.parse?.entities || defaultEntities,
      this.settings.parse?.rules || defaultRules
    )
    return sqlParseResult
  } 
}

const myPlugin = new DtSqlParserPostgresqlPlugin()
const sql = 'SELECT a.b| FROM t'
const caretColumn = sql.indexOf('|') + 1
const result = myPlugin.parse(sql.replace('|', ''), { lineNumber: 1, columnNumber: caretColumn })
console.log(result)

// 基于分析结果的业务逻辑测试
// if (result.nerestCaretEntityList[0].type === PostgreSQLParser.RULE_column_name && result.nerestCaretEntityList[0].rule === 'select_column') {
//   const columnPrefix = result.nerestCaretEntityList[0].text.replace(DEFAULT_CARET_PLACEHOLDER, '')
//   const tableName = result.nerestCaretEntityList[0].belongsToStmt.relatedEntities.select_from_table[0].text
//   console.log(`will fetch column start with ${columnPrefix} from table ${tableName}`)
// }
