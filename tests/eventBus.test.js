/**
 * Vacancy Radar India - Event Bus & Pub-Sub State Acceptance Tests
 */

import assert from 'assert';
import { EventBus, EVENTS, eventBus } from '../js/services/eventBus.js';
import { storageService } from '../js/services/storageService.js';

console.log('------------------------------------------------------------');
console.log('⚡ RUNNING PUB-SUB STATE & EVENT BUS ACCEPTANCE SUITE');
console.log('------------------------------------------------------------\n');

let testsPassed = 0;
let testsTotal = 0;

function runTest(name, fn) {
  testsTotal++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   Error: ${err.message}\n`);
    throw err;
  }
}

// TEST 1: Basic Subscription and Publishing
runTest('1. Subscribers receive published payloads', () => {
  const bus = new EventBus();
  let receivedData = null;

  bus.subscribe('test:event', (payload) => {
    receivedData = payload;
  });

  const count = bus.publish('test:event', { msg: 'hello' });
  assert.strictEqual(count, 1, 'Should notify 1 subscriber');
  assert.deepStrictEqual(receivedData, { msg: 'hello' }, 'Payload should match');
});

// TEST 2: Unsubscribe handle
runTest('2. Returned unsubscribe handle cleanly unbinds subscriber', () => {
  const bus = new EventBus();
  let callCount = 0;

  const unsubscribe = bus.subscribe('test:counter', () => {
    callCount++;
  });

  bus.publish('test:counter');
  assert.strictEqual(callCount, 1, 'Should be called once');

  const removed = unsubscribe();
  assert.strictEqual(removed, true, 'Unsubscribe should return true');

  bus.publish('test:counter');
  assert.strictEqual(callCount, 1, 'Should not be called after unsubscribing');
});

// TEST 3: One-shot event listener (once)
runTest('3. once() handler executes exactly once and detaches automatically', () => {
  const bus = new EventBus();
  let onceCalls = 0;

  bus.once('test:single', (num) => {
    onceCalls += num;
  });

  bus.publish('test:single', 5);
  bus.publish('test:single', 10);
  bus.publish('test:single', 20);

  assert.strictEqual(onceCalls, 5, 'once listener should only run once');
  assert.strictEqual(bus.listenerCount('test:single'), 0, 'Listener should be cleaned up');
});

// TEST 4: Fault tolerance / subscriber error isolation
runTest('4. Failing subscriber does not prevent subsequent subscribers from running', () => {
  const bus = new EventBus();
  let secondReceived = false;

  // First subscriber throws
  bus.subscribe('test:error', () => {
    throw new Error('Simulated subscriber crash');
  });

  // Second subscriber must still run
  bus.subscribe('test:error', () => {
    secondReceived = true;
  });

  const count = bus.publish('test:error', { ok: true });
  assert.strictEqual(secondReceived, true, 'Second subscriber must still execute');
  assert.strictEqual(count, 1, '1 subscriber succeeded without error');
});

// TEST 5: Clear listeners
runTest('5. clear() removes specific event or all event listeners', () => {
  const bus = new EventBus();
  bus.subscribe('ev1', () => {});
  bus.subscribe('ev2', () => {});

  assert.strictEqual(bus.listenerCount('ev1'), 1);
  assert.strictEqual(bus.listenerCount('ev2'), 1);

  bus.clear('ev1');
  assert.strictEqual(bus.listenerCount('ev1'), 0);
  assert.strictEqual(bus.listenerCount('ev2'), 1);

  bus.clear();
  assert.strictEqual(bus.listenerCount('ev2'), 0);
});

// TEST 6: Reactive storageService integration
runTest('6. storageService mutations publish EVENTS.VACANCIES_UPDATED and EVENTS.PROFILE_CHANGED', () => {
  let vacancyPayload = null;
  let profilePayload = null;

  const un1 = eventBus.subscribe(EVENTS.VACANCIES_UPDATED, (data) => {
    vacancyPayload = data;
  });

  const un2 = eventBus.subscribe(EVENTS.PROFILE_CHANGED, (data) => {
    profilePayload = data;
  });

  try {
    // Save a vacancy
    storageService.saveVacancy({
      id: 'test-event-bus-vac-1',
      title: 'Event Bus Test Vacancy',
      organisation: 'Test Org'
    });

    assert(vacancyPayload !== null, 'VACANCIES_UPDATED should be published');
    assert.strictEqual(vacancyPayload.action, 'save');
    assert.strictEqual(vacancyPayload.vacancy.id, 'test-event-bus-vac-1');

    // Switch active profile
    const active = storageService.getActiveProfile();
    storageService.setActiveProfile(active.id);

    assert(profilePayload !== null, 'PROFILE_CHANGED should be published');
    assert.strictEqual(profilePayload, active.id);
  } finally {
    un1();
    un2();
    // Cleanup test vacancy
    const vacancies = storageService.getVacancies().filter(v => v.id !== 'test-event-bus-vac-1');
    storageService.storage.setItem('vacancy_radar_vacancies_v1', JSON.stringify(vacancies));
  }
});

console.log('------------------------------------------------------------');
console.log(`🎉 TEST RUN COMPLETED: ${testsPassed} / ${testsTotal} PASSED (100% SUCCESS)`);
console.log('------------------------------------------------------------\n');
