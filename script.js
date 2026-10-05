 /* =============================================================================
 * ArcGIGuess — Game logic
 * =============================================================================
 * Pazudusī Latvija — Atrodi vietu kartē
 * ============================================================================= */

$arcgis
    .import([
        "@arcgis/core/config.js",
        "@arcgis/core/WebMap.js",
        "@arcgis/core/Graphic.js",
        "@arcgis/core/request.js",
        "@arcgis/core/geometry/operators/distanceOperator.js",
        "@arcgis/core/geometry/geometryEngine.js",
        "@arcgis/core/Basemap.js",
    ])
    .then(
        ([
            esriConfig,
            WebMap,
            Graphic,
            esriRequest,
            distanceOperator,
            geometryEngine,
            Basemap,
        ]) => {

            /* =================================================================
             * CONFIG
             * ================================================================= */

            const CONFIG =
                window.ARCGIGUESS_CONFIG || {};

            const LEADERBOARD =
                CONFIG.leaderboard || {};

            const $ = (id) =>
                document.getElementById(id);

            const mapEl =
                document.querySelector(
                    "arcgis-map"
                );

            /* =================================================================
             * PANELS
             * ================================================================= */

            const panels = {
                start: $("start-panel"),
                loading: $("loading-panel"),
                game: $("game-panel"),
                roundResult: $("round-result-panel"),
                gameOver: $("game-over-panel"),
                shareModal: $("share-modal"),
                submitModal: $("submit-modal"),
                leaderboardModal: $("leaderboard-modal"),
                leaderboardLoading: $("leaderboard-loading"),
                leaderboardList: $("leaderboard-list"),
            };

            /* =================================================================
             * BUTTONS
             * ================================================================= */

            const buttons = {
                langToggle: $("lang-toggle"),
                start: $("start-button"),
                confirm: $("confirm-button"),
                next: $("next-button"),
                finishEarly: $("finish-early-button"),
                playAgain: $("play-again-button"),
                share: $("share-button"),
                closeModal: $("close-modal-button"),
                submitScore: $("submit-score-button"),
                viewLeaderboard: $("view-leaderboard-button"),
                closeSubmitModal: $("close-submit-modal-button"),
                closeLeaderboardModal: $("close-leaderboard-modal-button"),
            };

            /* =================================================================
             * IMAGES
             * ================================================================= */

            const imageElements = {
                container: $("landmark-image-container"),
                image: $("landmark-image"),
                spinner: $("image-spinner"),
            };

            /* =================================================================
             * LANGUAGE
             * ================================================================= */

            const LANGUAGES =
                CONFIG.languages || [];

            const LANG_BY_CODE = {};

            LANGUAGES.forEach(
                (lang) => {
                    LANG_BY_CODE[lang.code] =
                        lang;
                }
            );

            const DEFAULT_LANG =
                LANGUAGES[0];

            let currentLanguage =
                DEFAULT_LANG
                    ? DEFAULT_LANG.code
                    : "lv";

             /* =================================================================
             * GAME STATE
             * ================================================================= */

            let gameState =
                "LOADING";

            let landmarkPool =
                [];

            let allLandmarks =
                [];

            let currentLandmarkIndex =
                0;

            let totalScore =
                0;

            let accuracyTracker =
                [];

            let clickedPoint =
                null;

            let currentRoundHasCustomPrompt =
                false;

            let webmap =
                null;

            let landmarksLayer =
                null;

            let clicksEnabled =
                false;

            let finishEarlyArmed =
                false;

            let finishEarlyTimer =
                null;

            /* =================================================================
             * PIN
             * ================================================================= */

            const PIN_IMAGE =
                "./assets/pin.svg";

            const PIN_WIDTH =
                28;

            const PIN_HEIGHT =
                42;

            const PIN_REST_YOFFSET =
                PIN_HEIGHT / 2;

            /* =================================================================
             * BASEMAP
             * ================================================================= */

            const IMAGERY_ZOOM =
                16;

            let currentBasemapType =
                null;

            let basemapSwitchingReady =
                false;

            /* =================================================================
             * BASEMAP HELPERS
             * ================================================================= */

            function createBasemaps() {

                console.log(
                    "Creating basemaps..."
                );

                console.log(
                    "Using ArcGIS Online basemap IDs."
                );
            }

            function setOpenStreetMap() {

                if (
                    !mapEl ||
                    !mapEl.map
                ) {
                    return;
                }

                try {

                    const basemap =
                        Basemap.fromId(
                            "osm"
                        );

                    if (!basemap) {

                        console.error(
                            "ArcGIS Online OSM basemap could not be created."
                        );

                        return;
                    }

                    mapEl.map.basemap =
                        basemap;

                    currentBasemapType =
                        "osm";

                    console.log(
                        "BASEMAP -> OpenStreetMap"
                    );

                } catch (error) {

                    console.error(
                        "OSM basemap error:",
                        error
                    );
                }
            }

            function setWorldImagery() {

                if (
                    !mapEl ||
                    !mapEl.map
                ) {
                    return;
                }

                try {

                    const basemap =
                        Basemap.fromId(
                            "hybrid"
                        );

                    if (!basemap) {

                        console.error(
                            "ArcGIS Online World Hybrid basemap could not be created."
                        );

                        return;
                    }

                    mapEl.map.basemap =
                        basemap;

                    currentBasemapType =
                        "imagery";

                    console.log(
                        "BASEMAP -> Imagery Hybrid"
                    );

                } catch (error) {

                    console.error(
                        "Imagery Hybrid basemap error:",
                        error
                    );
                }
            }

            function updateBasemapForZoom(
                zoom
            ) {

                if (
                    !mapEl ||
                    !mapEl.map
                ) {
                    return;
                }

                if (
                    typeof zoom !== "number" ||
                    !Number.isFinite(zoom) ||
                    zoom < 0
                ) {
                    return;
                }

                console.log(
                    "Checking basemap for zoom:",
                    zoom
                );

                if (
                    zoom <
                    IMAGERY_ZOOM
                ) {

                    if (
                        currentBasemapType !==
                        "osm"
                    ) {
                        setOpenStreetMap();
                    }

                    return;
                }

                if (
                    currentBasemapType !==
                    "imagery"
                ) {
                    setWorldImagery();
                }
            }

            function setupBasemapSwitching() {

                if (!mapEl) {

                    console.error(
                        "Basemap: map element not found."
                    );

                    return;
                }

                if (!mapEl.view) {

                    console.error(
                        "Basemap: map view not ready."
                    );

                    return;
                }

                console.log(
                    "Setting up basemap switching..."
                );

                setOpenStreetMap();

                const waitForZoom =
                    () => {

                        if (
                            !mapEl.view
                        ) {
                            setTimeout(
                                waitForZoom,
                                300
                            );

                            return;
                        }

                        const zoom =
                            mapEl.view.zoom;

                        console.log(
                            "Current zoom:",
                            zoom
                        );

                        if (
                            typeof zoom !== "number" ||
                            zoom < 0
                        ) {
                            setTimeout(
                                waitForZoom,
                                300
                            );

                            return;
                        }

                        basemapSwitchingReady =
                            true;

                        updateBasemapForZoom(
                            zoom
                        );

                        mapEl.view.watch(
                            "zoom",
                            (newZoom) => {

                                if (
                                    !basemapSwitchingReady
                                ) {
                                    return;
                                }

                                if (
                                    typeof newZoom !== "number" ||
                                    newZoom < 0
                                ) {
                                    return;
                                }

                                console.log(
                                    "Zoom changed:",
                                    newZoom
                                );

                                updateBasemapForZoom(
                                    newZoom
                                );
                            }
                        );
                    };

                waitForZoom();
            }

            /* =================================================================
             * PIN / SYMBOLS
             * ================================================================= */

            function makePinSymbol(
                yoffset
            ) {

                return {
                    type: "picture-marker",
                    url: PIN_IMAGE,
                    width: PIN_WIDTH,
                    height: PIN_HEIGHT,
                    yoffset: yoffset,
                };
            }

            const correctPointSymbol = {
                type: "simple-marker",
                style: "circle",
                color: [22, 163, 74, 0.95],
                size: 16,
                outline: {
                    color: "white",
                    width: 3,
                },
            };

            const correctAreaSymbol = {
                type: "simple-fill",
                color: [50, 205, 50, 0.3],
                outline: {
                    color: "white",
                    width: 2,
                },
            };

            const incorrectAreaSymbol = {
                type: "simple-fill",
                color: [220, 20, 60, 0.3],
                outline: {
                    color: "white",
                    width: 2,
                },
            };

            /* =================================================================
             * LANGUAGE
             * ================================================================= */

            function currentLang() {

                return (
                    LANG_BY_CODE[
                        currentLanguage
                    ] ||
                    DEFAULT_LANG
                );
            }

            function t(
                key,
                replacements = {}
            ) {

                const active =
                    currentLang();

                let text =
                    (
                        active &&
                        active.strings &&
                        active.strings[key]
                    ) ||
                    (
                        DEFAULT_LANG &&
                        DEFAULT_LANG.strings &&
                        DEFAULT_LANG.strings[key]
                    ) ||
                    key;

                const values = {
                    appName:
                        CONFIG.appName || "",

                    url:
                        (
                            CONFIG.social &&
                            CONFIG.social.url
                        ) ||
                        "",

                    ...replacements,
                };

                for (
                    const [
                        placeholder,
                        value,
                    ] of Object.entries(
                        values
                    )
                ) {

                    text =
                        text
                            .split(
                                `{${placeholder}}`
                            )
                            .join(value);
                }

                return text;
            }
function randomT(
    key,
    fallbackKey,
    replacements = {}
) {

    const active =
        currentLang();

    let values =
        (
            active &&
            active.strings &&
            active.strings[key]
        ) ||
        (
            DEFAULT_LANG &&
            DEFAULT_LANG.strings &&
            DEFAULT_LANG.strings[key]
        );

    if (
        Array.isArray(values) &&
        values.length > 0
    ) {

        const randomIndex =
            Math.floor(
                Math.random() *
                    values.length
            );

        let text =
            values[randomIndex];

        const replacementValues = {

            appName:
                CONFIG.appName ||
                "",

            url:
                (
                    CONFIG.social &&
                    CONFIG.social.url
                ) ||
                "",

            ...replacements,
        };

        for (
            const [
                placeholder,
                value,
            ] of Object.entries(
                replacementValues
            )
        ) {

            text =
                text
                    .split(
                        `{${placeholder}}`
                    )
                    .join(value);
        }

        return text;
    }

    return t(
        fallbackKey || key,
        replacements
    );
}
            function buildScoringSummary() {

                const s =
                    CONFIG.scoring || {
                        pointsForHit: 10,
                        bucketMeters: 500,
                        penaltyPerBucket: 1,
                        minScore: 0,
                    };

                return t(
                    "scoringSummaryTemplate",
                    {
                        points:
                            s.pointsForHit,

                        bucket:
                            s.bucketMeters,

                        penalty:
                            s.penaltyPerBucket,

                        min:
                            s.minScore,
                    }
                );
            }

            /* =================================================================
             * UI
             * ================================================================= */

            function showPanel(
                panelName
            ) {

                for (
                    const panel of
                    Object.values(
                        panels
                    )
                ) {

                    if (panel) {
                        panel.classList.add(
                            "hidden"
                        );
                    }
                }

                if (
                    panels[panelName]
                ) {

                    panels[
                        panelName
                    ].classList.remove(
                        "hidden"
                    );
                }
            }
function updateFindLandmarkTextVisibility() {
    const el = $("find-landmark-text");

    if ( !el ) {
        return;
    }

    if ( currentRoundHasCustomPrompt ) {
        el.classList.add( "hidden" );
        el.style.setProperty( "display", "none", "important" );
        el.style.visibility = "hidden";
        el.style.height = "0";
        el.style.margin = "0";
        el.style.padding = "0";
        el.innerText = "";
        return;
    }

    el.classList.remove( "hidden" );
    el.style.removeProperty( "display" );
    el.style.visibility = "";
    el.style.height = "";
    el.style.margin = "";
    el.style.padding = "";
    el.innerText = t( "findLandmarkText" );
}
            function updateUI() {

                const activeLang =
                    currentLang();

                document.documentElement.lang =
                    currentLanguage;

                document.body.dir =
                    (
                        activeLang &&
                        activeLang.dir
                    ) ||
                    "ltr";

                if (
                    buttons.langToggle
                ) {

                    buttons.langToggle.innerText =
                        (
                            activeLang &&
                            activeLang.toggleLabel
                        ) ||
                        currentLanguage.toUpperCase();

                    buttons.langToggle.classList.toggle(
                        "hidden",
                        LANGUAGES.length < 2
                    );
                }

                if (
                    $("welcome-title")
                ) {

                    $("welcome-title").innerHTML =
                        t(
                            "welcomeTitle"
                        );
                }

                if (
                    $("welcome-desc")
                ) {

                    $("welcome-desc").innerHTML =
                        t(
                            "welcomeDesc",
                            {
                                scoringSummary:
                                    buildScoringSummary(),
                            }
                        );
                }

                if (
                    buttons.start
                ) {
                    buttons.start.innerText =
                        t(
                            "startButton"
                        );
                }

                if (
                    $("loading-text")
                ) {
                    $("loading-text").innerText =
                        t(
                            "loadingText"
                        );
                }
              updateFindLandmarkTextVisibility();
                if (
                    $("score-display")
                ) {
                    $("score-display").innerText =
                        t(
                            "scoreDisplay",
                            {
                                score:
                                    totalScore,
                            }
                        );
                }

                if (
                    $("round-display") &&
                    allLandmarks.length > 0
                ) {
                    $("round-display").innerText =
                        t(
                            "roundDisplay",
                            {
                                current:
                                    currentLandmarkIndex + 1,

                                total:
                                    allLandmarks.length,
                            }
                        );
                }

                if (
                    buttons.confirm
                ) {

                    buttons.confirm.classList.toggle(
                        "hidden",
                        !clickedPoint
                    );

                    buttons.confirm.innerText =
                        t(
                            "confirmButton"
                        );
                }

                const canFinishEarly =
                    CONFIG.allowFinishEarly &&
                    gameState === "PLAYING" &&
                    currentLandmarkIndex <
                        allLandmarks.length - 1;

                if (
                    buttons.finishEarly
                ) {

                    buttons.finishEarly.classList.toggle(
                        "hidden",
                        !canFinishEarly
                    );

                    if (
                        !finishEarlyArmed
                    ) {
                        buttons.finishEarly.innerText =
                            t(
                                "finishEarlyButton"
                            );
                    }
                }

                if (
                    buttons.next
                ) {

                    buttons.next.innerText =
                        t(
                            currentLandmarkIndex ===
                                allLandmarks.length - 1
                                ? "gameOverButton"
                                : "nextButton"
                        );
                }

                if (
                    $("game-over-title")
                ) {
                    $("game-over-title").innerText =
                        t(
                            "gameOverTitle"
                        );
                }

                if (
                    $("final-score-text")
                ) {
                    $("final-score-text").innerText =
                        t(
                            "finalScoreText"
                        );
                }

                if (
                    $("total-score-label")
                ) {
                    $("total-score-label").innerText =
                        t(
                            "totalScoreLabel"
                        );
                }

                if (
                    $("accuracy-label")
                ) {
                    $("accuracy-label").innerText =
                        t(
                            "accuracyLabel"
                        );
                }

                if (
                    $("found-label")
                ) {
                    $("found-label").innerText =
                        t(
                            "foundLabel"
                        );
                }

                if (
                    buttons.playAgain
                ) {
                    buttons.playAgain.innerText =
                        t(
                            "playAgainButton"
                        );
                }

                if (
                    buttons.share
                ) {
                    buttons.share.innerText =
                        t(
                            "shareButton"
                        );
                }

                if (
                    buttons.submitScore
                ) {
                    buttons.submitScore.innerText =
                        t(
                            "submitScoreButton"
                        );
                }

                if (
                    buttons.viewLeaderboard
                ) {
                    buttons.viewLeaderboard.innerText =
                        t(
                            "viewLeaderboardButton"
                        );
                }

                if (
                    $("share-modal-title")
                ) {
                    $("share-modal-title").innerText =
                        t(
                            "shareModalTitle"
                        );
                }

                if (
                    $("share-modal-desc")
                ) {
                    $("share-modal-desc").innerText =
                        t(
                            "shareModalDesc"
                        );
                }

                if (
                    $("submit-modal-title")
                ) {
                    $("submit-modal-title").innerText =
                        t(
                            "submitModalTitle"
                        );
                }

                if (
                    $("leaderboard-modal-title")
                ) {
                    $("leaderboard-modal-title").innerText =
                        t(
                            "leaderboardModalTitle"
                        );
                }

                if (
                    $("leaderboard-loading-text")
                ) {
                    $("leaderboard-loading-text").innerText =
                        t(
                            "leaderboardLoadingText"
                        );
                }

                if (
                    $("share-card-title")
                ) {
                    $("share-card-title").innerText =
                        t(
                            "shareCardTitle"
                        );
                }

                if (
                    $("share-card-score-label")
                ) {
                    $("share-card-score-label").innerText =
                        t(
                            "shareCardScoreLabel"
                        );
                }

                if (
                    $("share-card-accuracy-label")
                ) {
                    $("share-card-accuracy-label").innerText =
                        t(
                            "shareCardAccuracyLabel"
                        );
                }

                if (
                    $("share-card-found-label")
                ) {
                    $("share-card-found-label").innerText =
                        t(
                            "foundLabel"
                        );
                }

                switch (
                    gameState
                ) {

                    case "LOADING":

                        showPanel(
                            "loading"
                        );

                        break;

                    case "START":

                        showPanel(
                            "start"
                        );

                        break;

                    case "PLAYING":

                        showPanel(
                            "game"
                        );

                        if (
                            buttons.confirm
                        ) {
                            buttons.confirm.classList.toggle(
                                "hidden",
                                !clickedPoint
                            );
                        }

                        break;

                    case "ROUND_RESULT":

                        showPanel(
                            "roundResult"
                        );

                        break;

                    case "GAME_OVER":

                        showPanel(
                            "gameOver"
                        );

                        break;
                }
            }

            function toggleLanguage() {

                if (
                    LANGUAGES.length < 2
                ) {
                    return;
                }

                const idx =
                    LANGUAGES.findIndex(
                        (lang) =>
                            lang.code ===
                            currentLanguage
                    );

                currentLanguage =
                    LANGUAGES[
                        (
                            idx + 1
                        ) %
                            LANGUAGES.length
                    ].code;

                updateUI();

                if (
                    gameState === "PLAYING" &&
                    allLandmarks[
                        currentLandmarkIndex
                    ]
                ) {

                    const landmark =
                        allLandmarks[
                            currentLandmarkIndex
                        ];

                    if (
                        $("landmark-name")
                    ) {
                        $("landmark-name").innerText =
                            getLandmarkName(
                                landmark
                            );
                    }
                }
            }

            /* =================================================================
             * ARRAY
             * ================================================================= */

            function shuffleArray(
                array
            ) {

                for (
                    let i =
                        array.length - 1;
                    i > 0;
                    i--
                ) {

                    const j =
                        Math.floor(
                            Math.random() *
                            (i + 1)
                        );

                    [
                        array[i],
                        array[j],
                    ] = [
                        array[j],
                        array[i],
                    ];
                }

                return array;
            }

            /* =================================================================
             * SHARE IMAGE
             * ================================================================= */

            function dataURLtoFile(
                dataUrl,
                filename
            ) {

                return fetch(
                    dataUrl
                )
                    .then(
                        (res) =>
                            res.blob()
                    )
                    .then(
                        (blob) =>
                            new File(
                                [
                                    blob,
                                ],
                                filename,
                                {
                                    type:
                                        blob.type,
                                }
                            )
                    );
            }

            /* =================================================================
             * LANDMARK HELPERS
             * ================================================================= */

            function getLandmarkName(
                feature
            ) {

                if (
                    !feature ||
                    !feature.attributes
                ) {
                    return "Nezināma vieta";
                }

                const lang =
                    currentLang();

                const field =
                    (
                        lang &&
                        lang.landmarkNameField
                    ) ||
                    "Name";

                return (
                    feature.attributes[
                        field
                    ] ||
                    "Nezināma vieta"
                );
            }
function getCustomLandmarkPrompt(
    landmark
) {

    const prompts =
        CONFIG.customLandmarkPrompts ||
        {};

    const name =
        getLandmarkName(
            landmark
        );

    const normalizedName =
        String(name || "")
            .trim()
            .toLowerCase();

    for (
        const [
            key,
            value,
        ] of Object.entries(
            prompts
        )
    ) {

        const normalizedKey =
            String(key || "")
                .trim()
                .toLowerCase();

        if (
            normalizedKey ===
            normalizedName
        ) {

            return value;
        }
    }

    return null;
}
            function getLandmarkPhoto(
                feature
            ) {

                if (
                    !feature ||
                    !feature.attributes
                ) {
                    return null;
                }

                if (
                    feature.attributes.imageUrl
                ) {
                    return String(
                        feature.attributes.imageUrl
                    ).trim();
                }

                const field =
                    CONFIG.landmarkPhotoField ||
                    "Photo";

                const value =
                    feature.attributes[
                        field
                    ];

                if (!value) {
                    return null;
                }

                return String(
                    value
                ).trim();
            }

            function getTargetGeometry(
                feature
            ) {

                return feature
                    ? feature.geometry
                    : null;
            }

            /* =================================================================
             * DISTANCE
             * ================================================================= */
                        function getDistanceMeters(
                targetGeometry,
                guessPoint
            ) {

                if (
                    !targetGeometry ||
                    !guessPoint
                ) {

                    return Number.POSITIVE_INFINITY;
                }

                try {

                    /*
                     * Ja pareizā vieta ir polygon un klikšķis ir polygon iekšā,
                     * distance ir 0 m.
                     */

                    if (
                        targetGeometry.type ===
                            "polygon"
                    ) {

                        const inside =
                            geometryEngine.contains(
                                targetGeometry,
                                guessPoint
                            );

                        if (
                            inside
                        ) {

                            return 0;
                        }
                    }

                    /*
                     * Ja pareizā vieta ir extent un klikšķis ir extent iekšā,
                     * distance ir 0 m.
                     */

                    if (
                        targetGeometry.type ===
                            "extent"
                    ) {

                        const inside =
                            targetGeometry.contains(
                                guessPoint
                            );

                        if (
                            inside
                        ) {

                            return 0;
                        }
                    }

                    /*
                     * Vispirms mēģinām geodēzisko attālumu metros.
                     * Tas ir drošāk kartēm ar WebMercator/WGS84 koordinātām.
                     */

                    if (
                        geometryEngine.geodesicDistance
                    ) {

                        const geodesicDistance =
                            geometryEngine.geodesicDistance(
                                targetGeometry,
                                guessPoint,
                                "meters"
                            );

                        if (
                            typeof geodesicDistance ===
                                "number" &&
                            Number.isFinite(
                                geodesicDistance
                            ) &&
                            !Number.isNaN(
                                geodesicDistance
                            )
                        ) {

                            return Math.max(
                                0,
                                geodesicDistance
                            );
                        }
                    }

                    /*
                     * Ja geodēziskais variants neder,
                     * mēģinām parasto geometryEngine.distance.
                     */

                    const planarDistance =
                        geometryEngine.distance(
                            targetGeometry,
                            guessPoint,
                            "meters"
                        );

                    if (
                        typeof planarDistance ===
                            "number" &&
                        Number.isFinite(
                            planarDistance
                        ) &&
                        !Number.isNaN(
                            planarDistance
                        )
                    ) {

                        return Math.max(
                            0,
                            planarDistance
                        );
                    }

                } catch (error) {

                    console.warn(
                        "geometryEngine distance failed, trying distanceOperator:",
                        error
                    );
                }

                /*
                 * Rezerves variants.
                 */

                try {

                    const operatorDistance =
                        distanceOperator.execute(
                            targetGeometry,
                            guessPoint,
                            {
                                unit:
                                    "meters",
                            }
                        );

                    if (
                        typeof operatorDistance ===
                            "number" &&
                        Number.isFinite(
                            operatorDistance
                        ) &&
                        !Number.isNaN(
                            operatorDistance
                        )
                    ) {

                        return Math.max(
                            0,
                            operatorDistance
                        );
                    }

                } catch (error) {

                    console.warn(
                        "Distance calculation failed:",
                        error
                    );
                }

                /*
                 * SVARĪGI:
                 * Ja distance neizdodas, neatgriežam 0,
                 * jo 0 nozīmē pilnus 10 punktus.
                 *
                 * Atgriežam Infinity, lai rezultāts kļūst par minScore.
                 */

                return Number.POSITIVE_INFINITY;
            }

                                function isDirectHit(
                targetGeometry,
                guessPoint
            ) {

                if (
                    !targetGeometry ||
                    !guessPoint
                ) {

                    return false;
                }

                try {

                    /*
                     * Ja klikšķis ir polygon iekšā,
                     * tas ir tiešs trāpījums.
                     */

                    if (
                        targetGeometry.type ===
                            "polygon" &&
                        geometryEngine.contains(
                            targetGeometry,
                            guessPoint
                        )
                    ) {

                        return true;
                    }

                    /*
                     * Ja klikšķis ir extent iekšā,
                     * tas ir tiešs trāpījums.
                     */

                    if (
                        targetGeometry.type ===
                            "extent" &&
                        targetGeometry.contains(
                            guessPoint
                        )
                    ) {

                        return true;
                    }

                } catch (error) {

                    console.warn(
                        "Hit test failed:",
                        error
                    );
                }

                const scoring =
                    CONFIG.scoring || {
                        bucketMeters:
                            500,
                    };

                const distance =
                    getDistanceMeters(
                        targetGeometry,
                        guessPoint
                    );

                if (
                    !Number.isFinite(
                        distance
                    )
                ) {

                    return false;
                }

                return (
                    distance <=
                    scoring.bucketMeters
                );
            }
            /* =================================================================
             * RESULT SYMBOL
             * ================================================================= */

            function getResultSymbol(
                geometry,
                gotFullPoints
            ) {

                if (!geometry) {
                    return correctPointSymbol;
                }

                if (
                    geometry.type === "polygon" ||
                    geometry.type === "extent"
                ) {
                    return gotFullPoints
                        ? correctAreaSymbol
                        : incorrectAreaSymbol;
                }

                return correctPointSymbol;
            }

            /* =================================================================
             * INIT
             * ================================================================= */

            async function init() {

                try {

                    if (!mapEl) {

                        alert(
                            "Kartes elements <arcgis-map> nav atrasts index.html failā."
                        );

                        return;
                    }

                    console.log(
                        "ArcGIGuess initialization..."
                    );

                    if (
                        CONFIG.portalUrl
                    ) {
                        esriConfig.portalUrl =
                            CONFIG.portalUrl;
                    }

                    createBasemaps();

                    webmap =
                        new WebMap({
                            portalItem: {
                                id:
                                    CONFIG.webMapItemId,
                            },
                        });

                    mapEl.map =
                        webmap;

                    await webmap.load();

                    console.log(
                        "WebMap loaded."
                    );

                    console.log(
                        "Original WebMap basemap:",
                        webmap.basemap
                    );

                    landmarksLayer =
                        webmap.layers.find(
                            (layer) =>
                                layer.title ===
                                (
                                    CONFIG.landmarkLayerTitle ||
                                    "Vietas"
                                )
                        );

                    if (
                        !landmarksLayer
                    ) {

                        console.error(
                            "Layer not found:",
                            CONFIG.landmarkLayerTitle ||
                            "Vietas"
                        );

                        alert(
                            `Tīmekļa kartē neizdevās atrast slāni “${CONFIG.landmarkLayerTitle || "Vietas"}”.`
                        );

                        return;
                    }

                    landmarksLayer.visible =
                        false;

                    await mapEl.viewOnReady();

                    console.log(
                        "Map view ready."
                    );

                    console.log(
                        "Initial zoom:",
                        mapEl.view.zoom
                    );

                    setupBasemapSwitching();

                    await loadGameData();

                    gameState =
                        "START";

                    console.log(
                        "ArcGIGuess ready."
                    );

                    updateUI();

                } catch (error) {

                    console.error(
                        "Initialization error:",
                        error
                    );

                    alert(
                        "Neizdevās ielādēt spēles datus. Pārbaudi Web Map ID, slāni “Vietas”, publisko piekļuvi un laukus."
                    );

                    gameState =
                        "LOADING";

                    updateUI();
                }
            }

            /* =================================================================
             * DATA
             * ================================================================= */

            function loadGameData() {

                try {

                    const query =
                        landmarksLayer.createQuery();

                    query.where =
                        "1=1";

                    query.outFields =
                        ["*"];

                    query.returnGeometry =
                        true;

                    /*
                     * Svarīgi:
                     * prasām slāņa ģeometrijas tajā pašā projekcijā,
                     * kurā ir kartes skats.
                     */

                    if (
                        mapEl &&
                        mapEl.view &&
                        mapEl.view.spatialReference
                    ) {

                        query.outSpatialReference =
                            mapEl.view.spatialReference;
                    }

                    return landmarksLayer
                        .queryFeatures(
                            query
                        )
                        .then(
                            (featureSet) => {

                                console.log(
                                    "FeatureSet:",
                                    featureSet
                                );

                                const landmarks =
                                    featureSet.features.filter(
                                        (feature) =>
                                            feature.geometry
                                    );

                                const photoField =
                                    CONFIG.landmarkPhotoField ||
                                    "Photo";

                                landmarks.forEach(
                                    (feature) => {

                                        const photoUrl =
                                            feature.attributes[
                                                photoField
                                            ];

                                        feature.attributes.imageUrl =
                                            photoUrl
                                                ? String(
                                                      photoUrl
                                                  ).trim()
                                                : null;
                                    }
                                );

                                landmarkPool =
                                    landmarks;

                                allLandmarks =
                                    landmarks.slice();

                                console.log(
                                    "Landmarks loaded:",
                                    landmarkPool.length
                                );

                                if (
                                    landmarkPool[0]
                                ) {

                                    console.log(
                                        "First feature geometry:",
                                        landmarkPool[0]
                                            .geometry
                                    );

                                    console.log(
                                        "First feature attributes:",
                                        landmarkPool[0]
                                            .attributes
                                    );
                                }

                                if (
                                    !landmarkPool.length
                                ) {

                                    alert(
                                        "Netika atrasta neviena vieta."
                                    );
                                }

                                return landmarks;
                            }
                        )
                        .catch(
                            (error) => {

                                console.error(
                                    "Error querying landmark data:",
                                    error
                                );

                                alert(
                                    "Neizdevās ielādēt vietu datus."
                                );

                                return Promise.reject(
                                    error
                                );
                            }
                        );

                } catch (error) {

                    console.error(
                        "Error creating query:",
                        error
                    );

                    alert(
                        "Neizdevās izveidot vietu datu pieprasījumu."
                    );

                    return Promise.reject(
                        error
                    );
                }
            }

            /* =================================================================
             * GAME
             * ================================================================= */

            function startGame() {

                currentLandmarkIndex =
                    0;

                totalScore =
                    0;

                accuracyTracker =
                    [];

                clickedPoint =
                    null;

                if (
                    mapEl.graphics
                ) {
                    mapEl.graphics.removeAll();
                }

                allLandmarks =
                    CONFIG.shuffleLandmarks
                        ? shuffleArray(
                              landmarkPool.slice()
                          )
                        : landmarkPool.slice();

                if (
                    CONFIG.roundsPerGame
                ) {
                    allLandmarks =
                        allLandmarks.slice(
                            0,
                            CONFIG.roundsPerGame
                        );
                }

                if (
                    !allLandmarks.length
                ) {

                    alert(
                        "Nav pieejamu vietu spēlei."
                    );

                    return;
                }

                startRound();
            }

            function startRound() {

                clickedPoint =
                    null;

                if (
                    mapEl.graphics
                ) {
                    mapEl.graphics.removeAll();
                }

                resetFinishEarly();

                const landmark =
                    allLandmarks[
                        currentLandmarkIndex
                    ];

            const name = getLandmarkName( landmark );

const nameLooksLikePrompt =
    String( name || "" )
        .trim()
        .toLowerCase()
        .startsWith( "kur atrodas" );

const customPrompt =
    getCustomLandmarkPrompt( landmark ) ||
    (
        nameLooksLikePrompt
            ? name
            : null
    );

currentRoundHasCustomPrompt =
    Boolean(
        customPrompt
    );

console.log(
    "DEBUG custom prompt:",
    {
        name: name,
        nameLooksLikePrompt: nameLooksLikePrompt,
        customPrompt: customPrompt,
        currentRoundHasCustomPrompt: currentRoundHasCustomPrompt,
    }
);

const imageUrl = getLandmarkPhoto( landmark );
             
updateFindLandmarkTextVisibility();

if ( $("landmark-name") ) {
    $("landmark-name").innerText =
        customPrompt || name;
}


                if (
                    imageUrl &&
                    imageElements.container &&
                    imageElements.image
                ) {

                    imageElements.container.classList.remove(
                        "hidden"
                    );

                    imageElements.image.classList.add(
                        "hidden"
                    );

                    if (
                        imageElements.spinner
                    ) {
                        imageElements.spinner.classList.remove(
                            "hidden"
                        );
                    }

                    imageElements.image.onload =
                        () => {

                            imageElements.image.classList.remove(
                                "hidden"
                            );

                            if (
                                imageElements.spinner
                            ) {
                                imageElements.spinner.classList.add(
                                    "hidden"
                                );
                            }
                        };

                    imageElements.image.onerror =
                        () => {

                            imageElements.container.classList.add(
                                "hidden"
                            );

                            if (
                                imageElements.spinner
                            ) {
                                imageElements.spinner.classList.add(
                                    "hidden"
                                );
                            }
                        };

                    imageElements.image.src =
                        imageUrl;

                    imageElements.image.alt =
                        name;

                } else {

                    if (
                        imageElements.container
                    ) {
                        imageElements.container.classList.add(
                            "hidden"
                        );
                    }

                    if (
                        imageElements.spinner
                    ) {
                        imageElements.spinner.classList.add(
                            "hidden"
                        );
                    }

                    if (
                        imageElements.image
                    ) {
                        imageElements.image.removeAttribute(
                            "src"
                        );
                    }
                }

               gameState = "PLAYING";
clicksEnabled = true;

if ( $("landmark-name") ) {
    $("landmark-name").innerText =
        customPrompt || name;
}

updateFindLandmarkTextVisibility();
updateUI();
updateFindLandmarkTextVisibility();

setTimeout(() => {
    updateFindLandmarkTextVisibility();
}, 0);
            }

            /* =================================================================
             * MAP CLICK / PIN
             * ================================================================= */

            function handleMapClick(
                mapPoint
            ) {

                if (
                    !clicksEnabled
                ) {
                    return;
                }

                if (!mapPoint) {
                    return;
                }

                clickedPoint =
                    mapPoint;

                if (
                    mapEl.graphics
                ) {
                    mapEl.graphics.removeAll();
                }

                const pinGraphic =
                    new Graphic({
                        geometry:
                            clickedPoint,

                        symbol:
                            makePinSymbol(
                                PIN_REST_YOFFSET
                            ),
                    });

                mapEl.graphics.add(
                    pinGraphic
                );

                animatePinDrop(
                    pinGraphic
                );

                updateUI();
            }

            function animatePinDrop(
                graphic
            ) {

                const dropHeight =
                    60;

                const duration =
                    650;

                const start =
                    performance.now();

                function frame(
                    now
                ) {

                    const p =
                        Math.min(
                            (
                                now -
                                start
                            ) /
                                duration,
                            1
                        );

                    const extra =
                        dropHeight *
                        (
                            1 -
                            easeOutBounce(
                                p
                            )
                        );

                    graphic.symbol =
                        makePinSymbol(
                            PIN_REST_YOFFSET +
                            extra
                        );

                    if (
                        p < 1
                    ) {
                        requestAnimationFrame(
                            frame
                        );
                    }
                }

                requestAnimationFrame(
                    frame
                );
            }

            function easeOutBounce(
                x
            ) {

                const n1 =
                    7.5625;

                const d1 =
                    2.75;

                if (
                    x <
                    1 / d1
                ) {
                    return (
                        n1 *
                        x *
                        x
                    );
                }

                if (
                    x <
                    2 / d1
                ) {
                    return (
                        n1 *
                        (
                            x -=
                                1.5 /
                                d1
                        ) *
                        x +
                        0.75
                    );
                }

                if (
                    x <
                    2.5 / d1
                ) {
                    return (
                        n1 *
                        (
                            x -=
                                2.25 /
                                d1
                        ) *
                        x +
                        0.9375
                    );
                }

                return (
                    n1 *
                    (
                        x -=
                            2.625 /
                            d1
                    ) *
                    x +
                    0.984375
                );
            }

            /* =================================================================
             * CONFIRM GUESS
             * ================================================================= */

                       function getDistanceMeters(
                targetGeometry,
                guessPoint
            ) {

                if (
                    !targetGeometry ||
                    !guessPoint
                ) {

                    return Number.POSITIVE_INFINITY;
                }

                try {

                    /*
                     * Ja klikšķis ir poligonā, distance ir 0.
                     */

                    if (
                        targetGeometry.type ===
                            "polygon" &&
                        geometryEngine.contains(
                            targetGeometry,
                            guessPoint
                        )
                    ) {

                        return 0;
                    }

                    /*
                     * Ja klikšķis ir extent iekšā, distance ir 0.
                     */

                    if (
                        targetGeometry.type ===
                            "extent" &&
                        targetGeometry.contains(
                            guessPoint
                        )
                    ) {

                        return 0;
                    }

                    /*
                     * Mēģinām geodēzisko distanci metros.
                     */

                    if (
                        geometryEngine.geodesicDistance
                    ) {

                        const geodesicDistance =
                            geometryEngine.geodesicDistance(
                                targetGeometry,
                                guessPoint,
                                "meters"
                            );

                        if (
                            typeof geodesicDistance ===
                                "number" &&
                            Number.isFinite(
                                geodesicDistance
                            ) &&
                            !Number.isNaN(
                                geodesicDistance
                            )
                        ) {

                            return Math.max(
                                0,
                                geodesicDistance
                            );
                        }
                    }

                    /*
                     * Ja geodēziskais variants neder, mēģinām parasto distanci.
                     */

                    const planarDistance =
                        geometryEngine.distance(
                            targetGeometry,
                            guessPoint,
                            "meters"
                        );

                    if (
                        typeof planarDistance ===
                            "number" &&
                        Number.isFinite(
                            planarDistance
                        ) &&
                        !Number.isNaN(
                            planarDistance
                        )
                    ) {

                        return Math.max(
                            0,
                            planarDistance
                        );
                    }

                } catch (error) {

                    console.warn(
                        "geometryEngine distance failed, trying distanceOperator:",
                        error
                    );
                }

                /*
                 * Rezerves variants.
                 */

                try {

                    const operatorDistance =
                        distanceOperator.execute(
                            targetGeometry,
                            guessPoint,
                            {
                                unit:
                                    "meters",
                            }
                        );

                    if (
                        typeof operatorDistance ===
                            "number" &&
                        Number.isFinite(
                            operatorDistance
                        ) &&
                        !Number.isNaN(
                            operatorDistance
                        )
                    ) {

                        return Math.max(
                            0,
                            operatorDistance
                        );
                    }

                } catch (error) {

                    console.warn(
                        "Distance calculation failed:",
                        error
                    );
                }

                /*
                 * Ja distanci nevar aprēķināt, NEATGRIEŽAM 0,
                 * jo 0 dotu pilnus punktus.
                 */

                return Number.POSITIVE_INFINITY;
            }

            function isDirectHit(
                targetGeometry,
                guessPoint
            ) {

                if (
                    !targetGeometry ||
                    !guessPoint
                ) {

                    return false;
                }

                try {

                    /*
                     * 10 punkti tikai tad, ja klikšķis ir poligonā.
                     */

                    if (
                        targetGeometry.type ===
                            "polygon" &&
                        geometryEngine.contains(
                            targetGeometry,
                            guessPoint
                        )
                    ) {

                        return true;
                    }

                    if (
                        targetGeometry.type ===
                            "extent" &&
                        targetGeometry.contains(
                            guessPoint
                        )
                    ) {

                        return true;
                    }

                } catch (error) {

                    console.warn(
                        "Hit test failed:",
                        error
                    );
                }

                /*
                 * Svarīgi:
                 * Vairs nedodam full points par 500 m robežu.
                 * 10 punkti ir tikai poligonā.
                 */

                return false;
            }
                     function getResultSymbol(
                geometry,
                gotFullPoints
            ) {

                if (!geometry) {

                    return correctPointSymbol;
                }

                if (
                    geometry.type ===
                        "polygon" ||
                    geometry.type ===
                        "extent"
                ) {

                    return gotFullPoints
                        ? correctAreaSymbol
                        : incorrectAreaSymbol;
                }

                return correctPointSymbol;
            }
                     function normalizeLandmarkName(
                value
            ) {

                return String(
                    value || ""
                )
                    .trim()
                    .toLowerCase()
                    .replace(
                        /["“”]/g,
                        "\""
                    )
                    .replace(
                        /\s+/g,
                        " "
                    );
            }

function shouldUseFullScoreBuffer( landmark ) {
    const excludedNames = CONFIG.noFullScoreBufferLandmarks || [];
    const currentName = normalizeLandmarkName( getLandmarkName( landmark ) );

    const isExcluded = excludedNames.some( (name) =>
        normalizeLandmarkName( name ) === currentName
    );

    return !isExcluded;
}

            function getDistanceMeters(
                targetGeometry,
                guessPoint
            ) {

                if (
                    !targetGeometry ||
                    !guessPoint
                ) {

                    return Number.POSITIVE_INFINITY;
                }

                try {

                    if (
                        targetGeometry.type ===
                            "polygon" &&
                        geometryEngine.contains(
                            targetGeometry,
                            guessPoint
                        )
                    ) {

                        return 0;
                    }

                    if (
                        targetGeometry.type ===
                            "extent" &&
                        targetGeometry.contains(
                            guessPoint
                        )
                    ) {

                        return 0;
                    }

                    if (
                        geometryEngine.geodesicDistance
                    ) {

                        const geodesicDistance =
                            geometryEngine.geodesicDistance(
                                targetGeometry,
                                guessPoint,
                                "meters"
                            );

                        if (
                            typeof geodesicDistance ===
                                "number" &&
                            Number.isFinite(
                                geodesicDistance
                            ) &&
                            !Number.isNaN(
                                geodesicDistance
                            )
                        ) {

                            return Math.max(
                                0,
                                geodesicDistance
                            );
                        }
                    }

                    const planarDistance =
                        geometryEngine.distance(
                            targetGeometry,
                            guessPoint,
                            "meters"
                        );

                    if (
                        typeof planarDistance ===
                            "number" &&
                        Number.isFinite(
                            planarDistance
                        ) &&
                        !Number.isNaN(
                            planarDistance
                        )
                    ) {

                        return Math.max(
                            0,
                            planarDistance
                        );
                    }

                } catch (error) {

                    console.warn(
                        "geometryEngine distance failed, trying distanceOperator:",
                        error
                    );
                }

                try {

                    const operatorDistance =
                        distanceOperator.execute(
                            targetGeometry,
                            guessPoint,
                            {
                                unit:
                                    "meters",
                            }
                        );

                    if (
                        typeof operatorDistance ===
                            "number" &&
                        Number.isFinite(
                            operatorDistance
                        ) &&
                        !Number.isNaN(
                            operatorDistance
                        )
                    ) {

                        return Math.max(
                            0,
                            operatorDistance
                        );
                    }

                } catch (error) {

                    console.warn(
                        "Distance calculation failed:",
                        error
                    );
                }

                return Number.POSITIVE_INFINITY;
            }

            function isInsideGeometry(
                targetGeometry,
                guessPoint
            ) {

                if (
                    !targetGeometry ||
                    !guessPoint
                ) {

                    return false;
                }

                try {

                    if (
                        targetGeometry.type ===
                            "polygon" &&
                        geometryEngine.contains(
                            targetGeometry,
                            guessPoint
                        )
                    ) {

                        return true;
                    }

                    if (
                        targetGeometry.type ===
                            "extent" &&
                        targetGeometry.contains(
                            guessPoint
                        )
                    ) {

                        return true;
                    }

                } catch (error) {

                    console.warn(
                        "Inside check failed:",
                        error
                    );
                }

                return false;
            }function confirmGuess() {

                if (
                    !clickedPoint
                ) {

                    return;
                }

                clicksEnabled =
                    false;

                const targetLandmark =
                    allLandmarks[
                        currentLandmarkIndex
                    ];

                const targetGeometry =
                    getTargetGeometry(
                        targetLandmark
                    );

                const scoring =
                    CONFIG.scoring || {
                        pointsForHit:
                            10,

                        bucketMeters:
                            500,

                        penaltyPerBucket:
                            1,

                        minScore:
                            0,
                    };

          const hasFullScoreBuffer = shouldUseFullScoreBuffer( targetLandmark );

                const isInside =
                    isInsideGeometry(
                        targetGeometry,
                        clickedPoint
                    );

                let distanceInMeters =
                    getDistanceMeters(
                        targetGeometry,
                        clickedPoint
                    );

                if (
                    typeof distanceInMeters !==
                        "number" ||
                    Number.isNaN(
                        distanceInMeters
                    ) ||
                    distanceInMeters < 0
                ) {

                    distanceInMeters =
                        Number.POSITIVE_INFINITY;
                }

                let roundScore;

                /*
                 * Punktu loģika:
                 *
                 * 1. Ja klikšķis ir poligonā = 10 punkti visiem objektiem.
                 *
                 * 2. Mazajiem objektiem:
                 *    līdz 500 m no poligona = 10 punkti.
                 *
                 * 3. Lielajiem objektiem:
                 *    tiklīdz iziet ārpus poligona, sākas sods:
                 *    1-500 m = 9 punkti.
                 */

                if (
                    isInside
                ) {

                    roundScore =
                        scoring.pointsForHit;

                } else if (
                    !Number.isFinite(
                        distanceInMeters
                    )
                ) {

                    roundScore =
                        scoring.minScore;

                } else if (
                    hasFullScoreBuffer
                ) {

                    /*
                     * Mazie objekti:
                     * 0-500 m ārpus poligona = 10 punkti
                     * 501-1000 m = 9 punkti
                     * 1001-1500 m = 8 punkti
                     */

                    const bandsBeyondBuffer =
                        Math.max(
                            0,
                            Math.ceil(
                                (
                                    distanceInMeters -
                                    scoring.bucketMeters
                                ) /
                                    scoring.bucketMeters
                            )
                        );

                    const penalty =
                        bandsBeyondBuffer *
                        scoring.penaltyPerBucket;

                    roundScore =
                        Math.max(
                            scoring.minScore,
                            scoring.pointsForHit -
                                penalty
                        );

                } else {

                    /*
                     * Lielie objekti:
                     * poligonā = 10 punkti
                     * 1-500 m ārpus poligona = 9 punkti
                     * 501-1000 m = 8 punkti
                     */

                    const bands =
                        Math.ceil(
                            distanceInMeters /
                                scoring.bucketMeters
                        );

                    const penalty =
                        bands *
                        scoring.penaltyPerBucket;

                    roundScore =
                        Math.max(
                            scoring.minScore,
                            scoring.pointsForHit -
                                penalty
                        );
                }

                const gotFullPoints =
                    roundScore ===
                    scoring.pointsForHit;

                let resultTitle;
                let resultMessage;

               if ( gotFullPoints ) {
    resultTitle = t( "correctTitle" );
    resultMessage = t( "correctMessage", {
        roundScore: roundScore,
    } );
    accuracyTracker.push( 1 );
}
               else {

                    /*
                     * Ja tev ir randomT() funkcija un incorrectTitles masīvs,
                     * vari lietot randomT().
                     * Ja nav, šī daļa automātiski lietos parasto t().
                     */

                    if (
                        typeof randomT ===
                            "function"
                    ) {

                        resultTitle =
                            randomT(
                                "incorrectTitles",
                                "incorrectTitle"
                            );

                    } else {

                        resultTitle =
                            t(
                                "incorrectTitle"
                            );
                    }

                    const displayDistance =
                        Number.isFinite(
                            distanceInMeters
                        )
                            ? Math.round(
                                  distanceInMeters
                              )
                            : "ļoti tālu";

                    resultMessage =
                        t(
                            "incorrectMessage",
                            {
                                distance:
                                    displayDistance,

                                roundScore:
                                    roundScore,
                            }
                        );

                    accuracyTracker.push(
                        0
                    );
                }

                totalScore +=
                    roundScore;

                if (
                    $("round-result-title")
                ) {

                    $(
                        "round-result-title"
                    ).innerText =
                        resultTitle;

                    $(
                        "round-result-title"
                    ).style.color =
                        gotFullPoints
                            ? "#16a34a"
                            : "#dc2626";
                }

                if (
                    $("round-result-message")
                ) {

                    $(
                        "round-result-message"
                    ).innerHTML =
                        resultMessage;
                }

                if (
                    targetGeometry
                ) {

                    const answerGraphic =
                        new Graphic({
                            geometry:
                                targetGeometry,

                            symbol:
                                getResultSymbol(
                                    targetGeometry,
                                    gotFullPoints
                                ),
                        });

                    mapEl.graphics.add(
                        answerGraphic
                    );

                    goToAnswer(
                        targetGeometry
                    );
                }

                gameState =
                    "ROUND_RESULT";

                updateUI();
            }

            function goToAnswer(
                geometry
            ) {

                if (!geometry) {
                    return;
                }

                let target =
                    geometry;

                if (
                    geometry.extent
                ) {
                    target =
                        geometry.extent.expand(
                            1.8
                        );
                }

                mapEl
                    .goTo(
                        target
                    )
                    .catch(
                        (error) => {

                            if (
                                error &&
                                error.name !==
                                "AbortError"
                            ) {
                                console.error(
                                    error
                                );
                            }
                        }
                    );
            }

            /* =================================================================
             * FINISH EARLY
             * ================================================================= */

            function resetFinishEarly() {

                finishEarlyArmed =
                    false;

                if (
                    finishEarlyTimer
                ) {

                    clearTimeout(
                        finishEarlyTimer
                    );

                    finishEarlyTimer =
                        null;
                }

                if (
                    buttons.finishEarly
                ) {

                    buttons.finishEarly.classList.remove(
                        "armed"
                    );

                    buttons.finishEarly.innerText =
                        t(
                            "finishEarlyButton"
                        );
                }
            }

            function handleFinishEarly() {

                if (
                    !finishEarlyArmed
                ) {

                    finishEarlyArmed =
                        true;

                    buttons.finishEarly.classList.add(
                        "armed"
                    );

                    buttons.finishEarly.innerText =
                        t(
                            "finishEarlyConfirm"
                        );

                    finishEarlyTimer =
                        setTimeout(
                            resetFinishEarly,
                            3000
                        );

                    return;
                }

                resetFinishEarly();

                clicksEnabled =
                    false;

                endGame();
            }

            function nextRound() {

                currentLandmarkIndex++;

                if (
                    currentLandmarkIndex <
                    allLandmarks.length
                ) {
                    startRound();
                } else {
                    endGame();
                }
            }

            function endGame() {

                gameState =
                    "GAME_OVER";

                clicksEnabled =
                    false;

                updateUI();

                const total =
                    allLandmarks.length ||
                    1;

                const foundCount =
                    accuracyTracker.filter(
                        (value) =>
                            value === 1
                    ).length;

                const accuracy =
                    Math.round(
                        (
                            foundCount /
                            total
                        ) *
                        100
                    );

                const foundText =
                    `${foundCount} / ${allLandmarks.length}`;

                if (
                    $("total-score")
                ) {
                    $("total-score").innerText =
                        totalScore;
                }

                if (
                    $("accuracy")
                ) {
                    $("accuracy").innerText =
                        `${accuracy}%`;
                }

                if (
                    $("found-count")
                ) {
                    $("found-count").innerText =
                        foundText;
                }

                if (
                    $("share-card-score")
                ) {
                    $("share-card-score").innerText =
                        totalScore;
                }

                if (
                    $("share-card-accuracy")
                ) {
                    $("share-card-accuracy").innerText =
                        `${accuracy}%`;
                }

                if (
                    $("share-card-found")
                ) {
                    $("share-card-found").innerText =
                        foundText;
                }
            }

            /* =================================================================
             * SHARE
             * ================================================================= */

            function shareResults() {

                const shareCard =
                    $("share-card");

                if (
                    !shareCard ||
                    typeof html2canvas ===
                    "undefined"
                ) {

                    console.warn(
                        "html2canvas is not available."
                    );

                    return;
                }

                const fileName =
                    `${(
                        CONFIG.appName ||
                        "arcgigues"
                    )
                        .replace(
                            /\s+/g,
                            "-"
                        )
                        .toLowerCase()}-results.png`;

                shareCard.classList.remove(
                    "hidden"
                );

                shareCard.style.position =
                    "absolute";

                shareCard.style.left =
                    "-9999px";

                setTimeout(
                    () => {

                        html2canvas(
                            shareCard,
                            {
                                scale: 2,
                                useCORS: true,
                            }
                        )
                            .then(
                                (canvas) => {

                                    const dataUrl =
                                        canvas.toDataURL(
                                            "image/png"
                                        );

                                    return dataURLtoFile(
                                        dataUrl,
                                        fileName
                                    ).then(
                                        (file) => ({
                                            dataUrl,
                                            file,
                                        })
                                    );
                                }
                            )
                            .then(
                                ({
                                    dataUrl,
                                    file,
                                }) => {

                                    hideShareCard();

                                    if (
                                        navigator.share &&
                                        navigator.canShare &&
                                        navigator.canShare(
                                            {
                                                files:
                                                    [
                                                        file,
                                                    ],
                                            }
                                        )
                                    ) {
                                        return navigator.share(
                                            {
                                                title:
                                                    t(
                                                        "shareCardTitle"
                                                    ),

                                                text:
                                                    t(
                                                        "shareText",
                                                        {
                                                            score:
                                                                totalScore,
                                                        }
                                                    ),

                                                files:
                                                    [
                                                        file,
                                                    ],
                                            }
                                        );
                                    }

                                    if (
                                        $("share-image-preview")
                                    ) {
                                        $("share-image-preview").src =
                                            dataUrl;
                                    }

                                    if (
                                        panels.shareModal
                                    ) {
                                        panels.shareModal.classList.remove(
                                            "hidden"
                                        );
                                    }
                                }
                            )
                            .catch(
                                (error) => {

                                    console.error(
                                        "Share error:",
                                        error
                                    );

                                    hideShareCard();
                                }
                            );
                    },
                    100
                );
            }

            function hideShareCard() {

                const shareCard =
                    $("share-card");

                if (!shareCard) {
                    return;
                }

                shareCard.classList.add(
                    "hidden"
                );

                shareCard.style.position =
                    "";

                shareCard.style.left =
                    "";
            }

            /* =================================================================
             * LEADERBOARD / SURVEY123
             * ================================================================= */

 function showSubmitModal() {

    if (
        !LEADERBOARD.enabled ||
        !LEADERBOARD.survey123Url
    ) {
        return;
    }

    const rawScoreField =
        LEADERBOARD.submitScoreFieldId ||
        LEADERBOARD.scoreField ||
        "rezult_ts";

    const scoreField =
        String(rawScoreField).replace(
            /^field:/,
            ""
        );

    const safeScore =
        Number.isFinite(Number(totalScore))
            ? Number(totalScore)
            : 0;

    const separator =
        LEADERBOARD.survey123Url.includes("?")
            ? "&"
            : "?";

    /*
     * Survey123 URL prefill:
     * field:rezult_ts=123
     */
    const url =
        `${LEADERBOARD.survey123Url}` +
        `${separator}` +
        `field:${scoreField}=${encodeURIComponent(String(safeScore))}` +
        `&hide=navbar,header,description,footer`;

    console.log(
        "Total score:",
        safeScore
    );

    console.log(
        "Survey123 score field:",
        scoreField
    );

    console.log(
        "Survey123 submit URL:",
        url
    );

    if (
        $("survey-iframe")
    ) {
        $("survey-iframe").src =
            url;
    }

    if (
        panels.submitModal
    ) {
        panels.submitModal.classList.remove(
            "hidden"
        );
    }
}

            function showLeaderboard() {

                if (
                    !LEADERBOARD.enabled
                ) {
                    return;
                }

                panels.leaderboardModal.classList.remove(
                    "hidden"
                );

                panels.leaderboardLoading.classList.remove(
                    "hidden"
                );

                panels.leaderboardList.classList.add(
                    "hidden"
                );

                panels.leaderboardList.innerHTML =
                    "";

                fetchLeaderboardData();
            }

            function fetchLeaderboardData() {

                const queryParams = {
                    f: "json",
                    where: "1=1",
                    outFields:
                        `${LEADERBOARD.firstNameField},${LEADERBOARD.lastNameField},${LEADERBOARD.scoreField}`,
                    orderByFields:
                        `${LEADERBOARD.scoreField} DESC`,
                    resultRecordCount:
                        LEADERBOARD.topN,
                };

                esriRequest(
                    LEADERBOARD.dataApiUrl,
                    {
                        query:
                            queryParams,

                        responseType:
                            "json",
                    }
                )
                    .then(
                        (response) => {

                            const features =
                                response.data.features;

                            populateLeaderboard(
                                features
                            );
                        }
                    )
                    .catch(
                        (error) => {

                            console.error(
                                "Leaderboard error:",
                                error
                            );

                            panels.leaderboardLoading.classList.add(
                                "hidden"
                            );

                            panels.leaderboardList.classList.remove(
                                "hidden"
                            );

                            panels.leaderboardList.innerHTML =
                                `<li class="text-red-600">${t(
                                    "leaderboardError"
                                )}</li>`;
                        }
                    );
            }

            function populateLeaderboard(
                features
            ) {

                panels.leaderboardLoading.classList.add(
                    "hidden"
                );

                panels.leaderboardList.classList.remove(
                    "hidden"
                );

                if (
                    !features ||
                    features.length === 0
                ) {

                    panels.leaderboardList.innerHTML =
                        `<li>${t(
                            "noScores"
                        )}</li>`;

                    return;
                }

                features.forEach(
                    (
                        feature,
                        index
                    ) => {

                        const firstName =
                            feature
                                .attributes[
                                    LEADERBOARD.firstNameField
                                ] ||
                            "";

                        const lastName =
                            feature
                                .attributes[
                                    LEADERBOARD.lastNameField
                                ] ||
                            "";

                        const name =
                            `${firstName} ${lastName}`
                                .trim() ||
                            "Anonymous";

                        const score =
                            feature
                                .attributes[
                                    LEADERBOARD.scoreField
                                ] ||
                            0;

                        const li =
                            document.createElement(
                                "li"
                            );

                        li.className =
                            "p-3 bg-gray-100 rounded-lg flex justify-between items-center";

                        const nameSpan =
                            document.createElement(
                                "span"
                            );

                        nameSpan.className =
                            "font-bold text-lg text-blue-700";

                        nameSpan.textContent =
                            `${index + 1}. ${name}`;

                        const scoreSpan =
                            document.createElement(
                                "span"
                            );

                        scoreSpan.className =
                            "font-semibold text-lg";

                        scoreSpan.textContent =
                            `${score} ${t(
                                "points"
                            )}`;

                        li.appendChild(
                            nameSpan
                        );

                        li.appendChild(
                            scoreSpan
                        );

                        panels.leaderboardList.appendChild(
                            li
                        );
                    }
                );
            }

            /* =================================================================
             * STATIC CONFIG
             * ================================================================= */

            function applyStaticConfig() {

                document.title =
                    `${CONFIG.appName || "ArcGIGuess"} | ${CONFIG.tagline || ""}`;

                const logoAlt =
                    `${CONFIG.appName || "ArcGIGuess"} Logo`;

                [
                    $("start-logo"),
                    $("share-logo"),
                ].forEach(
                    (img) => {

                        if (img) {
                            img.alt =
                                logoAlt;
                        }
                    }
                );

                if (
                    $("share-card-footer")
                ) {
                    $("share-card-footer").innerText =
                        CONFIG.shareCardFooter ||
                        CONFIG.tagline ||
                        "ArcGIGuess";
                }

                applySocialMeta();

                if (
                    !LEADERBOARD ||
                    !LEADERBOARD.enabled
                ) {

                    if (
                        buttons.submitScore
                    ) {
                        buttons.submitScore.classList.add(
                            "hidden"
                        );
                    }

                    if (
                        buttons.viewLeaderboard
                    ) {
                        buttons.viewLeaderboard.classList.add(
                            "hidden"
                        );
                    }
                }

                /*
                 * Spēlētāja ekrānā paslēpjam:
                 * - Dalīties ar rezultātiem
                 * - Rezultātu tabula
                 *
                 * Atstājam:
                 * - Iesniegt rezultātu
                 */
                if (
                    buttons.share
                ) {
                    buttons.share.classList.add(
                        "hidden"
                    );
                }

                if (
                    buttons.viewLeaderboard
                ) {
                    buttons.viewLeaderboard.classList.add(
                        "hidden"
                    );
                }
            }

            function applySocialMeta() {

                const s =
                    CONFIG.social;

                if (!s) {
                    return;
                }

                const setMeta =
                    (
                        selector,
                        value
                    ) => {

                        if (
                            value == null ||
                            value === ""
                        ) {
                            return;
                        }

                        const el =
                            document.head.querySelector(
                                selector
                            );

                        if (el) {
                            el.setAttribute(
                                "content",
                                value
                            );
                        }
                    };

                setMeta(
                    'meta[name="description"]',
                    s.description
                );

                setMeta(
                    'meta[property="og:site_name"]',
                    CONFIG.appName
                );

                setMeta(
                    'meta[property="og:title"]',
                    s.title
                );

                setMeta(
                    'meta[property="og:description"]',
                    s.description
                );

                setMeta(
                    'meta[property="og:image"]',
                    s.image
                );

                setMeta(
                    'meta[property="og:url"]',
                    s.url
                );

                setMeta(
                    'meta[name="twitter:title"]',
                    s.title
                );

                setMeta(
                    'meta[name="twitter:description"]',
                    s.description
                );

                setMeta(
                    'meta[name="twitter:image"]',
                    s.image
                );

                setMeta(
                    'meta[name="twitter:site"]',
                    s.twitterHandle
                );

                setMeta(
                    'meta[name="twitter:creator"]',
                    s.twitterHandle
                );
            }

            /* =================================================================
             * EVENTS
             * ================================================================= */

            if (mapEl) {

                mapEl.addEventListener(
                    "arcgisViewClick",
                    (event) => {

                        if (
                            !clicksEnabled
                        ) {
                            return;
                        }

                        const mapPoint =
                            event.detail &&
                            event.detail.mapPoint;

                        if (
                            !mapPoint
                        ) {
                            return;
                        }

                        handleMapClick(
                            mapPoint
                        );
                    }
                );
            }

            if (
                buttons.langToggle
            ) {
                buttons.langToggle.addEventListener(
                    "click",
                    toggleLanguage
                );
            }

            if (
                buttons.start
            ) {
                buttons.start.addEventListener(
                    "click",
                    startGame
                );
            }

            if (
                buttons.confirm
            ) {
                buttons.confirm.addEventListener(
                    "click",
                    confirmGuess
                );
            }

            if (
                buttons.next
            ) {
                buttons.next.addEventListener(
                    "click",
                    nextRound
                );
            }

            if (
                buttons.finishEarly
            ) {
                buttons.finishEarly.addEventListener(
                    "click",
                    handleFinishEarly
                );
            }

            if (
                buttons.playAgain
            ) {
                buttons.playAgain.addEventListener(
                    "click",
                    startGame
                );
            }

            if (
                buttons.share
            ) {
                buttons.share.addEventListener(
                    "click",
                    shareResults
                );
            }

            if (
                buttons.closeModal
            ) {
                buttons.closeModal.addEventListener(
                    "click",
                    () => {

                        if (
                            panels.shareModal
                        ) {
                            panels.shareModal.classList.add(
                                "hidden"
                            );
                        }
                    }
                );
            }

            if (
                buttons.submitScore
            ) {
                buttons.submitScore.addEventListener(
                    "click",
                    showSubmitModal
                );
            }

            if (
                buttons.viewLeaderboard
            ) {
                buttons.viewLeaderboard.addEventListener(
                    "click",
                    showLeaderboard
                );
            }

            if (
                buttons.closeSubmitModal
            ) {
                buttons.closeSubmitModal.addEventListener(
                    "click",
                    () => {

                        if (
                            panels.submitModal
                        ) {
                            panels.submitModal.classList.add(
                                "hidden"
                            );
                        }

                        if (
                            $("survey-iframe")
                        ) {
                            $("survey-iframe").src =
                                "";
                        }
                    }
                );
            }

            if (
                buttons.closeLeaderboardModal
            ) {
                buttons.closeLeaderboardModal.addEventListener(
                    "click",
                    () => {

                        if (
                            panels.leaderboardModal
                        ) {
                            panels.leaderboardModal.classList.add(
                                "hidden"
                            );
                        }
                    }
                );
            }

            /* =================================================================
             * START
             * ================================================================= */

            applyStaticConfig();

            updateUI();

            init();

            /* =================================================================
             * DEBUG / TEST
             * ================================================================= */

            window.skipToResults =
                () => {

                    console.log(
                        "Skipping to results with a random score."
                    );

                    if (
                        allLandmarks.length === 0
                    ) {
                        allLandmarks =
                            new Array(
                                5
                            ).fill(1);
                    }

                    totalScore =
                        Math.floor(
                            Math.random() *
                            (
                                allLandmarks.length *
                                8
                            )
                        ) +
                        10;

                    accuracyTracker =
                        allLandmarks.map(
                            () =>
                                Math.random() > 0.5
                                    ? 1
                                    : 0
                        );

                    endGame();
                };
        }
    );
