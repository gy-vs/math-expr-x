// test DestructuringAssignmentNode
import assert from 'assert'

import math from '../../../../src/defaultInstance.js'
const Node = math.Node
const ArrayNode = math.ArrayNode
const ConstantNode = math.ConstantNode
const SymbolNode = math.SymbolNode
const DestructuringAssignmentNode = math.DestructuringAssignmentNode

describe('DestructuringAssignmentNode', function () {
  function createVariables (...names) {
    return new ArrayNode(names.map(name => new SymbolNode(name)))
  }

  it('should create a DestructuringAssignmentNode', function () {
    const n = new DestructuringAssignmentNode(createVariables('a', 'b'), new Node())
    assert(n instanceof DestructuringAssignmentNode)
    assert(n instanceof Node)
    assert.strictEqual(n.type, 'DestructuringAssignmentNode')
  })

  it('should have property isDestructuringAssignmentNode', function () {
    const node = new DestructuringAssignmentNode(createVariables('a', 'b'), new Node())
    assert(node.isDestructuringAssignmentNode)
  })

  it('should throw an error when calling without new operator', function () {
    assert.throws(
      () => DestructuringAssignmentNode(createVariables('a'), new Node()), TypeError)
  })

  it('should throw an error on wrong constructor arguments', function () {
    assert.throws(function () { console.log(new DestructuringAssignmentNode()) }, TypeError)
    assert.throws(function () { console.log(new DestructuringAssignmentNode(new Node(), new Node())) }, TypeError)
    assert.throws(function () { console.log(new DestructuringAssignmentNode('a', new Node())) }, TypeError)
    assert.throws(function () { console.log(new DestructuringAssignmentNode(2, new Node())) }, TypeError)
    // no variables at all
    assert.throws(function () { console.log(new DestructuringAssignmentNode(new ArrayNode([]), new Node())) }, TypeError)
    // variables containing a non-symbol
    assert.throws(function () {
      console.log(new DestructuringAssignmentNode(
        new ArrayNode([new SymbolNode('a'), new ConstantNode(2)]), new Node()))
    }, TypeError)
    // missing value
    assert.throws(function () { console.log(new DestructuringAssignmentNode(createVariables('a'))) }, TypeError)
  })

  it('should throw an error when creating a DestructuringAssignmentNode with a reserved keyword', function () {
    assert.throws(function () {
      console.log(new DestructuringAssignmentNode(createVariables('end'), new Node()))
    }, /Cannot assign to symbol "end"/)
  })

  it('should compile and evaluate a DestructuringAssignmentNode with an Array', function () {
    const n = new DestructuringAssignmentNode(
      createVariables('a', 'b'),
      new ArrayNode([new ConstantNode(1), new ConstantNode(2)]))

    const expr = n.compile()

    const scope = {}
    const result = expr.evaluate(scope)
    assert.deepStrictEqual(result, math.matrix([1, 2]))
    assert.strictEqual(scope.a, 1)
    assert.strictEqual(scope.b, 2)
  })

  it('should compile and evaluate a DestructuringAssignmentNode with a Matrix', function () {
    const n = new DestructuringAssignmentNode(
      createVariables('m', 'n'),
      new SymbolNode('s'))

    const expr = n.compile()

    const s = math.matrix([2, 3])
    const scope = { s }
    const result = expr.evaluate(scope)
    assert.strictEqual(result, s) // returns the right hand side value itself
    assert.strictEqual(scope.m, 2)
    assert.strictEqual(scope.n, 3)
  })

  it('should compile and evaluate a DestructuringAssignmentNode with a single variable', function () {
    const n = new DestructuringAssignmentNode(
      createVariables('a'),
      new ArrayNode([new ConstantNode(42)]))

    const scope = {}
    assert.deepStrictEqual(n.compile().evaluate(scope), math.matrix([42]))
    assert.strictEqual(scope.a, 42)
  })

  it('should evaluate the right hand side before assigning, allowing swaps', function () {
    const n = new DestructuringAssignmentNode(
      createVariables('a', 'b'),
      new ArrayNode([new SymbolNode('b'), new SymbolNode('a')]))

    const scope = { a: 1, b: 2 }
    n.compile().evaluate(scope)
    assert.strictEqual(scope.a, 2)
    assert.strictEqual(scope.b, 1)
  })

  it('should assign duplicate variables in order', function () {
    const n = new DestructuringAssignmentNode(
      createVariables('a', 'a'),
      new ArrayNode([new ConstantNode(1), new ConstantNode(2)]))

    const scope = {}
    n.compile().evaluate(scope)
    assert.strictEqual(scope.a, 2)
  })

  it('should throw a descriptive error when the number of variables and elements differ', function () {
    const n = new DestructuringAssignmentNode(
      createVariables('a', 'b', 'c'),
      new ArrayNode([new ConstantNode(1), new ConstantNode(2)]))

    assert.throws(function () { n.compile().evaluate({}) },
      /Destructuring assignment mismatch: 3 variables on the left hand side, but 2 elements on the right hand side/)

    const m = new DestructuringAssignmentNode(
      createVariables('a'),
      new ArrayNode([new ConstantNode(1), new ConstantNode(2)]))

    assert.throws(function () { m.compile().evaluate({}) },
      /Destructuring assignment mismatch: 1 variables on the left hand side, but 2 elements on the right hand side/)
  })

  it('should leave all variables untouched when the number of elements differs', function () {
    const n = new DestructuringAssignmentNode(
      createVariables('a', 'b', 'c'),
      new ArrayNode([new ConstantNode(1), new ConstantNode(2)]))

    const scope = { a: 10, b: 20 }
    assert.throws(function () { n.compile().evaluate(scope) })
    assert.strictEqual(scope.a, 10)
    assert.strictEqual(scope.b, 20)
    assert.strictEqual('c' in scope, false)
  })

  it('should throw an error when the right hand side is not a one-dimensional vector', function () {
    const value = new DestructuringAssignmentNode(createVariables('a'), new ConstantNode(2))
    assert.throws(function () { value.compile().evaluate({}) },
      /TypeError: Right hand side of destructuring assignment must be a one-dimensional array or matrix/)

    const twoDim = new DestructuringAssignmentNode(
      createVariables('a', 'b'),
      new ArrayNode([
        new ArrayNode([new ConstantNode(1), new ConstantNode(2)]),
        new ArrayNode([new ConstantNode(3), new ConstantNode(4)])
      ]))
    assert.throws(function () { twoDim.compile().evaluate({}) },
      /TypeError: Right hand side of destructuring assignment must be a one-dimensional array or matrix/)
  })

  it('should forEach over the variables and value of a DestructuringAssignmentNode', function () {
    const variables = createVariables('a', 'b')
    const value = new ArrayNode([new ConstantNode(1), new ConstantNode(2)])
    const n = new DestructuringAssignmentNode(variables, value)

    const children = []
    n.forEach(function (node, path, parent) {
      children.push([node, path, parent])
    })

    assert.strictEqual(children.length, 2)
    assert.strictEqual(children[0][0], variables)
    assert.strictEqual(children[0][1], 'variables')
    assert.strictEqual(children[0][2], n)
    assert.strictEqual(children[1][0], value)
    assert.strictEqual(children[1][1], 'value')
    assert.strictEqual(children[1][2], n)
  })

  it('should map over the variables and value of a DestructuringAssignmentNode', function () {
    const variables = createVariables('a', 'b')
    const value = new ArrayNode([new ConstantNode(1), new ConstantNode(2)])
    const n = new DestructuringAssignmentNode(variables, value)

    const newValue = new ArrayNode([new ConstantNode(3), new ConstantNode(4)])
    const m = n.map(function (node, path, parent) {
      return path === 'value' ? newValue : node
    })

    assert(m instanceof DestructuringAssignmentNode)
    assert.strictEqual(m.variables, variables)
    assert.strictEqual(m.value, newValue)
  })

  it('should throw an error when the map callback does not return a node', function () {
    const n = new DestructuringAssignmentNode(createVariables('a'), new ConstantNode(1))
    assert.throws(function () { n.map(function () { return undefined }) }, /TypeError: Callback function must return a Node/)
  })

  it('should transform the value of a DestructuringAssignmentNode', function () {
    // [a, b] = [x, 2]
    const variables = createVariables('a', 'b')
    const x = new SymbolNode('x')
    const b = new ConstantNode(2)
    const value = new ArrayNode([x, b])
    const n = new DestructuringAssignmentNode(variables, value)

    const e = new ConstantNode(3)
    const f = n.transform(function (node) {
      return node.isSymbolNode && node.name === 'x' ? e : node
    })

    assert.notStrictEqual(f, n)
    assert.deepStrictEqual(f.value.items[0], e)
    assert.deepStrictEqual(f.value.items[1], b)
  })

  it('should traverse a DestructuringAssignmentNode', function () {
    const a = new SymbolNode('a')
    const variables = new ArrayNode([a])
    const value = new ConstantNode(2)
    const n = new DestructuringAssignmentNode(variables, value)

    const visited = []
    n.traverse(function (node, path, parent) {
      visited.push([node, path, parent])
    })

    assert.strictEqual(visited.length, 4)
    assert.strictEqual(visited[0][0], n)
    assert.strictEqual(visited[0][1], null)
    assert.strictEqual(visited[0][2], null)
    assert.strictEqual(visited[1][0], variables)
    assert.strictEqual(visited[1][1], 'variables')
    assert.strictEqual(visited[1][2], n)
    assert.strictEqual(visited[2][0], a)
    assert.strictEqual(visited[2][1], 'items[0]')
    assert.strictEqual(visited[2][2], variables)
    assert.strictEqual(visited[3][0], value)
    assert.strictEqual(visited[3][1], 'value')
    assert.strictEqual(visited[3][2], n)
  })

  it('should filter symbols from a DestructuringAssignmentNode', function () {
    const n = new DestructuringAssignmentNode(
      createVariables('a', 'b'),
      new ArrayNode([new SymbolNode('c'), new ConstantNode(2)]))

    const symbols = n.filter(node => node.isSymbolNode)
    assert.deepStrictEqual(symbols.map(node => node.name), ['a', 'b', 'c'])
  })

  it('should clone a DestructuringAssignmentNode', function () {
    const variables = createVariables('a', 'b')
    const value = new ArrayNode([new ConstantNode(1), new ConstantNode(2)])
    const n = new DestructuringAssignmentNode(variables, value)

    const clone = n.clone()
    assert(clone instanceof DestructuringAssignmentNode)
    assert.deepStrictEqual(clone, n)
    assert.notStrictEqual(clone, n)
    assert.strictEqual(clone.variables, n.variables)
    assert.strictEqual(clone.value, n.value)
  })

  it('should deep clone a DestructuringAssignmentNode', function () {
    const n = new DestructuringAssignmentNode(
      createVariables('a', 'b'),
      new ArrayNode([new ConstantNode(1), new ConstantNode(2)]))

    const clone = n.cloneDeep()
    assert.deepStrictEqual(clone, n)
    assert.notStrictEqual(clone.variables, n.variables)
    assert.notStrictEqual(clone.value, n.value)
  })

  it('test equality another Node', function () {
    const a = new DestructuringAssignmentNode(
      createVariables('a', 'b'),
      new ArrayNode([new ConstantNode(1), new ConstantNode(2)]))
    const b = new DestructuringAssignmentNode(
      createVariables('a', 'b'),
      new ArrayNode([new ConstantNode(1), new ConstantNode(2)]))
    const c = new DestructuringAssignmentNode(
      createVariables('a', 'c'),
      new ArrayNode([new ConstantNode(1), new ConstantNode(2)]))
    const d = new DestructuringAssignmentNode(
      createVariables('a', 'b'),
      new ArrayNode([new ConstantNode(1), new ConstantNode(3)]))
    const e = new DestructuringAssignmentNode(
      createVariables('a'),
      new ArrayNode([new ConstantNode(1)]))

    assert.strictEqual(a.equals(null), false)
    assert.strictEqual(a.equals(undefined), false)
    assert.strictEqual(a.equals(b), true)
    assert.strictEqual(a.equals(c), false)
    assert.strictEqual(a.equals(d), false)
    assert.strictEqual(a.equals(e), false)
  })

  it('should respect the \'all\' parenthesis option', function () {
    const n = new DestructuringAssignmentNode(
      createVariables('x', 'y'),
      new ArrayNode([new ConstantNode(1), new ConstantNode(2)]))

    assert.strictEqual(n.toString({ parenthesis: 'all' }), '[x, y] = ([1, 2])')
    assert.strictEqual(n.toTex({ parenthesis: 'all' }), '\\begin{bmatrix} x\\\\ y\\end{bmatrix}=\\left(\\begin{bmatrix}1\\\\2\\end{bmatrix}\\right)')
  })

  it('should stringify a DestructuringAssignmentNode', function () {
    const n = new DestructuringAssignmentNode(
      createVariables('a', 'b'),
      new ArrayNode([new ConstantNode(1), new ConstantNode(2)]))

    assert.strictEqual(n.toString(), '[a, b] = [1, 2]')
  })

  it('should stringify a DestructuringAssignmentNode with an assignment as value', function () {
    const value = new math.AssignmentNode(new SymbolNode('c'), new ConstantNode(2))
    const n = new DestructuringAssignmentNode(createVariables('a', 'b'), value)

    assert.strictEqual(n.toString(), '[a, b] = (c = 2)')
  })

  it('should stringify a DestructuringAssignmentNode with custom toString', function () {
    // Also checks if custom functions get passed to the children
    const customFunction = function (node, options) {
      if (node.type === 'DestructuringAssignmentNode') {
        return node.variables.toString(options) +
          ' gets ' + node.value.toString(options)
      } else if (node.type === 'ConstantNode') {
        return 'const(' + node.value + ', ' + math.typeOf(node.value) + ')'
      }
    }

    const n = new DestructuringAssignmentNode(createVariables('a'), new ConstantNode(1))

    assert.strictEqual(n.toString({ handler: customFunction }), '[a] gets const(1, number)')
  })

  it('should stringify a DestructuringAssignmentNode with custom toHTML', function () {
    // Also checks if custom functions get passed to the children
    const customFunction = function (node, options) {
      if (node.type === 'DestructuringAssignmentNode') {
        return node.variables.toHTML(options) +
          ' gets ' + node.value.toHTML(options)
      } else if (node.type === 'ConstantNode') {
        return 'const(' + node.value + ', ' + math.typeOf(node.value) + ')'
      }
    }

    const n = new DestructuringAssignmentNode(createVariables('a'), new ConstantNode(1))

    assert.strictEqual(n.toHTML({ handler: customFunction }),
      '<span class="math-parenthesis math-square-parenthesis">[</span><span class="math-symbol">a</span>' +
      '<span class="math-parenthesis math-square-parenthesis">]</span> gets const(1, number)')
  })

  it('should render a DestructuringAssignmentNode as HTML', function () {
    const n = new DestructuringAssignmentNode(
      createVariables('a', 'b'),
      new ArrayNode([new ConstantNode(1), new ConstantNode(2)]))

    assert.strictEqual(n.toHTML(),
      '<span class="math-parenthesis math-square-parenthesis">[</span>' +
      '<span class="math-symbol">a</span><span class="math-separator">,</span><span class="math-symbol">b</span>' +
      '<span class="math-parenthesis math-square-parenthesis">]</span>' +
      '<span class="math-operator math-assignment-operator math-variable-assignment-operator math-binary-operator">=</span>' +
      '<span class="math-parenthesis math-square-parenthesis">[</span>' +
      '<span class="math-number">1</span><span class="math-separator">,</span><span class="math-number">2</span>' +
      '<span class="math-parenthesis math-square-parenthesis">]</span>')
  })

  it('toJSON and fromJSON', function () {
    const variables = createVariables('a', 'b')
    const value = new ArrayNode([new ConstantNode(1), new ConstantNode(2)])
    const node = new DestructuringAssignmentNode(variables, value)

    const json = node.toJSON()

    assert.deepStrictEqual(json, {
      mathjs: 'DestructuringAssignmentNode',
      variables,
      value
    })

    const parsed = DestructuringAssignmentNode.fromJSON(json)
    assert.deepStrictEqual(parsed, node)
  })

  it('should LaTeX a DestructuringAssignmentNode', function () {
    const n = new DestructuringAssignmentNode(
      createVariables('x', 'y'),
      new ArrayNode([new ConstantNode(1), new ConstantNode(2)]))

    assert.strictEqual(n.toTex(), '\\begin{bmatrix} x\\\\ y\\end{bmatrix}=\\begin{bmatrix}1\\\\2\\end{bmatrix}')
  })

  it('should LaTeX a DestructuringAssignmentNode with an assignment as value', function () {
    const value = new math.AssignmentNode(new SymbolNode('c'), new ConstantNode(2))
    const n = new DestructuringAssignmentNode(createVariables('x', 'y'), value)

    assert.strictEqual(n.toTex(), '\\begin{bmatrix} x\\\\ y\\end{bmatrix}=\\left( c=2\\right)')
  })

  it('should LaTeX a DestructuringAssignmentNode with custom toTex', function () {
    // Also checks if custom functions get passed to the children
    const customFunction = function (node, options) {
      if (node.type === 'DestructuringAssignmentNode') {
        return node.variables.toTex(options) +
          '\\gets' + node.value.toTex(options)
      } else if (node.type === 'ConstantNode') {
        return 'const\\left(' + node.value + ', ' + math.typeOf(node.value) + '\\right)'
      }
    }

    const n = new DestructuringAssignmentNode(createVariables('a'), new ConstantNode(1))

    assert.strictEqual(n.toTex({ handler: customFunction }), '\\begin{bmatrix} a\\end{bmatrix}\\getsconst\\left(1, number\\right)')
  })
})
