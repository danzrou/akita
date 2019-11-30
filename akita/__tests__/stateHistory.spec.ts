import { Store } from '../src/store';
import { Query } from '../src/query';
import { StateHistoryPlugin } from '../src/plugins/stateHistory/stateHistoryPlugin';
import { StoreConfig } from '../src/storeConfig';

interface State {
  counter: number;
}

@StoreConfig({ name: 'count' })
class CounterStore extends Store<State> {
  constructor() {
    super({ counter: 0 });
  }
}

class CounterQuery extends Query<State> {
  constructor(protected store) {
    super(store);
  }
}

const store = new CounterStore();
const query = new CounterQuery(store);
const stateHistory = new StateHistoryPlugin(query);

describe('StateHistory', () => {
  it('should set the current state', () => {
    expect(stateHistory.history).toEqual({
      past: [],
      present: { counter: 0 },
      future: []
    });
  });

  it('should work', () => {
    expect(stateHistory.hasPast).toBeFalsy();
    expect(stateHistory.hasFuture).toBeFalsy();

    store._setState(state => {
      return {
        counter: state.counter + 1
      };
    });

    expect(stateHistory.history).toEqual({
      past: [{ counter: 0 }],
      present: { counter: 1 },
      future: []
    });

    expect(stateHistory.hasPast).toBeTruthy();
    expect(stateHistory.hasFuture).toBeFalsy();

    store._setState(state => {
      return {
        counter: state.counter + 1
      };
    });

    expect(stateHistory.history).toEqual({
      past: [{ counter: 0 }, { counter: 1 }],
      present: { counter: 2 },
      future: []
    });

    expect(stateHistory.hasPast).toBeTruthy();
    expect(stateHistory.hasFuture).toBeFalsy();

    stateHistory.undo();

    expect(stateHistory.history).toEqual({
      past: [{ counter: 0 }],
      present: { counter: 1 },
      future: [{ counter: 2 }]
    });

    expect(stateHistory.hasPast).toBeTruthy();
    expect(stateHistory.hasFuture).toBeTruthy();

    stateHistory.undo();

    expect(stateHistory.history).toEqual({
      past: [],
      present: { counter: 0 },
      future: [{ counter: 1 }, { counter: 2 }]
    });

    expect(stateHistory.hasPast).toBeFalsy();
    expect(stateHistory.hasFuture).toBeTruthy();

    stateHistory.redo();

    expect(stateHistory.history).toEqual({
      past: [{ counter: 0 }],
      present: { counter: 1 },
      future: [{ counter: 2 }]
    });

    expect(stateHistory.hasPast).toBeTruthy();
    expect(stateHistory.hasFuture).toBeTruthy();

    stateHistory.redo();

    expect(stateHistory.history).toEqual({
      past: [{ counter: 0 }, { counter: 1 }],
      present: { counter: 2 },
      future: []
    });

    expect(stateHistory.hasPast).toBeTruthy();
    expect(stateHistory.hasFuture).toBeFalsy();

    store._setState(state => {
      return {
        counter: state.counter + 1
      };
    });

    store._setState(state => {
      return {
        counter: state.counter + 1
      };
    });

    store._setState(state => {
      return {
        counter: state.counter + 1
      };
    });

    expect(stateHistory.history).toEqual({
      past: [{ counter: 0 }, { counter: 1 }, { counter: 2 }, { counter: 3 }, { counter: 4 }],
      present: { counter: 5 },
      future: []
    });

    stateHistory.jumpToPast(1);

    expect(stateHistory.history).toEqual({
      past: [{ counter: 0 }],
      present: { counter: 1 },
      future: [{ counter: 2 }, { counter: 3 }, { counter: 4 }]
    });

    stateHistory.jumpToFuture(1);

    expect(stateHistory.history).toEqual({
      past: [{ counter: 0 }, { counter: 2 }],
      present: { counter: 3 },
      future: [{ counter: 4 }]
    });

    stateHistory.ignoreNext();

    store._setState(state => {
      return {
        counter: state.counter + 1
      };
    });

    expect(stateHistory.history).toEqual({
      past: [{ counter: 0 }, { counter: 2 }],
      present: { counter: 3 },
      future: [{ counter: 4 }]
    });

    store._setState(state => {
      return {
        counter: state.counter + 1
      };
    });

    expect(stateHistory.history).toEqual({
      past: [{ counter: 0 }, { counter: 2 }, { counter: 4 }],
      present: { counter: 5 },
      future: [{ counter: 4 }]
    });

    stateHistory.ignoreNext();

    expect(stateHistory.history).toEqual({
      past: [{ counter: 0 }, { counter: 2 }, { counter: 4 }],
      present: { counter: 5 },
      future: [{ counter: 4 }]
    });

    stateHistory.clear((history) => {
      return {
        past: history.past,
        present: history.present,
        future: []
      };
    });

    expect(stateHistory.history).toEqual({
      past: [{ counter: 0 }, { counter: 2 }, { counter: 4 }],
      present: { counter: 5 },
      future: []
    });

    stateHistory.clear((history) => {
      return {
        past: [],
        present: history.present,
        future: history.future
      };
    });

    expect(stateHistory.history).toEqual({
      past: [],
      present: { counter: 5 },
      future: []
    });
  });
});

const store2 = new CounterStore();
const query2 = new CounterQuery(store2);
const stateHistory2 = new StateHistoryPlugin(query2, { maxAge: 1 });

describe('StateHistory - Limit', () => {
  store2._setState(state => {
    return {
      counter: state.counter + 1
    };
  });

  store2._setState(state => {
    return {
      counter: state.counter + 1
    };
  });

  store2._setState(state => {
    return {
      counter: state.counter + 1
    };
  });

  store2._setState(state => {
    return {
      counter: state.counter + 1
    };
  });

  store2._setState(state => {
    return {
      counter: state.counter + 1
    };
  });

  store2._setState(state => {
    return {
      counter: state.counter + 1
    };
  });

  store2._setState(state => {
    return {
      counter: state.counter + 1
    };
  });

  expect(stateHistory2.history).toEqual({ past: [{ counter: 6 }], present: { counter: 7 }, future: [] });
});
