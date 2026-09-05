(function () {
  const sidebar = document.getElementById('sidebar');
  const handle = document.getElementById('sidebarResize');
  let dragging = false;

  handle.addEventListener('mousedown', (e) => {
    dragging = true;
    handle.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const min = parseInt(getComputedStyle(sidebar).minWidth, 10);
    const max = parseInt(getComputedStyle(sidebar).maxWidth, 10);
    let newWidth = e.clientX;
    newWidth = Math.max(min, Math.min(max, newWidth));
    sidebar.style.width = newWidth + 'px';
  });

  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  });
})();

(function () {
  const BASE = '/vortex-archive';
  const REPO_OWNER = 'none45';
  const REPO_NAME = 'vortex-archive';

  const views = {
    '/': document.getElementById('view-readme'),
 '/contributing/': document.getElementById('view-contributing'),
 '/archive-downloader/': document.getElementById('view-downloader'),
 '/version-checker/': document.getElementById('view-checker'),
 '/vrtx-editor/': document.getElementById('view-vrtx-editor'),
 '/vrtx-merger/': document.getElementById('view-vrtx-merger')
  };
  const navLinks = document.querySelectorAll('[data-route]');
  const readmeNavLink = document.getElementById('readmeNavLink');
  const contributingNavLink = document.getElementById('contributingNavLink');
  const navDownloader = document.getElementById('navDownloader');
  const navChecker = document.getElementById('navChecker');
  const navVrtxEditor = document.getElementById('navVrtxEditor');
  const navVrtxMerger = document.getElementById('navVrtxMerger');
  const mainCard = document.getElementById('mainCard');
  const mainEl = document.getElementById('mainEl');

  let readmeLoaded = false;
  let contributingLoaded = false;
  let config = { wideMode: {} };

  async function loadConfig() {
    try {
      const res = await fetch(
        BASE + '/config.json?v=' + Date.now()
      );
      if (!res.ok) throw new Error('HTTP ' + res.status);
      config = await res.json();
    } catch (err) {
      config = { wideMode: {} };
    }
  }

  async function loadContributing() {
    if (contributingLoaded) return;

    const contributingContent =
    document.getElementById('contributingContent');

    try {
      const res = await fetch(
        'https://raw.githubusercontent.com/' +
        REPO_OWNER +
        '/' +
        REPO_NAME +
        '/main/CONTRIBUTING.md'
      );

      if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      }

      const text = await res.text();

      contributingContent.innerHTML =
      marked.parse(text);

      contributingLoaded = true;

    } catch (err) {
      contributingContent.innerHTML =
      '<div class="markdown-status">' +
      'Could not load CONTRIBUTING.md (' +
      err.message +
      ')' +
      '</div>';
    }
  }

  async function loadReadme() {
    if (readmeLoaded) return;
    const readmeContent = document.getElementById('readmeContent');
    try {
      const res = await fetch('https://raw.githubusercontent.com/' + REPO_OWNER + '/' + REPO_NAME + '/main/README.md');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      readmeContent.innerHTML = marked.parse(text);
      readmeLoaded = true;
    } catch (err) {
      readmeContent.innerHTML = '<div class="markdown-status">Could not load README.md (' + err.message + ')</div>';
    }
  }

  function normalizeRoute(pathname) {
    let path = pathname;
    if (path.startsWith(BASE)) path = path.slice(BASE.length);
    if (path === '' || path === '/') return '/';
    if (!path.endsWith('/')) path += '/';
    if (views[path]) return path;
    return '/';
  }

  function render(route) {
    Object.keys(views).forEach((key) => {
      views[key].classList.toggle('active', key === route);
    });

    mainCard.classList.toggle(
      'wide',
      !!(config.wideMode && config.wideMode[route])
    );

    mainEl.classList.toggle(
      'wide',
      !!(config.wideMode && config.wideMode[route])
    );

    navLinks.forEach((link) => {
      link.classList.remove('active-nav');
      link.classList.remove('active');
      link.classList.add('inactive');
    });

    if (route === '/') {
      readmeNavLink.classList.add('active');
      readmeNavLink.classList.remove('inactive');
      loadReadme();

    } else if (route === '/contributing/') {
      contributingNavLink.classList.add('active');
      contributingNavLink.classList.remove('inactive');
      loadContributing();

    } else if (route === '/archive-downloader/') {
      navDownloader.classList.remove('inactive');

    } else if (route === '/version-checker/') {
      navChecker.classList.remove('inactive');

    } else if (route === '/vrtx-editor/') {
      navVrtxEditor.classList.remove('inactive');
    } else if (route === '/vrtx-merger/') {
      navVrtxMerger.classList.remove('inactive');
    }

    navLinks.forEach((link) => {
      if (link.getAttribute('data-route') === route) {
        link.classList.add('active');
        link.classList.remove('inactive');
      }
    });

    const titles = {
      '/': 'none\'s vortex tools',
 '/contributing/': 'none\'s vortex tools',
 '/archive-downloader/': 'none\'s archive downloader',
 '/version-checker/': 'none\'s version checker',
 '/vrtx-editor/': 'none\'s .vrtx editor',
 '/vrtx-merger/': 'none\'s .vrtx merger'
    };

    document.title = titles[route] || titles['/'];
  }

  function navigate(route, push) {
    if (push) {
      window.history.pushState({}, '', BASE + route);
    }
    render(route);
  }

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.getAttribute('data-route'), true);
    });
  });

  window.addEventListener('popstate', () => {
    render(normalizeRoute(window.location.pathname));
  });

  loadConfig().then(() => {
    render(normalizeRoute(window.location.pathname));
  });
})();

(function () {
  const versionHelpBtn = document.getElementById('versionHelpBtn');
  const versionModal = document.getElementById('versionModal');
  const versionModalClose = document.getElementById('versionModalClose');
  const versionTabs = document.querySelectorAll('.version-tab');
  const versionCols = document.querySelectorAll('.version-col');

  function setActiveTab(tab) {
    versionTabs.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });
    versionCols.forEach((col) => {
      col.classList.toggle('active-tab', col.getAttribute('data-col') === tab);
    });
  }

  versionTabs.forEach((btn) => {
    btn.addEventListener('click', () => setActiveTab(btn.getAttribute('data-tab')));
  });

  setActiveTab('client');

  versionHelpBtn.addEventListener('click', () => versionModal.classList.add('open'));
  versionModalClose.addEventListener('click', () => versionModal.classList.remove('open'));
  versionModal.addEventListener('click', (e) => {
    if (e.target === versionModal) versionModal.classList.remove('open');
  });
})();

