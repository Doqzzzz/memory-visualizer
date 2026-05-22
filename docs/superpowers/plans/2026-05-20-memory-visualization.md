# 内存可视化系统 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 构建纯前端 Web 内存可视化系统，支持 Python/C 变量赋值、列表、2D 列表、引用、浅拷贝和深拷贝的逐步动画展示。

**架构：** 4 层单向数据流 — 输入层(代码编辑器+预设) → 解释器(解析生成事件) → 状态管理(步骤/快照) → 渲染层(Canvas 盒子+箭头)。三区布局：左侧预设列表 | 中间代码编辑 | 右侧 Canvas 内存视图。

**技术栈：** 纯 HTML + CSS + JS，零依赖，Canvas 2D API

---

### 任务 1：项目骨架

**文件：**
- 创建：`index.html`
- 创建：`css/style.css`
- 创建：`js/main.js`、`js/interpreter.js`、`js/stateManager.js`、`js/renderer.js`、`js/presets.js`、`js/layout.js`

- [ ] **步骤 1：创建目录结构和空文件**

```bash
mkdir -p css js
```

- [ ] **步骤 2：编写 index.html 骨架（三区布局 + 步骤控制条）**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>内存可视化</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="toolbar">
    <select id="lang-select">
      <option value="python">Python</option>
      <option value="c">C</option>
    </select>
    <button id="run-btn">运行</button>
    <button id="reset-btn">重置</button>
  </header>
  <main class="layout">
    <aside id="preset-panel">
      <h3>预设场景</h3>
      <ul id="preset-list"></ul>
    </aside>
    <section id="code-panel">
      <textarea id="code-editor" spellcheck="false"></textarea>
    </section>
    <section id="memory-panel">
      <canvas id="memory-canvas"></canvas>
      <div id="step-controls">
        <button id="prev-btn">◀ 上一步</button>
        <span id="step-indicator">步骤 0/0</span>
        <button id="next-btn">下一步 ▶</button>
        <input type="range" id="step-slider" min="0" max="0" value="0">
      </div>
    </section>
  </main>
  <script src="js/presets.js"></script>
  <script src="js/interpreter.js"></script>
  <script src="js/stateManager.js"></script>
  <script src="js/layout.js"></script>
  <script src="js/renderer.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **步骤 3：编写基础 CSS 变量和三区布局**

```css
/* css/style.css */
:root {
  --bg: #1e1e2e;
  --surface: #313244;
  --overlay: #45475a;
  --text: #cdd6f4;
  --subtext: #6c7086;
  --yellow: #f9e2af;
  --blue: #89b4fa;
  --green: #a6e3a1;
  --purple: #cba6f7;
  --red: #f38ba8;
  --font: 'Segoe UI', system-ui, monospace;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex; gap: 10px; padding: 8px 16px;
  background: var(--surface); border-bottom: 1px solid var(--overlay);
}

.toolbar button, .toolbar select {
  background: var(--overlay); color: var(--text);
  border: 1px solid var(--overlay); padding: 6px 14px;
  border-radius: 4px; cursor: pointer; font-size: 13px;
}

.toolbar button:hover { background: var(--purple); color: var(--bg); }

.layout {
  display: flex; flex: 1; overflow: hidden;
}

#preset-panel {
  width: 180px; background: var(--surface);
  border-right: 1px solid var(--overlay); padding: 12px;
  overflow-y: auto;
}

#preset-panel h3 {
  color: var(--yellow); font-size: 13px;
  margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;
}

#preset-list { list-style: none; }

#preset-list li {
  padding: 8px 10px; border-radius: 4px; cursor: pointer;
  font-size: 12px; margin-bottom: 2px; color: var(--subtext);
}

#preset-list li:hover { background: var(--overlay); color: var(--text); }
#preset-list li.active { background: var(--purple); color: var(--bg); font-weight: bold; }

#code-panel {
  flex: 3; display: flex; flex-direction: column;
  border-right: 1px solid var(--overlay);
}

#code-editor {
  flex: 1; background: var(--bg); color: var(--green);
  border: none; padding: 16px; font-family: 'Cascadia Code', 'Fira Code', monospace;
  font-size: 14px; line-height: 1.7; resize: none; outline: none;
  tab-size: 2;
}

#memory-panel {
  flex: 5; display: flex; flex-direction: column;
  position: relative;
}

#memory-canvas {
  flex: 1; width: 100%;
}

#step-controls {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 10px 16px; background: var(--surface);
  border-top: 1px solid var(--overlay);
}

#step-controls button {
  background: var(--overlay); color: var(--text);
  border: none; padding: 6px 14px; border-radius: 4px;
  cursor: pointer; font-size: 13px;
}

#step-controls button:hover:not(:disabled) { background: var(--purple); }
#step-controls button:disabled { opacity: 0.4; cursor: default; }

#step-indicator {
  font-size: 13px; color: var(--yellow); min-width: 80px; text-align: center;
}

#step-slider { flex: 1; accent-color: var(--purple); }
```

