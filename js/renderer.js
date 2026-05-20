function Renderer(canvas) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
}

Renderer.prototype.resize = function() {
  var rect = this.canvas.parentElement.getBoundingClientRect();
  var dpr = window.devicePixelRatio || 1;
  this.canvas.width = rect.width * dpr;
  this.canvas.height = rect.height * dpr;
  this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  this.canvas.style.width = rect.width + 'px';
  this.canvas.style.height = rect.height + 'px';
  this.w = rect.width;
  this.h = rect.height;
};

Renderer.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.w, this.h);
  this.ctx.fillStyle = '#1e1e2e';
  this.ctx.fillRect(0, 0, this.w, this.h);
};

Renderer.prototype.render = function(baseBoxes, currentSnapshot, diff) {
  this.resize();
  this.clear();

  if (!baseBoxes || baseBoxes.length === 0 || !currentSnapshot) {
    this.drawEmpty();
    return;
  }

  var self = this;
  var objects = currentSnapshot.objects;
  var variables = currentSnapshot.variables;
  var diffSet = diff ? new Set(diff.added.concat(diff.modified)) : new Set();

  function exists(addr) { return objects && !!objects[addr]; }

  // 找出哪些变量名绑定到哪个地址
  function getVarNames(addr) {
    var names = [];
    for (var v in variables) {
      if (variables.hasOwnProperty(v) && variables[v] === addr) names.push(v);
    }
    return names;
  }

  // 递归收集子盒子中有实际数据的地址——仅当父盒子存在时画子盒子
  function collectExistingAddrs(box, list) {
    if (exists(box.address)) list.push(box.address);
    if (box.children) {
      for (var i = 0; i < box.children.length; i++) {
        collectExistingAddrs(box.children[i], list);
      }
    }
  }

  // 先画竖直父子箭头（列表展开）—— 当前快照 refs 中有此地址的才画箭头
  function drawChildrenArrows(box, currentAddr) {
    if (!exists(currentAddr)) return;
    var obj = objects[currentAddr];
    if (!obj || !obj.refs || !box.children) return;
    // 建当前 refs 地址查找表
    var refSet = {};
    for (var r = 0; r < obj.refs.length; r++) { refSet[obj.refs[r]] = r; }
    for (var i = 0; i < box.children.length; i++) {
      var childPos = box.children[i];
      if (!exists(childPos.address) || !refSet.hasOwnProperty(childPos.address)) continue;
      self.drawArrow(
        box.x + box.w / 2, box.y + box.h,
        childPos.x + childPos.w / 2, childPos.y,
        '#cba6f7'
      );
      drawChildrenArrows(childPos, childPos.address);
    }
  }

  for (var i = 0; i < baseBoxes.length; i++) {
    if (exists(baseBoxes[i].address)) {
      drawChildrenArrows(baseBoxes[i], baseBoxes[i].address);
    }
  }

  // 收集所有已经是父子关系的地址对（避免双重箭头）
  function collectParentChildPairs(box, set) {
    if (box.children) {
      for (var i = 0; i < box.children.length; i++) {
        set[box.address + '->' + box.children[i].address] = true;
        set[box.children[i].address + '->' + box.address] = true;
        collectParentChildPairs(box.children[i], set);
      }
    }
  }
  var pcPairs = {};
  for (var i = 0; i < baseBoxes.length; i++) { collectParentChildPairs(baseBoxes[i], pcPairs); }

  // 先画引用箭头（跨盒子，排除列表对象）
  function drawRefArrowsForBox(box) {
    if (!exists(box.address)) return;
    var obj = objects[box.address];
    if (!obj || !obj.refs || obj.type === 'list') return;
    for (var i = 0; i < obj.refs.length; i++) {
      var refAddr = obj.refs[i];
      var target = self.findBox(refAddr, baseBoxes);
      if (target && exists(target.address) && target.address !== box.address) {
        var key = box.address + '->' + target.address;
        if (!pcPairs[key]) {
          self.drawReferArrow(box, target, '#cba6f7');
        }
      }
    }
    if (box.children) {
      for (var i = 0; i < box.children.length; i++) { drawRefArrowsForBox(box.children[i]); }
    }
  }

  // 画跨盒子引用箭头
  for (var i = 0; i < baseBoxes.length; i++) {
    drawRefArrowsForBox(baseBoxes[i]);
  }

  // 再画所有盒子 —— 子元素是否实心取决于是否在父对象当前 refs 中
  function drawBoxTree(posBox, currentAddr, parentRefSet, indexInParent, parentVarName) {
    var existsInObjs = exists(currentAddr);
    var filled = existsInObjs;
    if (parentRefSet && existsInObjs) {
      filled = parentRefSet.hasOwnProperty(currentAddr);
    }
    var obj = filled ? objects[currentAddr] : null;
    var names = filled ? getVarNames(currentAddr) : [];
    // 子盒子的下标标签
    var subLabel = '';
    if (indexInParent != null && parentVarName) {
      subLabel = parentVarName + '[' + indexInParent + ']';
    }
    self.drawBox(posBox.x, posBox.y, posBox.w, posBox.h, currentAddr, obj ? obj.type : posBox.type, filled, names, obj, diffSet, subLabel);

    // 收集当前 refs 地址→索引映射
    var refIndexMap = null;
    if (filled && obj && obj.refs && posBox.children && posBox.children.length > 0) {
      refIndexMap = {};
      for (var r = 0; r < obj.refs.length; r++) { refIndexMap[obj.refs[r]] = r; }
    }
    var childPrefix = subLabel || ((names && names.length > 0) ? names[0] : '');
    if (posBox.children && posBox.children.length > 0) {
      for (var i = 0; i < posBox.children.length; i++) {
        var childAddr = posBox.children[i].address;
        var idx = (refIndexMap && refIndexMap.hasOwnProperty(childAddr)) ? refIndexMap[childAddr] : null;
        drawBoxTree(posBox.children[i], childAddr, refIndexMap, idx, childPrefix);
      }
    }
  }
  for (var i = 0; i < baseBoxes.length; i++) {
    if (baseBoxes[i].address) {
      drawBoxTree(baseBoxes[i], baseBoxes[i].address);
    }
  }
};

