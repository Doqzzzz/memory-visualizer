function computeLayout(snapshot, canvasWidth, canvasHeight, allVarAddrs, allChildAddrs) {
  if (!snapshot || !snapshot.objects) return [];

  var objects = snapshot.objects;
  var variables = snapshot.variables;
  var boxes = [];

  // 尺寸根据画布大小自适应
  var BOX_W = Math.max(130, Math.min(160, canvasWidth / 6));
  var BOX_H = Math.max(62, Math.min(72, canvasHeight / 5));
  var GAP_X = Math.max(60, BOX_W * 0.5);
  var GAP_Y = Math.max(90, BOX_H * 1.5);

  var CELL_W = Math.max(80, Math.min(100, canvasWidth / 10));
  var CELL_H = 44;
  var CELL_GAP = 20;
  var CELL_Y_GAP = Math.max(50, CELL_H * 1.3);

  var PADDING = 40;

  var varNames = Object.keys(variables);
  var seen = {};
  var topAddrList = [];
  for (var i = 0; i < varNames.length; i++) {
    var addr = variables[varNames[i]];
    if (!seen[addr]) { seen[addr] = true; topAddrList.push(addr); }
  }
  // 收集所有列表子元素地址（这些已作为 children 展示，不做顶层盒子）
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

  // 加入曾在任意步骤绑定过变量、但不在最终 variables 中的中间对象（如 C 临时值）
  if (allVarAddrs) {
    for (var addr in allVarAddrs) {
      if (!allVarAddrs.hasOwnProperty(addr)) continue;
      if (!seen[addr] && !childAddrs[addr]) { seen[addr] = true; topAddrList.push(addr); }
    }
  }

  // 计算总布局宽度（所有顶层盒子 + 间距），再居中偏移
  var totalWidth = topAddrList.length * (BOX_W + GAP_X) - GAP_X;
  var startX = Math.max(PADDING, (canvasWidth - totalWidth) / 2);

  // 收集整棵对象树需要的高度
  function calcTreeHeight(addr, visited) {
    if (visited[addr]) return BOX_H;
    visited[addr] = true;
    var obj = objects[addr];
    if (!obj || !obj.refs) return BOX_H;
    var maxChildH = 0;
    for (var i = 0; i < obj.refs.length; i++) {
      var ch = calcTreeHeight(obj.refs[i], visited);
      if (ch > maxChildH) maxChildH = ch;
    }
    return BOX_H + GAP_Y + CELL_H + (maxChildH > BOX_H ? maxChildH - BOX_H : 0);
  }

  var treeVisit = {};
  var maxTreeH = BOX_H;
  for (var i = 0; i < topAddrList.length; i++) {
    var th = calcTreeHeight(topAddrList[i], treeVisit);
    if (th > maxTreeH) maxTreeH = th;
  }

  var x = startX;
  var y = Math.max(PADDING, (canvasHeight - maxTreeH) / 2);
  if (y < PADDING) y = PADDING;

  for (var i = 0; i < topAddrList.length; i++) {
    var addr = topAddrList[i];
    var obj = objects[addr];
    if (!obj) continue;

    var attachedVars = [];
    for (var j = 0; j < varNames.length; j++) {
      if (variables[varNames[j]] === addr) attachedVars.push(varNames[j]);
    }

    var children = [];
    var childStartX = x;
    var childY = y + BOX_H + GAP_Y;

    var actualChildren = (allChildAddrs && allChildAddrs[addr]) ? Object.keys(allChildAddrs[addr]) : (obj.refs || []);

    if (obj.type === 'list' && actualChildren.length > 0) {
      // 计算子元素总宽度
      var totalChildW = actualChildren.length * (CELL_W + CELL_GAP) - CELL_GAP;
      var cx = x + (BOX_W - totalChildW) / 2;
      if (cx < PADDING) cx = PADDING;

      for (var k = 0; k < actualChildren.length; k++) {
        var childAddr = actualChildren[k];
        var child = objects[childAddr] || (allChildAddrs && allChildAddrs[addr] ? { type: '?', value: null, refs: null, address: childAddr } : null);
        if (!child) continue;

        var childBox = {
          x: cx, y: childY, w: CELL_W, h: CELL_H,
          address: childAddr, type: child.type || '?', value: child.value,
          refs: child.refs, varNames: [], index: k, children: []
        };

        // 嵌套列表 —— 同样使用全部历史子元素
        var nestedChildren = (allChildAddrs && allChildAddrs[childAddr]) ? Object.keys(allChildAddrs[childAddr]) : (child.refs || []);
        if ((child.type === 'list' || nestedChildren.length > 0) && nestedChildren.length > 0) {
          var grandTotalW = nestedChildren.length * (CELL_W + CELL_GAP) - CELL_GAP;
          var gx = cx + (CELL_W - grandTotalW) / 2;
          if (gx < PADDING) gx = PADDING;
          var gy = childY + CELL_H + CELL_Y_GAP;

          for (var m = 0; m < nestedChildren.length; m++) {
            var gcAddr = nestedChildren[m];
            var gc = objects[gcAddr] || { type: '?', value: null, refs: null, address: gcAddr };
            childBox.children.push({
              x: gx, y: gy, w: CELL_W, h: CELL_H,
              address: gcAddr, type: gc.type || '?', value: gc.value,
              refs: null, varNames: [], index: m, children: []
            });
            gx += CELL_W + CELL_GAP;
          }
        }

        children.push(childBox);
        cx += CELL_W + CELL_GAP;
      }
    }

    boxes.push({
      x: x, y: y, w: BOX_W, h: BOX_H,
      address: addr, type: obj.type, value: obj.value,
      refs: obj.refs, varNames: attachedVars, children: children
    });

    x += BOX_W + GAP_X;
  }

  return boxes;
}