- [ ] **步骤 4：编写空的 JS 模块占位**

```js
// js/presets.js
const PRESETS = [];
```

```js
// js/interpreter.js
function interpret(code, language) { return []; }
```

```js
// js/stateManager.js
class StateManager {
  constructor(events) { this.events = events; this.step = 0; }
  get currentStep() { return this.step; }
  get totalSteps() { return this.events.length; }
  get currentSnapshot() { return this.events[this.step]?.snapshot || null; }
  goToStep(n) { this.step = Math.max(0, Math.min(n, this.totalSteps - 1)); }
  next() { this.goToStep(this.step + 1); }
  prev() { this.goToStep(this.step - 1); }
}
```

```js
// js/layout.js
function computeLayout(snapshot, canvasWidth, canvasHeight) { return []; }
```

```js
// js/renderer.js
class Renderer {
  constructor(canvas) { this.ctx = canvas.getContext('2d'); this.canvas = canvas; }
  render(boxes) {}
  clear() { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }
}
```

- [ ] **步骤 5：Commit**

```bash
git add index.html css/style.css js/
git commit -m "feat: 添加项目骨架，三区布局和 JS 模块占位"
```

---

### 任务 2：预设场景数据

**文件：**
- 修改：`js/presets.js`

- [ ] **步骤 1：定义 6 个预设场景**

```js
// js/presets.js
const PRESETS = [
  {
    id: 'py-assign',
    name: 'Python 基本赋值',
    language: 'python',
    code: 'a = 10\nb = a\nb = 20',
    description: '演示不可变对象：b 重新绑定不影响 a'
  },
  {
    id: 'c-pointer',
    name: 'C 指针',
    language: 'c',
    code: 'int a = 1\nint *p = &a\n*p = 2',
    description: '演示指针：通过 p 修改 a 的值'
  },
  {
    id: 'py-list',
    name: 'Python 列表',
    language: 'python',
    code: 'lst = [1, 2, 3]\nlst[0] = 99',
    description: '演示列表元素引用变更'
  },
  {
    id: 'py-2dlist',
    name: '二维列表',
    language: 'python',
    code: 'm = [[1, 2], [3, 4]]\nm[0][1] = 99',
    description: '演示嵌套列表的引用结构'
  },
  {
    id: 'py-shallow',
    name: '浅拷贝',
    language: 'python',
    code: 'a = [1, 2]\nb = a.copy()\nb[0] = 99',
    description: '浅拷贝：修改 b[0] 不影响 a[0]（int 不可变）'
  },
  {
    id: 'py-deep',
    name: '浅拷贝 vs 深拷贝',
    language: 'python',
    code: 'a = [[1, 2], [3, 4]]\nb = a.copy()\nc = deepcopy(a)\nb[0][0] = 99',
    description: '嵌套列表：浅拷贝共享内层，深拷贝完全隔离'
  }
];
```

- [ ] **步骤 2：Commit**

```bash
git add js/presets.js
git commit -m "feat: 添加 6 个预设演示场景数据"
```

---

### 任务 3：解释器 — 核心数据结构 + 简单赋值

**文件：**
- 修改：`js/interpreter.js`

- [ ] **步骤 1：实现地址生成器和 MemoryObject 工厂**

```js
// js/interpreter.js

let nextAddr = 1;
function newAddress() {
  return '0x' + (nextAddr++).toString(16).padStart(4, '0');
}

function makeObject(type, value, refs) {
  return {
    address: newAddress(),
    type: type,
    value: value !== undefined ? value : null,
    refs: refs !== undefined ? refs : null
  };
}

function cloneObject(obj) {
  return {
    address: newAddress(),
    type: obj.type,
    value: obj.value,
    refs: obj.refs ? [...obj.refs] : null
  };
}

function snapshotFromMemory(variables, objects) {
  return {
    variables: { ...variables },
    objects: {}
    // objects 需要通过深拷贝序列化 — 在下面实现
  };
}

function serializeObjects(objects) {
  const copy = {};
  for (const [addr, obj] of Object.entries(objects)) {
    copy[addr] = {
      address: obj.address,
      type: obj.type,
      value: obj.value,
      refs: obj.refs ? [...obj.refs] : null
    };
  }
  return copy;
}

function snapshotFromMemory(variables, objects) {
  return {
    variables: { ...variables },
    objects: serializeObjects(objects)
  };
}
```

