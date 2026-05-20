let nextAddr = 1;
function newAddress() {
  return '0x' + (nextAddr++).toString(16).padStart(4, '0');
}

function makeObject(type, value, refs) {
  return { address: newAddress(), type: type, value: value !== undefined ? value : null, refs: refs !== undefined ? refs : null };
}

function serializeObjects(objects) {
  var copy = {};
  for (var addr in objects) {
    if (!objects.hasOwnProperty(addr)) continue;
    var obj = objects[addr];
    copy[addr] = { address: obj.address, type: obj.type, value: obj.value, refs: obj.refs ? obj.refs.slice() : null };
  }
  return copy;
}

function snapshot(vars, objs) {
  return { variables: Object.assign({}, vars), objects: serializeObjects(objs) };
}

/* ========== Python 解释器 ========== */
function interpretPython(code) {
  nextAddr = 1;
  var events = [];
  var variables = {};
  var objects = {};

  var lines = code.split('\n').filter(function(l) { return l.trim(); });

  function emit(action, varName, address, step) {
    events.push({
      step: step, action: action, varName: varName || null,
      address: address || null, snapshot: snapshot(variables, objects)
    });
  }

  function allocObject(type, value, refs) {
    var obj = makeObject(type, value, refs);
    objects[obj.address] = obj;
    return obj;
  }

  function parseValue(raw) {
    raw = raw.trim();
    if (/^-?\d+$/.test(raw)) return allocObject('int', parseInt(raw));
    if (/^-?\d+\.\d+$/.test(raw)) return allocObject('float', parseFloat(raw));
    if (/^["'].*["']$/.test(raw)) return allocObject('str', raw.slice(1, -1));
    if (/^[a-zA-Z_]\w*$/.test(raw)) {
      var addr = variables[raw];
      if (!addr) throw new Error('未定义的变量: ' + raw);
      return objects[addr];
    }
    if (/^\[.*\]$/.test(raw)) return parseListLiteral(raw);
    var m = raw.match(/^([a-zA-Z_]\w*)\.copy\(\)$/);
    if (m) {
      var srcAddr = variables[m[1]];
      if (!srcAddr) throw new Error('未定义的变量: ' + m[1]);
      var src = objects[srcAddr];
      return allocObject(src.type, src.value, src.refs ? src.refs.slice() : null);
    }
    m = raw.match(/^deepcopy\(([a-zA-Z_]\w*)\)$/);
    if (m) {
      var srcAddr2 = variables[m[1]];
      if (!srcAddr2) throw new Error('未定义的变量: ' + m[1]);
      return deepCopyObject(objects[srcAddr2], objects, {});
    }
    throw new Error('无法解析: ' + raw);
  }

  function parseListLiteral(raw) {
    var inner = raw.slice(1, -1).trim();
    var elements = splitElements(inner);
    var refAddrs = [];
    for (var i = 0; i < elements.length; i++) {
      refAddrs.push(parseValue(elements[i].trim()).address);
    }
    return allocObject('list', null, refAddrs);
  }

  function splitElements(str) {
    var parts = [], depth = 0, current = '';
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if (ch === '[') { depth++; current += ch; }
      else if (ch === ']') { depth--; current += ch; }
      else if (ch === ',' && depth === 0) { parts.push(current); current = ''; }
      else { current += ch; }
    }
    if (current) parts.push(current);
    return parts;
  }

  function deepCopyObject(src, objs, copies) {
    if (copies[src.address]) return copies[src.address];
    if (src.type !== 'list') {
      var cp = allocObject(src.type, src.value);
      copies[src.address] = cp;
      return cp;
    }
    var cp = allocObject('list', null, []);
    copies[src.address] = cp;
    for (var i = 0; i < src.refs.length; i++) {
      cp.refs.push(deepCopyObject(objs[src.refs[i]], objs, copies).address);
    }
    return cp;
  }

  function handleAssign(lhs, rhs, step) {
    lhs = lhs.trim();
    var bracketMatch = lhs.match(/^(\w+)((?:\[\d+\])+)$/);
    var rhsObj = parseValue(rhs.trim());

    if (bracketMatch) {
      var varName = bracketMatch[1];
      var indices = bracketMatch[2].match(/\d+/g).map(Number);
      var parentAddr = variables[varName];
      if (!parentAddr) throw new Error('未定义的变量: ' + varName);
      var current = objects[parentAddr];
      for (var i = 0; i < indices.length - 1; i++) {
        current = objects[current.refs[indices[i]]];
      }
      current.refs[indices[indices.length - 1]] = rhsObj.address;
      emit('set_element', varName, parentAddr, step);
    } else {
      variables[lhs] = rhsObj.address;
      emit('bind', lhs, rhsObj.address, step);
    }
  }

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    handleAssign(line.substring(0, eqIdx), line.substring(eqIdx + 1), i + 1);
  }

  return events;
}

/* ========== C 解释器 ========== */
function interpretC(code) {
  nextAddr = 1;
  var events = [];
  var variables = {};
  var objects = {};

  var lines = code.split('\n').filter(function(l) { return l.trim(); });

  function emit(action, varName, address, step) {
    events.push({
      step: step, action: action, varName: varName || null,
      address: address || null, snapshot: snapshot(variables, objects)
    });
  }

  function allocObject(type, value, refs) {
    var obj = makeObject(type, value, refs);
    objects[obj.address] = obj;
    return obj;
  }

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    var step = i + 1;

    var m = line.match(/^int\s+(\w+)\s*=\s*(.+)$/);
    if (m) {
      var obj = allocObject('int', parseInt(m[2]));
      variables[m[1]] = obj.address;
      emit('bind', m[1], obj.address, step);
      continue;
    }

    m = line.match(/^int\s*\*\s*(\w+)\s*=\s*&(\w+)$/);
    if (m) {
      var targetAddr = variables[m[2]];
      if (!targetAddr) throw new Error('未定义的变量: ' + m[2]);
      var ptr = allocObject('pointer', targetAddr);
      variables[m[1]] = ptr.address;
      emit('bind', m[1], ptr.address, step);
      continue;
    }

    m = line.match(/^\*(\w+)\s*=\s*(.+)$/);
    if (m) {
      var ptrAddr = variables[m[1]];
      if (!ptrAddr) throw new Error('未定义的指针: ' + m[1]);
      var ptr = objects[ptrAddr];
      objects[ptr.value].value = parseInt(m[2]);
      emit('modify', m[1], ptrAddr, step);
      continue;
    }
  }

  return events;
}

/* ========== 入口 ========== */
function interpret(code, language) {
  if (language === 'c') return interpretC(code);
  return interpretPython(code);
}
