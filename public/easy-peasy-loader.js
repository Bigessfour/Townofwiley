(function loadEasyPeasyChatbot() {
  var chatbotButtonLabel = 'Open Town of Wiley assistant chat';

  var labelChatButton = function () {
    var chatButton = document.getElementById('dialoq-btn');

    if (!chatButton) {
      return false;
    }

    if (!chatButton.getAttribute('aria-label')) {
      chatButton.setAttribute('aria-label', chatbotButtonLabel);
    }

    if (!chatButton.getAttribute('title')) {
      chatButton.setAttribute('title', chatbotButtonLabel);
    }

    return true;
  };

  var watchForChatButton = function () {
    if (labelChatButton()) {
      return;
    }

    var observer = new MutationObserver(function () {
      if (!labelChatButton()) {
        return;
      }

      observer.disconnect();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  };

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
    watchForChatButton();
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
