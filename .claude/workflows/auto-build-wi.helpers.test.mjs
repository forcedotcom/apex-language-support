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
    'parseSequence', 'topSegment', 'isBlockerSatisfied', 'extractBlockers', 'computeBuildConcurrency',
    'detectFileOverlap', 'pickReconcileBase',
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

test('computeBuildConcurrency: derives K from cores', () => {
  const h = loadHelpers()
  assert.equal(h.computeBuildConcurrency(1), 1)   // floor((1-2)/2)=-1 -> clamp 1
  assert.equal(h.computeBuildConcurrency(2), 1)   // floor(0/2)=0 -> clamp 1
  assert.equal(h.computeBuildConcurrency(4), 1)   // floor(2/2)=1
  assert.equal(h.computeBuildConcurrency(8), 3)   // floor(6/2)=3
  assert.equal(h.computeBuildConcurrency(16), 4)  // floor(14/2)=7 -> clamp 4
  assert.equal(h.computeBuildConcurrency(32), 4)  // clamp 4
})

test('computeBuildConcurrency: positive override wins, ignores cores', () => {
  const h = loadHelpers()
  assert.equal(h.computeBuildConcurrency(32, 2), 2)
  assert.equal(h.computeBuildConcurrency(2, 4), 4)
})

test('computeBuildConcurrency: non-positive/absent override falls back to cores', () => {
  const h = loadHelpers()
  assert.equal(h.computeBuildConcurrency(8, 0), 3)
  assert.equal(h.computeBuildConcurrency(8, undefined), 3)
  assert.equal(h.computeBuildConcurrency(8, -1), 3)
})

test('detectFileOverlap: disjoint vs shared', () => {
  const h = loadHelpers()
  assert.equal(h.detectFileOverlap(['a.ts', 'b.ts'], ['c.ts']), false)
  assert.equal(h.detectFileOverlap(['a.ts', 'b.ts'], ['b.ts', 'd.ts']), true)
  assert.equal(h.detectFileOverlap([], ['a.ts']), false)
})

test('pickReconcileBase: smaller diff wins', () => {
  const h = loadHelpers()
  assert.equal(h.pickReconcileBase({ files: ['a'], headEpochRank: 1 }, { files: ['a', 'b'], headEpochRank: 9 }), 'a')
  assert.equal(h.pickReconcileBase({ files: ['a', 'b', 'c'], headEpochRank: 1 }, { files: ['a'], headEpochRank: 1 }), 'b')
})

test('pickReconcileBase: equal file count tiebreaks to later head', () => {
  const h = loadHelpers()
  assert.equal(h.pickReconcileBase({ files: ['a'], headEpochRank: 5 }, { files: ['b'], headEpochRank: 9 }), 'b')
  assert.equal(h.pickReconcileBase({ files: ['a'], headEpochRank: 9 }, { files: ['b'], headEpochRank: 5 }), 'a')
})