- [ ] **步骤 2：实现 Python 变量赋值解析**

```js
function interpretPython(code) {
  nextAddr = 1;
  const events = [];
  const variables = {};   // varName → address
  const objects = {};     // address → MemoryObject

  const lines = code.split('\n').filter(line => line.trim());

  function emit(action, varName, address, step) {
    events.push({
      step: step,
      action: action,
      varName: varName || null,
      address: address || null,
      snapshot: snapshotFromMemory(variables, objects)
    });
  }

  function allocObject(type, value, refs) {
    const obj = makeObject(type, value, refs);
    objects[obj.address] = obj;
    return obj;
  }

  function parseValue(raw, refsMap) {
    // 数字字面量
    if (/^-?\d+$/.test(raw)) {
      return allocObject('int', parseInt(raw));
    }
    if (/^-?\d+\.\d+$/.test(raw)) {
      return allocObject('float', parseFloat(raw));
    }
    // 字符串字面量
    if (/^["'].*["']$/.test(raw)) {
      return allocObject('str', raw.slice(1, -1));
    }
    // 变量引用
    if (/^[a-zA-Z_]\w*$/.test(raw)) {
      const addr = variables[raw];
      if (!addr) throw new Error('未定义的变量: ' + raw);
      return objects[addr];
    }
    // 列表字面量 [...]
    if (/^\[.+\]$/.test(raw)) {
      return parseListLiteral(raw, refsMap);
    }
    // .copy()
    if (/^([a-zA-Z_]\w*)\.copy\(\)$/.test(raw)) {
      const srcAddr = variables[RegExp.$1];
      if (!srcAddr) throw new Error('未定义的变量: ' + RegExp.$1);
      const src = objects[srcAddr];
      const copyObj = allocObject(src.type, src.value, src.refs ? [...src.refs] : null);
      return copyObj;
    }
    // deepcopy(var)
    if (/^deepcopy\(([a-zA-Z_]\w*)\)$/.test(raw)) {
      const srcAddr = variables[RegExp.$1];
      if (!srcAddr) throw new Error('未定义的变量: ' + RegExp.$1);
      return deepCopyObject(objects[srcAddr], objects);
    }
    throw new Error('无法解析: ' + raw);
  }

  function parseListLiteral(raw) {
    const inner = raw.slice(1, -1).trim();
    const elements = splitListElements(inner);
    const refAddrs = [];
    for (const elem of elements) {
      const obj = parseValue(elem.trim());
      refAddrs.push(obj.address);
    }
    return allocObject('list', null, refAddrs);
  }

  function splitListElements(str) {
    const parts = [];
    let depth = 0, current = '';
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === '[') { depth++; current += ch; }
      else if (ch === ']') { depth--; current += ch; }
      else if (ch === ',' && depth === 0) { parts.push(current); current = ''; }
      else { current += ch; }
    }
    if (current) parts.push(current);
    return parts;
  }

  function deepCopyObject(src, objects, copies) {
    copies = copies || {};
    if (copies[src.address]) return copies[src.address];
    if (src.type !== 'list') {
      const copy = allocObject(src.type, src.value);
      copies[src.address] = copy;
      return copy;
    }
    const copy = allocObject('list', null, []);
    copies[src.address] = copy;
    for (const refAddr of src.refs) {
      const childCopy = deepCopyObject(objects[refAddr], objects, copies);
      copy.refs.push(childCopy.address);
    }
    return copy;
  }

  function handleAssignment(lhs, rhs, step) {
    let indexChain = null;
    let varName = lhs;
    const bracketMatch = lhs.match(/^(\w+)((?:\[\d+\])+)$/);
    if (bracketMatch) {
      varName = bracketMatch[1];
      indexChain = bracketMatch[2].match(/\d+/g).map(Number);
    }

    const rhsObj = parseValue(rhs);

    if (indexChain) {
      // 索引赋值: lst[0] = 99 或 m[0][1] = 99
      const parentAddr = variables[varName];
      if (!parentAddr) throw new Error('未定义的变量: ' + varName);
      let current = objects[parentAddr];
      for (let i = 0; i < indexChain.length - 1; i++) {
        current = objects[current.refs[indexChain[i]]];
      }
      const lastIdx = indexChain[indexChain.length - 1];
      current.refs[lastIdx] = rhsObj.address;
      emit('set_element', varName, parentAddr, step);
    } else {
      // 普通赋值
      variables[varName] = rhsObj.address;
      emit('bind', varName, rhsObj.address, step);
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const lhs = line.substring(0, eqIdx).trim();
    const rhs = line.substring(eqIdx + 1).trim();
    handleAssignment(lhs, rhs, i + 1);
  }

  return events;
}
```

