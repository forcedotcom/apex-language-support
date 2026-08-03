/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

const PLACEHOLDER_NAME =
  /^unknown(?:Class|Interface|Enum|Trigger|Constructor|Method|Parameter|Variable|Property|Field)$/;
const TEXT_FALLBACK_HELPER =
  /^(?:recover|infer|extract|resolve).*(?:FromSource|FromText)$/;
const TEXT_INTERPRETATION_METHODS = new Set([
  'endsWith',
  'includes',
  'match',
  'replace',
  'search',
  'slice',
  'split',
  'startsWith',
  'substring',
  'toLowerCase',
  'toUpperCase',
  'trim',
]);
const TEXT_COMPARISON_OPERATORS = new Set([
  '==',
  '===',
  '!=',
  '!==',
  '<',
  '<=',
  '>',
  '>=',
]);
const RAW_SOURCE_NAME = /^(?:sourceCode|sourceContent|sourceText)$/;
const RAW_DOCUMENT_NAME = /^(?:document|textDocument)$/;
const PARSER_CONTEXT_NAME =
  /^(?:ctx|context|expr|expression|typeRef|creator|.*Context)$/;
const COMPOSITE_CONTEXT_ACCESSORS = new Set([
  'creator',
  'expression',
  'expression_list',
  'expressionList',
  'typeRef',
]);

const memberName = (node) => {
  if (!node || node.type !== 'MemberExpression' || node.computed) {
    return undefined;
  }
  return node.property.type === 'Identifier' ? node.property.name : undefined;
};

const unwrapChain = (node) =>
  node?.type === 'ChainExpression' ? node.expression : node;

const isGetTextCall = (node) => {
  const unwrapped = unwrapChain(node);
  if (unwrapped?.type !== 'CallExpression') {
    return false;
  }

  const callee = unwrapChain(unwrapped.callee);
  return (
    callee?.type === 'MemberExpression' && memberName(callee) === 'getText'
  );
};

const isTerminalContextAccessorCall = (node) => {
  const unwrapped = unwrapChain(node);
  if (unwrapped?.type !== 'CallExpression') {
    return false;
  }
  const callee = unwrapChain(unwrapped.callee);
  if (callee?.type !== 'MemberExpression') {
    return false;
  }
  const accessor = memberName(callee);
  return (
    accessor === 'id' ||
    accessor === 'anyId' ||
    (accessor !== undefined && /^[A-Z_]/.test(accessor))
  );
};

const getTextReceiver = (node) => {
  const unwrapped = unwrapChain(node);
  if (!isGetTextCall(unwrapped)) {
    return undefined;
  }
  const callee = unwrapChain(unwrapped.callee);
  return unwrapChain(callee.object);
};

const isCompositeGetTextCall = (node, isCompositeReceiver) => {
  const receiver = getTextReceiver(node);
  if (receiver?.type === 'Identifier') {
    return isCompositeReceiver(receiver);
  }
  if (receiver?.type !== 'CallExpression') {
    return false;
  }
  const receiverCallee = unwrapChain(receiver.callee);
  return (
    receiverCallee?.type === 'MemberExpression' &&
    COMPOSITE_CONTEXT_ACCESSORS.has(memberName(receiverCallee) ?? '')
  );
};

const functionName = (node) => {
  if (node.type === 'FunctionDeclaration') {
    return node.id?.name;
  }
  if (node.type === 'MethodDefinition' || node.type === 'PropertyDefinition') {
    return node.key?.type === 'Identifier' ? node.key.name : undefined;
  }
  return undefined;
};

const parserOwnedSemanticsRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require semantic analysis to use parser-owned structures instead of source-text fallbacks.',
    },
    schema: [],
    messages: {
      compositeText:
        'Do not interpret composite getText() output. Add a parser/listener semantic record instead.',
      rawSource:
        'Do not interpret raw Apex source text. Consume parser, symbol, or reference state instead.',
      fallbackHelper:
        'Semantic recovery helpers named {{name}} are forbidden; consume parser, symbol, or reference state.',
      placeholder:
        'Do not publish the semantic placeholder {{name}}. Preserve uncertainty or create only a structural scope.',
    },
  },
  create(context) {
    const taintedVariables = new WeakMap();
    const compositeContextVariables = new WeakSet();
    const terminalContextVariables = new WeakSet();
    const sourceCode = context.sourceCode;

    const findVariable = (identifier) => {
      let scope = sourceCode.getScope(identifier);
      while (scope) {
        const variable = scope.set.get(identifier.name);
        if (variable) {
          return variable;
        }
        scope = scope.upper;
      }
      return undefined;
    };

    const semanticTextOrigin = (node) => {
      const unwrapped = unwrapChain(node);
      const getTextReceiverNode = getTextReceiver(unwrapped);
      if (
        getTextReceiverNode?.type === 'Identifier' &&
        RAW_DOCUMENT_NAME.test(getTextReceiverNode.name)
      ) {
        return 'rawSource';
      }
      if (
        isCompositeGetTextCall(unwrapped, (identifier) => {
          const variable = findVariable(identifier);
          if (variable && terminalContextVariables.has(variable)) {
            return false;
          }
          return (
            (variable !== undefined &&
              compositeContextVariables.has(variable)) ||
            PARSER_CONTEXT_NAME.test(identifier.name)
          );
        })
      ) {
        return 'compositeText';
      }
      if (isGetTextCall(unwrapped)) {
        return undefined;
      }
      if (unwrapped?.type === 'Identifier') {
        if (RAW_SOURCE_NAME.test(unwrapped.name)) {
          return 'rawSource';
        }
        const variable = findVariable(unwrapped);
        return variable ? taintedVariables.get(variable) : undefined;
      }
      if (unwrapped?.type === 'MemberExpression') {
        if (RAW_SOURCE_NAME.test(memberName(unwrapped) ?? '')) {
          return 'rawSource';
        }
        return semanticTextOrigin(unwrapped.object);
      }
      if (unwrapped?.type === 'CallExpression') {
        const callee = unwrapChain(unwrapped.callee);
        return callee?.type === 'MemberExpression'
          ? semanticTextOrigin(callee.object)
          : undefined;
      }
      if (unwrapped?.type === 'LogicalExpression') {
        return (
          semanticTextOrigin(unwrapped.left) ??
          semanticTextOrigin(unwrapped.right)
        );
      }
      if (unwrapped?.type === 'ConditionalExpression') {
        return (
          semanticTextOrigin(unwrapped.consequent) ??
          semanticTextOrigin(unwrapped.alternate)
        );
      }
      return undefined;
    };

    const reportSemanticTextUse = (node, expressions) => {
      for (const expression of expressions) {
        const origin = semanticTextOrigin(expression);
        if (origin) {
          context.report({ node, messageId: origin });
          return true;
        }
      }
      return false;
    };

    const checkFunctionName = (node) => {
      const name = functionName(node);
      if (
        name === 'getTextFromContext' ||
        TEXT_FALLBACK_HELPER.test(name ?? '')
      ) {
        context.report({
          node,
          messageId: 'fallbackHelper',
          data: { name },
        });
      }
    };

    return {
      FunctionDeclaration: checkFunctionName,
      MethodDefinition: checkFunctionName,
      PropertyDefinition: checkFunctionName,
      VariableDeclarator(node) {
        if (node.id.type !== 'Identifier' || !node.init) {
          return;
        }
        if (isTerminalContextAccessorCall(node.init)) {
          for (const variable of sourceCode.getDeclaredVariables(node)) {
            terminalContextVariables.add(variable);
          }
        }
        const init = unwrapChain(node.init);
        if (init?.type === 'CallExpression') {
          const callee = unwrapChain(init.callee);
          if (
            callee?.type === 'MemberExpression' &&
            COMPOSITE_CONTEXT_ACCESSORS.has(memberName(callee) ?? '')
          ) {
            for (const variable of sourceCode.getDeclaredVariables(node)) {
              compositeContextVariables.add(variable);
            }
          }
        }
        const origin = semanticTextOrigin(node.init);
        if (!origin) {
          return;
        }
        for (const variable of sourceCode.getDeclaredVariables(node)) {
          taintedVariables.set(variable, origin);
        }
      },
      Literal(node) {
        if (
          typeof node.value === 'string' &&
          PLACEHOLDER_NAME.test(node.value)
        ) {
          context.report({
            node,
            messageId: 'placeholder',
            data: { name: node.value },
          });
        }
      },
      BinaryExpression(node) {
        if (TEXT_COMPARISON_OPERATORS.has(node.operator)) {
          reportSemanticTextUse(node, [node.left, node.right]);
        }
      },
      CallExpression(node) {
        const callee = unwrapChain(node.callee);
        if (callee?.type === 'Identifier') {
          if (
            callee.name === 'getTextFromContext' ||
            TEXT_FALLBACK_HELPER.test(callee.name)
          ) {
            context.report({
              node,
              messageId: 'fallbackHelper',
              data: { name: callee.name },
            });
          }
          return;
        }

        const operation = memberName(callee);
        if (
          callee?.type === 'MemberExpression' &&
          operation === 'test' &&
          reportSemanticTextUse(node, node.arguments)
        ) {
          return;
        }
        if (
          callee?.type === 'MemberExpression' &&
          operation &&
          TEXT_INTERPRETATION_METHODS.has(operation)
        ) {
          const origin = semanticTextOrigin(callee.object);
          if (origin) {
            context.report({ node, messageId: origin });
          }
        }
      },
    };
  },
};

export default {
  rules: {
    'parser-owned-semantics': parserOwnedSemanticsRule,
  },
};
