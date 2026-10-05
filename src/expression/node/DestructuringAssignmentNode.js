import { isArrayNode, isMatrix, isNode, isSymbolNode } from '../../utils/is.js'
import { factory } from '../../utils/factory.js'
import { getPrecedence } from '../operators.js'

const name = 'DestructuringAssignmentNode'
const dependencies = [
  'Node'
]

export const createDestructuringAssignmentNode = /* #__PURE__ */ factory(name, dependencies, ({ Node }) => {
  /*
   * Is parenthesis needed?
   * @param {node} node
   * @param {string} [parenthesis='keep']
   * @param {string} implicit
   * @private
   */
  function needParenthesis (node, parenthesis, implicit) {
    if (!parenthesis) {
      parenthesis = 'keep'
    }

    const precedence = getPrecedence(node, parenthesis, implicit)
    const exprPrecedence = getPrecedence(node.value, parenthesis, implicit)
    return (parenthesis === 'all') ||
      ((exprPrecedence !== null) && (exprPrecedence <= precedence))
  }

  /**
   * Get the elements of a one-dimensional array or Matrix.
   * Returns null when the value is not a one-dimensional vector.
   * @param {*} value
   * @return {Array | null}
   * @private
   */
  function toVectorElements (value) {
    const array = isMatrix(value) ? value.valueOf() : value

    if (!Array.isArray(array) ||
        array.some(item => Array.isArray(item) || isMatrix(item))) {
      return null
    }

    return array
  }

  class DestructuringAssignmentNode extends Node {
    /**
     * @constructor DestructuringAssignmentNode
     * @extends {Node}
     *
     * Define multiple symbols at once by unpacking the elements of a
     * one-dimensional vector, like `[m, n] = size(A)`.
     *
     * Syntax:
     *
     *     new DestructuringAssignmentNode(variables, value)
     *
     * Usage:
     *
     *     new DestructuringAssignmentNode(
     *       new ArrayNode([new SymbolNode('m'), new SymbolNode('n')]),
     *       new SymbolNode('v'))   // [m, n] = v
     *
     * @param {ArrayNode} variables
     *     ArrayNode holding the SymbolNodes to assign to, in order
     * @param {Node} value
     *     The expression to unpack. Must evaluate to a one-dimensional
     *     Array or Matrix with as many elements as there are variables
     */
    constructor (variables, value) {
      super()
      this.variables = variables
      this.value = value

      // validate input
      if (!isArrayNode(variables) ||
          variables.items.length === 0 ||
          !variables.items.every(isSymbolNode)) {
        throw new TypeError(
          'ArrayNode containing SymbolNodes expected as "variables"')
      }
      if (variables.items.some(item => item.name === 'end')) {
        throw new Error('Cannot assign to symbol "end"')
      }
      if (!isNode(this.value)) {
        throw new TypeError('Node expected as "value"')
      }
    }

    // class name for typing purposes:
    static name = name

    get type () { return name }
    get isDestructuringAssignmentNode () { return true }

    /**
     * Compile a node into a JavaScript function.
     * This basically pre-calculates as much as possible and only leaves open
     * calculations which depend on a dynamic scope with variables.
     * @param {Object} math     Math.js namespace with functions and constants.
     * @param {Object} argNames An object with argument names as key and `true`
     *                          as value. Used in the SymbolNode to optimize
     *                          for arguments from user assigned functions
     *                          (see FunctionAssignmentNode) or special symbols
     *                          like `end` (see IndexNode).
     * @return {function} Returns a function which can be called like:
     *                        evalNode(scope: Object, args: Object, context: *)
     */
    _compile (math, argNames) {
      const evalValue = this.value._compile(math, argNames)
      const names = this.variables.items.map(item => item.name)

      return function evalDestructuringAssignmentNode (scope, args, context) {
        const value = evalValue(scope, args, context)
        const elements = toVectorElements(value)

        if (elements === null) {
          throw new TypeError(
            'Right hand side of destructuring assignment must be a ' +
            'one-dimensional array or matrix')
        }
        if (elements.length !== names.length) {
          // validate before assigning anything, so that a failed
          // destructuring assignment leaves all variables untouched
          throw new Error(
            'Destructuring assignment mismatch: ' +
            names.length + ' variables on the left hand side, but ' +
            elements.length + ' elements on the right hand side')
        }

        for (let i = 0; i < names.length; i++) {
          scope.set(names[i], elements[i])
        }

        return value
      }
    }

    /**
     * Execute a callback for each of the child nodes of this node
     * @param {function(child: Node, path: string, parent: Node)} callback
     */
    forEach (callback) {
      callback(this.variables, 'variables', this)
      callback(this.value, 'value', this)
    }

    /**
     * Create a new DestructuringAssignmentNode whose children are the results
     * of calling the provided callback function for each child of the
     * original node.
     * @param {function(child: Node, path: string, parent: Node): Node} callback
     * @returns {DestructuringAssignmentNode} Returns a transformed copy of the node
     */
    map (callback) {
      const variables = this._ifNode(callback(this.variables, 'variables', this))
      const value = this._ifNode(callback(this.value, 'value', this))

      return new DestructuringAssignmentNode(variables, value)
    }

    /**
     * Create a clone of this node, a shallow copy
     * @return {DestructuringAssignmentNode}
     */
    clone () {
      return new DestructuringAssignmentNode(this.variables, this.value)
    }

    /**
     * Get string representation
     * @param {Object} options
     * @return {string}
     */
    _toString (options) {
      const variables = this.variables.toString(options)
      let value = this.value.toString(options)
      if (needParenthesis(
        this, options && options.parenthesis, options && options.implicit)) {
        value = '(' + value + ')'
      }

      return variables + ' = ' + value
    }

    /**
     * Get a JSON representation of the node
     * @returns {Object}
     */
    toJSON () {
      return {
        mathjs: name,
        variables: this.variables,
        value: this.value
      }
    }

    /**
     * Instantiate a DestructuringAssignmentNode from its JSON representation
     * @param {Object} json
     *     An object structured like
     *     `{"mathjs": "DestructuringAssignmentNode", variables: ..., value: ...}`,
     *     where mathjs is optional
     * @returns {DestructuringAssignmentNode}
     */
    static fromJSON (json) {
      return new DestructuringAssignmentNode(json.variables, json.value)
    }

    /**
     * Get HTML representation
     * @param {Object} options
     * @return {string}
     */
    _toHTML (options) {
      const variables = this.variables.toHTML(options)
      let value = this.value.toHTML(options)
      if (needParenthesis(
        this, options && options.parenthesis, options && options.implicit)) {
        value = '<span class="math-paranthesis math-round-parenthesis">(</span>' +
          value +
          '<span class="math-paranthesis math-round-parenthesis">)</span>'
      }

      return variables +
        '<span class="math-operator math-assignment-operator ' +
        'math-variable-assignment-operator math-binary-operator">=</span>' +
        value
    }

    /**
     * Get LaTeX representation
     * @param {Object} options
     * @return {string}
     */
    _toTex (options) {
      const variables = this.variables.toTex(options)
      let value = this.value.toTex(options)
      if (needParenthesis(
        this, options && options.parenthesis, options && options.implicit)) {
        value = `\\left(${value}\\right)`
      }

      return variables + '=' + value
    }
  }

  return DestructuringAssignmentNode
}, { isClass: true, isNode: true })