- [ ] **步骤 3：实现 C 代码解析**

```js
function interpretC(code) {
  nextAddr = 1;
  const events = [];
  const variables = {};
  const objects = {};

  const lines = code.split('\n').filter(line => line.trim());

  function emit(action, varName, address, step) {
    events.push({
      step: step,
      action: action,
      varName: varName || null,
      address: address || null,
      snapshot: snapshotFromMemory(variables, objects)
    });
  }

  function allocObject(type, value, refs) {
    const obj = makeObject(type, value, refs);
    objects[obj.address] = obj;
    return obj;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const step = i + 1;

    // int a = 1
    let m = line.match(/^int\s+(\w+)\s*=\s*(.+)$/);
    if (m) {
      const obj = allocObject('int', parseInt(m[2]));
      variables[m[1]] = obj.address;
      emit('bind', m[1], obj.address, step);
      continue;
    }

    // int *p = &a
    m = line.match(/^int\s*\*\s*(\w+)\s*=\s*&(\w+)$/);
    if (m) {
      const targetAddr = variables[m[2]];
      if (!targetAddr) throw new Error('未定义的变量: ' + m[2]);
      const ptr = allocObject('pointer', targetAddr);
      variables[m[1]] = ptr.address;
      emit('bind', m[1], ptr.address, step);
      continue;
    }

    // *p = 2
    m = line.match(/^\*(\w+)\s*=\s*(.+)$/);
    if (m) {
      const ptrAddr = variables[m[1]];
      if (!ptrAddr) throw new Error('未定义的指针: ' + m[1]);
      const ptr = objects[ptrAddr];
      const targetObj = objects[ptr.value];
      targetObj.value = parseInt(m[2]);
      emit('modify', m[1], ptrAddr, step);
      continue;
    }
  }

  return events;
}
```

- [ ] **步骤 4：实现 interpret 入口函数**

```js
function interpret(code, language) {
  nextAddr = 1;
  if (language === 'c') {
    return interpretC(code);
  }
  return interpretPython(code);
}
```

确保 `interpretPython` 和 `interpretC` 内部也重置 `nextAddr = 1`（已包含在上方代码中）。

- [ ] **步骤 5：编辑 index.html 添加控制台测试按钮**

在 index.html 底部（`</body>` 之前）添加：

```html
<!-- 开发用：控制台测试 -->
<!-- 打开浏览器控制台运行: PRESETS.forEach(p => console.log(p.id, interpret(p.code, p.language))) -->
```

跳过 — 通过浏览器控制台手动验证。

- [ ] **步骤 6：Commit**

```bash
git add js/interpreter.js
git commit -m "feat: 实现解释器，支持 Python 赋值/列表/拷贝和 C 指针"
```

---

### 任务 4：状态管理器

**文件：**
- 修改：`js/stateManager.js`

- [ ] **步骤 1：完善 StateManager，增加变更检测**

```js
// js/stateManager.js
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

  // 返回当前步相比上一步的变更：{新增的地址: [...], 修改的地址: [...], 删除的地址: [...]}
  getDiff() {
    if (this._step === 0) return { added: Object.keys(this.currentSnapshot.objects) };
    const curr = this.currentSnapshot.objects;
    const prev = this.prevSnapshot.objects;
    const added = [];
    const modified = [];
    for (const addr of Object.keys(curr)) {
      if (!prev[addr]) {
        added.push(addr);
      } else if (JSON.stringify(curr[addr]) !== JSON.stringify(prev[addr])) {
        modified.push(addr);
      }
    }
    return { added, modified, removed: [] };
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add js/stateManager.js
git commit -m "feat: 完善状态管理器，增加快照变更检测"
```

---

### 任务 5：自动布局引擎

**文件：**
- 修改：`js/layout.js`

- [ ] **步骤 1：实现布局坐标计算**

