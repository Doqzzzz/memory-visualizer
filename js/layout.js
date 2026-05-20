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

  // 顶层地址
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
  // 子元素盒子用更小的，但足够看
  var CELL_W = 64;
  var CELL_H = 34;
  var CELL_GAP = 12;
  var CELL_Y_GAP = 48;
  var PADDING = 40;

  var totalWidth = topAddrs.length * (BOX_W + GAP_X) - GAP_X;
  var startX = Math.max(PADDING, (canvasWidth - totalWidth) / 2);

  // 全局已分配盒子的地址 → 防止重复
  var allocated = {};
  // 共享引用列表：{ parentAddr → [refAddr, ...] } 需要画跨盒箭头
  var sharedRefs = {};

  function buildBox(addr, parentX, parentY, isTop) {
    var obj = objects[addr];
    if (!obj) return null;

    // 已经在别处画过了 → 跳过，记录共享关系
    if (allocated[addr]) {
      return null;
    }
    allocated[addr] = true;

    var attachedVars = [];
    for (var j = 0; j < varNames.length; j++) {
      if (variables[varNames[j]] === addr) attachedVars.push(varNames[j]);
    }

    var box = {
      x: parentX, y: parentY,
      w: isTop ? BOX_W : CELL_W,
      h: isTop ? BOX_H : CELL_H,
      address: addr, type: obj.type, value: obj.value,
      refs: obj.refs, varNames: attachedVars, children: [],
      isTop: isTop
    };

    if (obj.type === 'list' && obj.refs) {
      // 收集可达子元素
      var validRefs = [];
      for (var k = 0; k < obj.refs.length; k++) {
        if (reachable[obj.refs[k]]) validRefs.push({ index: k, addr: obj.refs[k] });
      }
      if (validRefs.length > 0) {
        var totalChildW = validRefs.length * (CELL_W + CELL_GAP) - CELL_GAP;
        var cx = parentX + ((isTop ? BOX_W : CELL_W) - totalChildW) / 2;
        if (cx < PADDING) cx = PADDING;
        var cy = parentY + (isTop ? BOX_H : CELL_H) + (isTop ? GAP_Y : CELL_Y_GAP);

        for (var k = 0; k < validRefs.length; k++) {
          var childAddr = validRefs[k].addr;
          var childIdx = validRefs[k].index;

          if (allocated[childAddr]) {
            // 已存在 → 记录为共享引用
            if (!sharedRefs[addr]) sharedRefs[addr] = [];
            sharedRefs[addr].push(childAddr);
            continue;
          }

          var childObj = objects[childAddr];
          if (!childObj) continue;

          allocated[childAddr] = true;
          var childBox = {
            x: cx, y: cy, w: CELL_W, h: CELL_H,
            address: childAddr, type: childObj.type, value: childObj.value,
            refs: childObj.refs, varNames: [], index: childIdx, children: [],
            isTop: false
          };

          // 嵌套列表
          if (childObj.type === 'list' && childObj.refs) {
            var validGrandRefs = [];
            for (var m = 0; m < childObj.refs.length; m++) {
              if (reachable[childObj.refs[m]]) validGrandRefs.push({ index: m, addr: childObj.refs[m] });
            }
            if (validGrandRefs.length > 0) {
              var grandTotalW = validGrandRefs.length * (CELL_W + CELL_GAP) - CELL_GAP;
              var gx = cx + (CELL_W - grandTotalW) / 2;
              if (gx < PADDING) gx = PADDING;
              var gy = cy + CELL_H + CELL_Y_GAP;
              for (var m = 0; m < validGrandRefs.length; m++) {
                var gcAddr = validGrandRefs[m].addr;
                var gcIdx = validGrandRefs[m].index;

                if (allocated[gcAddr]) {
                  if (!sharedRefs[childAddr]) sharedRefs[childAddr] = [];
                  sharedRefs[childAddr].push(gcAddr);
                  continue;
                }

                var gc = objects[gcAddr];
                if (!gc) continue;
                allocated[gcAddr] = true;
                childBox.children.push({
                  x: gx, y: gy, w: CELL_W, h: CELL_H,
                  address: gcAddr, type: gc.type, value: gc.value,
                  refs: null, varNames: [], index: gcIdx, children: [],
                  isTop: false
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
    var box = buildBox(topAddrs[i], x, y, true);
    if (box) {
      box.sharedRefs = sharedRefs[topAddrs[i]] || [];
      boxes.push(box);
    }
    x += BOX_W + GAP_X;
  }

  return boxes;
}
