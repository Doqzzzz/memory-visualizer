class StateManager {
  constructor(events) {
    // 在第 0 位插入初始空快照，作为「第 0 步」
    this.events = [{ step: 0, action: 'init', varName: null, address: null, snapshot: { variables: {}, objects: {} } }];
    if (events && events.length > 0) {
      // 后续事件的 step 号加 1
      for (var i = 0; i < events.length; i++) {
        events[i].step = i + 1;
      }
      this.events = this.events.concat(events);
    }
    this._step = 0;
  }

  get currentStep() { return this._step; }
  get totalSteps() { return this.events.length; }

  get currentSnapshot() {
    if (this.events.length === 0) return null;
    return this.events[this._step].snapshot;
  }

  get prevSnapshot() {
    if (this._step === 0) return null;
    return this.events[this._step - 1].snapshot;
  }

  get finalSnapshot() {
    return this.events[this.events.length - 1].snapshot;
  }

  goToStep(n) {
    this._step = Math.max(0, Math.min(n, this.totalSteps - 1));
  }

  next() { this.goToStep(this._step + 1); }
  prev() { this.goToStep(this._step - 1); }

  reset() {
    this._step = 0;
    this.events = [{ step: 0, action: 'init', varName: null, address: null, snapshot: { variables: {}, objects: {} } }];
  }

  getDiff() {
    if (this._step === 0) return { added: [], modified: [], removed: [] };
    var curr = this.currentSnapshot.objects;
    var prev = this.prevSnapshot.objects;
    var added = [];
    var modified = [];
    for (var addr in curr) {
      if (!curr.hasOwnProperty(addr)) continue;
      if (!prev[addr]) {
        added.push(addr);
      } else if (JSON.stringify(curr[addr]) !== JSON.stringify(prev[addr])) {
        modified.push(addr);
      }
    }
    return { added: added, modified: modified, removed: [] };
  }
}
