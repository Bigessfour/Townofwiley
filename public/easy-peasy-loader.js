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

  var getChatbotConfig = function () {
    var runtimeConfig = window.__TOW_RUNTIME_CONFIG__;
    var runtimeConfigOverride = window.__TOW_RUNTIME_CONFIG_OVERRIDE__;

    return Object.assign(
      {},
      runtimeConfig && runtimeConfig.chatbot,
      runtimeConfigOverride && runtimeConfigOverride.chatbot,
    );
  };

  const chatbotConfig = getChatbotConfig();

  if (
    !chatbotConfig ||
    chatbotConfig.provider !== 'easyPeasy' ||
    chatbotConfig.mode !== 'embed' ||
    !chatbotConfig.chatUrl
  ) {
    return;
  }

  if (
    document.querySelector('script[data-tow-chatbot="easy-peasy"]') &&
    document.querySelector('script[data-tow-chatbot="cow-popup"]')
  ) {
    return;
  }

  const injectCowPopupScript = function () {
    if (document.querySelector('script[data-tow-chatbot="cow-popup"]')) {
      return;
    }

    const cowScript = document.createElement('script');
    const cowVideoMp4Src = chatbotConfig.cowVideoMp4Url || chatbotConfig.cowVideoUrl || '/videos/cow-welcome.mp4';

    cowScript.src = '/cow-video-popup.js';
    cowScript.dataset.towChatbot = 'cow-popup';
    cowScript.dataset.buttonPosition = chatbotConfig.buttonPosition || 'bottom-right';
    cowScript.dataset.videoSrc = cowVideoMp4Src;
    cowScript.dataset.videoMp4Src = cowVideoMp4Src;
    cowScript.dataset.delayMs = '300';
    cowScript.dataset.autoHideMs = '4200';

    if (chatbotConfig.cowVideoWebmUrl) {
      cowScript.dataset.videoWebmSrc = chatbotConfig.cowVideoWebmUrl;
    }

    if (chatbotConfig.cowVideoPosterUrl) {
      cowScript.dataset.videoPosterSrc = chatbotConfig.cowVideoPosterUrl;
    }

    if (chatbotConfig.cowBubbleText) {
      cowScript.dataset.bubbleText = chatbotConfig.cowBubbleText;
    }

    cowScript.async = true;

    document.body.appendChild(cowScript);
  };

  const injectWidgetScript = function () {
    if (!document.querySelector('script[data-tow-chatbot="easy-peasy"]')) {
      const widgetScript = document.createElement('script');

      widgetScript.src = 'https://bots.easy-peasy.ai/chat.min.js';
      widgetScript.dataset.chatUrl = chatbotConfig.chatUrl;
      widgetScript.dataset.btnPosition = chatbotConfig.buttonPosition || 'bottom-right';
      widgetScript.dataset.towChatbot = 'easy-peasy';
      widgetScript.async = true;

      document.body.appendChild(widgetScript);
      watchForChatButton();
    }

    injectCowPopupScript();
  };

  const scheduleWidgetLoad = function () {
    window.setTimeout(injectWidgetScript, 0);
  };

  if (document.readyState === 'complete') {
    scheduleWidgetLoad();
    return;
  }

  window.addEventListener('load', scheduleWidgetLoad, { once: true });
})();