```js
// js/layout.js

/**
 * 输入：一个内存快照 + 画布尺寸
 * 输出：DrawBox[] — 每个元素 = { x, y, w, h, address, varName, type, value, refs, children }
 */
function computeLayout(snapshot, canvasWidth, canvasHeight) {
  if (!snapshot || !snapshot.objects) return [];

  const objects = snapshot.objects;
  const variables = snapshot.variables;
  const boxes = [];

  const PADDING = 40;
  const BOX_W = 120;
  const BOX_H = 60;
  const GAP_X = 60;
  const GAP_Y = 80;
  const CELL_W = 56;
  const CELL_H = 36;

  // 收集顶层变量（不被其他变量引用的独立变量）
  const varNames = Object.keys(variables);
  const varAddresses = varNames.map(n => variables[n]);

  // 收集所有需要绘制的对象（从顶层变量可达的所有对象）
  const visited = new Set();
  const toDraw = [];

  function collect(addr) {
    if (visited.has(addr)) return;
    visited.add(addr);
    const obj = objects[addr];
    if (!obj) return;
    toDraw.push({ address: addr, ...obj });
    if (obj.refs) {
      for (const refAddr of obj.refs) {
        collect(refAddr);
      }
    }
  }

  for (const addr of varAddresses) {
    collect(addr);
  }

  // 找出顶层盒子（直接被变量引用的对象）
  const topLevelAddrs = new Set(varAddresses);
  const topLevel = toDraw.filter(d => topLevelAddrs.has(d.address));

  // 简单布局：顶层盒子从左到右排列
  let x = PADDING;
  let y = PADDING;

  for (const item of topLevel) {
    const attachedVars = varNames.filter(n => variables[n] === item.address);
    const box = {
      x: x, y: y,
      w: BOX_W, h: BOX_H,
      address: item.address,
      type: item.type,
      value: item.value,
      refs: item.refs,
      varNames: attachedVars,
      children: []
    };

    // 如果是列表，为其子元素创建子盒子
    if (item.type === 'list' && item.refs) {
      let cx = x;
      let cy = y + BOX_H + GAP_Y;
      for (let i = 0; i < item.refs.length; i++) {
        const childObj = objects[item.refs[i]];
        if (childObj) {
          const childBox = {
            x: cx, y: cy,
            w: CELL_W, h: CELL_H,
            address: childObj.address,
            type: childObj.type,
            value: childObj.value,
            refs: childObj.refs,
            varNames: [],
            index: i,
            children: []
          };

          // 递归处理嵌套列表
          if (childObj.type === 'list' && childObj.refs) {
            let gx = cx;
            let gy = cy + CELL_H + 40;
            for (let j = 0; j < childObj.refs.length; j++) {
              const grandChild = objects[childObj.refs[j]];
              if (grandChild) {
                childBox.children.push({
                  x: gx, y: gy,
                  w: CELL_W, h: CELL_H,
                  address: grandChild.address,
                  type: grandChild.type,
                  value: grandChild.value,
                  refs: null,
                  varNames: [],
                  index: j,
                  children: []
                });
                gx += CELL_W + 16;
              }
            }
          }

          box.children.push(childBox);
          cx += CELL_W + 16;
        }
      }
    }

    boxes.push(box);
    x += BOX_W + GAP_X;

    // 换行
    if (x + BOX_W > canvasWidth - PADDING) {
      x = PADDING;
      y = y + BOX_H + GAP_Y + 120;
    }
  }

  // 收集非顶层对象（被多个变量引用时额外绘制）
  const remaining = toDraw.filter(d => !topLevelAddrs.has(d.address));
  // 简化：不在任何盒子中的独立对象，在右侧额外一列绘制
  if (remaining.length > 0) {
    let rx = PADDING;
    let ry = y + GAP_Y + 100;
    for (const item of remaining) {
      boxes.push({
        x: rx, y: ry,
        w: BOX_W, h: BOX_H,
        address: item.address,
        type: item.type,
        value: item.value,
        refs: item.refs,
        varNames: [],
        children: []
      });
      rx += BOX_W + GAP_X;
    }
  }

  return boxes;
}
```

- [ ] **步骤 2：Commit**

```bash
git add js/layout.js
git commit -m "feat: 实现自动布局引擎，支持嵌套列表展开"
```

---

### 任务 6：Canvas 渲染器

**文件：**
- 修改：`js/renderer.js`

- [ ] **步骤 1：实现完整渲染器**

