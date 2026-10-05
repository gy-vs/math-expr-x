import { isArray, isArrayNode, isMatrix, isNode, isSymbolNode } from '../../utils/is.js'
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

  class DestructuringAssignmentNode extends Node {
    /**
     * @constructor DestructuringAssignmentNode
     * @extends {Node}
     *
     * Assign the elements of a one dimensional vector to a list of symbols,
     * like `[a, b] = [1, 2]` or `[m, n] = size(A)`.
     *
     * Syntax:
     *
     *     new DestructuringAssignmentNode(object, value)
     *
     * Usage:
     *
     *    new DestructuringAssignmentNode(
     *      new ArrayNode([new SymbolNode('a'), new SymbolNode('b')]),
     *      new ArrayNode([new ConstantNode(1), new ConstantNode(2)]))
     *
     * @param {ArrayNode} object
     *     A non-empty ArrayNode holding the SymbolNodes to assign to, in order.
     * @param {Node} value
     *     The expression yielding the values. Must evaluate to a one
     *     dimensional Array or Matrix with the same number of elements as
     *     there are symbols in `object`.
     */
    constructor (object, value) {
      super()
      this.object = object
      this.value = value

      // validate input
      if (!isArrayNode(object)) {
        throw new TypeError('ArrayNode expected as "object"')
      }
      if (object.items.length === 0) {
        throw new SyntaxError('At least one variable expected in destructuring assignment')
      }
      if (!object.items.every(isSymbolNode)) {
        throw new SyntaxError('Variable names expected in destructuring assignment left hand side')
      }
      if (object.items.some(item => item.name === 'end')) {
        throw new Error('Cannot assign to symbol "end"')
      }
      if (!isNode(this.value)) {
        throw new TypeError('Node expected as "value"')
      }
    }

    // class name for typing purposes:
    static name = name

    // readonly property name
    get name () {
      return ''
    }

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
      const names = this.object.items.map(item => item.name)
      const evalValue = this.value._compile(math, argNames)
      const size = names.length

      return function evalDestructuringAssignmentNode (scope, args, context) {
        const value = evalValue(scope, args, context)

        let values
        if (isArray(value)) {
          values = value
        } else if (isMatrix(value)) {
          values = value.toArray()
        } else {
          throw new TypeError('Cannot destructure value of type ' +
            (value && value.constructor ? value.constructor.name : typeof value) +
            ': expected a one dimensional Array or Matrix')
        }

        if (values.length !== size) {
          // throw before writing anything to the scope, so a mismatch can
          // never leave behind a partially destructured state
          throw new Error('Cannot destructure ' + values.length +
            ' values into ' + size + ' variables')
        }

        for (let i = 0; i < size; i++) {
          scope.set(names[i], values[i])
        }

        // the expression evaluates to the value of the right hand side,
        // just like a regular assignment
        return value
      }
    }

    /**
     * Execute a callback for each of the child nodes of this node
     * @param {function(child: Node, path: string, parent: Node)} callback
     */
    forEach (callback) {
      callback(this.object, 'object', this)
      callback(this.value, 'value', this)
    }

    /**
     * Create a new DestructuringAssignmentNode whose children are the
     * results of calling the provided callback function for each child of
     * the original node.
     * @param {function(child: Node, path: string, parent: Node): Node} callback
     * @returns {DestructuringAssignmentNode} Returns a transformed copy of the node
     */
    map (callback) {
      const object = this._ifNode(callback(this.object, 'object', this))
      const value = this._ifNode(callback(this.value, 'value', this))

      return new DestructuringAssignmentNode(object, value)
    }

    /**
     * Create a clone of this node, a shallow copy
     * @return {DestructuringAssignmentNode}
     */
    clone () {
      return new DestructuringAssignmentNode(this.object, this.value)
    }

    /**
     * Get string representation
     * @param {Object} options
     * @return {string}
     */
    _toString (options) {
      const object = this.object.toString(options)
      let value = this.value.toString(options)
      if (needParenthesis(
        this, options && options.parenthesis, options && options.implicit)) {
        value = '(' + value + ')'
      }

      return object + ' = ' + value
    }

    /**
     * Get a JSON representation of the node
     * @returns {Object}
     */
    toJSON () {
      return {
        mathjs: name,
        object: this.object,
        value: this.value
      }
    }

    /**
     * Instantiate a DestructuringAssignmentNode from its JSON representation
     * @param {Object} json
     *     An object structured like
     *     `{"mathjs": "DestructuringAssignmentNode", object: ..., value: ...}`,
     *     where mathjs is optional
     * @returns {DestructuringAssignmentNode}
     */
    static fromJSON (json) {
      return new DestructuringAssignmentNode(json.object, json.value)
    }

    /**
     * Get HTML representation
     * @param {Object} options
     * @return {string}
     */
    _toHTML (options) {
      const object = this.object.toHTML(options)
      let value = this.value.toHTML(options)
      if (needParenthesis(
        this, options && options.parenthesis, options && options.implicit)) {
        value = '<span class="math-paranthesis math-round-parenthesis">(</span>' +
          value +
          '<span class="math-paranthesis math-round-parenthesis">)</span>'
      }

      return object +
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
      const object = this.object.toTex(options)
      let value = this.value.toTex(options)
      if (needParenthesis(
        this, options && options.parenthesis, options && options.implicit)) {
        value = `\\left(${value}\\right)`
      }

      return object + '=' + value
    }
  }

  return DestructuringAssignmentNode
}, { isClass: true, isNode: true })
