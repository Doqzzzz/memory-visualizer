function computeLayout(snapshot, canvasWidth, canvasHeight, allVarAddrs, allChildAddrs) {
  if (!snapshot || !snapshot.objects) return [];

  var objects = snapshot.objects;
  var variables = snapshot.variables;

  var BOX_W = 130;
  var BOX_H = 62;
  var GAP_X = 50;
  var GAP_Y = 100;
  var PADDING = 40;

  // ---- 收集所有需要展示的地址 ----
  var allAddrs = [];

  // 顶层变量地址
  var topAddrs = {};
  for (var v in variables) {
    if (variables.hasOwnProperty(v)) topAddrs[variables[v]] = true;
  }
  // 历史变量地址
  if (allVarAddrs) {
    for (var a in allVarAddrs) {
      if (allVarAddrs.hasOwnProperty(a)) topAddrs[a] = true;
    }
  }

  for (var a in topAddrs) {
    if (topAddrs.hasOwnProperty(a)) allAddrs.push(a);
  }

  // 被引用的子元素地址（列表元素等）
  var refAddrs = {};
  if (allChildAddrs) {
    for (var parent in allChildAddrs) {
      if (allChildAddrs.hasOwnProperty(parent)) {
        var kids = allChildAddrs[parent];
        for (var ca in kids) {
          if (kids.hasOwnProperty(ca)) refAddrs[ca] = true;
        }
      }
    }
  }

  for (var a in refAddrs) {
    if (refAddrs.hasOwnProperty(a) && !topAddrs[a]) allAddrs.push(a);
  }

  // ---- 分类：顶层 vs 被引用 ----
  var topList = [];
  var refList = [];
  for (var i = 0; i < allAddrs.length; i++) {
    if (topAddrs[allAddrs[i]]) {
      topList.push(allAddrs[i]);
    } else {
      refList.push(allAddrs[i]);
    }
  }

  // ---- 放置顶层盒子 ----
  var boxes = [];
  // 居中
  var totalTopW = topList.length * (BOX_W + GAP_X) - GAP_X;
  if (totalTopW < 0) totalTopW = 0;
  var startX = Math.max(PADDING, (canvasWidth - totalTopW) / 2);
  var topY = PADDING + 20;

  // 如果行太宽，换行
  var rowX = startX;
  var rowY = topY;
  for (var i = 0; i < topList.length; i++) {
    if (i > 0 && rowX + BOX_W > canvasWidth - PADDING) {
      rowX = PADDING;
      rowY += BOX_H + GAP_Y;
    }

    var addr = topList[i];
    var obj = objects[addr];
    if (!obj) continue;

    var names = [];
    for (var v in variables) {
      if (variables.hasOwnProperty(v) && variables[v] === addr) names.push(v);
    }

    boxes.push({
      x: rowX, y: rowY, w: BOX_W, h: BOX_H,
      address: addr, type: obj.type, value: obj.value,
      refs: obj.refs, varNames: names, isChild: false
    });
    rowX += BOX_W + GAP_X;
  }

  // ---- 放置被引用盒子（第二行） ----
  if (refList.length > 0) {
    var totalRefW = refList.length * (BOX_W + GAP_X) - GAP_X;
    var refStartX = Math.max(PADDING, (canvasWidth - totalRefW) / 2);
    var refY = rowY + BOX_H + GAP_Y;

    var rx = refStartX;
    for (var i = 0; i < refList.length; i++) {
      if (i > 0 && rx + BOX_W > canvasWidth - PADDING) {
        rx = PADDING;
        refY += BOX_H + GAP_Y;
      }
      var addr = refList[i];
      var obj = objects[addr];
      if (!obj) continue;

      boxes.push({
        x: rx, y: refY, w: BOX_W, h: BOX_H,
        address: addr, type: obj.type, value: obj.value,
        refs: obj.refs, varNames: [], isChild: true
      });
      rx += BOX_W + GAP_X;
    }
  }

  return boxes;
}
