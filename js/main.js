var stateManager = null;
var renderer = null;

var langSelect = document.getElementById('lang-select');
var runBtn = document.getElementById('run-btn');
var resetBtn = document.getElementById('reset-btn');
var codeEditor = document.getElementById('code-editor');
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
  renderer.render([], null);

  window.addEventListener('resize', function() {
    if (stateManager && stateManager.currentSnapshot) {
      renderer.resize();
      var boxes = computeLayout(stateManager.currentSnapshot, renderer.w, renderer.h);
      renderer.render(boxes, null);
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
  langSelect.value = preset.language;

  var items = presetList.querySelectorAll('li');
  items.forEach(function(item) {
    var idx = parseInt(item.dataset.index);
    item.classList.toggle('active', PRESETS[idx] === preset);
  });

  runCode();
}

function runCode() {
  var code = codeEditor.value.trim();
  var language = langSelect.value;

  if (!code) { showError('请输入代码'); return; }

  try {
    var events = interpret(code, language);
    stateManager = new StateManager(events);
    if (stateManager.totalSteps > 0) {
      goToStep(0);
    } else {
      renderer.render([], null);
      updateStepUI();
    }
  } catch (err) {
    showError(err.message);
    console.error(err);
  }
}

function resetCode() {
  stateManager = null;
  renderer.render([], null);
  updateStepUI();
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
  var snapshot = stateManager.currentSnapshot;
  var boxes = computeLayout(snapshot, renderer.w, renderer.h);
  var diff = stateManager.getDiff();
  renderer.render(boxes, diff);
  updateStepUI();
}

function prevStep() {
  if (!stateManager || stateManager.currentStep <= 0) return;
  var prevSnapshot = stateManager.prevSnapshot;
  // go to prev step manually and render without diff
  stateManager.goToStep(stateManager.currentStep - 1);
  renderer.resize();
  var boxes = computeLayout(stateManager.currentSnapshot, renderer.w, renderer.h);
  var diff = stateManager.getDiff();
  renderer.render(boxes, diff);
  updateStepUI();
}

function nextStep() {
  if (!stateManager || stateManager.currentStep >= stateManager.totalSteps - 1) return;
  stateManager.next();
  renderer.resize();
  var boxes = computeLayout(stateManager.currentSnapshot, renderer.w, renderer.h);
  var diff = stateManager.getDiff();
  renderer.render(boxes, diff);
  updateStepUI();
}

function updateStepUI() {
  var total = stateManager ? stateManager.totalSteps : 0;
  var current = stateManager ? stateManager.currentStep + 1 : 0;

  stepIndicator.textContent = '步骤 ' + current + '/' + total;
  stepSlider.max = total > 0 ? total - 1 : 0;
  stepSlider.value = stateManager ? stateManager.currentStep : 0;

  prevBtn.disabled = !stateManager || stateManager.currentStep === 0;
  nextBtn.disabled = !stateManager || stateManager.currentStep >= total - 1;
}

function showError(msg) {
  var toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 3000);
}

document.addEventListener('DOMContentLoaded', init);
