/* ===== Configuración inicial y detección de entorno ===== */
let adsManager = null;
let adsLoader = null;
let adDisplayContainer = null;
let width = window.innerWidth;
let height = window.innerHeight;
let isUserInteracted = false;
const isInIframe = window.self !== window.top;

/* ===== Verificación del SDK IMA ===== */
function checkIMASDK() {
    if (typeof google === 'undefined' || !google.ima) {
        console.error("ERROR: IMA SDK no está cargado. Verifica que ima3.js esté importado correctamente.");
        
        // Intentar cargar el SDK dinámicamente si falla (solo en desarrollo)
        if (window.location.protocol === 'file:') {
            console.warn("Intentando cargar IMA SDK desde CDN...");
            const script = document.createElement('script');
            script.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';
            script.onload = () => {
                console.log("IMA SDK cargado dinámicamente con éxito.");
                initialize();
            };
            script.onerror = () => {
                console.error("Fallo al cargar IMA SDK dinámicamente.");
                showErrorUI();
            };
            document.head.appendChild(script);
        } else {
            showErrorUI();
        }
        return false;
    }
    return true;
}

/* ===== Inicialización segura ===== */
function initialize() {
    if (!checkIMASDK()) return;

    // Configuración para iframe
    if (isInIframe) {
        setupIframeCommunication();
    } else {
        setupDirectPage();
    }
}

/* ===== Configuración para iframe (comunicación con window.parent) ===== */
function setupIframeCommunication() {
    window.addEventListener('message', (event) => {
        // Solo aceptar mensajes de orígenes confiables
        const trustedOrigins = [
            'file://',
            'http://localhost',
            'https://eduardoalonsog.github.io'
        ];

        if (!trustedOrigins.some(origin => event.origin.startsWith(origin))) return;

        if (event.data.type === 'initAds') {
            console.log("Iniciando anuncios desde iframe...");
            startAdPlayback();
        }
    });

    // Notificar al padre que estamos listos
    window.parent.postMessage({ type: 'adsReady' }, '*');
}

/* ===== Configuración para página directa ===== */
function setupDirectPage() {
    const playButton = document.getElementById('playButton');
    if (playButton) {
        playButton.style.display = 'block';
        playButton.addEventListener('click', () => {
            isUserInteracted = true;
            playButton.style.display = 'none';
            startAdPlayback();
        });
    } else {
        // Autoplay si no hay botón (con mute por defecto)
        startAdPlayback();
    }
}

/* ===== Inicio de la reproducción de anuncios ===== */
function startAdPlayback() {
    try {
        setUpIMA();
    } catch (error) {
        console.error("Error al iniciar anuncios:", error);
        setTimeout(startAdPlayback, 2000); // Reintentar después de 2 segundos
    }
}

/* ===== Configuración del contenedor IMA ===== */
function setUpIMA() {
    try {
        // Crear contenedor de anuncios
        const adContainer = document.getElementById('content');
        if (!adContainer) throw new Error("No se encontró el contenedor de anuncios (#content).");

        adContainer.style.position = 'absolute';
        adContainer.style.top = '0';
        adContainer.style.left = '0';
        adContainer.style.width = '100%';
        adContainer.style.height = '100%';

        adDisplayContainer = new google.ima.AdDisplayContainer(adContainer);
        adDisplayContainer.initialize();

        // Configurar el cargador de anuncios
        adsLoader = new google.ima.AdsLoader(adDisplayContainer);
        adsLoader.addEventListener(
            google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
            onAdsManagerLoaded
        );
        adsLoader.addEventListener(
            google.ima.AdErrorEvent.Type.AD_ERROR,
            onAdError
        );

        // Solicitar anuncios
        requestAds();
    } catch (error) {
        console.error("Error en setUpIMA:", error);
        throw error;
    }
}

/* ===== Solicitud de anuncios ===== */
function requestAds() {
    const adsRequest = new google.ima.AdsRequest();
    adsRequest.adTagUrl = 'https://pubads.g.doubleclick.net/gampad/ads?iu=/6881/televisa.bullmedia/spotvideo&description_url=https%3A%2F%2Fbullmedia.mx%2F&tfcd=0&npa=0&sz=640x360%7C640x480%7C854x480%7C1200x675%7C1280x720%7C1280x800%7C1920x1080&gdfp_req=1&unviewed_position_start=1&output=vast&env=vp&impl=s&ad_rule=1&vpmute=0&plcmt=1&correlator=';

    adsRequest.linearAdSlotWidth = width;
    adsRequest.linearAdSlotHeight = height;
    adsRequest.nonLinearAdSlotWidth = width;
    adsRequest.nonLinearAdSlotHeight = (150 * width) / 640;

    adsLoader.requestAds(adsRequest);
}

/* ===== Manejo de anuncios cargados ===== */
function onAdsManagerLoaded(event) {
    try {
        const adsRenderingSettings = new google.ima.AdsRenderingSettings();
        adsRenderingSettings.loadVideoTimeout = 16000;
        adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;

        adsManager = event.getAdsManager(null, adsRenderingSettings);

        // Iniciar silenciado si no hay interacción del usuario
        if (!isUserInteracted) {
            adsManager.setVolume(0);
        }

        // Eventos del AdsManager
        adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onAdError);
        adsManager.addEventListener(google.ima.AdEvent.Type.LOADED, onAdEvent);
        adsManager.addEventListener(google.ima.AdEvent.Type.STARTED, onAdEvent);
        adsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE, onAdEvent);
        adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, onAdEvent);

        // Iniciar anuncios
        playAds();
    } catch (error) {
        console.error("Error en onAdsManagerLoaded:", error);
        onAdError(error);
    }
}

/* ===== Reproducción de anuncios ===== */
function playAds() {
    try {
        adsManager.init(width, height, google.ima.ViewMode.NORMAL);
        adsManager.start();
    } catch (error) {
        console.error("Error en playAds:", error);
        showErrorUI();
    }
}

/* ===== Manejo de eventos de anuncios ===== */
function onAdEvent(event) {
    const transitionScreen = document.getElementById('transitionScreen');
    if (!transitionScreen) return;

    switch (event.type) {
        case google.ima.AdEvent.Type.LOADED:
            transitionScreen.style.opacity = '0';
            transitionScreen.style.visibility = 'hidden';
            transitionScreen.style.transition = 'opacity 0.5s ease-in-out';
            break;

        case google.ima.AdEvent.Type.ALL_ADS_COMPLETED:
            transitionScreen.style.opacity = '1';
            transitionScreen.style.visibility = 'visible';
            transitionScreen.style.transition = 'opacity 0.5s ease-in-out';
            setTimeout(() => {
                if (adsManager) adsManager.destroy();
                requestAds(); // Recargar nuevos anuncios
            }, 500);
            break;
    }
}

/* ===== Manejo de errores ===== */
function onAdError(error) {
    console.error("Error en el anuncio:", error);
    if (adsManager) adsManager.destroy();
    setTimeout(requestAds, 2000); // Reintentar después de 2 segundos
}

/* ===== UI de error ===== */
function showErrorUI() {
    const playButton = document.getElementById('playButton');
    if (playButton) {
        playButton.style.display = 'block';
        playButton.textContent = 'Reintentar';
        playButton.onclick = () => window.location.reload();
    }
}

/* ===== Inicialización al cargar el DOM ===== */
if (document.readyState === 'complete') {
    initialize();
} else {
    document.addEventListener('DOMContentLoaded', initialize);
}

/* ===== Manejo de redimensionamiento ===== */
window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    if (adsManager) adsManager.resize(width, height, google.ima.ViewMode.NORMAL);
});