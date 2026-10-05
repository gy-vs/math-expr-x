// test DestructuringAssignmentNode
import assert from 'assert'

import math from '../../../../src/defaultInstance.js'
const Node = math.Node
const ArrayNode = math.ArrayNode
const ConstantNode = math.ConstantNode
const SymbolNode = math.SymbolNode
const DestructuringAssignmentNode = math.DestructuringAssignmentNode
const OperatorNode = math.OperatorNode

describe('DestructuringAssignmentNode', function () {
  it('should create a DestructuringAssignmentNode', function () {
    const n = new DestructuringAssignmentNode(
      new ArrayNode([new SymbolNode('a')]),
      new ConstantNode(1))
    assert(n instanceof DestructuringAssignmentNode)
    assert(n instanceof Node)
    assert.strictEqual(n.type, 'DestructuringAssignmentNode')
  })

  it('should have property isDestructuringAssignmentNode', function () {
    const n = new DestructuringAssignmentNode(
      new ArrayNode([new SymbolNode('a')]),
      new ConstantNode(1))
    assert(n.isDestructuringAssignmentNode)
    assert(math.isDestructuringAssignmentNode(n))
    assert(!math.isDestructuringAssignmentNode(new Node()))
  })

  it('should throw an error when calling without new operator', function () {
    assert.throws(
      () => DestructuringAssignmentNode(
        new ArrayNode([new SymbolNode('a')]),
        new ConstantNode(1)), TypeError)
  })

  it('should throw an error on wrong constructor arguments', function () {
    assert.throws(function () {
      console.log(new DestructuringAssignmentNode())
    }, TypeError)
    assert.throws(function () {
      // object must be an ArrayNode
      console.log(new DestructuringAssignmentNode(
        new SymbolNode('a'), new ConstantNode(1)))
    }, TypeError)
    assert.throws(function () {
      // left hand side must contain symbol nodes
      console.log(new DestructuringAssignmentNode(
        new ArrayNode([new ConstantNode(1)]), new ConstantNode(1)))
    }, SyntaxError)
    assert.throws(function () {
      // left hand side must not be empty
      console.log(new DestructuringAssignmentNode(
        new ArrayNode([]), new ConstantNode(1)))
    }, SyntaxError)
    assert.throws(function () {
      // value must be a Node
      console.log(new DestructuringAssignmentNode(
        new ArrayNode([new SymbolNode('a')]), 2))
    }, TypeError)
  })

  it('should throw an error when assigning to symbol "end"', function () {
    assert.throws(function () {
      console.log(new DestructuringAssignmentNode(
        new ArrayNode([new SymbolNode('end')]),
        new ConstantNode(1)))
    }, /Cannot assign to symbol "end"/)
  })

  it('should have an empty name', function () {
    const n = new DestructuringAssignmentNode(
      new ArrayNode([new SymbolNode('a'), new SymbolNode('b')]),
      new ConstantNode(1))
    assert.strictEqual(n.name, '')
  })

  it('should destructure an Array into variables', function () {
    const n = math.parse('[a, b] = [3, 4]')
    const expr = n.compile()

    const scope = {}
    const value = expr.evaluate(scope)
    assert.strictEqual(math.typeOf(value), 'DenseMatrix')
    assert.deepStrictEqual(value.toArray(), [3, 4])
    assert.strictEqual(scope.a, 3)
    assert.strictEqual(scope.b, 4)
  })

  it('should destructure a Matrix into variables', function () {
    const n = math.parse('[m, n] = size(A)')
    const expr = n.compile()

    const scope = { A: math.matrix([[1, 2, 3], [4, 5, 6]]) }
    const value = expr.evaluate(scope)
    assert.strictEqual(math.typeOf(value), 'DenseMatrix')
    assert.deepStrictEqual(value.toArray(), [2, 3])
    assert.strictEqual(scope.m, 2)
    assert.strictEqual(scope.n, 3)
  })

  it('should destructure a range', function () {
    const scope = {}
    math.evaluate('[a, b, c] = 2:4', scope)
    assert.deepStrictEqual([scope.a, scope.b, scope.c], [2, 3, 4])
  })

  it('should support swapping variables', function () {
    const n = math.parse('[a, b] = [b, a]')
    const expr = n.compile()

    const scope = { a: 1, b: 2 }
    expr.evaluate(scope)
    assert.strictEqual(scope.a, 2)
    assert.strictEqual(scope.b, 1)
  })

  it('should evaluate the whole right hand side before assigning', function () {
    const scope = { a: 1, b: 2, c: 3 }
    math.evaluate('[a, b] = [b, c]', scope)
    assert.strictEqual(scope.a, 2)
    assert.strictEqual(scope.b, 3)
    assert.strictEqual(scope.c, 3)
  })

  it('should throw an error when there are more variables than values', function () {
    const scope = { a: 'kept' }
    assert.throws(function () {
      math.evaluate('[a, b, c] = [1, 2]', scope)
    }, function (err) {
      return err instanceof Error &&
        /Cannot destructure 2 values into 3 variables/.test(err.message)
    })
  })

  it('should throw an error when there are more values than variables', function () {
    const scope = { a: 'kept' }
    assert.throws(function () {
      math.evaluate('[a, b] = [1, 2, 3]', scope)
    }, function (err) {
      return err instanceof Error &&
        /Cannot destructure 3 values into 2 variables/.test(err.message)
    })
  })

  it('should not write any variables when the sizes do not match', function () {
    const scope = { existing: 'kept' }
    assert.throws(function () {
      math.evaluate('[a, b, c] = [1, 2]', scope)
    })
    assert.deepStrictEqual(scope, { existing: 'kept' })

    // a second failing attempt must not leak variables either
    scope.existing = 'still kept'
    assert.throws(function () {
      math.evaluate('[x, y, z] = size([1, 2; 3, 4])', scope)
    }, /Cannot destructure 2 values into 3 variables/)
    assert.deepStrictEqual(scope, { existing: 'still kept' })
  })

  it('should throw a TypeError when the right hand side is not a vector', function () {
    assert.throws(function () {
      math.evaluate('[a] = 5')
    }, function (err) {
      return err instanceof TypeError &&
        /Cannot destructure value of type Number/.test(err.message)
    })

    const scope = { a: 'kept' }
    assert.throws(function () {
      math.evaluate('[a] = "text"', scope)
    }, TypeError)
    assert.strictEqual(scope.a, 'kept')
  })

  it('should parse syntax errors at parse time', function () {
    assert.throws(function () { math.parse('[a, 2] = [1, 2]') }, SyntaxError)
    assert.throws(function () { math.parse('[1, b] = [1, 2]') }, SyntaxError)
    assert.throws(function () { math.parse('[a, b()] = [1, 2]') }, SyntaxError)
    assert.throws(function () { math.parse('[a, b[1]] = [1, 2]') }, SyntaxError)
    assert.throws(function () { math.parse('[[a, b]] = [[1, 2]]') }, SyntaxError)
    assert.throws(function () { math.parse('[] = [1]') }, SyntaxError)
    assert.throws(function () { math.parse('[end] = [1]') }, SyntaxError)
  })

  it('should stay compatible with the matrix literal syntax', function () {
    // `[a, b]` on its own is still an ArrayNode, not an assignment
    const node = math.parse('[a, b]')
    assert.strictEqual(node.type, 'ArrayNode')
    assert.strictEqual(math.evaluate('[2, 3] + 1').toString(), '[3, 4]')

    // a matrix literal still parses as a value on the right hand side
    const assignment = math.parse('[a, b] = [[1, 2], [3, 4]]')
    assert.strictEqual(assignment.type, 'DestructuringAssignmentNode')
    assert.strictEqual(assignment.value.type, 'ArrayNode')
  })

  it('should stringify a DestructuringAssignmentNode', function () {
    const n = math.parse('[a, b] = [1, 2]')
    assert.strictEqual(n.toString(), '[a, b] = [1, 2]')

    const m = math.parse('[m, n] = size(A)')
    assert.strictEqual(m.toString(), '[m, n] = size(A)')
  })

  it('should add parentheses around a lower precedence right hand side', function () {
    const n = math.parse('[a, b] = c = [1, 2]')
    assert.strictEqual(n.toString(), '[a, b] = (c = [1, 2])')
    // with parenthesis: 'all', the array literal inside the inner
    // assignment is parenthesized as well, consistent with AssignmentNode
    assert.strictEqual(n.toString({ parenthesis: 'all' }), '[a, b] = (c = ([1, 2]))')
  })

  it('should parse its own toString output into an equivalent tree', function () {
    const expressions = [
      '[a, b] = [1, 2]',
      '[m, n] = size(A)',
      '[lo, hi] = [min(v), max(v)]',
      '[a, b, c] = 2:4'
    ]

    expressions.forEach(function (expr) {
      const node = math.parse(expr)
      const reparsed = math.parse(node.toString())
      assert.strictEqual(reparsed.type, 'DestructuringAssignmentNode')
      assert.deepStrictEqual(JSON.parse(JSON.stringify(reparsed)),
        JSON.parse(JSON.stringify(node)))
    })
  })

  it('should LaTeX a DestructuringAssignmentNode', function () {
    const n = math.parse('[m, n] = size(A)')
    const tex = n.toTex()
    assert(tex.includes('\\begin{bmatrix}'))
    assert(tex.includes('='))
    assert(tex.includes('mathrm{size}'))

    assert.strictEqual(math.parse('[a] = 1:1').toTex({ parenthesis: 'all' }),
      '\\begin{bmatrix} a\\end{bmatrix}=\\left(\\left(1\\right):\\left(1\\right)\\right)')
  })

  it('should HTML a DestructuringAssignmentNode', function () {
    const html = math.parse('[a, b] = [1, 2]').toHTML()
    assert(html.includes('math-assignment-operator'))
    assert(html.includes('['))
    assert(html.includes(']'))
  })

  it('toJSON and fromJSON', function () {
    const node = math.parse('[m, n] = size(A)')

    const json = node.toJSON()
    assert.deepStrictEqual(json, {
      mathjs: 'DestructuringAssignmentNode',
      object: new ArrayNode([new SymbolNode('m'), new SymbolNode('n')]),
      value: node.value
    })

    const revived = DestructuringAssignmentNode.fromJSON(json)
    assert(revived instanceof DestructuringAssignmentNode)
    assert.strictEqual(revived.toString(), '[m, n] = size(A)')
    assert.deepStrictEqual(revived.toJSON(), json)

    const scope = { A: [[1, 2, 3], [4, 5, 6]] }
    revived.compile().evaluate(scope)
    assert.strictEqual(scope.m, 2)
    assert.strictEqual(scope.n, 3)
  })

  it('should survive JSON serialization and math.reviver', function () {
    const node = math.parse('[m, n] = size(A)')
    const json = JSON.stringify(node)
    const revived = JSON.parse(json, math.reviver)

    assert(revived instanceof DestructuringAssignmentNode)
    assert.strictEqual(revived.type, 'DestructuringAssignmentNode')
    assert.strictEqual(revived.toString(), '[m, n] = size(A)')

    const scope = { A: [[1, 2, 3], [4, 5, 6]] }
    revived.compile().evaluate(scope)
    assert.strictEqual(scope.m, 2)
    assert.strictEqual(scope.n, 3)
  })

  it('should clone a DestructuringAssignmentNode', function () {
    const n = math.parse('[a, b] = [1, 2]')
    const clone = n.clone()

    assert(clone instanceof DestructuringAssignmentNode)
    assert.notStrictEqual(clone, n)
    assert.strictEqual(clone.object, n.object) // clone is a shallow copy
    assert.strictEqual(clone.toString(), '[a, b] = [1, 2]')
  })

  it('should iterate over its children via forEach', function () {
    const n = math.parse('[a, b] = [1, 2]')
    const paths = []
    n.forEach(function (child, path) {
      paths.push(path)
    })
    assert.deepStrictEqual(paths, ['object', 'value'])
  })

  it('should transform a DestructuringAssignmentNode via map', function () {
    const n = math.parse('[a, b] = [1, 2]')
    const mapped = n.map(function (node, path) {
      if (path === 'value') {
        return new OperatorNode('+', 'add', [node, new ConstantNode(0)])
      }
      return node
    })

    assert(mapped instanceof DestructuringAssignmentNode)
    assert.strictEqual(mapped.toString(), '[a, b] = [1, 2] + 0')
  })

  it('should find DestructuringAssignmentNodes in a tree', function () {
    const block = math.parse('x = 1\n[a, b] = [x, 2]')
    const found = block.filter(function (node) {
      return node.isDestructuringAssignmentNode
    })
    assert.strictEqual(found.length, 1)
  })
})
