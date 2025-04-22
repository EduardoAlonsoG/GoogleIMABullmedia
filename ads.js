/* ========== VARIABLES GLOBALES ========== */
let adsManager = null;
let adsLoader = null;
let adDisplayContainer = null;
let width = window.innerWidth;
let height = window.innerHeight;
let isUserInteracted = false;
const isInIframe = window.self !== window.top;

/* ========== VERIFICACIÓN DEL SDK IMA ========== */
function checkIMASDK() {
    if (typeof google === 'undefined' || !google.ima) {
        console.error("ERROR: IMA SDK no está cargado.");
        if (window.location.protocol === 'file:') {
            console.warn("Intentando cargar IMA SDK desde CDN...");
            const script = document.createElement('script');
            script.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';
            script.onload = initialize;
            script.onerror = showErrorUI;
            document.head.appendChild(script);
        } else {
            showErrorUI();
        }
        return false;
    }
    return true;
}

/* ========== INICIALIZACIÓN PRINCIPAL ========== */
function initialize() {
    if (!checkIMASDK()) return;

    if (isInIframe) {
        window.addEventListener('message', (event) => {
            if (event.data.type === 'initAds') startAdPlayback();
        });
        window.parent.postMessage({ type: 'adsReady' }, '*');
    } else {
        const playButton = document.getElementById('playButton');
        if (playButton) {
            playButton.style.display = 'block';
            playButton.addEventListener('click', () => {
                isUserInteracted = true;
                playButton.style.display = 'none';
                startAdPlayback();
            });
        } else {
            startAdPlayback();
        }
    }
}

/* ========== REPRODUCCIÓN DE ANUNCIOS ========== */
function startAdPlayback() {
    try {
        setUpIMA();
    } catch (error) {
        console.error("Error en startAdPlayback:", error);
        setTimeout(startAdPlayback, 2000);
    }
}

/* ========== CONFIGURACIÓN IMA ========== */
function setUpIMA() {
    try {
        const adContainer = document.getElementById('content');
        if (!adContainer) throw new Error("Elemento #content no encontrado");

        adContainer.style.position = 'absolute';
        adContainer.style.top = '0';
        adContainer.style.left = '0';
        adContainer.style.width = '100%';
        adContainer.style.height = '100%';

        adDisplayContainer = new google.ima.AdDisplayContainer(adContainer);
        adDisplayContainer.initialize();

        adsLoader = new google.ima.AdsLoader(adDisplayContainer);
        
        // CORRECCIÓN: Usar funciones definidas localmente
        adsLoader.addEventListener(
            google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
            (event) => onAdsManagerLoaded(event) // Definida abajo
        );
        adsLoader.addEventListener(
            google.ima.AdErrorEvent.Type.AD_ERROR,
            (error) => onAdError(error) // Definida abajo
        );

        requestAds();
    } catch (error) {
        console.error("Error en setUpIMA:", error);
        throw error;
    }
}

/* ========== SOLICITUD DE ANUNCIOS ========== */
function requestAds() {
    const adsRequest = new google.ima.AdsRequest();
    adsRequest.adTagUrl = 'https://pubads.g.doubleclick.net/gampad/ads?iu=/6881/televisa.bullmedia/spotvideo&description_url=https%3A%2F%2Fbullmedia.mx%2F&tfcd=0&npa=0&sz=640x360%7C640x480%7C854x480%7C1200x675%7C1280x720%7C1280x800%7C1920x1080&gdfp_req=1&unviewed_position_start=1&output=vast&env=vp&impl=s&ad_rule=1&vpmute=0&plcmt=1&correlator=';
    adsRequest.linearAdSlotWidth = width;
    adsRequest.linearAdSlotHeight = height;
    adsLoader.requestAds(adsRequest);
}

/* ========== MANEJO DE ANUNCIOS CARGADOS ========== */
function onAdsManagerLoaded(event) {
    try {
        const adsRenderingSettings = new google.ima.AdsRenderingSettings();
        adsRenderingSettings.loadVideoTimeout = 16000;

        adsManager = event.getAdsManager(null, adsRenderingSettings);
        if (!isUserInteracted) adsManager.setVolume(0);

        // Event listeners con funciones definidas localmente
        adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onAdError);
        adsManager.addEventListener(google.ima.AdEvent.Type.LOADED, onAdEvent);
        adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, onAdEvent);

        playAds();
    } catch (error) {
        console.error("Error en onAdsManagerLoaded:", error);
        onAdError(error);
    }
}

/* ========== REPRODUCCIÓN ========== */
function playAds() {
    try {
        adsManager.init(width, height, google.ima.ViewMode.NORMAL);
        adsManager.start();
    } catch (error) {
        console.error("Error en playAds:", error);
        showErrorUI();
    }
}

/* ========== MANEJO DE EVENTOS ========== */
function onAdEvent(event) {
    const transitionScreen = document.getElementById('transitionScreen');
    if (!transitionScreen) return;

    switch (event.type) {
        case google.ima.AdEvent.Type.LOADED:
            transitionScreen.style.opacity = '0';
            transitionScreen.style.visibility = 'hidden';
            break;
        case google.ima.AdEvent.Type.ALL_ADS_COMPLETED:
            transitionScreen.style.opacity = '1';
            transitionScreen.style.visibility = 'visible';
            setTimeout(() => {
                if (adsManager) adsManager.destroy();
                requestAds();
            }, 500);
            break;
    }
}

/* ========== MANEJO DE ERRORES ========== */
function onAdError(error) {
    console.error("Error en el anuncio:", error);
    if (adsManager) adsManager.destroy();
    setTimeout(requestAds, 2000);
}

function showErrorUI() {
    const playButton = document.getElementById('playButton');
    if (playButton) {
        playButton.style.display = 'block';
        playButton.textContent = 'Reintentar';
        playButton.onclick = () => window.location.reload();
    }
}

/* ========== INICIO ========== */
if (document.readyState === 'complete') {
    initialize();
} else {
    document.addEventListener('DOMContentLoaded', initialize);
}

window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    if (adsManager) adsManager.resize(width, height, google.ima.ViewMode.NORMAL);
});