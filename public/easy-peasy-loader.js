(function loadEasyPeasyChatbot() {
  const runtimeConfig = window.__TOW_RUNTIME_CONFIG__;
  const chatbotConfig = runtimeConfig && runtimeConfig.chatbot;

  if (
    !chatbotConfig ||
    chatbotConfig.provider !== 'easyPeasy' ||
    chatbotConfig.mode !== 'embed' ||
    !chatbotConfig.chatUrl
  ) {
    return;
  }

  if (document.querySelector('script[data-tow-chatbot="easy-peasy"]')) {
    return;
  }

  const injectWidgetScript = function () {
    if (document.querySelector('script[data-tow-chatbot="easy-peasy"]')) {
      return;
    }

    const widgetScript = document.createElement('script');

    widgetScript.src = 'https://bots.easy-peasy.ai/chat.min.js';
    widgetScript.dataset.chatUrl = chatbotConfig.chatUrl;
    widgetScript.dataset.btnPosition = chatbotConfig.buttonPosition || 'bottom-right';
    widgetScript.dataset.towChatbot = 'easy-peasy';
    widgetScript.async = true;

    document.body.appendChild(widgetScript);
  };

  const scheduleWidgetLoad = function () {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(injectWidgetScript, { timeout: 4000 });
      return;
    }

    window.setTimeout(injectWidgetScript, 0);
  };

  if (document.readyState === 'complete') {
    scheduleWidgetLoad();
    return;
  }

  window.addEventListener('load', scheduleWidgetLoad, { once: true });
})();
