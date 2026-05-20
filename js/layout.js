function computeLayout(snapshot, canvasWidth, canvasHeight) {
  if (!snapshot || !snapshot.objects) return [];

  var objects = snapshot.objects;
  var variables = snapshot.variables;

  // 从变量出发，收集可达对象
  var reachable = {};
  function markReachable(addr) {
    if (!addr || !objects[addr] || reachable[addr]) return;
    reachable[addr] = true;
    var obj = objects[addr];
    if (obj.refs) {
      for (var i = 0; i < obj.refs.length; i++) {
        markReachable(obj.refs[i]);
      }
    }
  }
  var varNames = Object.keys(variables);
  for (var i = 0; i < varNames.length; i++) {
    markReachable(variables[varNames[i]]);
  }

  // 顶层：直接被变量引用的对象
  var topAddrs = [];
  var seen = {};
  for (var i = 0; i < varNames.length; i++) {
    var addr = variables[varNames[i]];
    if (!seen[addr]) { seen[addr] = true; topAddrs.push(addr); }
  }

  var BOX_W = Math.max(130, Math.min(160, canvasWidth / 6));
  var BOX_H = Math.max(62, Math.min(72, canvasHeight / 5));
  var GAP_X = Math.max(60, BOX_W * 0.5);
  var GAP_Y = Math.max(90, BOX_H * 1.5);
  var CELL_W = Math.max(80, Math.min(100, canvasWidth / 10));
  var CELL_H = 44;
  var CELL_GAP = 20;
  var CELL_Y_GAP = Math.max(50, CELL_H * 1.3);
  var PADDING = 40;

  var totalWidth = topAddrs.length * (BOX_W + GAP_X) - GAP_X;
  var startX = Math.max(PADDING, (canvasWidth - totalWidth) / 2);

  // 递归构建盒子（只包含可达对象）
  function buildBox(addr, parentX, parentY) {
    var obj = objects[addr];
    if (!obj) return null;

    var attachedVars = [];
    for (var j = 0; j < varNames.length; j++) {
      if (variables[varNames[j]] === addr) attachedVars.push(varNames[j]);
    }

    var box = {
      x: parentX, y: parentY, w: BOX_W, h: BOX_H,
      address: addr, type: obj.type, value: obj.value,
      refs: obj.refs, varNames: attachedVars, children: []
    };

    if (obj.type === 'list' && obj.refs) {
      // 过滤：只保留可达的子元素
      var validRefs = [];
      for (var k = 0; k < obj.refs.length; k++) {
        if (reachable[obj.refs[k]]) validRefs.push(obj.refs[k]);
      }
      if (validRefs.length > 0) {
        var totalChildW = validRefs.length * (CELL_W + CELL_GAP) - CELL_GAP;
        var cx = parentX + (BOX_W - totalChildW) / 2;
        if (cx < PADDING) cx = PADDING;
        var cy = parentY + BOX_H + GAP_Y;

        for (var k = 0; k < validRefs.length; k++) {
          var childAddr = validRefs[k];
          var child = objects[childAddr];
          if (!child) continue;

          var childBox = {
            x: cx, y: cy, w: CELL_W, h: CELL_H,
            address: childAddr, type: child.type, value: child.value,
            refs: child.refs, varNames: [], index: k, children: []
          };

          // 嵌套列表
          if (child.type === 'list' && child.refs) {
            var validGrandRefs = [];
            for (var m = 0; m < child.refs.length; m++) {
              if (reachable[child.refs[m]]) validGrandRefs.push(child.refs[m]);
            }
            if (validGrandRefs.length > 0) {
              var grandTotalW = validGrandRefs.length * (CELL_W + CELL_GAP) - CELL_GAP;
              var gx = cx + (CELL_W - grandTotalW) / 2;
              if (gx < PADDING) gx = PADDING;
              var gy = cy + CELL_H + CELL_Y_GAP;
              for (var m = 0; m < validGrandRefs.length; m++) {
                var gc = objects[validGrandRefs[m]];
                if (!gc) continue;
                childBox.children.push({
                  x: gx, y: gy, w: CELL_W, h: CELL_H,
                  address: validGrandRefs[m], type: gc.type, value: gc.value,
                  refs: null, varNames: [], index: m, children: []
                });
                gx += CELL_W + CELL_GAP;
              }
            }
          }

          box.children.push(childBox);
          cx += CELL_W + CELL_GAP;
        }
      }
    }

    return box;
  }

  var boxes = [];
  var x = startX;
  var y = Math.max(PADDING, (canvasHeight - BOX_H - GAP_Y - 80) / 3);

  for (var i = 0; i < topAddrs.length; i++) {
    var box = buildBox(topAddrs[i], x, y);
    if (box) boxes.push(box);
    x += BOX_W + GAP_X;
  }

  return boxes;
}
