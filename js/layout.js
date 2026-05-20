function computeLayout(snapshot, canvasWidth, canvasHeight, allVarAddrs, allChildAddrs) {
  if (!snapshot || !snapshot.objects) return [];

  var objects = snapshot.objects;
  var variables = snapshot.variables;

  var BOX_W = Math.max(130, Math.min(160, canvasWidth / 6));
  var BOX_H = Math.max(62, Math.min(72, canvasHeight / 5));
  var GAP_X = Math.max(60, BOX_W * 0.5);
  var GAP_Y = Math.max(100, BOX_H * 1.6);

  var CELL_W = Math.max(80, Math.min(100, canvasWidth / 10));
  var CELL_H = 44;
  var CELL_GAP = 24;
  var ROW_GAP = 56;

  var PADDING = 40;

  // ---- 收集顶层地址 ----
  var varNames = Object.keys(variables);
  var seen = {};
  var topAddrList = [];
  for (var i = 0; i < varNames.length; i++) {
    var addr = variables[varNames[i]];
    if (!seen[addr]) { seen[addr] = true; topAddrList.push(addr); }
  }

  // 收集列表子元素标记（用于排除孤儿）
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

  // ---- 收集所有唯一的列表子元素地址 ----
  var allRefAddrs = {};
  for (var i = 0; i < topAddrList.length; i++) {
    var obj = objects[topAddrList[i]];
    if (!obj || !obj.refs) continue;
    var children = (allChildAddrs && allChildAddrs[topAddrList[i]]) ? Object.keys(allChildAddrs[topAddrList[i]]) : obj.refs;
    for (var j = 0; j < children.length; j++) {
      allRefAddrs[children[j]] = true;
    }
  }
  var refAddrList = Object.keys(allRefAddrs);

  // ---- 计算顶层盒子需要的宽度 ----
  function treeWidth(addr) {
    var obj = objects[addr];
    var children = (allChildAddrs && allChildAddrs[addr]) ? Object.keys(allChildAddrs[addr]) : (obj && obj.refs ? obj.refs : []);
    if (children.length === 0) return BOX_W;
    var total = children.length * (CELL_W + CELL_GAP) - CELL_GAP;
    return Math.max(BOX_W, total);
  }

  var treeWidths = [];
  for (var i = 0; i < topAddrList.length; i++) {
    treeWidths.push(treeWidth(topAddrList[i]));
  }

  // ---- 行排版顶层盒子 ----
  var result = [];
  var addrToPos = {};
  var rowY = PADDING;
  var row = [];
  var rowW = 0;

  function flushRow() {
    var startX = Math.max(PADDING, (canvasWidth - rowW) / 2);
    var x = startX;
    for (var i = 0; i < row.length; i++) {
      addrToPos[row[i].addr] = { baseX: x, baseY: rowY };
      x += row[i].tw + GAP_X;
    }
    rowY += BOX_H + GAP_Y;
    row = [];
    rowW = 0;
  }

  for (var i = 0; i < topAddrList.length; i++) {
    var tw = treeWidths[i];
    if (i > 0 && rowW + tw + GAP_X > canvasWidth - PADDING * 2) flushRow();
    row.push({ addr: topAddrList[i], tw: tw });
    rowW += tw + (row.length > 1 ? GAP_X : 0);
  }
  flushRow();

  // ---- 构建顶层盒子（扁平，无嵌套 children） ----
  for (var i = 0; i < topAddrList.length; i++) {
    var addr = topAddrList[i];
    var obj = objects[addr];
    if (!obj) continue;

    var attachedVars = [];
    for (var j = 0; j < varNames.length; j++) {
      if (variables[varNames[j]] === addr) attachedVars.push(varNames[j]);
    }

    result.push({
      x: addrToPos[addr].baseX, y: addrToPos[addr].baseY,
      w: BOX_W, h: BOX_H,
      address: addr, type: obj.type, value: obj.value,
      refs: obj.refs, varNames: attachedVars
    });
  }

  // ---- 扁平放置子元素盒子（去重，共享地址只画一份） ----
  var refAddrToPos = {};
  if (refAddrList.length > 0) {
    var totalRefW = refAddrList.length * (CELL_W + CELL_GAP) - CELL_GAP;
    var refX = Math.max(PADDING, (canvasWidth - totalRefW) / 2);
    var refY = rowY + 20; // 顶层盒子下方

    // 如果需要嵌套（二维列表），递归添加更深层子元素
    var extraRefs = {};
    for (var j = 0; j < refAddrList.length; j++) {
      var ra = refAddrList[j];
      var child = objects[ra];
      if (child && child.refs) {
        var deepChildren = (allChildAddrs && allChildAddrs[ra]) ? Object.keys(allChildAddrs[ra]) : child.refs;
        for (var k = 0; k < deepChildren.length; k++) {
          if (!allRefAddrs[deepChildren[k]]) {
            extraRefs[deepChildren[k]] = true;
          }
        }
      }
    }
    var deepList = Object.keys(extraRefs);
    var allRefWithDeep = refAddrList.concat(deepList);

    var totW = allRefWithDeep.length * (CELL_W + CELL_GAP) - CELL_GAP;
    refX = Math.max(PADDING, (canvasWidth - totW) / 2);

    for (var j = 0; j < allRefWithDeep.length; j++) {
      var ra = allRefWithDeep[j];
      var child = objects[ra] || { type: '?', value: null, refs: null, address: ra };
      refAddrToPos[ra] = { x: refX, y: refY, w: CELL_W, h: CELL_H };
      result.push({
        x: refX, y: refY, w: CELL_W, h: CELL_H,
        address: ra, type: child.type || '?', value: child.value,
        refs: child.refs, varNames: []
      });
      refX += CELL_W + CELL_GAP;
    }
  }

  // 把位置信息挂到返回数组上（给渲染器用）
  result._refPositions = refAddrToPos;

  return result;
}
