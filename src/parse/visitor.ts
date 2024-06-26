import { type ParserRuleContext } from 'antlr4ts'
import { AbstractParseTreeVisitor, type PostgreSQLParserVisitor } from 'dt-sql-parser'
import { type ProgramContext, PostgreSQLParser } from 'dt-sql-parser/dist/lib/pgsql/PostgreSQLParser'
import { Entity, SQLParseResult, Stmt } from '../types'
import { caretPlaceholder } from '../caret'

function withCaret (ctx: ParserRuleContext) {
  return ctx.text.includes(caretPlaceholder)
}

export class SQLVisitor extends AbstractParseTreeVisitor<void> implements PostgreSQLParserVisitor<void> {
  private result: SQLParseResult = {
    stmtList: [],
    nerestCaretEntityList: []
  }

  protected defaultResult = () => ({ list: [], nerestCaret: null })

  public clear () {
    this.result = { stmtList: [], nerestCaretEntityList: [] }
  }

  public getResult () {
    return this.result
  }

  private readonly stmtStack: Stmt[] = []

  private readonly entityStack: Entity[] = []

  private readonly rules: Map<string, number[]> = new Map()

  private readonly stmtRules: Map<number, string[]> = new Map()

  private readonly entityRules: Map<number, string[]> = new Map()

  public addRules (name: string, rules: number[]) {
    if (!this.stmtRules.has(rules[0]) && !this.entityRules.has(rules[0])) {
      console.error(`待添加的规则${name}的起始节点未被注册为Statement/Entity，请先注册，或者调整规则起始节点为已注册的Statement/Entity`)
      return
    }
    if (!this.entityRules.has(rules[rules.length - 1])) {
      console.error(`待添加的规则${name}的结束节点未被注册为Entity，请先注册，或者调整规则结束节点为已注册的Entity`)
      return
    }
    this.rules.set(name, [...rules])
    if (this.stmtRules.has(rules[0])) this.stmtRules.get(rules[0])?.push(name)
    else if (this.entityRules.has(rules[0])) this.entityRules.get(rules[0])?.push(name)
    this.entityRules.get(rules[rules.length - 1])?.push(name)
  }

  public addEntity (name: string) {
    this.entityRules.set((PostgreSQLParser as any)[`RULE_${name}`], [])
    let isHitRule = false
    const visitorName = `visit${name.slice(0, 1).toUpperCase()}${name.slice(1)}`
    const rules = this.entityRules.get((PostgreSQLParser as any)[`RULE_${name}`])!;
    (this as any)[visitorName] = (ctx: ParserRuleContext) => {
      const chain = this.getNodeChain(ctx)
      for (const rule of rules) {
        if (this.matchRules(chain, this.rules.get(rule))) {
          const result: Entity = {
            rule,
            text: ctx.text,
            type: ctx.ruleIndex,
            caret: withCaret(ctx),
            belongsToStmt: this.stmtStack[this.stmtStack.length - 1],
            relatedEntities: {}
          }
          if (this.entityStack[this.entityStack.length - 1]) {
            if (!this.entityStack[this.entityStack.length - 1].relatedEntities[rule]) this.entityStack[this.entityStack.length - 1].relatedEntities[rule] = []    
            this.entityStack[this.entityStack.length - 1].relatedEntities[rule].push(result)
          } else {
            if (!this.stmtStack[this.stmtStack.length - 1].relatedEntities[rule]) this.stmtStack[this.stmtStack.length - 1].relatedEntities[rule] = []
            this.stmtStack[this.stmtStack.length - 1].relatedEntities[rule].push(result)
          }
          if (withCaret(ctx)) this.result.nerestCaretEntityList.push(result)
          this.entityStack.push(result)
          isHitRule = true
          break
        }
      }
      this.visitChildren(ctx)
      if (isHitRule) this.entityStack.pop()
    }
  }

  public addStmt (name: string) {
    this.stmtRules.set((PostgreSQLParser as any)[`RULE_${name}`], [])
    const visitorName = `visit${name.slice(0, 1).toUpperCase()}${name.slice(1)}`;
    (this as any)[visitorName] = (ctx: ParserRuleContext) => {
      this.stmtStack.push({
        text: ctx.text,
        type: ctx.ruleIndex,
        caret: withCaret(ctx),
        relatedEntities: {}
      })
      this.visitChildren(ctx)
      const lastStmt = this.stmtStack.pop()
      if (lastStmt) this.result.stmtList.push(lastStmt)
    }
  }

  private getNodeChain (ctx: ParserRuleContext) {
    let _ctx: ParserRuleContext | undefined = ctx
    const result = []
    while (_ctx) {
      result.unshift(_ctx.ruleIndex)
      _ctx = _ctx.parent
    }
    return result
  }

  private matchRules (chain: number[], ruleChain: number[] | undefined) {
    // 只要ruleChain里面每个元素都出现在chain里面，且顺序一致，则返回true。否则返回false
    if (!ruleChain) return false
    let index = 0
    for (let i = 0; i < ruleChain.length; i++) {
      if (chain.indexOf(ruleChain[i]) < index) return false
      else index = chain.indexOf(ruleChain[i])
    }
    return true
  }

  visitProgram (ctx: ProgramContext) {
    this.visitChildren(ctx)
  }
}
