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
  var refPositions = baseBoxes._refPositions || {};

  function exists(addr) { return objects && !!objects[addr]; }

  function getVarNames(addr) {
    var names = [];
    for (var v in variables) {
      if (variables.hasOwnProperty(v) && variables[v] === addr) names.push(v);
    }
    return names;
  }

  // ---- 画所有引用箭头 ----
  var arrowColors = ['#cba6f7', '#f9e2af', '#89b4fa', '#a6e3a1'];
  var colorIdx = 0;
  var boxColors = {};

  // 第一遍：收集嵌套列表的标签前缀 + 分配颜色
  var nestedLabels = {};
  for (var i = 0; i < baseBoxes.length; i++) {
    var box = baseBoxes[i];
    if (!exists(box.address)) continue;
    var obj = objects[box.address];
    if (!obj || !obj.refs) continue;
    var names = getVarNames(box.address);
    var prefix = (names && names.length > 0) ? names[0] : '';
    for (var j = 0; j < obj.refs.length; j++) {
      var ra = obj.refs[j];
      var ro = objects[ra];
      if (ro && ro.type === 'list') nestedLabels[ra] = prefix + '[' + j + ']';
    }
    if (!boxColors[box.address]) {
      boxColors[box.address] = arrowColors[colorIdx++ % arrowColors.length];
    }
  }

  // 第二遍：画箭头
  for (var i = 0; i < baseBoxes.length; i++) {
    var box = baseBoxes[i];
    if (!exists(box.address)) continue;
    var obj = objects[box.address];
    if (!obj || !obj.refs) continue;

    var parentNames = getVarNames(box.address);
    var prefix = nestedLabels[box.address] || (parentNames && parentNames.length > 0 ? parentNames[0] : '');
    var color = boxColors[box.address] || '#cba6f7';

    for (var j = 0; j < obj.refs.length; j++) {
      var refAddr = obj.refs[j];
      var refPos = refPositions[refAddr];
      if (!refPos) continue;
      if (!exists(refAddr)) continue;

      var idxLabel = prefix + '[' + j + ']';
      var sx = box.x + box.w / 2;
      var sy = box.y + box.h;
      var tx = refPos.x + refPos.w / 2;
      var ty = refPos.y;
      var bend = (sx < tx) ? 20 + j * 8 : -(20 + j * 8);
      self.drawRefArrow(sx, sy, tx, ty, color, idxLabel, bend);
    }
  }

  // ---- 收集当前所有被引用的地址 ----
  var currentRefsSet = {};
  for (var i = 0; i < baseBoxes.length; i++) {
    var b = baseBoxes[i];
    if (!exists(b.address)) continue;
    var o = objects[b.address];
    if (o && o.refs) {
      for (var j = 0; j < o.refs.length; j++) {
        currentRefsSet[o.refs[j]] = true;
      }
    }
  }

  // ---- 画所有盒子 ----
  for (var i = 0; i < baseBoxes.length; i++) {
    var box = baseBoxes[i];
    var existsInObjs = exists(box.address);
    var isVar = getVarNames(box.address).length > 0;
    // 非变量盒子：必须在当前 refs 中才算实心
    var filled = existsInObjs && (isVar || currentRefsSet.hasOwnProperty(box.address));
    var obj = filled ? objects[box.address] : null;
    var names = filled ? getVarNames(box.address) : [];
    self.drawBox(box.x, box.y, box.w, box.h, box.address, obj ? obj.type : box.type, filled, names, obj);
  }
};

Renderer.prototype.drawBox = function(x, y, w, h, address, type, filled, varNames, obj) {
  var ctx = this.ctx;

  if (filled) {
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

    ctx.fillStyle = '#cba6f7';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(obj ? obj.type : type, x + w - 4, y + h - 6);
  } else {
    ctx.fillStyle = 'rgba(49, 50, 68, 0.15)';
    this.roundRect(x, y, w, h, 6);
    ctx.fill();

    ctx.fillStyle = '#bac2de';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(address, x + 6, y + 14);

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

Renderer.prototype.drawRefArrow = function(x1, y1, x2, y2, color, label, bend) {
  bend = bend || 0;
  var ctx = this.ctx;
  ctx.strokeStyle = color || '#cba6f7';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  var midY = (y1 + y2) / 2;
  ctx.moveTo(x1, y1);
  ctx.bezierCurveTo(x1 + bend, midY, x2 + bend, midY, x2, y2);
  ctx.stroke();

  // 箭头尖
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

  // 标签
  if (label) {
    ctx.fillStyle = '#89b4fa';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2 - 6);
  }
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
