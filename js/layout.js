function computeLayout(snapshot, canvasWidth, canvasHeight, allVarAddrs, allChildAddrs) {
  if (!snapshot || !snapshot.objects) return [];

  var objects = snapshot.objects;
  var variables = snapshot.variables;
  var boxes = [];

  var BOX_W = Math.max(130, Math.min(160, canvasWidth / 6));
  var BOX_H = Math.max(62, Math.min(72, canvasHeight / 5));
  var GAP_X = Math.max(60, BOX_W * 0.5);
  var GAP_Y = Math.max(100, BOX_H * 1.6);

  var CELL_W = Math.max(80, Math.min(100, canvasWidth / 10));
  var CELL_H = 44;
  var CELL_GAP = 24;
  var CELL_Y_GAP = 56;

  var PADDING = 40;

  // ---- 收集顶层地址 ----
  var varNames = Object.keys(variables);
  var seen = {};
  var topAddrList = [];
  for (var i = 0; i < varNames.length; i++) {
    var addr = variables[varNames[i]];
    if (!seen[addr]) { seen[addr] = true; topAddrList.push(addr); }
  }

  // 收集列表子元素标记
  var childAddrs = {};
  function markChildren(addr, visited) {
    if (visited[addr]) return;
    visited[addr] = true;
    var o = objects[addr];
    if (o && o.refs) {
      for (var r = 0; r < o.refs.length; r++) {
        childAddrs[o.refs[r]] = true;
        markChildren(o.refs[r], visited);
      }
    }
  }
  var markVisit = {};
  for (var addr in objects) {
    if (objects.hasOwnProperty(addr)) markChildren(addr, markVisit);
  }

  if (allVarAddrs) {
    for (var addr in allVarAddrs) {
      if (allVarAddrs.hasOwnProperty(addr) && !seen[addr] && !childAddrs[addr]) {
        seen[addr] = true; topAddrList.push(addr);
      }
    }
  }

  // ---- 辅助函数：获取某地址的子元素列表（全部历史） ----
  function getActualChildren(addr, obj) {
    if (allChildAddrs && allChildAddrs[addr]) return Object.keys(allChildAddrs[addr]);
    return (obj && obj.refs) ? obj.refs : [];
  }

  // ---- 计算子元素实际所需宽度（含孙子） ----
  function childSlotWidth(childAddr) {
    var gc = getActualChildren(childAddr, objects[childAddr]);
    if (gc.length === 0) return CELL_W;
    var total = gc.length * (CELL_W + CELL_GAP) - CELL_GAP;
    return Math.max(CELL_W, total);
  }

  // ---- 计算整棵树需要的宽度 ----
  function treeWidth(addr) {
    var obj = objects[addr];
    var children = getActualChildren(addr, obj);
    if (children.length === 0) return BOX_W;
    var total = 0;
    for (var i = 0; i < children.length; i++) {
      total += childSlotWidth(children[i]);
      if (i > 0) total += CELL_GAP;
    }
    return Math.max(BOX_W, total);
  }

  // ---- 计算整棵树需要的高度 ----
  function treeHeight(addr, visited) {
    if (!visited) visited = {};
    if (visited[addr]) return BOX_H;
    visited[addr] = true;
    var obj = objects[addr];
    var children = getActualChildren(addr, obj);
    if (children.length === 0) return BOX_H;
    var maxChildH = 0;
    for (var i = 0; i < children.length; i++) {
      var gc = getActualChildren(children[i], objects[children[i]]);
      if (gc.length > 0) {
        var h = CELL_H + CELL_Y_GAP + CELL_H;
        if (h > maxChildH) maxChildH = h;
      } else {
        if (CELL_H > maxChildH) maxChildH = CELL_H;
      }
    }
    return BOX_H + GAP_Y + maxChildH;
  }

  // ---- 放置顶层盒子 ----
  var treeWidths = [];
  for (var i = 0; i < topAddrList.length; i++) {
    treeWidths.push(treeWidth(topAddrList[i]));
  }

  var addrToPos = {};
  var rowY = PADDING;
  var row = [];
  var rowW = 0;

  function flushRow() {
    var startX = Math.max(PADDING, (canvasWidth - rowW) / 2);
    var maxH = 0;
    for (var i = 0; i < row.length; i++) {
      maxH = Math.max(maxH, treeHeight(row[i].addr));
    }
    var x = startX;
    for (var i = 0; i < row.length; i++) {
      addrToPos[row[i].addr] = { baseX: x, baseY: rowY };
      x += row[i].tw + GAP_X;
    }
    rowY += maxH + GAP_Y;
    row = [];
    rowW = 0;
  }

  for (var i = 0; i < topAddrList.length; i++) {
    var tw = treeWidths[i];
    if (i > 0 && rowW + tw + GAP_X > canvasWidth - PADDING * 2) {
      flushRow();
    }
    row.push({ addr: topAddrList[i], tw: tw });
    rowW += tw + (row.length > 1 ? GAP_X : 0);
  }
  flushRow();

  // ---- 构建盒子树 ----
  for (var i = 0; i < topAddrList.length; i++) {
    buildBoxTree(topAddrList[i], addrToPos[topAddrList[i]].baseX, addrToPos[topAddrList[i]].baseY, boxes);
  }

  function buildBoxTree(addr, x, y, out) {
    var obj = objects[addr];
    if (!obj) return;

    var attachedVars = [];
    for (var j = 0; j < varNames.length; j++) {
      if (variables[varNames[j]] === addr) attachedVars.push(varNames[j]);
    }

    var children = [];
    var childList = getActualChildren(addr, obj);

    if (obj.type === 'list' && childList.length > 0) {
      // 计算子元素总宽度
      var slotWidths = [];
      var totalW = 0;
      for (var k = 0; k < childList.length; k++) {
        var sw = childSlotWidth(childList[k]);
        slotWidths.push(sw);
        totalW += sw + (k > 0 ? CELL_GAP : 0);
      }

      var cx = x + (treeWidth(addr) - totalW) / 2;
      if (cx < PADDING) cx = PADDING;
      var cy = y + BOX_H + GAP_Y;

      for (var k = 0; k < childList.length; k++) {
        var childAddr = childList[k];
        var child = objects[childAddr] || { type: '?', value: null, refs: null, address: childAddr };
        var slotW = slotWidths[k];

        var childBox = {
          x: cx, y: cy, w: CELL_W, h: CELL_H,
          address: childAddr, type: child.type || '?', value: child.value,
          refs: child.refs, varNames: [], index: k, children: []
        };

        // 孙子元素
        var gcList = getActualChildren(childAddr, child);
        if (gcList.length > 0) {
          var gcTotalW = gcList.length * (CELL_W + CELL_GAP) - CELL_GAP;
          var gcx = cx + (slotW - gcTotalW) / 2;
          if (gcx < PADDING) gcx = PADDING;
          var gcy = cy + CELL_H + CELL_Y_GAP;

          for (var m = 0; m < gcList.length; m++) {
            var gcAddr = gcList[m];
            var gc = objects[gcAddr] || { type: '?', value: null, refs: null, address: gcAddr };
            childBox.children.push({
              x: gcx, y: gcy, w: CELL_W, h: CELL_H,
              address: gcAddr, type: gc.type || '?', value: gc.value,
              refs: null, varNames: [], index: m, children: []
            });
            gcx += CELL_W + CELL_GAP;
          }
        }

        children.push(childBox);
        cx += slotW + CELL_GAP;
      }
    }

    out.push({
      x: x, y: y, w: BOX_W, h: BOX_H,
      address: addr, type: obj.type, value: obj.value,
      refs: obj.refs, varNames: attachedVars, children: children
    });
  }

  return boxes;
}
