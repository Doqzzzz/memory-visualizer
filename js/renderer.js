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

  // 先画竖直父子箭头（列表展开）
  function drawParentChildArrows(box) {
    if (!exists(box.address)) return;
    if (box.children) {
      for (var i = 0; i < box.children.length; i++) {
        var child = box.children[i];
        if (exists(child.address)) {
          self.drawArrow(
            box.x + box.w / 2, box.y + box.h,
            child.x + child.w / 2, child.y,
            diffSet.has(child.address) ? '#a6e3a1' : '#cba6f7'
          );
          // 索引标签
          var ctx = self.ctx;
          ctx.fillStyle = '#6c7086';
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('[' + (child.index != null ? child.index : i) + ']', child.x + child.w / 2, child.y - 5);
        }
        drawParentChildArrows(child);
      }
    }
  }

  // 先画引用箭头（跨盒子）
  function drawRefArrowsForBox(box) {
    if (!exists(box.address)) return;
    var obj = objects[box.address];
    if (!obj || !obj.refs) return;
    for (var i = 0; i < obj.refs.length; i++) {
      var target = self.findBox(obj.refs[i], baseBoxes);
      if (target && exists(target.address) && target.address !== box.address) {
        self.drawReferArrow(box, target, diffSet.has(obj.refs[i]) ? '#a6e3a1' : '#cba6f7');
      }
    }
    if (box.children) {
      for (var i = 0; i < box.children.length; i++) {
        drawRefArrowsForBox(box.children[i]);
      }
    }
  }

  // 画所有箭头（先画 = 在盒子下层）
  for (var i = 0; i < baseBoxes.length; i++) {
    drawParentChildArrows(baseBoxes[i]);
    drawRefArrowsForBox(baseBoxes[i]);
  }

  // 再画所有盒子
  function drawAllBoxes(box) {
    var filled = exists(box.address);
    var obj = filled ? objects[box.address] : null;
    var names = filled ? getVarNames(box.address) : [];
    self.drawBox(box.x, box.y, box.w, box.h, box.address, box.type, filled, names, obj, diffSet);
    if (box.children) {
      for (var i = 0; i < box.children.length; i++) {
        drawAllBoxes(box.children[i]);
      }
    }
  }
  for (var i = 0; i < baseBoxes.length; i++) {
    drawAllBoxes(baseBoxes[i]);
  }
};

Renderer.prototype.drawBox = function(x, y, w, h, address, type, filled, varNames, obj, diffSet) {
  var ctx = this.ctx;
  var isNew = diffSet && diffSet.has(address);

  if (filled) {
    // --- 实心盒子 ---
    ctx.strokeStyle = isNew ? '#a6e3a1' : '#f9e2af';
    ctx.lineWidth = isNew ? 2.5 : 1.5;
    ctx.fillStyle = '#313244';
    this.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#6c7086';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(address, x + 4, y + 12);

    if (varNames && varNames.length > 0) {
      ctx.fillStyle = '#89b4fa';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(varNames.join(', '), x + w / 2, y + 28);
    }

    var displayVal = '';
    if (obj) {
      displayVal = obj.value != null ? String(obj.value) : '';
      if (obj.type === 'list') displayVal = 'list[' + (obj.refs ? obj.refs.length : 0) + ']';
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
