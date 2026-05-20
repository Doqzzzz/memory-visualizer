function computeLayout(snapshot, canvasWidth, canvasHeight, allVarAddrs, allChildAddrs) {
  if (!snapshot || !snapshot.objects) return [];

  var objects = snapshot.objects;
  var variables = snapshot.variables;

  var BOX_W = Math.max(200, canvasWidth / 4);
  var BOX_H = Math.max(90, canvasHeight / 3);
  var GAP_X = Math.max(100, BOX_W * 0.6);
  var GAP_Y = Math.max(140, BOX_H * 1.6);

  var CELL_W = Math.max(120, canvasWidth / 6);
  var CELL_H = 64;
  var CELL_GAP = 32;
  var ROW_GAP = 72;

  var PADDING = 60;

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

  // ---- 计算顶层盒子需要的宽度（扁平模式，子元素独立放置） ----
  function treeWidth(addr) {
    return BOX_W;
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

  // ---- 分层放置子元素 ----
  // 第一层：本身是 list 的子元素（嵌套列表），作为中间节点
  var nestedListAddrs = {};
  for (var j = 0; j < refAddrList.length; j++) {
    var ra = refAddrList[j];
    var child = objects[ra];
    if (child && child.type === 'list') {
      nestedListAddrs[ra] = true;
    }
  }
  var nestedList = Object.keys(nestedListAddrs);

  // 第二层：值类型子元素（int/str/float 等） + 嵌套列表的子元素
  var valueAddrs = {};
  for (var j = 0; j < refAddrList.length; j++) {
    var ra = refAddrList[j];
    var child = objects[ra];
    if (!child || child.type !== 'list') {
      valueAddrs[ra] = true;
    }
  }
  // 纳嵌套列表的子元素
  for (var j = 0; j < nestedList.length; j++) {
    var nl = nestedList[j];
    var nlObj = objects[nl];
    var deepChildren = (allChildAddrs && allChildAddrs[nl]) ? Object.keys(allChildAddrs[nl]) : (nlObj && nlObj.refs ? nlObj.refs : []);
    for (var k = 0; k < deepChildren.length; k++) {
      valueAddrs[deepChildren[k]] = true;
    }
  }
  var valueList = Object.keys(valueAddrs);

  var refAddrToPos = {};
  var refY = rowY + 20;

  // 放置嵌套列表盒子（中间层）
  if (nestedList.length > 0) {
    var nestedW = nestedList.length * (CELL_W + CELL_GAP) - CELL_GAP;
    var nestedX = Math.max(PADDING, (canvasWidth - nestedW) / 2);
    for (var j = 0; j < nestedList.length; j++) {
      var addr = nestedList[j];
      var obj = objects[addr] || { type: 'list', value: null, refs: null, address: addr };
      refAddrToPos[addr] = { x: nestedX, y: refY, w: CELL_W, h: CELL_H };
      result.push({
        x: nestedX, y: refY, w: CELL_W, h: CELL_H,
        address: addr, type: obj.type || 'list', value: obj.value,
        refs: obj.refs, varNames: []
      });
      nestedX += CELL_W + CELL_GAP;
    }
    refY += CELL_H + ROW_GAP;
  }

  // 放置值元素盒子（底层共享）
  if (valueList.length > 0) {
    var valueW = valueList.length * (CELL_W + CELL_GAP) - CELL_GAP;
    var valueX = Math.max(PADDING, (canvasWidth - valueW) / 2);
    for (var j = 0; j < valueList.length; j++) {
      var addr = valueList[j];
      var obj = objects[addr] || { type: '?', value: null, refs: null, address: addr };
      refAddrToPos[addr] = { x: valueX, y: refY, w: CELL_W, h: CELL_H };
      result.push({
        x: valueX, y: refY, w: CELL_W, h: CELL_H,
        address: addr, type: obj.type || '?', value: obj.value,
        refs: obj.refs, varNames: []
      });
      valueX += CELL_W + CELL_GAP;
    }
  }

  result._refPositions = refAddrToPos;
  return result;
}
