(function () {
  "use strict";

  var DESKTOP_BREAKPOINT = 1280;
  var SCENE_BREAKPOINT = 768;
  var PHONE_BREAKPOINT = 480;
  var HEADER_OFFSET = 96;
  var INTRO_RING_LENGTH = 307.8760800517997;

  var documentElement = document.documentElement;
  var body = document.body;
  var header = document.querySelector("header");
  var headerLogo = document.querySelector(".header-logo");
  var hamburger = document.querySelector(".header-hamburger");
  var clickOutside = document.querySelector("header .clickoutside");
  var mouseWheel = document.querySelector(".mouse-wheel");

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function mix(from, to, progress) {
    return from + (to - from) * progress;
  }

  function progressBetween(value, start, end) {
    if (end <= start) {
      return value >= end ? 1 : 0;
    }

    return clamp((value - start) / (end - start), 0, 1);
  }

  function easeOutCubic(progress) {
    return 1 - Math.pow(1 - progress, 3);
  }

  function easeInOutCubic(progress) {
    if (progress < 0.5) {
      return 4 * progress * progress * progress;
    }

    return 1 - Math.pow(-2 * progress + 2, 3) / 2;
  }

  function safePlay(video) {
    if (!video || typeof video.play !== "function") {
      return;
    }

    var playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {});
    }
  }

  function clearStyles(element, properties) {
    if (!element) {
      return;
    }

    properties.forEach(function (property) {
      element.style[property] = "";
    });
  }

  function clearCustomProperty(element, property) {
    if (!element) {
      return;
    }

    element.style.removeProperty(property);
  }

  function getSceneBrandWidth(viewportWidth) {
    return Math.round(clamp(viewportWidth * 0.44, 320, 500));
  }

  function getProfessionalPanelWidth(viewportWidth) {
    return Math.round(clamp(viewportWidth * 0.4, 360, 520));
  }

  function measureCarouselTravel(carousel) {
    if (!carousel) {
      return 0;
    }

    var items = Array.from(carousel.querySelectorAll(".shadow-large, .shadow-medium")).filter(function (item) {
      return item && item.nodeType === 1 && item.getClientRects().length > 0;
    });

    if (items.length < 2) {
      items = Array.from(carousel.children).filter(function (item) {
        return item && item.nodeType === 1 && item.getClientRects().length > 0;
      });
    }

    if (items.length < 2) {
      return Math.max(0, Math.ceil(carousel.scrollHeight - carousel.clientHeight));
    }

    var tops = items.map(function (item) {
      return item.getBoundingClientRect().top;
    });
    var firstTop = Math.min.apply(Math, tops);
    var lastTop = Math.max.apply(Math, tops);

    return Math.max(0, Math.ceil(lastTop - firstTop));
  }

  function applyReveal(element, progress, offsetY) {
    if (!element) {
      return;
    }

    var eased = easeOutCubic(progress);
    element.style.opacity = String(eased);
    element.style.transform = "translate3d(0," + mix(offsetY, 0, eased) + "px,0)";
  }

  function loadDeferredMedia() {
    var videosToLoad = new Set();

    document.querySelectorAll("source[data-src], video[data-src], img[data-src]").forEach(function (node) {
      var source = node.getAttribute("data-src");

      if (!source) {
        return;
      }

      node.setAttribute("src", source);
      node.removeAttribute("data-src");

      if (node.tagName === "SOURCE" && node.parentElement && node.parentElement.tagName === "VIDEO") {
        videosToLoad.add(node.parentElement);
      }

      if (node.tagName === "VIDEO") {
        videosToLoad.add(node);
      }
    });

    videosToLoad.forEach(function (video) {
      video.load();
    });

    document.querySelectorAll("video[autoplay]").forEach(function (video) {
      safePlay(video);
    });
  }

  function setupMenu() {
    if (!header || !hamburger) {
      return;
    }

    function setMenuState(isOpen) {
      header.classList.toggle("open", isOpen);
      hamburger.classList.toggle("open", isOpen);
      documentElement.classList.toggle("overflow-y-hidden", isOpen && window.innerWidth < DESKTOP_BREAKPOINT);
      window.dispatchEvent(new Event("scroll"));
    }

    hamburger.addEventListener("click", function () {
      setMenuState(!header.classList.contains("open"));
    });

    if (clickOutside) {
      clickOutside.addEventListener("click", function () {
        setMenuState(false);
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setMenuState(false);
      }
    });

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function (event) {
        var href = link.getAttribute("href");

        if (!href || href === "#") {
          return;
        }

        var target = document.querySelector(href);

        if (!target) {
          return;
        }

        event.preventDefault();
        setMenuState(false);
        history.replaceState(null, "", href);
        window.scrollTo({
          top: target.offsetTop,
          behavior: "smooth"
        });
      });
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth >= DESKTOP_BREAKPOINT) {
        documentElement.classList.remove("overflow-y-hidden");
      }
    }, { passive: true });
  }

  function createIntroVideoController() {
    var section = document.getElementById("introduction");

    if (!section) {
      return {
        pause: function () {},
        refresh: function () {},
        setOverlayProgress: function () {},
        setProfileState: function () {}
      };
    }

    var videoFrame = section.querySelector(".video");
    var overlay = section.querySelector(".play-pause");
    var longVideo = section.querySelector("video.long");
    var loopVideo = section.querySelector("video.loop");
    var ring = section.querySelector(".vrp__wrapper + svg circle:last-of-type");
    var durationLabel = section.querySelector(".play-pause .large");

    function getDuration() {
      if (!longVideo || !Number.isFinite(longVideo.duration) || longVideo.duration <= 0) {
        return 45;
      }

      return longVideo.duration;
    }

    function updateProgress() {
      if (!ring || !durationLabel || !longVideo) {
        return;
      }

      var duration = getDuration();
      var currentTime = clamp(longVideo.currentTime || 0, 0, duration);
      var progress = duration > 0 ? currentTime / duration : 0;
      var remaining = Math.max(0, Math.ceil(duration - currentTime));

      ring.style.strokeDashoffset = String(INTRO_RING_LENGTH - INTRO_RING_LENGTH * progress);
      durationLabel.textContent = "(" + remaining + "s)";
    }

    function playLongVideo() {
      if (!longVideo) {
        return;
      }

      if (loopVideo) {
        loopVideo.pause();
      }

      longVideo.classList.add("playing");
      if (overlay) {
        overlay.classList.remove("visible");
      }

      safePlay(longVideo);
      updateProgress();
    }

    function pauseLongVideo(resetToStart) {
      if (!longVideo) {
        return;
      }

      longVideo.pause();

      if (resetToStart) {
        longVideo.currentTime = 0;
        longVideo.classList.remove("playing");
        if (loopVideo) {
          safePlay(loopVideo);
        }
      }

      if (overlay) {
        overlay.classList.add("visible");
      }

      updateProgress();
    }

    if (videoFrame && longVideo) {
      videoFrame.classList.add("play");
      if (overlay) {
        overlay.classList.add("visible");
      }

      videoFrame.addEventListener("click", function () {
        if (longVideo.paused || longVideo.ended) {
          playLongVideo();
        } else {
          pauseLongVideo(false);
        }
      });

      longVideo.addEventListener("timeupdate", updateProgress);
      longVideo.addEventListener("loadedmetadata", updateProgress);
      longVideo.addEventListener("ended", function () {
        pauseLongVideo(true);
      });

      if (loopVideo) {
        loopVideo.addEventListener("loadeddata", function () {
          if (longVideo.paused) {
            safePlay(loopVideo);
          }
        });
      }
    }

    updateProgress();

    return {
      pause: pauseLongVideo,
      refresh: updateProgress,
      setOverlayProgress: function (progress) {
        if (!overlay) {
          return;
        }

        overlay.style.opacity = String(clamp(progress, 0, 1));
      },
      setProfileState: function (isProfile) {
        section.setAttribute("profile", isProfile ? "true" : "false");
      }
    };
  }

  function resetPinnedSection(section, content) {
    clearStyles(section, ["height", "overflow", "position"]);
    clearStyles(content, ["position", "top", "left", "width", "height", "transform"]);
  }

  function applyPinnedState(section, element, env, start, distance, width, height) {
    if (!section || !element) {
      return;
    }

    var end = start + distance;
    var left = section.getBoundingClientRect().left;
    var resolvedWidth = typeof width === "number" ? width + "px" : width;
    var resolvedHeight = typeof height === "number" ? height + "px" : height;

    element.style.width = resolvedWidth;
    element.style.height = resolvedHeight;

    if (env.scrollY < start) {
      element.style.position = "absolute";
      element.style.top = "0";
      element.style.left = "0";
      return;
    }

    if (env.scrollY > end) {
      element.style.position = "absolute";
      element.style.top = distance + "px";
      element.style.left = "0";
      return;
    }

    element.style.position = "fixed";
    element.style.top = "0";
    element.style.left = left + "px";
  }

  function createIntroScene(section, introVideo) {
    if (!section) {
      return null;
    }

    var content = section.querySelector(".content");
    var videoFrame = section.querySelector(".video");
    var localState = {
      top: 0,
      horizontalDistance: 0,
      contentWidth: 0
    };

    function reset() {
      resetPinnedSection(section, content);
      clearStyles(videoFrame, ["width", "height", "left", "top", "borderRadius", "transform"]);
      clearCustomProperty(section, "--scene-brand-width");
      introVideo.setOverlayProgress(1);
      introVideo.setProfileState(false);
    }

    return {
      measure: function (env) {
        if (!content || !videoFrame || !env.hasPinnedScenes) {
          reset();
          return;
        }

        clearStyles(content, ["position", "top", "left", "width", "height"]);
        content.style.transform = "translate3d(0,0,0)";
        section.style.overflow = "visible";
        section.style.position = "relative";

        localState.contentWidth = Math.max(env.vw, Math.ceil(content.scrollWidth));
        localState.horizontalDistance = Math.max(0, Math.ceil(content.scrollWidth - env.vw));
        section.style.height = env.vh + localState.horizontalDistance + "px";
        localState.top = section.offsetTop;
      },

      render: function (env) {
        if (!content || !videoFrame || !env.hasPinnedScenes) {
          return;
        }

        var translateProgress = localState.horizontalDistance > 0
          ? progressBetween(env.scrollY, localState.top, localState.top + localState.horizontalDistance)
          : 0;
        var translateX = localState.horizontalDistance * translateProgress;
        var shrinkProgress = easeInOutCubic(progressBetween(translateProgress, 0, 0.35));
        var endSize = clamp(Math.min(env.vh * 0.42, env.vw * 0.28), 280, 360);
        var width = mix(env.vw, endSize, shrinkProgress);
        var height = mix(env.vh, endSize, shrinkProgress);
        var left = (env.vw - width) / 2;
        var top = (env.vh - height) / 2;

        applyPinnedState(section, content, env, localState.top, localState.horizontalDistance, localState.contentWidth, env.vh);
        content.style.transform = "translate3d(" + -translateX + "px,0,0)";
        videoFrame.style.width = width + "px";
        videoFrame.style.height = height + "px";
        videoFrame.style.left = left + "px";
        videoFrame.style.top = top + "px";
        videoFrame.style.borderRadius = mix(0, endSize / 2, shrinkProgress) + "px";
        videoFrame.style.transform = "translate3d(0,0,0)";

        introVideo.setOverlayProgress(mix(1, 0.2, progressBetween(translateProgress, 0, 0.18)));
        introVideo.setProfileState(translateProgress > 0.3);

        if (translateProgress > 0.35) {
          introVideo.pause(true);
        }
      },

      reset: reset
    };
  }

  function createHorizontalScene(section, options) {
    if (!section) {
      return null;
    }

    var content = section.querySelector(".content");
    var brandLeft = section.querySelector(".brand .left");
    var carousel = options && options.carouselSelector
      ? section.querySelector(options.carouselSelector)
      : null;
    var localState = {
      top: 0,
      shrinkDistance: 0,
      horizontalDistance: 0,
      verticalDistance: 0,
      targetWidth: 500,
      contentWidth: 0
    };

    function reset() {
      resetPinnedSection(section, content);
      clearStyles(brandLeft, ["width"]);
      clearStyles(carousel, ["transform"]);
      clearCustomProperty(section, "--scene-brand-width");
    }

    return {
      measure: function (env) {
        if (!content || !brandLeft || !env.hasPinnedScenes) {
          reset();
          return;
        }

        clearStyles(content, ["position", "top", "left", "width", "height"]);
        content.style.transform = "translate3d(0,0,0)";
        if (carousel) {
          carousel.style.transform = "translate3d(0,0,0)";
        }

        section.style.overflow = "visible";
        section.style.position = "relative";

        localState.targetWidth = getSceneBrandWidth(env.vw);
        section.style.setProperty("--scene-brand-width", localState.targetWidth + "px");
        localState.contentWidth = Math.max(env.vw, Math.ceil(content.scrollWidth));
        localState.shrinkDistance = Math.max(260, Math.round(Math.min(env.vh * 0.8, env.vw - localState.targetWidth)));
        localState.horizontalDistance = Math.max(0, Math.ceil(content.scrollWidth - env.vw));
        localState.verticalDistance = measureCarouselTravel(carousel);

        section.style.height = env.vh + localState.shrinkDistance + localState.horizontalDistance + localState.verticalDistance + "px";
        localState.top = section.offsetTop;
      },

      render: function (env) {
        if (!content || !brandLeft || !env.hasPinnedScenes) {
          return;
        }

        var total = localState.shrinkDistance + localState.horizontalDistance + localState.verticalDistance;
        var localScroll = clamp(env.scrollY - localState.top, 0, total);
        var shrinkProgress = easeOutCubic(progressBetween(localScroll, 0, localState.shrinkDistance));
        var horizontalProgress = easeInOutCubic(
          progressBetween(localScroll, localState.shrinkDistance, localState.shrinkDistance + localState.horizontalDistance)
        );
        var verticalProgress = easeInOutCubic(
          progressBetween(localScroll, localState.shrinkDistance + localState.horizontalDistance, total)
        );

        applyPinnedState(section, content, env, localState.top, total, localState.contentWidth, env.vh);
        brandLeft.style.width = mix(env.vw, localState.targetWidth, shrinkProgress) + "px";
        content.style.transform = "translate3d(" + (-localState.horizontalDistance * horizontalProgress) + "px,0,0)";

        if (carousel) {
          carousel.style.transform = "translate3d(0," + (-localState.verticalDistance * verticalProgress) + "px,0)";
        }
      },

      reset: reset
    };
  }

  function createBrandsScene(section) {
    if (!section) {
      return null;
    }

    var wrapper = section.querySelector(".wrapper");
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.className = "wrapper";

      while (section.firstChild) {
        wrapper.appendChild(section.firstChild);
      }

      section.appendChild(wrapper);
    }

    var logos = wrapper.querySelector(".logos");
    var localState = {
      top: 0,
      horizontalDistance: 0,
      wrapperWidth: 0
    };

    function reset() {
      clearStyles(section, ["height", "overflow", "position"]);
      clearStyles(wrapper, ["position", "top", "left", "width", "height"]);
      clearStyles(logos, ["transform"]);
    }

    return {
      measure: function (env) {
        if (!wrapper || !logos || !env.hasPinnedScenes) {
          reset();
          return;
        }

        clearStyles(wrapper, ["position", "top", "left", "width", "height"]);
        logos.style.transform = "translate3d(0,0,0)";
        section.style.overflow = "visible";
        section.style.position = "relative";

        localState.wrapperWidth = Math.ceil(section.getBoundingClientRect().width || env.vw);
        localState.horizontalDistance = Math.max(0, Math.ceil(logos.scrollWidth - logos.clientWidth));
        section.style.height = env.vh + localState.horizontalDistance + "px";
        localState.top = section.offsetTop;
      },

      render: function (env) {
        if (!logos || !env.hasPinnedScenes) {
          return;
        }

        var progress = easeInOutCubic(
          progressBetween(env.scrollY, localState.top, localState.top + localState.horizontalDistance)
        );

        applyPinnedState(section, wrapper, env, localState.top, localState.horizontalDistance, localState.wrapperWidth, env.vh);
        logos.style.transform = "translate3d(" + (-localState.horizontalDistance * progress) + "px,0,0)";
      },

      reset: reset
    };
  }

  function createProfessionalScene(section) {
    if (!section) {
      return null;
    }

    var content = section.querySelector(".content");
    var copyPanel = section.querySelector(".thirds.copy");
    var startups = section.querySelector(".thirds.startups");
    var videoPage = section.querySelector(".page.video");
    var titles = Array.from(section.querySelectorAll(".page.video .holder .title"));
    var logoMarks = Array.from(section.querySelectorAll(".page.video .logos .item svg"));
    var localState = {
      top: 0,
      leadDistance: 960,
      revealDistance: 0,
      exitDistance: 960,
      startHeight: 0,
      contentWidth: 0
    };

    function showAllMobileStates() {
      resetPinnedSection(section, content);
      clearStyles(videoPage, ["left", "height"]);
      clearCustomProperty(section, "--professional-panel-width");
      if (startups) {
        startups.style.visibility = "visible";
        startups.style.opacity = "1";
        startups.style.transform = "translate3d(0,0,0)";
      }

      titles.forEach(function (title) {
        title.style.opacity = "1";
        title.style.transform = "translate3d(0,0,0)";
      });

      logoMarks.forEach(function (logo) {
        logo.style.opacity = "1";
        logo.style.transform = "translate3d(0,0,0)";
      });
    }

    return {
      measure: function (env) {
        if (!content || !copyPanel || !videoPage || !env.hasPinnedScenes) {
          showAllMobileStates();
          return;
        }

        section.style.overflow = "visible";
        section.style.position = "relative";
        clearStyles(content, ["position", "top", "left", "width", "height"]);
        clearStyles(videoPage, ["left", "height"]);
        localState.leadDistance = env.vw < DESKTOP_BREAKPOINT
          ? getProfessionalPanelWidth(env.vw)
          : Math.round(copyPanel.getBoundingClientRect().width || 960);
        section.style.setProperty("--professional-panel-width", localState.leadDistance + "px");
        videoPage.style.left = localState.leadDistance + "px";
        localState.contentWidth = Math.max(env.vw, Math.ceil(content.scrollWidth));
        localState.revealDistance = Math.round(env.vh * 0.72);
        localState.exitDistance = localState.leadDistance;
        localState.startHeight = Math.max(env.vh - 200, Math.round(env.vh * 0.76));

        section.style.height = env.vh + localState.leadDistance + localState.revealDistance + localState.exitDistance + "px";
        localState.top = section.offsetTop;
      },

      render: function (env) {
        if (!content || !copyPanel || !videoPage || !env.hasPinnedScenes) {
          return;
        }

        var total = localState.leadDistance + localState.revealDistance + localState.exitDistance;
        var localScroll = clamp(env.scrollY - localState.top, 0, total);
        var enterProgress = easeOutCubic(progressBetween(localScroll, 0, localState.leadDistance));
        var exitProgress = easeInOutCubic(
          progressBetween(localScroll, localState.leadDistance + localState.revealDistance * 0.75, total)
        );
        var left = mix(localState.leadDistance, 0, enterProgress);

        if (exitProgress > 0) {
          left = mix(0, -localState.leadDistance, exitProgress);
        }

        applyPinnedState(section, content, env, localState.top, total, localState.contentWidth, env.vh);
        videoPage.style.left = left + "px";
        videoPage.style.height = mix(
          localState.startHeight,
          env.vh,
          easeOutCubic(progressBetween(localScroll, 0, localState.leadDistance * 0.55))
        ) + "px";

        titles.forEach(function (title, index) {
          var start = localState.leadDistance * (0.25 + index * 0.18);
          var end = start + 220;
          applyReveal(title, progressBetween(localScroll, start, end), 28);
        });

        logoMarks.forEach(function (logo, index) {
          var start = localState.leadDistance * 0.55 + index * 48;
          var end = start + 160;
          applyReveal(logo, progressBetween(localScroll, start, end), 18);
        });

        if (startups) {
          var startupsProgress = easeOutCubic(
            progressBetween(
              localScroll,
              localState.leadDistance + localState.revealDistance * 0.25,
              localState.leadDistance + localState.revealDistance
            )
          );

          startups.style.visibility = startupsProgress > 0 ? "visible" : "hidden";
          startups.style.opacity = String(startupsProgress);
          startups.style.transform = "translate3d(" + mix(80, 0, startupsProgress) + "px,0,0)";
        }
      },

      reset: showAllMobileStates
    };
  }

  function createSceneController(introVideo) {
    var scenes = [
      createIntroScene(document.getElementById("introduction"), introVideo),
      createHorizontalScene(document.getElementById("aston-martin"), { carouselSelector: ".page.page-4 .carousel" }),
      createHorizontalScene(document.getElementById("mimicmo"), { carouselSelector: ".page.page-3 .carousel" }),
      createHorizontalScene(document.getElementById("mentorcam"), { carouselSelector: ".page.page-4 .carousel" }),
      createHorizontalScene(document.getElementById("lamborghini"), { carouselSelector: ".page.page-4 .carousel" }),
      createBrandsScene(document.getElementById("brands")),
      createProfessionalScene(document.getElementById("professional"))
    ].filter(Boolean);

    var majorSections = Array.from(document.querySelectorAll("main > section[id]"));
    var darkSectionIds = new Set(["aston-martin", "mimicmo", "mentorcam", "lamborghini"]);
    var env = {
      vw: window.innerWidth,
      vh: window.innerHeight,
      scrollY: window.scrollY || window.pageYOffset || 0,
      isDesktop: window.innerWidth >= DESKTOP_BREAKPOINT,
      hasPinnedScenes: window.innerWidth >= SCENE_BREAKPOINT,
      isPhone: window.innerWidth < PHONE_BREAKPOINT
    };
    var ticking = false;

    function updateHeaderState() {
      if (!header) {
        return;
      }

      header.classList.toggle("scroll", env.scrollY > 8);

      if (mouseWheel) {
        mouseWheel.style.opacity = env.scrollY > 20 ? "0" : "1";
        mouseWheel.style.transform = "translate3d(0," + mix(0, 12, progressBetween(env.scrollY, 0, 120)) + "px,0)";
      }

      if (!headerLogo) {
        return;
      }

      var marker = env.scrollY + HEADER_OFFSET;
      var currentSection = majorSections[0] || null;

      majorSections.forEach(function (section) {
        if (marker >= section.offsetTop) {
          currentSection = section;
        }
      });

      var isMenuOpen = header.classList.contains("open");
      var darkSection = currentSection && darkSectionIds.has(currentSection.id);
      var useWhiteLogo = isMenuOpen || Boolean(darkSection);

      headerLogo.classList.toggle("white", useWhiteLogo);
      headerLogo.classList.toggle("black", !useWhiteLogo);
    }

    function captureEnv() {
      env.vw = window.innerWidth;
      env.vh = window.innerHeight;
      env.scrollY = window.scrollY || window.pageYOffset || 0;
      env.isDesktop = env.vw >= DESKTOP_BREAKPOINT;
      env.hasPinnedScenes = env.vw >= SCENE_BREAKPOINT;
      env.isPhone = env.vw < PHONE_BREAKPOINT;
    }

    function render() {
      captureEnv();
      updateHeaderState();
      scenes.forEach(function (scene) {
        scene.render(env);
      });
    }

    function requestRender() {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        render();
      });
    }

    function refresh() {
      captureEnv();

      scenes.forEach(function (scene) {
        scene.measure(env);
      });

      introVideo.refresh();
      render();
    }

    window.addEventListener("scroll", requestRender, { passive: true });
    window.addEventListener("resize", function () {
      window.requestAnimationFrame(refresh);
    }, { passive: true });
    window.addEventListener("load", refresh, { once: true });

    return {
      refresh: refresh
    };
  }

  function init() {
    loadDeferredMedia();
    setupMenu();

    if (headerLogo) {
      window.requestAnimationFrame(function () {
        headerLogo.classList.add("visible");
      });
    }

    var introVideo = createIntroVideoController();
    var controller = createSceneController(introVideo);

    controller.refresh();
    window.setTimeout(function () {
      controller.refresh();
    }, 300);
  }

  init();
})();