(function () {
  const API_URL =
  'https://api.github.com/repos/none45/vortex-archive/releases';

  const clientList = document.getElementById('clientVersions');
  const studioList = document.getElementById('studioVersions');
  const versionInput = document.getElementById('version');
  const versionModal = document.getElementById('versionModal');

  window.availableVersions = {
    client: [],
    studio: []
  };

  const topbarVersionsBtn =
  document.getElementById('topbarVersionsBtn');

  topbarVersionsBtn.addEventListener('click', () => {
    versionModal.classList.add('open');
  });

  function compareVersions(a, b) {
    const pa = a.replace(/^v/i, '').split('.').map(Number);
    const pb = b.replace(/^v/i, '').split('.').map(Number);

    const length = Math.max(pa.length, pb.length);

    for (let i = 0; i < length; i++) {
      const av = pa[i] ?? 0;
      const bv = pb[i] ?? 0;

      if (av !== bv) {
        return av - bv;
      }
    }

    return 0;
  }

  function normalizeVersion(version) {
    return 'v' + version.replace(/^v/i, '');
  }

  function renderList(list, versions) {
    list.innerHTML = '';

    if (!versions.length) {
      const li = document.createElement('li');
      li.textContent = 'No releases found';
      list.appendChild(li);
      return;
    }

    for (const version of versions) {
      const li = document.createElement('li');

      li.textContent = version;
      li.style.cursor = 'pointer';

      li.addEventListener('click', () => {
        versionInput.value = version;
        versionModal.classList.remove('open');
      });

      list.appendChild(li);
    }
  }

  async function loadVersions() {
    try {
      const releases = [];
      let page = 1;

      while (true) {
        const res = await fetch(
          API_URL +
          '?per_page=100&page=' +
          page
        );

        if (!res.ok) {
          throw new Error('GitHub API returned HTTP ' + res.status);
        }

        const batch = await res.json();
        releases.push(...batch);

        if (batch.length < 100) {
          break;
        }

        page++;
      }

      const client = new Set();
      const studio = new Set();

      for (const release of releases) {
        const tag = release.tag_name || '';

        let match = tag.match(
          /^client_(v?\d+(?:\.\d+)*)$/i
        );

        if (match) {
          client.add(normalizeVersion(match[1]));
          continue;
        }

        match = tag.match(
          /^studio_(v?\d+(?:\.\d+)*)$/i
        );

        if (match) {
          studio.add(normalizeVersion(match[1]));
        }
      }

      window.availableVersions.client =
      [...client].sort(compareVersions);

      window.availableVersions.studio =
      [...studio].sort(compareVersions);

      renderList(
        clientList,
        window.availableVersions.client
      );

      renderList(
        studioList,
        window.availableVersions.studio
      );

    } catch (err) {
      console.error('Failed to load versions:', err);

      clientList.innerHTML =
      '<li>Failed to load versions</li>';

      studioList.innerHTML =
      '<li>Failed to load versions</li>';
    }
  }

  loadVersions();
})();

(function () {
  const WORKER_URL =
  'https://vortex-artifact-proxy.none45556.workers.dev';

      const buildType = document.getElementById('buildType');
      const versionInput = document.getElementById('version');
      const wrapCheckbox = document.getElementById('wrapCheckbox');
      const goButton = document.getElementById('goButton');
      const statusEl = document.getElementById('dl-status');

      async function workerRequest(path, options = {}) {
        const res = await fetch(WORKER_URL + path, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
          }
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(
            'Worker returned ' + res.status + ': ' + text
          );
        }

        return res;
      }

      function showStatus(kind, headline, detailLines) {
        const cls =
        kind === 'progress'
        ? 'dl-result-box progress'
        : kind === 'ok'
        ? 'dl-result-box ok'
        : 'dl-result-box no';

        let html =
        '<div class="' + cls + '">' +
        '<div class="headline">' +
        escapeHtml(headline) +
        '</div>';

        if (detailLines && detailLines.length) {
          html +=
          '<div class="dl-details">' +
          detailLines.map(escapeHtml).join('<br>') +
          '</div>';
        }

        html += '</div>';

        statusEl.innerHTML = html;
      }

      function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
      }

      function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }


      async function dispatchWorkflow(type, version, mode) {
        await workerRequest('/dispatch', {
          method: 'POST',
          body: JSON.stringify({
            type: type,
            version: version,
            mode: mode
          })
        });
      }


      async function findRunByTime(sinceIso) {
        const res = await workerRequest(
          '/runs?since=' + encodeURIComponent(sinceIso)
        );

        return await res.json();
      }


      async function getRun(runId) {
        const res = await workerRequest(
          '/run?id=' + encodeURIComponent(runId)
        );

        return await res.json();
      }


      async function pollRun(runId) {
        while (true) {
          const run = await getRun(runId);

          if (run.status === 'completed') {
            return run;
          }

          showStatus('progress', 'Building…', [
            'status: ' + run.status,
            'run: #' + run.run_number
          ]);

          await sleep(4000);
        }
      }

      async function downloadArtifact(runId, filename) {
        const url =
        WORKER_URL +
        '?runId=' +
        encodeURIComponent(runId) +
        '&filename=' +
        encodeURIComponent(filename);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      goButton.addEventListener('click', async () => {
        const type = buildType.value;
        const version = versionInput.value.trim();
        const mode = wrapCheckbox.checked
        ? 'noupdate'
        : 'raw';

        if (!version) {
          showStatus(
            'no',
            'Missing version',
            ['Enter a version like v0.1.93']
          );
          return;
        }

        const normalizedVersion =
        'v' + version.replace(/^v/i, '');

        if (
          !window.availableVersions[type].includes(normalizedVersion)
        ) {
          showStatus(
            'no',
            'Version not found',
            [
              normalizedVersion +
              ' is not available for ' +
              (type === 'studio' ? 'Studio' : 'Client') +
              '.',
              'Click "Available versions" to see valid versions.'
            ]
          );
          return;
        }

        goButton.disabled = true;

        const sinceIso =
        new Date(Date.now() - 5000).toISOString();

        try {
          showStatus(
            'progress',
            'Dispatching build…',
            [
              'type: ' + type,
              'version: ' + version,
              'mode: ' + mode
            ]
          );

          await dispatchWorkflow(
            type,
            version,
            mode
          );


          showStatus(
            'progress',
            'Waiting for run to appear…',
            []
          );

          let run = null;

          for (let i = 0; i < 15; i++) {
            run = await findRunByTime(sinceIso);

            if (run) {
              break;
            }

            await sleep(2000);
          }

          if (!run) {
            throw new Error(
              'Timed out waiting for the workflow run to start.'
            );
          }


          const finishedRun = await pollRun(run.id);


          if (finishedRun.conclusion !== 'success') {
            showStatus(
              'no',
              'Build failed',
              [
                'conclusion: ' +
                finishedRun.conclusion,

                'See the Actions tab on GitHub for logs.'
              ]
            );

            return;
          }


          showStatus(
            'progress',
            'Downloading artifact…',
            []
          );


          const label =
          type === 'studio'
          ? 'VortexStudio'
          : 'Vortex';

          const zipName =
          label +
          '.' +
          version +
          (mode === 'noupdate'
          ? '.noupdate'
          : '') +
          '.exe';


          await downloadArtifact(
            finishedRun.id,
            zipName
          );


          showStatus(
            'ok',
            'Done',
            [
              'Downloaded as: ' + zipName
            ]
          );

        } catch (err) {
          showStatus(
            'no',
            'Error',
            [
              err instanceof Error
              ? err.message
              : String(err)
            ]
          );
        } finally {
          goButton.disabled = false;
        }
      });
})();

