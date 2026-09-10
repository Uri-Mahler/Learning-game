// Loads JSON config (quests/topics/themes) and dynamically imports the JS
// question-provider module a topic declares. Fetch paths are resolved
// against the page URL, so this app must be served over http(s) — opening
// index.html directly via file:// will fail fetch() in most browsers.

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

export async function loadQuests() {
  return fetchJSON('config/quests.json');
}

export async function loadTopicConfig(topicId) {
  return fetchJSON(`config/topics/${topicId}.json`);
}

export async function loadThemeConfig(themeId) {
  return fetchJSON(`config/themes/${themeId}.json`);
}

export async function loadTopicProvider(topicConfig) {
  const module = await import(`./topics/${topicConfig.providerModule}`);
  return module.createProvider(topicConfig);
}

export async function loadQuestBundle(quest) {
  const [topicConfig, themeConfig] = await Promise.all([
    loadTopicConfig(quest.topicId),
    loadThemeConfig(quest.themeId),
  ]);
  const provider = await loadTopicProvider(topicConfig);
  return { quest, topicConfig, themeConfig, provider };
}