Renderer.prototype.drawBox = function(x, y, w, h, address, type, filled, varNames, obj, diffSet, subLabel) {
  var ctx = this.ctx;
  var isNew = diffSet && diffSet.has(address);

  if (filled) {
    // --- 实心盒子 ---
    ctx.strokeStyle = '#f9e2af';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = '#313244';
    this.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#bac2de';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(address, x + 6, y + 14);

    if (varNames && varNames.length > 0) {
      ctx.fillStyle = '#89b4fa';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(varNames.join(', '), x + w / 2, y + 28);
    }

    var displayVal = '';
    if (obj) {
      displayVal = obj.value != null ? String(obj.value) : '';
      if (obj.type === 'list') displayVal = '';
      else if (obj.type === 'pointer') displayVal = '→ ' + obj.value;
    }
    ctx.fillStyle = '#a6e3a1';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    var valY = (varNames && varNames.length > 0) ? y + 48 : y + 34;
    ctx.fillText(displayVal, x + w / 2, valY);

    var objType = obj ? obj.type : type;
    ctx.fillStyle = '#cba6f7';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(objType, x + w - 4, y + h - 6);
  } else {
    // --- 虚线空框 ---
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#45475a';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(49, 50, 68, 0.4)';
    this.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#45475a';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(address, x + 4, y + 12);

    ctx.fillStyle = '#45475a';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(type || '?', x + w / 2, y + h / 2 + 4);
  }

  // 子盒子下标标签（盒子下方外侧）
  if (subLabel) {
    ctx.fillStyle = '#89b4fa';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(subLabel, x + w / 2, y + h + 14);
  }
};

Renderer.prototype.drawEmpty = function() {
  var ctx = this.ctx;
  ctx.fillStyle = '#6c7086';
  ctx.font = '16px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('点击「运行」查看内存变化', this.w / 2, this.h / 2);
};

Renderer.prototype.drawReferArrow = function(srcBox, tgtBox, color) {
  // 从源盒子右侧连到目标盒子左侧
  this.drawArrow(srcBox.x + srcBox.w, srcBox.y + srcBox.h / 2, tgtBox.x, tgtBox.y + tgtBox.h / 2, color);
};

Renderer.prototype.findBox = function(addr, boxes) {
  function search(list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].address === addr) return list[i];
      if (list[i].children) {
        var found = search(list[i].children);
        if (found) return found;
      }
    }
    return null;
  }
  return search(boxes);
};

Renderer.prototype.drawArrow = function(x1, y1, x2, y2, color) {
  var ctx = this.ctx;
  ctx.strokeStyle = color || '#cba6f7';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  var midX = (x1 + x2) / 2;
  ctx.moveTo(x1, y1);
  ctx.bezierCurveTo(midX, y1, midX, y2, x2, y2);
  ctx.stroke();

  ctx.fillStyle = color || '#cba6f7';
  var angle = Math.atan2(y2 - y1, x2 - x1);
  var ax = x2 - 8 * Math.cos(angle);
  var ay = y2 - 8 * Math.sin(angle);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(ax - 4 * Math.sin(angle), ay + 4 * Math.cos(angle));
  ctx.lineTo(ax + 4 * Math.sin(angle), ay - 4 * Math.cos(angle));
  ctx.closePath();
  ctx.fill();
};

Renderer.prototype.roundRect = function(x, y, w, h, r) {
  var ctx = this.ctx;
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
};
