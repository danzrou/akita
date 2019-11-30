import { pairwise } from 'rxjs/operators';
import { AkitaPlugin, Queries } from '../plugin';
import { logAction } from '../../actions';
import { isFunction } from '../../isFunction';

export interface StateHistoryParams {
  maxAge?: number;
  comparator?: (prevState, currentState) => boolean;
}

export type History<State> = {
  past: State[];
  present: State | null;
  future: State[];
};

export class StateHistoryPlugin<State = any> extends AkitaPlugin<State> {
  /** Allow skipping an update from outside */
  private skip = false;

  private history = {
    past: [],
    present: null,
    future: []
  };

  /** Skip the update when redo/undo */
  private skipUpdate = false;
  private subscription;

  constructor(protected query: Queries<State>, private params: StateHistoryParams = {}, private _entityId?: any) {
    super(query, {
      resetFn: () => this.clear()
    });
    params.maxAge = !!params.maxAge ? params.maxAge : 10;
    params.comparator = params.comparator || (() => true);
    this.activate();
  }

  get hasPast() {
    return this.history.past.length > 0;
  }

  get hasFuture() {
    return this.history.future.length > 0;
  }

  activate() {
    this.history.present = this.getSource(this._entityId);
    this.subscription = (this as any)
      .selectSource(this._entityId)
      .pipe(pairwise())
      .subscribe(([past, present]) => {
        if (this.skip) {
          this.skip = false;
          return;
        }
        /**
         *  comparator: (prev, current) => isEqual(prev, current) === false
         */
        const shouldUpdate = this.params.comparator(past, present);

        if (!this.skipUpdate && shouldUpdate) {
          if (this.history.past.length === this.params.maxAge) {
            this.history.past = this.history.past.slice(1);
          }
          this.history.past = [...this.history.past, past];
          this.history.present = present;
        }
      });
  }

  undo() {
    if (this.history.past.length > 0) {
      const { past, present } = this.history;
      const previous = past[past.length - 1];
      this.history.past = past.slice(0, past.length - 1);
      this.history.present = previous;
      this.history.future = [present, ...this.history.future];
      this.update();
    }
  }

  redo() {
    if (this.history.future.length > 0) {
      const { past, present } = this.history;
      const next = this.history.future[0];
      const newFuture = this.history.future.slice(1);
      this.history.past = [...past, present];
      this.history.present = next;
      this.history.future = newFuture;
      this.update('Redo');
    }
  }

  jumpToPast(index: number) {
    if (index < 0 || index >= this.history.past.length) return;

    const { past, future } = this.history;
    /**
     *
     * const past = [1, 2, 3, 4, 5];
     *
     * newPast = past.slice(0, 2) = [1, 2];
     * present = past[index] = 3;
     * [...past.slice(2 + 1), ...future] = [4, 5];
     *
     */
    const newPast = past.slice(0, index);
    const newFuture = [...past.slice(index + 1), ...future];
    const newPresent = past[index];
    this.history.past = newPast;
    this.history.present = newPresent;
    this.history.future = newFuture;
    this.update();
  }

  jumpToFuture(index: number) {
    if (index < 0 || index >= this.history.future.length) return;

    const { past, future } = this.history;

    const newPast = [...past, ...future.slice(0, index)];
    const newPresent = future[index];
    const newFuture = future.slice(index + 1);

    this.history.past = newPast;
    this.history.present = newPresent;
    this.history.future = newFuture;
    this.update('Redo');
  }

  /**
   *
   * jump n steps in the past or forward
   *
   */
  jump(n: number) {
    if (n > 0) return this.jumpToFuture(n - 1);
    if (n < 0) return this.jumpToPast(this.history.past.length + n);
  }

  /**
   * Clear the history
   *
   * @param customUpdateFn Callback function for only clearing part of the history
   *
   * @example
   *
   * stateHistory.clear((history) => {
   *  return {
   *    past: history.past,
   *    present: history.present,
   *    future: []
   *  };
   * });
   */
  clear(customUpdateFn?: (history: History<State>) => History<State>) {
    this.history = isFunction(customUpdateFn)
      ? customUpdateFn(this.history)
      : {
          past: [],
          present: null,
          future: []
        };
  }

  destroy(clearHistory = false) {
    if (clearHistory) {
      this.clear();
    }
    this.subscription.unsubscribe();
  }

  ignoreNext() {
    this.skip = true;
  }

  private update(action = 'Undo') {
    this.skipUpdate = true;
    logAction(`@StateHistory - ${action}`);
    this.updateStore(this.history.present, this._entityId);
    this.skipUpdate = false;
  }
}