(function () {
  const fileInput = document.getElementById('fileInput');
  const drop = document.getElementById('drop');
  const filenameEl = document.getElementById('filename');
  const progressEl = document.getElementById('vc-progress');
  const resultEl = document.getElementById('vc-result');

  const MARKER_NO_UPDATE = 'VORTEX_NO_UPDATE';
  const MARKER_STUDIO_NO_UPDATE = 'VORTEX_STUDIO_NO_UPDATE';
  const MARKER_NOUPDATE_EXE = '_vortex.exe';

  const VERSION_REGEX = /v0\.[0-9]\.[0-9]{1,2}/g;

  drop.addEventListener('click', () => fileInput.click());

  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('dragover');
  });

  drop.addEventListener('dragleave', () => {
    drop.classList.remove('dragover');
  });

  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('dragover');

    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      handleFile(fileInput.files[0]);
    }
  });

  function handleFile(file) {
    filenameEl.textContent =
    file.name + '  (' + formatBytes(file.size) + ')';

    resultEl.innerHTML = '';
    progressEl.textContent = 'Reading file…';

    const reader = new FileReader();

    reader.onerror = () => {
      progressEl.textContent = '';
      showResult(false, 'Not a Vortex binary.');
    };

    reader.onload = (e) => {
      progressEl.textContent = 'Scanning…';

      setTimeout(() => {
        try {
          const bytes = new Uint8Array(e.target.result);
          analyze(bytes);
        } catch (err) {
          showResult(
            false,
            'Error while scanning: ' + err.message
          );
        }

        progressEl.textContent = '';
      }, 10);
    };

    reader.readAsArrayBuffer(file);
  }

  function containsAscii(bytes, text) {
    const target = new TextEncoder().encode(text);

    outer:
    for (let i = 0; i <= bytes.length - target.length; i++) {
      for (let j = 0; j < target.length; j++) {
        if (bytes[i + j] !== target[j]) {
          continue outer;
        }
      }

      return true;
    }

    return false;
  }

  function extractStrings(bytes, minLen) {
    minLen = minLen || 4;

    const results = [];
    let start = -1;

    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      const printable = b >= 32 && b <= 126;

      if (printable) {
        if (start === -1) {
          start = i;
        }
      } else {
        if (start !== -1) {
          const len = i - start;

          if (len >= minLen) {
            results.push(
              bytesToAscii(bytes, start, i)
            );
          }

          start = -1;
        }
      }
    }

    if (
      start !== -1 &&
      bytes.length - start >= minLen
    ) {
      results.push(
        bytesToAscii(bytes, start, bytes.length)
      );
    }

    return results;
  }

  function bytesToAscii(bytes, start, end) {
    let s = '';

    for (let i = start; i < end; i++) {
      s += String.fromCharCode(bytes[i]);
    }

    return s;
  }

  function analyze(bytes) {
    const hasNoUpdate =
    containsAscii(bytes, MARKER_NO_UPDATE);

    const hasStudioNoUpdate =
    containsAscii(bytes, MARKER_STUDIO_NO_UPDATE);

    const hasWrapper =
    containsAscii(bytes, MARKER_NOUPDATE_EXE);

    if (!hasNoUpdate && !hasStudioNoUpdate) {
      showResult(false, 'Not a valid Vortex binary');
      return;
    }

    const type =
    hasStudioNoUpdate
    ? 'studio'
    : 'client';

    const strings = extractStrings(bytes, 4);

    let versionMatch = null;

    for (const s of strings) {
      const m = s.match(VERSION_REGEX);

      if (m && m.length) {
        versionMatch = m[0];
        break;
      }
    }

    showResult(
      true,
      null,
      type,
      versionMatch,
      hasWrapper
    );
  }

  function showResult(
    found,
    message,
    type,
    version,
    hasWrapper
  ) {
    if (!found) {
      resultEl.innerHTML =
      '<div class="vc-result-box no">' +
      '<div class="headline">' +
      escapeHtml(message) +
      '</div>' +
      '</div>';

    return;
    }

    const label =
    type === 'studio'
    ? 'Vortex Studio'
    : 'Vortex';

    const headline =
    version
    ? label + ' — ' + version
    : label + ' — version not found';

    resultEl.innerHTML =
    '<div class="vc-result-box ok">' +
    '<div class="headline">' +
    escapeHtml(headline) +
    '</div>' +
    '<div class="vc-details">' +

    '<div class="row">' +
    '<span class="k">type</span>' +
    '<span class="v">' +
    type +
    '</span>' +
    '</div>' +

    (
      version
      ? '<div class="row">' +
      '<span class="k">version</span>' +
      '<span class="v">' +
      escapeHtml(version) +
      '</span>' +
      '</div>'
      : ''
    ) +

    '<div class="row">' +
    '<span class="k">update guard</span>' +
    '<span class="v">' +
    (
      type === 'studio'
      ? 'VORTEX_STUDIO_NO_UPDATE'
      : 'VORTEX_NO_UPDATE'
    ) +
    '</span>' +
    '</div>' +

    '<div class="row">' +
    '<span class="k">noupdate</span>' +
    '<span class="v ' +
    (hasWrapper ? 'bool-true' : 'bool-false') +
    '">' +
    (hasWrapper ? 'TRUE' : 'FALSE') +
    '</span>' +
    '</div>' +

    '</div>' +
    '</div>';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(
      Math.log(bytes) / Math.log(k)
    );

    return (
      parseFloat(
        (bytes / Math.pow(k, i)).toFixed(1)
      ) +
      ' ' +
      sizes[i]
    );
  }
})();

