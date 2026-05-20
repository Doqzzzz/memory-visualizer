var stateManager = null;
var renderer = null;
var baseBoxes = null;
var isEditMode = true;

var currentLanguage = 'python';
var runBtn = document.getElementById('run-btn');
var resetBtn = document.getElementById('reset-btn');
var codeEditor = document.getElementById('code-editor');
var codeDisplay = document.getElementById('code-display');
var presetList = document.getElementById('preset-list');
var prevBtn = document.getElementById('prev-btn');
var nextBtn = document.getElementById('next-btn');
var stepSlider = document.getElementById('step-slider');
var stepIndicator = document.getElementById('step-indicator');
var canvas = document.getElementById('memory-canvas');

function init() {
  renderer = new Renderer(canvas);
  renderPresetList();
  loadPreset(PRESETS[0]);
  bindEvents();
  renderer.render([], null, null);

  window.addEventListener('resize', function() {
    if (stateManager && baseBoxes) {
      renderer.resize();
      renderer.render(baseBoxes, stateManager.currentSnapshot, null);
    }
  });
}

function bindEvents() {
  runBtn.addEventListener('click', runCode);
  resetBtn.addEventListener('click', resetCode);
  prevBtn.addEventListener('click', prevStep);
  nextBtn.addEventListener('click', nextStep);
  stepSlider.addEventListener('input', function() {
    goToStep(parseInt(stepSlider.value));
  });

  codeDisplay.addEventListener('click', showEditView);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); prevStep(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); nextStep(); }
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); runCode(); }
  });
}

function renderPresetList() {
  presetList.innerHTML = '';
  PRESETS.forEach(function(preset, idx) {
    var li = document.createElement('li');
    li.textContent = preset.name;
    li.title = preset.description;
    li.dataset.index = idx;
    li.addEventListener('click', function() { loadPreset(preset); });
    presetList.appendChild(li);
  });
}

function loadPreset(preset) {
  codeEditor.value = preset.code;
  currentLanguage = preset.language;

  var items = presetList.querySelectorAll('li');
  items.forEach(function(item) {
    var idx = parseInt(item.dataset.index);
    item.classList.toggle('active', PRESETS[idx] === preset);
  });

  runCode();
}

function showCodeView() {
  isEditMode = false;
  var lines = codeEditor.value.split('\n');
  var html = '';
  for (var i = 0; i < lines.length; i++) {
    html += '<span class="line" data-line="' + i + '">' + escHtml(lines[i] || ' ') + '</span>\n';
  }
  codeDisplay.innerHTML = html;
  codeEditor.classList.add('hidden');
  codeDisplay.classList.add('visible');
}

function showEditView() {
  isEditMode = true;
  codeDisplay.classList.remove('visible');
  codeEditor.classList.remove('hidden');
  codeEditor.focus();
}

function highlightLine(stepIndex) {
  // step 0 → 无高亮
  var lineIdx = stepIndex - 1;
  var allLines = codeDisplay.querySelectorAll('.line');
  for (var i = 0; i < allLines.length; i++) {
    allLines[i].classList.remove('current');
  }
  if (lineIdx >= 0 && lineIdx < allLines.length) {
    allLines[lineIdx].classList.add('current');
    allLines[lineIdx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function runCode() {
  var code = codeEditor.value.trim();
  var language = /\bint\b|&/.test(code) ? 'c' : currentLanguage;

  if (!code) { showError('请输入代码'); return; }

  try {
    var events = interpret(code, language);
    stateManager = new StateManager(events);
    if (stateManager.totalSteps > 0) {
      showCodeView();
      renderer.resize();
      // 用最后一步的快照预计算所有盒子位置
      var lastStep = stateManager.totalSteps - 1;
      stateManager.goToStep(lastStep);
      var finalSnap = stateManager.currentSnapshot;
      baseBoxes = computeLayout(finalSnap, renderer.w, renderer.h);
      // 回到第 0 步展示空盒子
      goToStep(0);
    } else {
      baseBoxes = null;
      renderer.render([], null, null);
      updateStepUI();
    }
  } catch (err) {
    showError(err.message);
    console.error(err);
  }
}

function resetCode() {
  stateManager = null;
  baseBoxes = null;
  renderer.render([], null, null);
  updateStepUI();
  showEditView();
  if (PRESETS.length > 0) {
    var currentPreset = null;
    var items = presetList.querySelectorAll('li');
    items.forEach(function(item) {
      if (item.classList.contains('active')) {
        currentPreset = PRESETS[parseInt(item.dataset.index)];
      }
    });
    if (currentPreset) codeEditor.value = currentPreset.code;
  }
}

function goToStep(n) {
  if (!stateManager || stateManager.totalSteps === 0) return;
  stateManager.goToStep(n);
  renderer.resize();
  var diff = stateManager.getDiff();
  renderer.render(baseBoxes, stateManager.currentSnapshot, diff);
  highlightLine(stateManager.currentStep);
  updateStepUI();
}

function prevStep() {
  if (!stateManager || stateManager.currentStep <= 0) return;
  stateManager.goToStep(stateManager.currentStep - 1);
  renderer.resize();
  var diff = stateManager.getDiff();
  renderer.render(baseBoxes, stateManager.currentSnapshot, diff);
  highlightLine(stateManager.currentStep);
  updateStepUI();
}

function nextStep() {
  if (!stateManager || stateManager.currentStep >= stateManager.totalSteps - 1) return;
  stateManager.next();
  renderer.resize();
  var diff = stateManager.getDiff();
  renderer.render(baseBoxes, stateManager.currentSnapshot, diff);
  highlightLine(stateManager.currentStep);
  updateStepUI();
}

function updateStepUI() {
  var totalCodeLines = stateManager ? stateManager.totalSteps - 1 : 0;
  var current = stateManager ? stateManager.currentStep : 0;

  stepIndicator.textContent = '步骤 ' + current + '/' + totalCodeLines;
  stepSlider.max = stateManager ? stateManager.totalSteps - 1 : 0;
  stepSlider.value = current;

  prevBtn.disabled = !stateManager || stateManager.currentStep === 0;
  nextBtn.disabled = !stateManager || stateManager.currentStep >= stateManager.totalSteps - 1;
}

function showError(msg) {
  var toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 3000);
}

document.addEventListener('DOMContentLoaded', init);
