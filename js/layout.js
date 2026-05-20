function computeLayout(snapshot, canvasWidth, canvasHeight) {
  if (!snapshot || !snapshot.objects) return [];

  var objects = snapshot.objects;
  var variables = snapshot.variables;
  var boxes = [];
  var BOX_W = 120, BOX_H = 60, GAP_X = 50, GAP_Y = 80;
  var CELL_W = 56, CELL_H = 34, CELL_GAP = 12;
  var x = 30, y = 30;

  var varNames = Object.keys(variables);
  var topAddrs = {};
  for (var i = 0; i < varNames.length; i++) {
    topAddrs[variables[varNames[i]]] = true;
  }

  // 收集所有顶层对象
  var topAddrList = [];
  var seen = {};
  for (var i = 0; i < varNames.length; i++) {
    var addr = variables[varNames[i]];
    if (!seen[addr]) { seen[addr] = true; topAddrList.push(addr); }
  }

  for (var i = 0; i < topAddrList.length; i++) {
    var addr = topAddrList[i];
    var obj = objects[addr];
    if (!obj) continue;

    var attachedVars = [];
    for (var j = 0; j < varNames.length; j++) {
      if (variables[varNames[j]] === addr) attachedVars.push(varNames[j]);
    }

    var box = {
      x: x, y: y, w: BOX_W, h: BOX_H,
      address: addr, type: obj.type, value: obj.value,
      refs: obj.refs, varNames: attachedVars, children: []
    };

    if (obj.type === 'list' && obj.refs) {
      var cx = x;
      var cy = y + BOX_H + GAP_Y;
      for (var k = 0; k < obj.refs.length; k++) {
        var childAddr = obj.refs[k];
        var child = objects[childAddr];
        if (!child) continue;
        var childBox = {
          x: cx, y: cy, w: CELL_W, h: CELL_H,
          address: childAddr, type: child.type, value: child.value,
          refs: child.refs, varNames: [], index: k, children: []
        };
        if (child.type === 'list' && child.refs) {
          var gx = cx, gy = cy + CELL_H + 30;
          for (var m = 0; m < child.refs.length; m++) {
            var gcAddr = child.refs[m];
            var gc = objects[gcAddr];
            if (!gc) continue;
            childBox.children.push({
              x: gx, y: gy, w: CELL_W, h: CELL_H,
              address: gcAddr, type: gc.type, value: gc.value,
              refs: null, varNames: [], index: m, children: []
            });
            gx += CELL_W + CELL_GAP;
          }
        }
        box.children.push(childBox);
        cx += CELL_W + CELL_GAP;
      }
    }

    boxes.push(box);
    x += BOX_W + GAP_X;
    if (x + BOX_W > canvasWidth - 30) { x = 30; y = y + BOX_H + GAP_Y + 120; }
  }

  return boxes;
}