(function () {
  const root = document.getElementById('view-vrtx-editor');
  if (!root) return;

  const fileInput = document.getElementById('vrtxFileInput');
  const drop = document.getElementById('vrtxDrop');
  const filenameEl = document.getElementById('vrtxFilename');
  const statusEl = document.getElementById('vrtxStatus');
  const editor = document.getElementById('vrtxJsonEditor');
  const preview = document.getElementById('vrtxJsonPreview');
  const sampleBtn = document.getElementById('vrtxLoadSampleBtn');
  const formatBtn = document.getElementById('vrtxFormatBtn');
  const downloadJsonBtn = document.getElementById('vrtxDownloadJsonBtn');
  const downloadVrtxBtn = document.getElementById('vrtxDownloadVrtxBtn');

  const CLASS_BY_ID = {
    0: 'Workspace',
    1: 'Lighting',
    2: 'Part',
    3: 'Group',
    4: 'Folder',
    5: 'IntValue',
    6: 'StringValue',
    7: 'LocalScript',
    8: 'Script',
    9: 'ModuleScript',
    10: 'ReplicatedStorage',
    11: 'StarterPlayerScripts',
    12: 'ServerScriptService',
    13: 'RemoteEvent',
    14: 'BindableEvent',
    15: 'RemoteFunction'
  };
  const CLASS_ID_BY_NAME = Object.fromEntries(
    Object.entries(CLASS_BY_ID).map(([id, name]) => [name, Number(id)])
  );
  const SCRIPT_CLASS_IDS = new Set([7, 8, 9]);

  const MATERIAL_BY_ID = {
    0: 'Smooth',
 1: 'Smooth',
 2: 'Plastic',
 3: 'Wood',
 4: 'Metal',
 5: 'Grass',
 6: 'Ice',
 7: 'Paint'
  };
  const MATERIAL_ID_BY_NAME = {
    Smooth: 0,
 Plastic: 2,
 Wood: 3,
 Metal: 4,
 Grass: 5,
 Ice: 6,
 Paint: 7
  };

  const FACE_BY_ID = {
    0: 'Right',
 1: 'Top',
 2: 'Back',
 3: 'Left',
 4: 'Bottom',
 5: 'Front'
  };
  const FACE_ID_BY_NAME = {
    Right: 0,
 Top: 1,
 Back: 2,
 Left: 3,
 Bottom: 4,
 Front: 5
  };

  const MAX_OUTPUT_SIZE = 256 * 1024 * 1024;
  const TEXT_DECODER = new TextDecoder();
  const TEXT_ENCODER = new TextEncoder();
  const DEFAULT_FILENAME = 'project.vrtx';

  let currentFileName = DEFAULT_FILENAME;
  let currentDoc = null;
  let parseTimer = null;
  let zstdPromise = null;

  function setStatus(message, kind) {
    statusEl.textContent = message;
    statusEl.style.color =
    kind === 'error'
    ? 'var(--bad)'
    : kind === 'ok'
    ? 'var(--good)'
    : kind === 'neutral'
    ? 'var(--muted)'
    : 'var(--muted)';
  }

  function bytesToBase64(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(
        null,
        bytes.subarray(i, i + chunk)
      );
    }
    return btoa(binary);
  }

  function base64ToBytes(value) {
    if (!value) return new Uint8Array();
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  function cloneDoc(doc) {
    return JSON.parse(JSON.stringify(doc));
  }

  function isObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
  }

  function readU64(view, offset) {
    if (typeof view.getBigUint64 === 'function') {
      return Number(view.getBigUint64(offset, true));
    }
    const lo = view.getUint32(offset, true);
    const hi = view.getUint32(offset + 4, true);
    return hi * 0x100000000 + lo;
  }

  function writeU64Bytes(value) {
    const bytes = new Uint8Array(8);
    const view = new DataView(bytes.buffer);
    if (typeof view.setBigUint64 === 'function') {
      view.setBigUint64(0, BigInt(value), true);
    } else {
      const lo = value >>> 0;
      const hi = Math.floor(value / 0x100000000) >>> 0;
      view.setUint32(0, lo, true);
      view.setUint32(4, hi, true);
    }
    return bytes;
  }

  function readVec(reader, n) {
    const values = [];
    for (let i = 0; i < n; i++) {
      values.push(reader.f32());
    }
    return values;
  }

  function writeVec(writer, value, n, field) {
    if (!Array.isArray(value) || value.length !== n) {
      throw new Error(field + ' must be an array of ' + n + ' numbers');
    }
    value.forEach((v) => writer.f32(v));
  }

  function materialName(value) {
    if (typeof value === 'string' && MATERIAL_ID_BY_NAME[value] !== undefined) {
      return value;
    }
    if (typeof value === 'number' && MATERIAL_BY_ID[value] !== undefined) {
      return MATERIAL_BY_ID[value];
    }
    return 'Unknown(' + String(value) + ')';
  }

  function materialId(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && MATERIAL_ID_BY_NAME[value] !== undefined) {
      return MATERIAL_ID_BY_NAME[value];
    }
    const match = typeof value === 'string' && value.match(/^Unknown\((\d+)\)$/);
    if (match) return Number(match[1]);
    throw new Error('Unknown material: ' + String(value));
  }

  function faceName(value) {
    if (typeof value === 'string' && FACE_ID_BY_NAME[value] !== undefined) {
      return value;
    }
    if (typeof value === 'number' && FACE_BY_ID[value] !== undefined) {
      return FACE_BY_ID[value];
    }
    return 'Unknown(' + String(value) + ')';
  }

  function faceId(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && FACE_ID_BY_NAME[value] !== undefined) {
      return FACE_ID_BY_NAME[value];
    }
    const match = typeof value === 'string' && value.match(/^Unknown\((\d+)\)$/);
    if (match) return Number(match[1]);
    throw new Error('Unknown face: ' + String(value));
  }

  function className(value) {
    if (typeof value === 'string' && CLASS_ID_BY_NAME[value] !== undefined) {
      return value;
    }
    if (typeof value === 'number' && CLASS_BY_ID[value] !== undefined) {
      return CLASS_BY_ID[value];
    }
    return 'Unknown(' + String(value) + ')';
  }

  function classId(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && CLASS_ID_BY_NAME[value] !== undefined) {
      return CLASS_ID_BY_NAME[value];
    }
    const match = typeof value === 'string' && value.match(/^Unknown\((\d+)\)$/);
    if (match) return Number(match[1]);
    throw new Error('Unknown class: ' + String(value));
  }

  function normalizeDoc(doc) {
    const copy = cloneDoc(doc);
    copy.records = (copy.records || []).map((record) => {
      const rec = cloneDoc(record);
      rec.class_id = className(rec.class_id);
      if (rec.body && typeof rec.body === 'object') {
        const body = rec.body;
        if (body.material !== undefined) {
          body.material = materialName(body.material);
        }
        if (Array.isArray(body.textures)) {
          body.textures = body.textures.map((texture) => ({
            ...texture,
            face: faceName(texture.face)
          }));
        }
      }
      return rec;
    });
    return copy;
  }

  class Reader {
    constructor(data) {
      this.data = data;
      this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      this.pos = 0;
    }

    take(n) {
      if (n < 0 || this.pos + n > this.data.length) {
        throw new Error(
          'unexpected end of file at offset 0x' + this.pos.toString(16)
        );
      }
      const out = this.data.slice(this.pos, this.pos + n);
      this.pos += n;
      return out;
    }

    u8() { return this.take(1)[0]; }
    bo() { return !!this.u8(); }
    u32() { const v = this.view.getUint32(this.pos, true); this.pos += 4; return v; }
    i32() { const v = this.view.getInt32(this.pos, true); this.pos += 4; return v; }
    u64() { const v = readU64(this.view, this.pos); this.pos += 8; return v; }
    f32() { const v = this.view.getFloat32(this.pos, true); this.pos += 4; return v; }
    string() {
      const len = this.u64();
      const bytes = this.take(len);
      try {
        return TEXT_DECODER.decode(bytes);
      } catch (err) {
        throw new Error('invalid UTF-8 string');
      }
    }
    opt_id() { return this.bo() ? this.u64() : null; }
  }

  class Writer {
    constructor() { this.parts = []; }
    bytes(v) { this.parts.push(v); }
    u8(v) { this.bytes(Uint8Array.of(Number(v) & 0xff)); }
    bo(v) { this.u8(!!v); }
    u32(v) {
      const bytes = new Uint8Array(4);
      new DataView(bytes.buffer).setUint32(0, Number(v), true);
      this.bytes(bytes);
    }
    i32(v) {
      const bytes = new Uint8Array(4);
      new DataView(bytes.buffer).setInt32(0, Number(v), true);
      this.bytes(bytes);
    }
    u64(v) { this.bytes(writeU64Bytes(v)); }
    f32(v) {
      const bytes = new Uint8Array(4);
      new DataView(bytes.buffer).setFloat32(0, Number(v), true);
      this.bytes(bytes);
    }
    string(v) {
      const bytes = TEXT_ENCODER.encode(String(v));
      this.u64(bytes.length);
      this.bytes(bytes);
    }
    opt_id(v) {
      this.bo(v !== null && v !== undefined);
      if (v !== null && v !== undefined) this.u64(v);
    }
    output() {
      const total = this.parts.reduce((sum, part) => sum + part.length, 0);
      const out = new Uint8Array(total);
      let offset = 0;
      for (const part of this.parts) {
        out.set(part, offset);
        offset += part.length;
      }
      return out;
    }
  }

  function nextHeader(data, start) {
    for (let p = start; p <= data.length - 12; p++) {
      const cls = new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(p, true);
      if (CLASS_BY_ID[cls] === undefined) continue;
      const nameLen = Number(readU64(new DataView(data.buffer, data.byteOffset, data.byteLength), p + 4));
      if (!(nameLen > 0 && nameLen <= 1_000_000) || p + 12 + nameLen > data.length) continue;
      try {
        TEXT_DECODER.decode(data.slice(p + 12, p + 12 + nameLen));
      } catch (err) {
        continue;
      }
      return p;
    }
    return null;
  }

  function readFooterWithCollapsed(bytes, fieldLabel, n, collapsed) {
    const footer = bytes.slice(0, n);
    if (footer.length !== n) {
      throw new Error(fieldLabel + ' must decode to ' + n + ' bytes');
    }
    if (collapsed !== undefined && collapsed !== null) {
      footer[footer.length - 1] = collapsed ? 1 : 0;
    }
    return footer;
  }

  const NO_PROPERTY_CLASS_IDS = new Set([0, 1, 3, 4, 10, 11, 12, 13, 14, 15]);

  function readVariableBody(reader, name, remains, cls) {
    const parentId = reader.opt_id();
    const end = remains ? nextHeader(reader.data, reader.pos) : reader.data.length - 57;
    if (end === null || end < reader.pos) {
      throw new Error('cannot find end of record ' + JSON.stringify(name));
    }
    const raw = reader.take(end - reader.pos);
    const collapsed = raw.length ? !!raw[raw.length - 1] : undefined;
    const body = { parent_id: parentId };
    if (collapsed !== undefined) body.collapsed = collapsed;
    if (NO_PROPERTY_CLASS_IDS.has(cls)) {
      body.footer = bytesToBase64(raw);
    } else {
      body.raw_body = bytesToBase64(raw);
    }
    return body;
  }

  function readLight(reader, spot) {
    const out = {
      color: readVec(reader, 4),
 intensity: reader.f32(),
 range: reader.f32()
    };
    if (spot) {
      out.fov = reader.f32();
      out.face = faceName(reader.u32());
    }
    return out;
  }

  function readPart(reader) {
    const body = {
      parent_id: reader.opt_id(),
 display_name: reader.bo() ? reader.string() : null,
 position: readVec(reader, 3),
 rotation: readVec(reader, 4),
 size: readVec(reader, 3),
 color: readVec(reader, 4),
 material: materialName(reader.u32())
    };
    body.prefix = bytesToBase64(reader.take(1));
    for (const key of [
      'cast_shadow',
      'anchored',
      'can_collide',
      'spawn_location',
      'locked',
      'custom_appearance',
      'truss'
    ]) {
      body[key] = reader.bo();
    }
    const count = reader.u64();
    if (count > 1_000_000) {
      throw new Error('unreasonable texture count: ' + count);
    }
    body.textures = [];
    for (let i = 0; i < count; i++) {
      body.textures.push({
        face: faceName(reader.u32()),
                         kind: reader.u32()
      });
    }
    body.point_light = reader.bo() ? readLight(reader, false) : null;
    body.spot_light = reader.bo() ? readLight(reader, true) : null;
    const footer = reader.take(12);
    body.collapsed = !!footer[footer.length - 1];
    body.footer = bytesToBase64(footer);
    return body;
  }

  function readRecord(reader, remains) {
    const cls = reader.u32();
    const name = reader.string();

    let body;
    if (cls === 2) {
      body = readPart(reader);
    } else if (SCRIPT_CLASS_IDS.has(cls)) {
      body = {
        parent_id: reader.opt_id(),
 unknown_prefix: bytesToBase64(reader.take(3)),
 source: reader.bo() ? reader.string() : null
      };
      const end = remains ? nextHeader(reader.data, reader.pos) : reader.data.length - 57;
      if (end === null || end < reader.pos) {
        throw new Error('cannot find record after Script ' + JSON.stringify(name));
      }
      const tail = reader.take(end - reader.pos);
      body.collapsed = tail.length ? !!tail[tail.length - 1] : null;
      body.tail = bytesToBase64(tail);
    } else {
      body = readVariableBody(reader, name, remains, cls);
    }

    return { class_id: className(cls), name, body };
  }

  function decodePayload(payload, compression) {
    const reader = new Reader(payload);
    const result = {
      format: 'nvtjson',
        format_version: 1,
          compression,
 version: reader.u8(),
 project_id: reader.string()
    };
    const count = reader.u64();
    result.records = [];
    for (let i = 0; i < count; i++) {
      result.records.push(readRecord(reader, count - i - 1));
    }
    result.lighting = {
      ambient_color: readVec(reader, 4),
 brightness: reader.f32(),
 sun_color: readVec(reader, 4),
 sun_illuminance: reader.f32(),
 sun_shadow_maps_enabled: reader.bo(),
 sun_direction: readVec(reader, 4)
    };
    if (reader.pos !== payload.length) {
      result.trailing_bytes = bytesToBase64(reader.take(payload.length - reader.pos));
    }
    return normalizeDoc(result);
  }

  function writeFooterWithCollapsed(base64Value, fieldLabel, n, collapsed) {
    const bytes = base64ToBytes(base64Value || '');
    if (bytes.length !== n) {
      throw new Error(fieldLabel + ' must decode to ' + n + ' bytes');
    }
    if (collapsed !== undefined && collapsed !== null) {
      bytes[bytes.length - 1] = collapsed ? 1 : 0;
    }
    return bytes;
  }

  function writeLight(writer, value, spot) {
    writeVec(writer, value.color, 4, 'light.color');
    writer.f32(value.intensity);
    writer.f32(value.range);
    if (spot) {
      writer.f32(value.fov);
      writer.u32(faceId(value.face));
    }
  }

  function writePart(writer, body) {
    writer.opt_id(body.parent_id);
    writer.bo(body.display_name !== null && body.display_name !== undefined);
    if (body.display_name !== null && body.display_name !== undefined) {
      writer.string(body.display_name);
    }
    for (const [key, n] of [['position', 3], ['rotation', 4], ['size', 3], ['color', 4]]) {
      writeVec(writer, body[key], n, key);
    }
    writer.u32(materialId(body.material));
    writer.bytes(base64ToBytes(body.prefix || ''));
    for (const key of [
      'cast_shadow',
      'anchored',
      'can_collide',
      'spawn_location',
      'locked',
      'custom_appearance',
      'truss'
    ]) {
      writer.bo(!!body[key]);
    }
    const textures = body.textures || [];
    writer.u64(textures.length);
    for (const texture of textures) {
      writer.u32(faceId(texture.face));
      writer.u32(texture.kind);
    }
    writer.bo(body.point_light !== null && body.point_light !== undefined);
    if (body.point_light !== null && body.point_light !== undefined) {
      writeLight(writer, body.point_light, false);
    }
    writer.bo(body.spot_light !== null && body.spot_light !== undefined);
    if (body.spot_light !== null && body.spot_light !== undefined) {
      writeLight(writer, body.spot_light, true);
    }
    writer.bytes(writeFooterWithCollapsed(body.footer || '', 'part.footer', 12, body.collapsed));
  }

  function writeVariableBody(writer, body, fieldLabel) {
    writer.opt_id(body.parent_id);
    const raw = body.footer !== undefined ? body.footer : body.raw_body;
    writer.bytes(base64ToBytes(raw || ''));
  }

  function writeRecord(writer, record) {
    const cls = classId(record.class_id);
    const body = record.body || {};
    writer.u32(cls);
    writer.string(record.name);
    if (cls === 2) {
      writePart(writer, body);
    } else if (SCRIPT_CLASS_IDS.has(cls)) {
      writer.opt_id(body.parent_id);
      writer.bytes(base64ToBytes(body.unknown_prefix || ''));
      writer.bo(body.source !== null && body.source !== undefined);
      if (body.source !== null && body.source !== undefined) {
        writer.string(body.source);
      }
      writer.bytes(base64ToBytes(body.tail || ''));
    } else {
      writer.opt_id(body.parent_id);
      writer.bytes(base64ToBytes(body.footer !== undefined ? body.footer : (body.raw_body || '')));
    }
  }

  function encodePayload(doc) {
    if (doc.format !== 'nvtjson') {
      throw new Error('not a nvtjson document');
    }
    const writer = new Writer();
    writer.u8(doc.version);
    writer.string(doc.project_id);
    const records = doc.records || [];
    writer.u64(records.length);
    for (const record of records) {
      writeRecord(writer, record);
    }
    const light = doc.lighting;
    if (!light) {
      throw new Error('lighting is required');
    }
    writeVec(writer, light.ambient_color, 4, 'lighting.ambient_color');
    writer.f32(light.brightness);
    writeVec(writer, light.sun_color, 4, 'lighting.sun_color');
    writer.f32(light.sun_illuminance);
    writer.bo(light.sun_shadow_maps_enabled);
    if (light.sun_direction) {
      writeVec(writer, light.sun_direction, 4, 'lighting.sun_direction');
    } else {
      writer.bytes(base64ToBytes(doc.unknown_quat || ''));
    }
    writer.bytes(base64ToBytes(doc.trailing_bytes || ''));
    return writer.output();
  }

  async function loadZstd() {
    if (!zstdPromise) {
      zstdPromise = import('/vortex-archive/zstd-bundle.js')
      .then(async (mod) => {
        await mod.init();
        return {
          compress: mod.compress,
          decompress: mod.decompress
        };
      })
      .catch((err) => {
        zstdPromise = null;
        throw err;
      });
    }
    return zstdPromise;
  }

  function startsWithVrtx(bytes) {
    return bytes.length >= 5 &&
    bytes[0] === 0x56 &&
    bytes[1] === 0x52 &&
    bytes[2] === 0x54 &&
    bytes[3] === 0x58;
  }

  async function decodeVrtxFile(bytes) {
    let payload = bytes;
    let compression = { kind: 'raw' };
    if (startsWithVrtx(bytes)) {
      if (bytes.length < 6) {
        throw new Error('truncated VRTX wrapper');
      }
      const codec = await loadZstd();
      payload = codec.decompress(bytes.slice(5));
      compression = {
        kind: 'nvtzstd',
 wrapper_version: bytes[4]
      };
    }
    return decodePayload(payload, compression);
  }

  async function encodeVrtxFile(doc) {
    const payload = encodePayload(doc);
    try {
      const codec = await loadZstd();
      const compressed = codec.compress(payload, 19);
      const out = new Uint8Array(5 + compressed.length);
      out.set([0x56, 0x52, 0x54, 0x58, 4], 0);
      out.set(compressed, 5);
      return { bytes: out, compressed: true };
    } catch (err) {
      return { bytes: payload, compressed: false };
    }
  }

  function renderScalar(value) {
    const span = document.createElement('span');
    if (value === null) {
      span.className = 'json-null';
      span.textContent = 'null';
    } else if (typeof value === 'string') {
      span.className = 'json-string';
      span.textContent = JSON.stringify(value);
    } else if (typeof value === 'number') {
      span.className = 'json-number';
      span.textContent = String(value);
    } else if (typeof value === 'boolean') {
      span.className = 'json-boolean';
      span.textContent = String(value);
    } else {
      span.className = 'json-null';
      span.textContent = String(value);
    }
    return span;
  }

  function renderNode(value, label, open) {
    if (Array.isArray(value)) {
      const details = document.createElement('details');
      details.className = 'json-details';
      if (open) details.open = true;
      const summary = document.createElement('summary');
      summary.className = 'json-summary';
      summary.innerHTML =
      (label ? '<span class="json-key">' + escapeHtml(label) + '</span><span class="json-punct">:</span> ' : '') +
      '<span class="json-type">array[' + value.length + ']</span>';
      details.appendChild(summary);
      const tree = document.createElement('div');
      tree.className = 'json-tree';
      value.forEach((entry, index) => {
        tree.appendChild(renderEntry(String(index), entry));
      });
      details.appendChild(tree);
      return details;
    }

    if (isObject(value)) {
      const details = document.createElement('details');
      details.className = 'json-details';
      if (open) details.open = true;
      const summary = document.createElement('summary');
      summary.className = 'json-summary';
      const keys = Object.keys(value);
      summary.innerHTML =
      (label ? '<span class="json-key">' + escapeHtml(label) + '</span><span class="json-punct">:</span> ' : '') +
      '<span class="json-type">object{' + keys.length + '}</span>';
      details.appendChild(summary);
      const tree = document.createElement('div');
      tree.className = 'json-tree';
      keys.forEach((key) => {
        tree.appendChild(renderEntry(key, value[key]));
      });
      details.appendChild(tree);
      return details;
    }

    const row = document.createElement('div');
    row.className = 'json-row';
    if (label !== null && label !== undefined) {
      const key = document.createElement('span');
      key.className = 'json-key';
      key.textContent = label;
      row.appendChild(key);
      const punct = document.createElement('span');
      punct.className = 'json-punct';
      punct.textContent = ':';
      row.appendChild(punct);
    }
    row.appendChild(renderScalar(value));
    return row;
  }

  function renderEntry(key, value) {
    if (Array.isArray(value) || isObject(value)) {
      const row = document.createElement('div');
      row.className = 'json-row';
      const keySpan = document.createElement('span');
      keySpan.className = 'json-key';
      keySpan.textContent = key;
      row.appendChild(keySpan);
      const punct = document.createElement('span');
      punct.className = 'json-punct';
      punct.textContent = ':';
      row.appendChild(punct);
      row.appendChild(renderNode(value, null, false));
      return row;
    }
    return renderNode(value, key, false);
  }

  function renderPreview(doc) {
    preview.innerHTML = '';
    if (!doc) {
      preview.innerHTML = '<div class="json-error">No document loaded.</div>';
      return;
    }
    preview.appendChild(renderNode(doc, 'root', true));
  }

  function formatEditor() {
    try {
      const parsed = JSON.parse(editor.value);
      const normalized = normalizeDoc(parsed);
      editor.value = JSON.stringify(normalized, null, 2) + '\n';
      currentDoc = normalized;
      renderPreview(normalized);
      setStatus('JSON formatted.', 'ok');
    } catch (err) {
      setStatus('Cannot format invalid JSON.', 'error');
      renderPreviewError(err.message);
    }
  }

  function renderPreviewError(message) {
    preview.innerHTML =
    '<div class="json-error">' +
    'JSON parse error: ' +
    escapeHtml(message) +
    '</div>';
  }

  function syncFromEditor() {
    try {
      const parsed = JSON.parse(editor.value);
      currentDoc = normalizeDoc(parsed);
      renderPreview(currentDoc);
      setStatus('JSON is valid.', 'ok');
    } catch (err) {
      renderPreviewError(err.message);
      setStatus('JSON has a syntax error.', 'error');
    }
  }

  async function loadBytesFromFile(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const decoded = await decodeVrtxFile(bytes);
    currentFileName = file.name || DEFAULT_FILENAME;
    filenameEl.textContent = file.name + '  (' + (file.size / 1024).toFixed(1) + ' KB)';
    currentDoc = decoded;
    editor.value = JSON.stringify(decoded, null, 2) + '\n';
    renderPreview(decoded);
    setStatus('Loaded ' + file.name + '.', 'ok');
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function downloadJson() {
    try {
      const parsed = normalizeDoc(JSON.parse(editor.value));
      const name = currentFileName.replace(/\.vrtx$/i, '') + '.json';
      downloadBlob(
        new Blob([JSON.stringify(parsed, null, 2) + '\n'], { type: 'application/json' }),
                   name
      );
      setStatus('JSON exported.', 'ok');
    } catch (err) {
      setStatus('Fix JSON before exporting.', 'error');
      renderPreviewError(err.message);
    }
  }

  async function downloadVrtx() {
    try {
      const parsed = normalizeDoc(JSON.parse(editor.value));
      const result = await encodeVrtxFile(parsed);
      const bytes = result.bytes;
      const name = currentFileName.replace(/\.json$/i, '') || DEFAULT_FILENAME;
      const fileName = name.endsWith('.vrtx') ? name : name.replace(/\.vrtx$/i, '') + '.vrtx';
      const blob = new Blob([bytes], { type: 'application/octet-stream' });
      downloadBlob(blob, fileName);
      setStatus(
        result.compressed
        ? 'VRTX exported with compression.'
        : 'VRTX exported as raw payload because the zstd library could not be loaded.',
        result.compressed ? 'ok' : 'error'
      );
    } catch (err) {
      setStatus('Fix JSON before exporting.', 'error');
      renderPreviewError(err.message);
    }
  }

  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('dragover');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
  drop.addEventListener('drop', async (e) => {
    e.preventDefault();
    drop.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      try {
        await loadBytesFromFile(e.dataTransfer.files[0]);
      } catch (err) {
        setStatus(err.message, 'error');
      }
    }
  });

  fileInput.addEventListener('change', async () => {
    if (fileInput.files.length) {
      try {
        await loadBytesFromFile(fileInput.files[0]);
      } catch (err) {
        setStatus(err.message, 'error');
      }
    }
  });

  sampleBtn.addEventListener('click', async () => {
    try {
      const samplePaths = [
        '../basic.vrtx',
        './basic.vrtx',
        '/basic.vrtx',
        '/vortex-archive/basic.vrtx'
      ];
      let res = null;
      for (const path of samplePaths) {
        res = await fetch(path);
        if (res.ok) break;
      }
      if (!res || !res.ok) {
        throw new Error('Could not load sample file');
      }
      const blob = await res.blob();
      const file = new File([blob], 'basic.vrtx', { type: 'application/octet-stream' });
      await loadBytesFromFile(file);
    } catch (err) {
      setStatus(err.message, 'error');
    }
  });

  formatBtn.addEventListener('click', formatEditor);
  downloadJsonBtn.addEventListener('click', downloadJson);
  downloadVrtxBtn.addEventListener('click', downloadVrtx);

  editor.addEventListener('input', () => {
    clearTimeout(parseTimer);
    parseTimer = setTimeout(syncFromEditor, 160);
  });

  editor.addEventListener('blur', () => {
    try {
      const parsed = JSON.parse(editor.value);
      const normalized = normalizeDoc(parsed);
      editor.value = JSON.stringify(normalized, null, 2) + '\n';
      currentDoc = normalized;
      renderPreview(normalized);
    } catch (err) {
      // Leave invalid text in place; the preview already reports the issue.
    }
  });

  editor.value = JSON.stringify({
    format: 'nvtjson',
      format_version: 1,
        compression: { kind: 'nvtzstd', wrapper_version: 4 },
        version: 1,
        project_id: '00000000000000000000000000000000',
        records: [],
        lighting: {
          ambient_color: [1, 1, 1, 1],
          brightness: 2000,
          sun_color: [1, 1, 1, 1],
          sun_illuminance: 8000,
          sun_shadow_maps_enabled: true,
          sun_direction: [-0.394473, 0.439168, 0.223347, 0.775654]
        }
  }, null, 2) + '\n';
  currentDoc = normalizeDoc(JSON.parse(editor.value));
  renderPreview(currentDoc);
  setStatus('Load a .vrtx file or start from the default document.', 'neutral');

  window.vrtxCodec = {
    decode: decodeVrtxFile,
 encode: encodeVrtxFile,
 clone: cloneDoc
  };
})();

