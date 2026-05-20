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

Renderer.prototype.render = function(boxes, diff) {
  this.resize();
  this.clear();

  if (!boxes || boxes.length === 0) {
    this.drawEmpty();
    return;
  }

  var self = this;
  var diffSet = diff ? new Set(diff.added.concat(diff.modified)) : new Set();

  // 先画所有箭头
  function drawAllArrows(box) {
    self.drawRefArrows(box, boxes);
    if (box.children) { for (var i = 0; i < box.children.length; i++) { drawAllArrows(box.children[i]); } }
  }
  for (var i = 0; i < boxes.length; i++) { drawAllArrows(boxes[i]); }

  // 再画所有盒子
  function drawAllBoxes(box) {
    self.drawBox(box, diffSet);
    if (box.children) { for (var i = 0; i < box.children.length; i++) { drawAllBoxes(box.children[i]); } }
  }
  for (var i = 0; i < boxes.length; i++) { drawAllBoxes(boxes[i]); }
};

Renderer.prototype.drawEmpty = function() {
  var ctx = this.ctx;
  ctx.fillStyle = '#6c7086';
  ctx.font = '16px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('点击「运行」查看内存变化', this.w / 2, this.h / 2);
};

Renderer.prototype.drawBox = function(box, diffSet) {
  var ctx = this.ctx;
  var x = box.x, y = box.y, w = box.w, h = box.h;

  var isNew = diffSet.has(box.address);
  ctx.strokeStyle = isNew ? '#a6e3a1' : '#f9e2af';
  ctx.lineWidth = isNew ? 2.5 : 1.5;
  ctx.fillStyle = '#313244';
  this.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();

  // 地址
  ctx.fillStyle = '#6c7086';
  ctx.font = '9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(box.address, x + 4, y + 12);

  // 变量名
  if (box.varNames && box.varNames.length > 0) {
    ctx.fillStyle = '#89b4fa';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(box.varNames.join(', '), x + w / 2, y + 28);
  }

  // 值
  var displayVal = box.value != null ? String(box.value) : '';
  if (box.type === 'list') displayVal = 'list[' + (box.refs ? box.refs.length : 0) + ']';
  else if (box.type === 'pointer') displayVal = '→ ' + box.value;

  ctx.fillStyle = '#a6e3a1';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  var valY = (box.varNames && box.varNames.length > 0) ? y + 48 : y + 34;
  ctx.fillText(displayVal, x + w / 2, valY);

  // 类型标签
  ctx.fillStyle = '#cba6f7';
  ctx.font = '9px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(box.type, x + w - 4, y + h - 6);

  // 子到父箭头 + 索引标签
  if (box.children && box.children.length > 0) {
    for (var i = 0; i < box.children.length; i++) {
      var child = box.children[i];
      // 父到子箭头
      this.drawArrow(x + w / 2, y + h, child.x + child.w / 2, child.y,
        diffSet.has(child.address) ? '#a6e3a1' : '#cba6f7');
      // 索引
      ctx.fillStyle = '#6c7086';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[' + (child.index != null ? child.index : i) + ']', child.x + child.w / 2, child.y - 5);
    }
  }
};

Renderer.prototype.drawRefArrows = function(box, allBoxes) {
  if (!box.refs) return;
  for (var i = 0; i < box.refs.length; i++) {
    var target = this.findBox(box.refs[i], allBoxes);
    if (target && target !== box) {
      this.drawArrow(box.x + box.w, box.y + box.h / 2, target.x, target.y + target.h / 2, '#cba6f7');
    }
  }
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
