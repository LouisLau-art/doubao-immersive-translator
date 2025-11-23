const manifest = {
  manifest_version: 3,
  name: 'Doubao Immersive Translator',
  description: 'Inline web page translations using Volcengine Doubao Seed Translation API.',
  version: '0.1.0',
  permissions: ['storage', 'activeTab', 'scripting', 'contextMenus'],
  host_permissions: ['https://ark.cn-beijing.volces.com/*'],
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Doubao Immersive Translator'
  },
  background: {
    service_worker: 'src/background/index.js',
    type: 'module'
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.jsx'],
      run_at: 'document_idle'
    }
  ],
  web_accessible_resources: [
    {
      resources: ['assets/*', 'src/content/*', 'src/popup/*'],
      matches: ['<all_urls>']
    }
  ],
  // 👇👇👇 新增部分：Firefox 专用配置 👇👇👇
  browser_specific_settings: {
    gecko: {
      // 必须是 email 格式，但这可以是假的，只要唯一即可
      id: "doubao-translator@louis-extensions.local", 
      strict_min_version: "109.0"
    }
  }
};

export default manifest;