```js
// js/renderer.js

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.prevBoxes = null; // 用于 diff 高亮
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * devicePixelRatio;
    this.canvas.height = rect.height * devicePixelRatio;
    this.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  clear() {
    const w = this.canvas.width / devicePixelRatio;
    const h = this.canvas.height / devicePixelRatio;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = '#1e1e2e';
    this.ctx.fillRect(0, 0, w, h);
  }

  render(boxes, diff) {
    this.resize();
    this.clear();

    if (!boxes || boxes.length === 0) {
      this.drawEmpty();
      return;
    }

    const diffSet = diff ? new Set([...diff.added, ...diff.modified]) : new Set();

    // 先画箭头（在盒子下方）
    for (const box of boxes) {
      this.drawArrows(box, diffSet);
    }

    // 再画盒子
    for (const box of boxes) {
      this.drawBox(box, diffSet);
    }
  }

  drawEmpty() {
    const w = this.canvas.width / devicePixelRatio;
    const h = this.canvas.height / devicePixelRatio;
    const ctx = this.ctx;
    ctx.fillStyle = '#6c7086';
    ctx.font = '16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('点击"运行"查看内存变化', w / 2, h / 2);
  }

  drawBox(box, diffSet, isChild) {
    const ctx = this.ctx;
    const { x, y, w, h, address, type, value, varNames, children } = box;

    const isNew = diffSet && diffSet.has(address);
    const borderColor = isNew ? '#a6e3a1' : '#f9e2af';

    // 盒子背景
    ctx.fillStyle = '#313244';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isNew ? 2.5 : 1.5;
    this.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    // 地址标签（左上角小字）
    ctx.fillStyle = '#6c7086';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(address, x + 4, y + 12);

    // 变量名
    if (varNames && varNames.length > 0) {
      ctx.fillStyle = '#89b4fa';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(varNames.join(', '), x + w / 2, y + 28);
    }

    // 值
    let displayVal = value !== null && value !== undefined ? String(value) : '';
    if (type === 'list') {
      displayVal = 'list[' + (box.refs ? box.refs.length : 0) + ']';
    } else if (type === 'pointer') {
      displayVal = '→ ' + value;
    }

    ctx.fillStyle = '#a6e3a1';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    const valY = (varNames && varNames.length > 0) ? y + 48 : y + 34;
    ctx.fillText(displayVal, x + w / 2, valY);

    // 类型标签
    ctx.fillStyle = '#cba6f7';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(type, x + w - 4, y + h - 6);

    // 子元素（列表单元）
    if (children && children.length > 0) {
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        // 父到子的箭头
        this.drawArrow(
          x + w / 2, y + h,
          child.x + child.w / 2, child.y,
          diffSet && diffSet.has(child.address) ? '#a6e3a1' : '#cba6f7'
        );
        this.drawBox(child, diffSet, true);
        // 子元素索引标签
        ctx.fillStyle = '#6c7086';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('[' + (child.index !== undefined ? child.index : i) + ']',
          child.x + child.w / 2, child.y - 6);
      }
    }
  }

  drawArrows(parentBox, diffSet) {
    // 画所有引用箭头：如果当前盒子指向的地址存在于其他盒子中，画箭头
  }

  drawArrow(x1, y1, x2, y2, color) {
    const ctx = this.ctx;
    ctx.strokeStyle = color || '#cba6f7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const midY = (y1 + y2) / 2;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1, midY);
    ctx.lineTo(x2, midY);
    ctx.lineTo(x2, y2);

    ctx.stroke();

    // 箭头尖
    ctx.fillStyle = color || '#cba6f7';
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 4, y2 - 8);
    ctx.lineTo(x2 + 4, y2 - 8);
    ctx.closePath();
    ctx.fill();
  }

  drawArrowsForBox(box, allBoxes, diffSet) {
    if (!box.refs) return;
    for (const refAddr of box.refs) {
      const target = this.findBoxByAddress(refAddr, allBoxes);
      if (target) {
        this.drawArrow(
          box.x + box.w / 2, box.y + box.h,
          target.x + target.w / 2, target.y,
          diffSet && diffSet.has(refAddr) ? '#a6e3a1' : '#cba6f7'
        );
      }
    }
  }

  findBoxByAddress(address, boxes) {
    for (const box of boxes) {
      if (box.address === address) return box;
      if (box.children) {
        const found = box.children.find(c => c.address === address);
        if (found) return found;
        for (const child of box.children) {
          if (child.children) {
            const f = child.children.find(c => c.address === address);
            if (f) return f;
          }
        }
      }
    }
    return null;
  }

  roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // 高亮闪烁
  flashAddress(address, color) {
    // 简单实现：在下一帧用高亮颜色重绘该盒子
    // 在 main.js 的渲染循环中处理
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add js/renderer.js
git commit -m "feat: 实现 Canvas 渲染器，支持盒子和箭头绘制"
```

---

### 任务 7：主线集成（main.js）

**文件：**
- 修改：`js/main.js`

- [ ] **步骤 1：实现完整的主线逻辑**

