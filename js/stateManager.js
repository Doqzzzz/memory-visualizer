class StateManager {
  constructor(events) {
    this.events = events || [];
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

  goToStep(n) {
    this._step = Math.max(0, Math.min(n, this.totalSteps - 1));
  }

  next() { this.goToStep(this._step + 1); }
  prev() { this.goToStep(this._step - 1); }

  reset() {
    this._step = 0;
    this.events = [];
  }

  getDiff() {
    if (this._step === 0) return { added: Object.keys(this.currentSnapshot.objects), modified: [], removed: [] };
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
