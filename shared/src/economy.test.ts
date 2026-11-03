import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, getListings, LOT_IDS, secondsToTicks, tick } from './index';

test('initial world has every lot for rent and nothing on sale', () => {
  const state = createInitialState();
  for (const id of LOT_IDS) {
    assert.equal(state.lots[id].ownerId, null);
    assert.equal(getListings(state, id).length, 0);
  }
  assert.deepEqual(Object.keys(state.money).filter((id) => id.startsWith('npc-')), []);
});

test('no lot restocks itself over time', () => {
  let state = createInitialState();
  const until = secondsToTicks(120);
  while (state.tick < until) state = tick(state);
  for (const id of LOT_IDS) assert.equal(getListings(state, id).length, 0);
});