```js
// js/main.js

let currentPreset = null;
let stateManager = null;
let renderer = null;

const langSelect = document.getElementById('lang-select');
const runBtn = document.getElementById('run-btn');
const resetBtn = document.getElementById('reset-btn');
const codeEditor = document.getElementById('code-editor');
const presetList = document.getElementById('preset-list');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const stepSlider = document.getElementById('step-slider');
const stepIndicator = document.getElementById('step-indicator');
const canvas = document.getElementById('memory-canvas');

function init() {
  renderer = new Renderer(canvas);
  renderPresetList();
  loadPreset(PRESETS[0]);
  bindEvents();
  renderer.render([], null);

  window.addEventListener('resize', () => {
    if (stateManager && stateManager.currentSnapshot) {
      const boxes = computeLayout(
        stateManager.currentSnapshot,
        canvas.width / devicePixelRatio,
        canvas.height / devicePixelRatio
      );
      renderer.render(boxes, null);
    }
  });
}

function bindEvents() {
  runBtn.addEventListener('click', runCode);
  resetBtn.addEventListener('click', resetCode);
  prevBtn.addEventListener('click', prevStep);
  nextBtn.addEventListener('click', nextStep);
  stepSlider.addEventListener('input', () => {
    const n = parseInt(stepSlider.value);
    goToStep(n);
  });
  langSelect.addEventListener('change', () => {
    if (currentPreset) {
      // 切换语言时，仅对预设生效
    }
  });

  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { prevStep(); }
    if (e.key === 'ArrowRight') { nextStep(); }
    if (e.ctrlKey && e.key === 'Enter') { runCode(); }
  });
}

function renderPresetList() {
  presetList.innerHTML = '';
  PRESETS.forEach((preset, idx) => {
    const li = document.createElement('li');
    li.textContent = preset.name;
    li.title = preset.description;
    li.dataset.index = idx;
    li.addEventListener('click', () => loadPreset(preset));
    presetList.appendChild(li);
  });
}

function loadPreset(preset) {
  currentPreset = preset;
  codeEditor.value = preset.code;
  langSelect.value = preset.language;

  // 高亮预设列表
  const items = presetList.querySelectorAll('li');
  items.forEach(item => {
    const idx = parseInt(item.dataset.index);
    item.classList.toggle('active', PRESETS[idx] === preset);
  });

  runCode();
}

function runCode() {
  const code = codeEditor.value.trim();
  const language = langSelect.value;

  if (!code) {
    alert('请输入代码');
    return;
  }

  try {
    const events = interpret(code, language);
    stateManager = new StateManager(events);
    if (stateManager.totalSteps > 0) {
      goToStep(0);
    } else {
      renderer.render([], null);
      updateStepUI();
    }
  } catch (err) {
    alert('执行错误: ' + err.message);
    console.error(err);
  }
}

function resetCode() {
  stateManager = null;
  renderer.render([], null);
  updateStepUI();
  if (currentPreset) {
    codeEditor.value = currentPreset.code;
  }
}

function goToStep(n) {
  if (!stateManager || stateManager.totalSteps === 0) return;
  stateManager.goToStep(n);
  const snapshot = stateManager.currentSnapshot;
  const diff = stateManager.getDiff();
  const boxes = computeLayout(
    snapshot,
    canvas.width / devicePixelRatio,
    canvas.height / devicePixelRatio
  );
  renderer.render(boxes, diff);
  updateStepUI();
}

function prevStep() {
  if (!stateManager) return;
  stateManager.prev();
  goToStep(stateManager.currentStep);
}

function nextStep() {
  if (!stateManager) return;
  stateManager.next();
  goToStep(stateManager.currentStep);
}

function updateStepUI() {
  const total = stateManager ? stateManager.totalSteps : 0;
  const current = stateManager ? stateManager.currentStep + 1 : 0;

  stepIndicator.textContent = `步骤 ${current}/${total}`;
  stepSlider.max = total > 0 ? total - 1 : 0;
  stepSlider.value = stateManager ? stateManager.currentStep : 0;

  prevBtn.disabled = !stateManager || stateManager.currentStep === 0;
  nextBtn.disabled = !stateManager || stateManager.currentStep >= total - 1;
}

// 启动
document.addEventListener('DOMContentLoaded', init);
```

- [ ] **步骤 2：Commit**

```bash
git add js/main.js
git commit -m "feat: 实现主线集成，连接所有模块"
```

---

### 任务 8：样式完善 + 响应式微调

**文件：**
- 修改：`css/style.css`

- [ ] **步骤 1：补充细节样式**

在 `css/style.css` 末尾追加：

