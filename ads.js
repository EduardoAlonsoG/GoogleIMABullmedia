// Copyright 2017 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

let adsManager;
let adsLoader;
let adDisplayContainer;
let adsInitialized;
let width;
let height;

/**
 * Initializes IMA setup.
 */
function initDesktopAutoplay() {
    setUpIMA();
}

/**
 * Sets up IMA ad display container, ads loader, and makes an ad request.
 */
function setUpIMA() {
  // Create the ad display container.
  createAdDisplayContainer();
 
  // Create ads loader.
  adsLoader = new google.ima.AdsLoader(adDisplayContainer);
  // Listen and respond to ads loaded and error events.
  adsLoader.addEventListener(
      google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      onAdsManagerLoaded, false);
  adsLoader.addEventListener(
      google.ima.AdErrorEvent.Type.AD_ERROR, onAdError, false);

  adDisplayContainer.initialize();

  requestAds();
}

/**
 * Sets the 'adContainer' div as the IMA ad display container.
 */
function createAdDisplayContainer() {
  // We assume the adContainer is the DOM id of the element that will house
  // the ads.

  const adContainer = document.getElementById('content');
  adContainer.style.position = 'absolute';
  adContainer.style.top = '0';
  adContainer.style.left = '0';
  adContainer.style.width = '100vw';
  adContainer.style.height = '100vh';

  adDisplayContainer = new google.ima.AdDisplayContainer(adContainer);
}

/**
 * Builds an ad request and uses it to request ads.
 */
function requestAds() {
  width = window.innerWidth;
  height = window.innerHeight;

  // Request video ads.
  const adsRequest = new google.ima.AdsRequest();
  adsRequest.adTagUrl = 'https://pubads.g.doubleclick.net/gampad/ads?iu=/6881/televisa.bullmedia/spotvideo&description_url=https%3A%2F%2Fbullmedia.mx%2F&tfcd=0&npa=0&sz=640x360%7C640x480%7C854x480%7C1200x675%7C1280x720%7C1280x800%7C1920x1080&gdfp_req=1&unviewed_position_start=1&output=vast&env=vp&impl=s&ad_rule=1&vpmute=0&plcmt=1&correlator=';

  // Specify the linear and nonlinear slot sizes. This helps the SDK to
  // select the correct creative if multiple are returned.
  adsRequest.linearAdSlotWidth = width;
  adsRequest.linearAdSlotHeight = height;

  adsRequest.nonLinearAdSlotWidth = width;
  adsRequest.nonLinearAdSlotHeight = (150*width)/640;

  adsLoader.requestAds(adsRequest);
}

/**
 * Handles the ad manager loading and sets ad event listeners.
 * @param {!google.ima.AdsManagerLoadedEvent} adsManagerLoadedEvent
 */
function onAdsManagerLoaded(adsManagerLoadedEvent) {
  // Get the ads manager.
  const adsRenderingSettings = new google.ima.AdsRenderingSettings();
  adsRenderingSettings.loadVideoTimeout = 16000; // 16 segundos

  adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
  // videoContent should be set to the content video element.
  adsManager = adsManagerLoadedEvent.getAdsManager(null, adsRenderingSettings);

  // Add listeners to the required events.
  adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onAdError);
  adsManager.addEventListener(google.ima.AdEvent.Type.LOADED, onAdEvent);
  adsManager.addEventListener(google.ima.AdEvent.Type.STARTED, onAdEvent);
  adsManager.addEventListener(google.ima.AdEvent.Type.SKIPPED, onAdEvent);
  adsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE, onAdEvent);
  adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, onAdEvent);

  playAds();
}

/**
 * Loads the video content and initializes IMA ad playback.
 */
function playAds() {
  try {
    // Initialize the ads manager. Ad rules playlist will start at this time.
    adsManager.init(width, height, google.ima.ViewMode.NORMAL);
    // Call play to start showing the ad. Single video and overlay ads will
    // start at this time; the call will be ignored for ad rules.
    adsManager.start();
  } catch (adError) {
    // An error may be thrown if there was a problem with the VAST response.
    console.log('Error al iniciar los anuncios:', adError);
  }
}

/**
 * Handles actions taken in response to ad events.
 * @param {!google.ima.AdEvent} adEvent
 */
function onAdEvent(adEvent) {
  // Retrieve the ad from the event. Some events (for example,
  // ALL_ADS_COMPLETED) don't have ad object associated.
  const ad = adEvent.getAd();
  const transitionScreen = document.getElementById('transitionScreen');
  switch (adEvent.type) {
    case google.ima.AdEvent.Type.LOADED:
        console.log('Anuncio cargado');

        transitionScreen.style.opacity = '0';
        transitionScreen.style.visibility = 'hidden';
        transitionScreen.style.transitionProperty = "opacity";
        transitionScreen.style.transitionDuration = "0.5s";
        transitionScreen.style.transitionTimingFunction = "ease-in-out";
      break;
    case google.ima.AdEvent.Type.STARTED:
        console.log('Anuncio iniciado');
      break;
    case google.ima.AdEvent.Type.SKIPPED:
        console.log('Anuncio skyp');
      break;
    case google.ima.AdEvent.Type.COMPLETE:
        console.log('Anuncio completado');
      break;
    case google.ima.AdEvent.Type.ALL_ADS_COMPLETED:
        console.log('Todo Anuncio completado');
        transitionScreen.style.opacity = '1';
        transitionScreen.style.visibility = 'visible';
        transitionScreen.style.transitionProperty = "opacity";
        transitionScreen.style.transitionDuration = "0.5s";
        transitionScreen.style.transitionTimingFunction = "ease-in-out";
        setTimeout(() => {
          console.log('Se pide nuevo Anuncio');
          adsManager.destroy();
          requestAds(); // Pedimos un nuevo anuncio
        }, 500);
      break;
  }
}

/**
 * Handles ad errors.
 * @param {!google.ima.AdErrorEvent} adErrorEvent
 */
function onAdError(adErrorEvent) {
  console.error('Error en la carga del anuncio:', adErrorEvent.getError());
  // Handle the error logging.
  if (adsManager) {
    adsManager.destroy();
  }
  // Fall back to playing content.
   setTimeout(requestAds, 2000); 
}

// Ajustar el tamaÃ±o de los anuncios al cambiar el tamaÃ±o de la ventana
window.addEventListener('resize', () => {
  if (adsManager) {
    width = window.innerWidth;
    height = window.innerHeight;
    adsManager.resize(width, height, google.ima.ViewMode.NORMAL);
  }
});