(function () {
  const root = document.getElementById('view-vrtx-merger');
  if (!root) return;

  const fileInput = document.getElementById('vrtxMergerFileInput');
  const drop = document.getElementById('vrtxMergerDrop');
  const grid = document.getElementById('vrtxMergerFileGrid');
  const countEl = document.getElementById('vrtxMergerCount');
  const statusEl = document.getElementById('vrtxMergerStatus');
  const clearBtn = document.getElementById('vrtxMergerClearBtn');
  const downloadBtn = document.getElementById('vrtxMergerDownloadBtn');
  const outputNameEl = document.getElementById('vrtxMergerOutputName');
  const files = [];
  let mergedDoc = null;

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function renderFiles() {
    grid.innerHTML = '';
    countEl.textContent = files.length
    ? files.length + ' file' + (files.length === 1 ? '' : 's') + ' ready'
    : 'No files selected';
    clearBtn.disabled = !files.length;
    downloadBtn.disabled = files.length < 2 || !mergedDoc;

    if (!files.length) {
      grid.innerHTML = '<div class="merger-empty">Your selected files will appear here.</div>';
      return;
    }

    files.forEach((entry, index) => {
      const tile = document.createElement('div');
      tile.className = 'merger-file-tile';
      tile.innerHTML =
      '<div class="merger-file-icon">VRTX</div>' +
      '<div class="merger-file-details"><strong>' + escapeHtml(entry.file.name) + '</strong>' +
      '<span>' + formatBytes(entry.file.size) + (entry.records ? ' · ' + entry.records + ' records' : '') + '</span></div>' +
      '<button type="button" class="merger-remove" aria-label="Remove ' + escapeHtml(entry.file.name) + '">&times;</button>';
      tile.querySelector('.merger-remove').addEventListener('click', () => {
        files.splice(index, 1);
        mergedDoc = null;
        statusEl.textContent = '';
        renderFiles();
        if (files.length >= 2) mergeFiles();
      });
        grid.appendChild(tile);
    });
  }

  function mergeDocuments(documents) {
    const base = window.vrtxCodec.clone(documents[0]);
    let records = (base.records || []).slice();
    const serviceRootClasses = new Set([
      'Workspace',
      'Lighting',
      'ReplicatedStorage',
      'StarterPlayerScripts',
      'ServerScriptService'
    ]);
    const rootByClass = new Map();

    records.forEach((record, index) => {
      const parent = record.body && record.body.parent_id;
      if (
        (parent === null || parent === undefined) &&
        serviceRootClasses.has(record.class_id) &&
        !rootByClass.has(record.class_id)
      ) {
        rootByClass.set(record.class_id, index);
      }
    });

    documents.slice(1).forEach((doc) => {
      const sourceRecords = doc.records || [];
      const indexMap = new Map();

      sourceRecords.forEach((record, index) => {
        const parent = record.body && record.body.parent_id;
        const isRoot = parent === null || parent === undefined;
        if (!isRoot) return;

        if (serviceRootClasses.has(record.class_id) && rootByClass.has(record.class_id)) {
          indexMap.set(index, rootByClass.get(record.class_id));
        } else {
          indexMap.set(index, records.length);
          records.push(window.vrtxCodec.clone(record));
          if (serviceRootClasses.has(record.class_id)) {
            rootByClass.set(record.class_id, records.length - 1);
          }
        }
      });

      sourceRecords.forEach((record, index) => {
        if (indexMap.has(index)) return;
        indexMap.set(index, records.length);
        records.push(window.vrtxCodec.clone(record));
      });

      sourceRecords.forEach((record, index) => {
        const parent = record.body && record.body.parent_id;
        const isRoot = parent === null || parent === undefined;
        if (isRoot || !indexMap.has(index)) return;
        const target = records[indexMap.get(index)];
        if (target.body && indexMap.has(parent)) {
          target.body.parent_id = indexMap.get(parent);
        } else if (target.body) {
          target.body.parent_id = null;
        }
      });
    });

    base.records = records;
    base.project_id = base.project_id || 'merged-project';
    return base;
  }

  async function mergeFiles() {
    if (files.length < 2) {
      mergedDoc = null;
      renderFiles();
      return;
    }
    statusEl.textContent = 'Reading and preserving file hierarchies…';
    downloadBtn.disabled = true;
    try {
      const documents = await Promise.all(files.map((entry) => window.vrtxCodec.decode(entry.bytes)));
      documents.forEach((doc, index) => {
        files[index].records = (doc.records || []).length;
      });
      mergedDoc = mergeDocuments(documents);
      outputNameEl.textContent = 'merged-project.vrtx · ' + (mergedDoc.records || []).length + ' records';
      statusEl.textContent = 'Ready to download. ' + (mergedDoc.records || []).length + ' records in the merged file.';
      renderFiles();
    } catch (err) {
      mergedDoc = null;
      statusEl.textContent = 'Could not merge: ' + err.message;
      renderFiles();
    }
  }

  async function addFiles(selectedFiles) {
    const incoming = Array.from(selectedFiles).filter((file) => /\.vrtx$/i.test(file.name));
    if (!incoming.length) {
      statusEl.textContent = 'Please choose one or more .vrtx files.';
      return;
    }
    for (const file of incoming) {
      if (!files.some((entry) => entry.file.name === file.name && entry.file.size === file.size)) {
        files.push({ file, bytes: new Uint8Array(await file.arrayBuffer()), records: 0 });
      }
    }
    fileInput.value = '';
    mergedDoc = null;
    renderFiles();
    await mergeFiles();
  }

  fileInput.addEventListener('change', () => addFiles(fileInput.files));
  drop.addEventListener('dragover', (event) => {
    event.preventDefault();
    drop.classList.add('dragover');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
  drop.addEventListener('drop', (event) => {
    event.preventDefault();
    drop.classList.remove('dragover');
    addFiles(event.dataTransfer.files);
  });
  clearBtn.addEventListener('click', () => {
    files.length = 0;
    mergedDoc = null;
    outputNameEl.textContent = 'merged-project.vrtx';
    statusEl.textContent = '';
    renderFiles();
  });
  downloadBtn.addEventListener('click', async () => {
    if (!mergedDoc) return;
    try {
      statusEl.textContent = 'Preparing merged file…';
      const result = await window.vrtxCodec.encode(mergedDoc);
      downloadBlob(new Blob([result.bytes], { type: 'application/octet-stream' }), 'merged-project.vrtx');
      statusEl.textContent = result.compressed ? 'Merged .vrtx downloaded.' : 'Merged raw payload downloaded.';
    } catch (err) {
      statusEl.textContent = 'Could not export: ' + err.message;
    }
  });
  renderFiles();
})();

(async function () {
  const versionEl = document.getElementById('siteVersion');

  if (!versionEl) return;

  try {
    const response = await fetch(
      'https://api.github.com/repos/none45/vortex-archive/actions/runs?per_page=100'
    );

    if (!response.ok) {
      throw new Error('GitHub API returned HTTP ' + response.status);
    }

    const data = await response.json();

    const deployments = data.workflow_runs
    .filter(run =>
    run.path &&
    run.path.includes('pages') &&
    run.status === 'completed'
    )
    .sort(
      (a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );

    if (!deployments.length) {
      throw new Error('No Pages workflow runs found');
    }

    const latest = deployments[0];

    versionEl.textContent =
    'v' + latest.run_number;

  } catch (err) {
    console.error('Failed to load site version:', err);
    versionEl.textContent = 'v?';
  }
})();