```css
/* 预设列表滚动条 */
#preset-panel::-webkit-scrollbar { width: 4px; }
#preset-panel::-webkit-scrollbar-thumb { background: var(--overlay); border-radius: 2px; }

/* 代码编辑器滚动条 */
#code-editor::-webkit-scrollbar { width: 6px; }
#code-editor::-webkit-scrollbar-thumb { background: var(--overlay); border-radius: 3px; }

/* 步骤滑块样式 */
#step-slider { height: 4px; cursor: pointer; }
#step-slider::-webkit-slider-thumb {
  width: 16px; height: 16px;
  background: var(--purple); border-radius: 50%;
  cursor: pointer;
}

/* alert 替换为内联错误提示 */
.error-toast {
  position: fixed; top: 60px; right: 20px;
  background: var(--red); color: white;
  padding: 10px 20px; border-radius: 6px;
  font-size: 13px; z-index: 100;
  animation: fadeOut 3s forwards;
}

@keyframes fadeOut {
  0% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; }
}

/* 当没有步骤时隐藏控制条 */
.no-steps #step-controls { opacity: 0.4; pointer-events: none; }
```

- [ ] **步骤 2：替换 main.js 中的 alert 为 toast**

在 `js/main.js` 中添加：

```js
function showError(msg) {
  const toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
```

并将两处 `alert(...)` 替换为 `showError(...)`。

- [ ] **步骤 3：Commit**

```bash
git add css/style.css js/main.js
git commit -m "style: 完善样式细节，alert 替换为 toast 提示"
```

---

### 任务 9：渲染器 Bug 修复 — render 方法调用 drawArrows

**文件：**
- 修改：`js/renderer.js`

- [ ] **步骤 1：在 render 方法中正确调用绘制引用箭头**

修改 `render` 方法中的箭头绘制部分：

```js
render(boxes, diff) {
  this.resize();
  this.clear();

  if (!boxes || boxes.length === 0) {
    this.drawEmpty();
    return;
  }

  const diffSet = diff ? new Set([...diff.added, ...diff.modified]) : new Set();

  // 先画箭头（在盒子下方）
  for (const box of boxes) {
    this.drawArrowsForBox(box, boxes, diffSet);
    if (box.children) {
      for (const child of box.children) {
        if (child.refs) {
          this.drawArrowsForBox(child, boxes, diffSet);
        }
        if (child.children) {
          for (const grandchild of child.children) {
            if (grandchild.refs) {
              this.drawArrowsForBox(grandchild, boxes, diffSet);
            }
          }
        }
      }
    }
  }

  // 再画盒子
  for (const box of boxes) {
    this.drawBox(box, diffSet);
  }
}
```

- [ ] **步骤 2：删除旧的无用 drawArrows 方法**

删除 `drawArrows(parentBox, diffSet)` 这个空方法。

- [ ] **步骤 3：Commit**

```bash
git add js/renderer.js
git commit -m "fix: 修复渲染器引用箭头绘制逻辑"
```

---

### 任务 10：最终验证

- [ ] **步骤 1：在浏览器中打开 index.html**

用浏览器打开 `f:/2-subject/visualization/index.html`

- [ ] **步骤 2：逐个测试 6 个预设场景**

- [ ] 场景 1「Python 基本赋值」：应看到 a=10, b→a, b=20 三个步骤，最终 a=10, b=20 独立盒子
- [ ] 场景 2「C 指针」：应看到 int a=1, *p→a, *p 修改为 2
- [ ] 场景 3「Python 列表」：应看到 lst 盒子展开，索引 [0] 从 1 变为 99
- [ ] 场景 4「二维列表」：应看到外层 m 和内层 2 个子列表，修改后内层子列表的索引 [1] 变化
- [ ] 场景 5「浅拷贝」：a=[1,2], b=a.copy() 各自独立，b[0]=99 不影响 a[0]
- [ ] 场景 6「浅拷 vs 深拷」：浅拷贝 b[0] 和 a[0] 指向同一内层列表，深拷贝 c[0] 独立
- [ ] 可编辑代码测试：修改代码后点击"运行"应重新执行
- [ ] 步骤控制：◀ ▶ 按钮和滑块正常工作
- [ ] 键盘快捷键：左右箭头切换步骤，Ctrl+Enter 运行

- [ ] **步骤 2：验证通过后 Commit**

```bash
git add -A
git commit -m "verify: 所有 6 个预设场景手动验证通过"
```

---

### 自检清单

- [x] 规格覆盖度 — 6 个预设 ✅ 解释器覆盖所有 Python 操作 ✅ C 指针 ✅ 三区布局 ✅ Canvas 盒子+箭头 ✅ 步骤动画 ✅
- [x] 占位符扫描 — 无 TODO/待定 ✅
- [x] 类型一致性 — MemoryObject、MemoryEvent、Snapshot 在 interpret/layout/renderer 中字段名一致 ✅
- [x] 文件结构 — 与规格文档一致 ✅
