import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

// The workflow must stay one importless file, so we read it as text, slice the
// fenced pure-helper block, and evaluate THAT in an isolated context. The slice
// is trusted, version-controlled source — not external input.
const SRC = readFileSync(new URL('./auto-build-wi.js', import.meta.url), 'utf8')

const START = '// ===PURE-HELPERS-START==='
const END = '// ===PURE-HELPERS-END==='

function loadHelpers() {
  assert.ok(SRC.includes(START), 'missing PURE-HELPERS-START sentinel')
  assert.ok(SRC.includes(END), 'missing PURE-HELPERS-END sentinel')
  const block = SRC.split(START)[1].split(END)[0]
  const ctx = {}
  const exportNames = [
    'parseSequence', 'topSegment', 'isBlockerSatisfied', 'extractBlockers',
  ]
  const exportTail = exportNames.map(n => `this.${n} = ${n};`).join('\n')
  vm.runInNewContext(block + '\n' + exportTail, ctx)
  return ctx
}

test('parseSequence: dotted prefix parses to segments', () => {
  const h = loadHelpers()
  assert.deepEqual([...h.parseSequence('1.2 Add loader')], [1, 2])
  assert.deepEqual([...h.parseSequence('2.40 release')], [2, 40]) // dotted number + space matches
  assert.equal(h.parseSequence('W-123 backport'), null)      // no leading digit
  assert.equal(h.parseSequence('1.2-no-space'), null)        // SEQUENCE_RE requires a trailing space
})

test('topSegment: first segment is the parallel-group id', () => {
  const h = loadHelpers()
  assert.equal(h.topSegment([1, 2]), 1)
  assert.equal(h.topSegment(null), null)
})

test('isBlockerSatisfied: only terminal statuses count as done', () => {
  const h = loadHelpers()
  assert.equal(h.isBlockerSatisfied('Closed'), true)
  assert.equal(h.isBlockerSatisfied('Completed'), true)
  assert.equal(h.isBlockerSatisfied('Duplicate'), true)
  assert.equal(h.isBlockerSatisfied('Ready for Review'), false)
  assert.equal(h.isBlockerSatisfied('In Progress'), false)
})

test('extractBlockers: pulls W-numbers from blocking keywords', () => {
  const h = loadHelpers()
  assert.deepEqual([...h.extractBlockers('blocked by W-111 and W-222', '')], ['W-111', 'W-222'])
  assert.deepEqual([...h.extractBlockers('independent work', '')], [])
})
