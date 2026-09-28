/* =============================================================================
 * ArcGIGuess — Main Script
 * =============================================================================
 * Pazudusī Latvija — Atrodi vietu kartē
 * ========================================================================== */

$arcgis.import([
    "@arcgis/core/config.js",
    "@arcgis/core/WebMap.js",
    "@arcgis/core/Graphic.js",
    "@arcgis/core/request.js",
    "@arcgis/core/geometry/operators/distanceOperator.js",
    "@arcgis/core/Basemap.js",
])
.then(
    async ([
        esriConfig,
        WebMap,
        Graphic,
        esriRequest,
        distanceOperator,
        Basemap,
    ]) => {

        /* =========================================================================
         * CONFIG
         * ========================================================================= */

        const CONFIG =
            window.ARCGIGUESS_CONFIG || {};

        const LEADERBOARD =
            CONFIG.leaderboard || {};

        const lang =
            CONFIG.languages?.[0] || {};

        const strings =
            lang.strings || {};

        /* =========================================================================
         * DOM
         * ========================================================================= */

        const mapEl =
            document.querySelector("arcgis-map");

        if (!mapEl) {

            console.error(
                "arcgis-map elements was not found."
            );

            return;
        }

        const startButton =
            document.querySelector("#start-button");

        const confirmButton =
            document.querySelector("#confirm-button");

        const nextButton =
            document.querySelector("#next-button");

        const finishEarlyButton =
            document.querySelector("#finish-early-button");

        const gameOverButton =
            document.querySelector("#game-over-button");

        const playAgainButton =
            document.querySelector("#play-again-button");

        const shareButton =
            document.querySelector("#share-button");

        const submitScoreButton =
            document.querySelector("#submit-score-button");

        const viewLeaderboardButton =
            document.querySelector("#view-leaderboard-button");

        const landmarkNameEl =
            document.querySelector("#landmark-name");

        const landmarkImageEl =
            document.querySelector("#landmark-image");

        const scoreEl =
            document.querySelector("#score");

        const roundEl =
            document.querySelector("#round");

        const resultTitleEl =
            document.querySelector("#result-title");

        const resultMessageEl =
            document.querySelector("#result-message");

        const finalScoreEl =
            document.querySelector("#final-score");

        const accuracyEl =
            document.querySelector("#accuracy");

        const foundEl =
            document.querySelector("#found");

        const welcomePanel =
            document.querySelector("#welcome-panel");

        const gamePanel =
            document.querySelector("#game-panel");

        const resultPanel =
            document.querySelector("#result-panel");

        const gameOverPanel =
            document.querySelector("#game-over-panel");

        const submitModal =
            document.querySelector("#submit-modal");

        const leaderboardModal =
            document.querySelector("#leaderboard-modal");

        const submitFrame =
            document.querySelector("#submit-frame");

        const leaderboardBody =
            document.querySelector("#leaderboard-body");

        const shareModal =
            document.querySelector("#share-modal");

        const shareImage =
            document.querySelector("#share-image");

        const languageButton =
            document.querySelector("#language-button");

        /* =========================================================================
         * GAME STATE
         * ========================================================================= */

        let webmap = null;

        let landmarksLayer = null;

        let landmarkPool = [];

        let allLandmarks = [];

        let currentLandmark = null;

        let currentGuessGraphic = null;

        let currentResultGraphic = null;

        let currentRoundIndex = 0;

        let totalScore = 0;

        let totalDistance = 0;

        let foundCount = 0;

        let gameStarted = false;

        let finishEarlyConfirm = false;

        /* =========================================================================
         * BASEMAP SETTINGS
         * ========================================================================= */

        /*
         * Zoom < 17
         *      ↓
         * OpenStreetMap
         *
         * Zoom >= 17
         *      ↓
         * World Imagery + reference information
         *
         * "hybrid" = satellite imagery + labels / roads / places
         */

        const IMAGERY_ZOOM = 17;

        let currentBasemapType = null;

        let basemapSwitchingReady = false;

        /* =========================================================================
         * PIN
         * ========================================================================= */

        const PIN_URL =
            "./assets/pin.svg";

        const PIN_WIDTH = 28;

        const PIN_HEIGHT = 42;

        /* =========================================================================
         * TRANSLATION
         * ========================================================================= */

        function t(
            key,
            replacements = {}
        ) {

            let text =
                strings[key] ?? key;

            Object.entries(
                replacements
            ).forEach(
                ([key, value]) => {

                    text =
                        text.replace(
                            new RegExp(
                                `\\{${key}\\}`,
                                "g"
                            ),
                            value
                        );
                }
            );

            return text;
        }

        /* =========================================================================
         * SCORING SUMMARY
         * ========================================================================= */

        function buildScoringSummary() {

            return t(
                "scoringSummaryTemplate",
                {
                    bucket:
                        CONFIG.scoring?.bucketMeters ??
                        500,

                    points:
                        CONFIG.scoring?.pointsForHit ??
                        10,

                    penalty:
                        CONFIG.scoring?.penaltyPerBucket ??
                        1,

                    min:
                        CONFIG.scoring?.minScore ??
                        0,
                }
            );
        }

        /* =========================================================================
         * SCORE CALCULATION
         * ========================================================================= */

        function calculateScore(
            distance
        ) {

            const scoring =
                CONFIG.scoring || {};

            const pointsForHit =
                Number(
                    scoring.pointsForHit ?? 10
                );

            const bucketMeters =
                Number(
                    scoring.bucketMeters ?? 500
                );

            const penaltyPerBucket =
                Number(
                    scoring.penaltyPerBucket ?? 1
                );

            const minScore =
                Number(
                    scoring.minScore ?? 0
                );

            if (
                distance <= bucketMeters
            ) {

                return pointsForHit;
            }

            const buckets =
                Math.floor(
                    distance /
                    bucketMeters
                );

            const score =
                pointsForHit -
                buckets *
                penaltyPerBucket;

            return Math.max(
                minScore,
                score
            );
        }

        function isDirectHit(
            distance
        ) {

            const bucketMeters =
                Number(
                    CONFIG.scoring?.bucketMeters ??
                    500
                );

            return (
                distance <=
                bucketMeters
            );
        }

        /* =========================================================================
         * OPENSTREETMAP BASEMAP
         * ========================================================================= */

        async function setOpenStreetMap() {

            if (
                !mapEl ||
                !mapEl.map
            ) {

                return;
            }

            try {

                const basemap =
                    Basemap.fromId("osm");

                if (!basemap) {

                    console.error(
                        "OpenStreetMap basemap could not be created."
                    );

                    return;
                }

                await basemap.load();

                mapEl.map.basemap =
                    basemap;

                currentBasemapType =
                    "osm";

                console.log(
                    "BASEMAP → OpenStreetMap"
                );

            } catch (error) {

                console.error(
                    "OpenStreetMap basemap error:",
                    error
                );
            }
        }

        /* =========================================================================
         * HYBRID BASEMAP
         * ========================================================================= */

        async function setHybridBasemap() {

            if (
                !mapEl ||
                !mapEl.map
            ) {

                return;
            }

            try {

                /*
                 * Hybrid =
                 * World Imagery +
                 * reference information.
                 */

                const basemap =
                    Basemap.fromId("hybrid");

                if (!basemap) {

                    console.error(
                        "Hybrid basemap could not be created."
                    );

                    return;
                }

                await basemap.load();

                mapEl.map.basemap =
                    basemap;

                currentBasemapType =
                    "hybrid";

                console.log(
                    "BASEMAP → Satellite + information"
                );

            } catch (error) {

                console.error(
                    "Hybrid basemap error:",
                    error
                );
            }
        }

        /* =========================================================================
         * BASEMAP SWITCHING
         * ========================================================================= */

        async function updateBasemapForZoom(
            zoom
        ) {

            if (!basemapSwitchingReady) {

                return;
            }

            if (
                typeof zoom !== "number"
            ) {

                return;
            }

            /*
             * Tuvāk:
             * Hybrid / Satellite + labels
             */

            if (
                zoom >= IMAGERY_ZOOM
            ) {

                if (
                    currentBasemapType !==
                    "hybrid"
                ) {

                    await setHybridBasemap();
                }

                return;
            }

            /*
             * Tālāk:
             * OSM
             */

            if (
                currentBasemapType !==
                "osm"
            ) {

                await setOpenStreetMap();
            }
        }

        /* =========================================================================
         * SETUP BASEMAP SWITCHING
         * ========================================================================= */

        async function setupBasemapSwitching() {

            try {

                /*
                 * Sākumā OSM.
                 */

                await setOpenStreetMap();

                await mapEl.viewOnReady();

                const view =
                    mapEl.view;

                if (!view) {

                    throw new Error(
                        "MapView was not found."
                    );
                }

                basemapSwitchingReady =
                    true;

                /*
                 * Iestata pareizo basemap
                 * pēc pašreizējā zoom.
                 */

                await updateBasemapForZoom(
                    view.zoom
                );

                /*
                 * Automātiska pārslēgšana.
                 */

                view.watch(
                    "zoom",
                    async (zoom) => {

                        await updateBasemapForZoom(
                            zoom
                        );
                    }
                );

                console.log(
                    "Basemap switching enabled."
                );

            } catch (error) {

                console.error(
                    "Basemap switching setup error:",
                    error
                );
            }
        }

        /* =========================================================================
         * PIN SYMBOL
         * ========================================================================= */

        function getPinSymbol() {

            return {

                type: "picture-marker",

                url: PIN_URL,

                width:
                    `${PIN_WIDTH}px`,

                height:
                    `${PIN_HEIGHT}px`,

                yoffset:
                    `${PIN_HEIGHT / 2}px`
            };
        }

        /* =========================================================================
         * RESULT SYMBOL
         * ========================================================================= */

        function getResultSymbol(
            correct
        ) {

            if (correct) {

                return {

                    type: "simple-marker",

                    style: "circle",

                    color: [
                        0,
                        170,
                        90,
                        0.9
                    ],

                    size: "16px",

                    outline: {

                        color: [
                            255,
                            255,
                            255,
                            1
                        ],

                        width: 2
                    }
                };
            }

            return {

                type: "simple-marker",

                style: "circle",

                color: [
                    210,
                    40,
                    40,
                    0.9
                ],

                size: "16px",

                outline: {

                    color: [
                        255,
                        255,
                        255,
                        1
                    ],

                    width: 2
                }
            };
        }

        /* =========================================================================
         * UI
         * ========================================================================= */

        function updateUI() {

            if (scoreEl) {

                scoreEl.textContent =
                    t(
                        "scoreDisplay",
                        {
                            score:
                                totalScore
                        }
                    );
            }

            if (roundEl) {

                roundEl.textContent =
                    t(
                        "roundDisplay",
                        {
                            current:
                                currentRoundIndex + 1,

                            total:
                                landmarkPool.length
                        }
                    );
            }
        }

        function showPanel(
            panel
        ) {

            [
                welcomePanel,
                gamePanel,
                resultPanel,
                gameOverPanel
            ].forEach(
                (element) => {

                    if (!element) {

                        return;
                    }

                    element.hidden =
                        element !== panel;
                }
            );
        }

        /* =========================================================================
         * LANDMARK HELPERS
         * ========================================================================= */

        function getLandmarkName(
            feature
        ) {

            if (!feature) {

                return "";
            }

            const field =
                lang.landmarkNameField ||
                "Name";

            return (
                feature.attributes?.[field] ||
                "Nezināma vieta"
            );
        }

        function getLandmarkPhoto(
            feature
        ) {

            if (!feature) {

                return "";
            }

            const photoField =
                CONFIG.landmarkPhotoField ||
                "Photo";

            return (
                feature.attributes?.[
                    photoField
                ] || ""
            );
        }

        function getTargetGeometry(
            feature
        ) {

            return (
                feature?.geometry ||
                null
            );
        }

        /* =========================================================================
         * SHUFFLE
         * ========================================================================= */

        function shuffleArray(
            array
        ) {

            const result =
                [...array];

            for (
                let i =
                    result.length - 1;
                i > 0;
                i--
            ) {

                const j =
                    Math.floor(
                        Math.random() *
                        (i + 1)
                    );

                [
                    result[i],
                    result[j]
                ] = [
                    result[j],
                    result[i]
                ];
            }

            return result;
        }

        /* =========================================================================
         * LOAD LANDMARK DATA
         * ========================================================================= */

        async function loadGameData() {

            if (!landmarksLayer) {

                throw new Error(
                    "Landmark layer nav atrasts."
                );
            }

            console.log(
                "===================================="
            );

            console.log(
                "LANDMARK DATA"
            );

            console.log(
                "Layer:",
                landmarksLayer.title
            );

            console.log(
                "Layer type:",
                landmarksLayer.type
            );

            console.log(
                "===================================="
            );

            /*
             * Ielādējam pašu slāni.
             */

            await landmarksLayer.load();

            /*
             * Pārbaudām, vai slānis var veikt query.
             */

            if (
                typeof landmarksLayer.queryFeatures !==
                "function"
            ) {

                throw new Error(
                    `Slānis "${landmarksLayer.title}" neatbalsta queryFeatures().`
                );
            }

            const query =
                landmarksLayer.createQuery();

            query.where =
                "1=1";

            query.outFields =
                ["*"];

            query.returnGeometry =
                true;

            console.log(
                "Querying landmark features..."
            );

            /*
             * Pieprasām visus objektus.
             */

            const result =
                await landmarksLayer.queryFeatures(
                    query
                );

            console.log(
                "Query completed."
            );

            console.log(
                "Returned features:",
                result?.features?.length
            );

            if (
                !result ||
                !Array.isArray(
                    result.features
                )
            ) {

                throw new Error(
                    "Slānis neatgrieza FeatureSet."
                );
            }

            /*
             * Saglabājam tikai objektus,
             * kuriem ir ģeometrija.
             */

            const features =
                result.features.filter(
                    (feature) =>
                        feature.geometry
                );

            console.log(
                "Features with geometry:",
                features.length
            );

            if (
                features.length === 0
            ) {

                throw new Error(
                    "Slānī nav neviena objekta ar ģeometriju."
                );
            }

            /*
             * Foto.
             */

            const photoField =
                CONFIG.landmarkPhotoField ||
                "Photo";

            console.log(
                "Photo field:",
                photoField
            );

            features.forEach(
                (feature) => {

                    feature.attributes.imageUrl =
                        feature.attributes[
                            photoField
                        ] || "";
                }
            );

            /*
             * Saglabājam visas vietas.
             */

            allLandmarks =
                features;

            /*
             * Sajaucam vietas.
             */

            if (
                CONFIG.shuffleLandmarks !== false
            ) {

                landmarkPool =
                    shuffleArray(
                        allLandmarks
                    );

            } else {

                landmarkPool =
                    [
                        ...allLandmarks
                    ];
            }

            /*
             * Kārtu skaits.
             */

            const rounds =
                Number(
                    CONFIG.roundsPerGame
                );

            if (
                Number.isFinite(rounds) &&
                rounds > 0
            ) {

                landmarkPool =
                    landmarkPool.slice(
                        0,
                        rounds
                    );
            }

            console.log(
                "Final landmark pool:",
                landmarkPool.length
            );
        }

        /* =========================================================================
         * START GAME
         * ========================================================================= */

        async function startGame() {

            totalScore = 0;

            totalDistance = 0;

            foundCount = 0;

            currentRoundIndex = 0;

            finishEarlyConfirm =
                false;

            gameStarted =
                true;

            if (
                CONFIG.shuffleLandmarks !== false
            ) {

                landmarkPool =
                    shuffleArray(
                        allLandmarks
                    );

            } else {

                landmarkPool =
                    [
                        ...allLandmarks
                    ];
            }

            const rounds =
                Number(
                    CONFIG.roundsPerGame
                );

            if (
                Number.isFinite(rounds) &&
                rounds > 0
            ) {

                landmarkPool =
                    landmarkPool.slice(
                        0,
                        rounds
                    );
            }

            updateUI();

            await startRound();
        }

        /* =========================================================================
         * START ROUND
         * ========================================================================= */

        async function startRound() {

            if (
                currentRoundIndex >=
                landmarkPool.length
            ) {

                endGame();

                return;
            }

            currentLandmark =
                landmarkPool[
                    currentRoundIndex
                ];

            currentGuessGraphic =
                null;

            if (
                currentResultGraphic
            ) {

                mapEl.graphics.remove(
                    currentResultGraphic
                );

                currentResultGraphic =
                    null;
            }

            mapEl.graphics.removeAll();

            const name =
                getLandmarkName(
                    currentLandmark
                );

            const photo =
                getLandmarkPhoto(
                    currentLandmark
                );

            if (landmarkNameEl) {

                landmarkNameEl.textContent =
                    name;
            }

            if (landmarkImageEl) {

                if (photo) {

                    landmarkImageEl.src =
                        photo;

                    landmarkImageEl.hidden =
                        false;

                } else {

                    landmarkImageEl.hidden =
                        true;
                }
            }

            if (confirmButton) {

                confirmButton.disabled =
                    true;
            }

            updateUI();

            showPanel(
                gamePanel
            );

            /*
             * Pārvietojam karti uz Latvijas
             * sākuma skatījumu.
             *
             * Šeit NEiestatām basemap.
             */

            try {

                await mapEl.goTo(
                    {
                        center:
                            [
                                24.6032,
                                56.8796
                            ],

                        zoom: 7
                    },
                    {
                        duration: 700
                    }
                );

            } catch (error) {

                console.warn(
                    "Could not move map:",
                    error
                );
            }
        }

        /* =========================================================================
         * MAP CLICK
         * ========================================================================= */

        function handleMapClick(
            event
        ) {

            if (
                !gameStarted ||
                !currentLandmark
            ) {

                return;
            }

            const point =
                event.mapPoint;

            if (!point) {

                return;
            }

            if (
                currentGuessGraphic
            ) {

                mapEl.graphics.remove(
                    currentGuessGraphic
                );
            }

            currentGuessGraphic =
                new Graphic(
                    {
                        geometry:
                            point,

                        symbol:
                            getPinSymbol()
                    }
                );

            mapEl.graphics.add(
                currentGuessGraphic
            );

            if (confirmButton) {

                confirmButton.disabled =
                    false;
            }
        }

        /* =========================================================================
         * CONFIRM GUESS
         * ========================================================================= */

        async function confirmGuess() {

            if (
                !currentLandmark ||
                !currentGuessGraphic
            ) {

                return;
            }

            const guessPoint =
                currentGuessGraphic.geometry;

            const targetGeometry =
                getTargetGeometry(
                    currentLandmark
                );

            if (!targetGeometry) {

                return;
            }

            let distance;

            try {

                distance =
                    distanceOperator.execute(
                        targetGeometry,
                        guessPoint,
                        {
                            unit: "meters"
                        }
                    );

            } catch (error) {

                console.error(
                    "Distance calculation failed:",
                    error
                );

                return;
            }

            if (
                typeof distance !==
                "number"
            ) {

                return;
            }

            const roundScore =
                calculateScore(
                    distance
                );

            totalScore +=
                roundScore;

            totalDistance +=
                distance;

            foundCount++;

            const correct =
                isDirectHit(
                    distance
                );

            currentResultGraphic =
                new Graphic(
                    {
                        geometry:
                            targetGeometry,

                        symbol:
                            getResultSymbol(
                                correct
                            )
                    }
                );

            mapEl.graphics.add(
                currentResultGraphic
            );

            if (resultTitleEl) {

                resultTitleEl.innerHTML =
                    correct
                        ? t("correctTitle")
                        : t("incorrectTitle");
            }

            if (resultMessageEl) {

                if (correct) {

                    resultMessageEl.innerHTML =
                        t(
                            "correctMessage",
                            {
                                roundScore:
                                    roundScore
                            }
                        );

                } else {

                    resultMessageEl.innerHTML =
                        t(
                            "incorrectMessage",
                            {
                                distance:
                                    Math.round(
                                        distance
                                    ),

                                roundScore:
                                    roundScore
                            }
                        );
                }
            }

            updateUI();

            if (confirmButton) {

                confirmButton.disabled =
                    true;
            }

            showPanel(
                resultPanel
            );

            /*
             * Pietuvojamies pareizajai vietai.
             */

            try {

                await mapEl.goTo(
                    {
                        target:
                            targetGeometry,

                        zoom:
                            IMAGERY_ZOOM
                    },
                    {
                        duration:
                            800
                    }
                );

            } catch (error) {

                console.warn(
                    "Could not zoom to correct location:",
                    error
                );
            }
        }

        /* =========================================================================
         * NEXT ROUND
         * ========================================================================= */

        async function nextRound() {

            currentRoundIndex++;

            finishEarlyConfirm =
                false;

            if (
                currentRoundIndex >=
                landmarkPool.length
            ) {

                endGame();

                return;
            }

            await startRound();
        }

        /* =========================================================================
         * FINISH EARLY
         * ========================================================================= */

        function finishEarly() {

            if (
                !CONFIG.allowFinishEarly
            ) {

                return;
            }

            if (!finishEarlyConfirm) {

                finishEarlyConfirm =
                    true;

                if (
                    finishEarlyButton
                ) {

                    finishEarlyButton.textContent =
                        t(
                            "finishEarlyConfirm"
                        );
                }

                setTimeout(
                    () => {

                        finishEarlyConfirm =
                            false;

                        if (
                            finishEarlyButton
                        ) {

                            finishEarlyButton.textContent =
                                t(
                                    "finishEarlyButton"
                                );
                        }

                    },
                    2500
                );

                return;
            }

            endGame();
        }

        /* =========================================================================
         * END GAME
         * ========================================================================= */

        function endGame() {

            gameStarted =
                false;

            const total =
                landmarkPool.length;

            const accuracy =
                total > 0
                    ? (
                        foundCount /
                        total
                    ) * 100
                    : 0;

            if (finalScoreEl) {

                finalScoreEl.textContent =
                    totalScore;
            }

            if (accuracyEl) {

                accuracyEl.textContent =
                    `${Math.round(
                        accuracy
                    )}%`;
            }

            if (foundEl) {

                foundEl.textContent =
                    `${foundCount}/${total}`;
            }

            showPanel(
                gameOverPanel
            );
        }

        /* =========================================================================
         * SHARE
         * ========================================================================= */

        async function shareResults() {

            const social =
                CONFIG.social || {};

            const appName =
                CONFIG.appName ||
                "ArcGIGuess";

            const url =
                social.url ||
                window.location.href;

            const shareText =
                t(
                    "shareText",
                    {
                        score:
                            totalScore,

                        appName:
                            appName,

                        url:
                            url
                    }
                );

            if (
                navigator.share
            ) {

                try {

                    await navigator.share(
                        {
                            title:
                                social.title ||
                                appName,

                            text:
                                shareText,

                            url:
                                url
                        }
                    );

                    return;

                } catch (error) {

                    console.log(
                        "Share cancelled.",
                        error
                    );
                }
            }

            try {

                await navigator.clipboard.writeText(
                    shareText
                );

                alert(
                    "Rezultāta teksts ir nokopēts!"
                );

            } catch (error) {

                alert(
                    shareText
                );
            }
        }

        /* =========================================================================
         * SUBMIT SCORE
         * ========================================================================= */

        function showSubmitModal() {

            if (
                !submitModal ||
                !submitFrame
            ) {

                return;
            }

            if (
                !LEADERBOARD.survey123Url
            ) {

                console.error(
                    "Survey123 URL is not configured."
                );

                return;
            }

            const fieldId =
                LEADERBOARD.submitScoreFieldId ||
                "field:score";

            const separator =
                LEADERBOARD.survey123Url.includes("?")
                    ? "&"
                    : "?";

            let url =
                `${LEADERBOARD.survey123Url}` +
                `${separator}` +
                `${fieldId}` +
                `=${encodeURIComponent(
                    totalScore
                )}`;

            url +=
                "&hide=navbar,header,description,footer";

            if (
                lang.surveyLang
            ) {

                url +=
                    `&lang=${encodeURIComponent(
                        lang.surveyLang
                    )}`;
            }

            submitFrame.src =
                url;

            submitModal.hidden =
                false;
        }

        /* =========================================================================
         * LEADERBOARD
         * ========================================================================= */

        async function fetchLeaderboardData() {

            if (
                !LEADERBOARD.dataApiUrl
            ) {

                throw new Error(
                    "Leaderboard data API URL is not configured."
                );
            }

            const firstNameField =
                LEADERBOARD.firstNameField ||
                "first_name";

            const lastNameField =
                LEADERBOARD.lastNameField ||
                "last_name";

            const scoreField =
                LEADERBOARD.scoreField ||
                "score";

            const params = {

                f: "json",

                where: "1=1",

                outFields:
                    [
                        firstNameField,
                        lastNameField,
                        scoreField
                    ].join(","),

                orderByFields:
                    `${scoreField} DESC`,

                resultRecordCount:
                    LEADERBOARD.topN ||
                    10,

                returnGeometry:
                    false
            };

            const response =
                await esriRequest(
                    LEADERBOARD.dataApiUrl,
                    {
                        query:
                            params,

                        responseType:
                            "json"
                    }
                );

            return (
                response.data?.features ||
                []
            );
        }

        function populateLeaderboard(
            features
        ) {

            if (!leaderboardBody) {

                return;
            }

            leaderboardBody.innerHTML =
                "";

            if (
                !features ||
                features.length === 0
            ) {

                const row =
                    document.createElement(
                        "tr"
                    );

                const cell =
                    document.createElement(
                        "td"
                    );

                cell.colSpan =
                    3;

                cell.textContent =
                    t("noScores");

                row.appendChild(
                    cell
                );

                leaderboardBody.appendChild(
                    row
                );

                return;
            }

            const firstNameField =
                LEADERBOARD.firstNameField ||
                "first_name";

            const lastNameField =
                LEADERBOARD.lastNameField ||
                "last_name";

            const scoreField =
                LEADERBOARD.scoreField ||
                "score";

            features.forEach(
                (
                    feature,
                    index
                ) => {

                    const attributes =
                        feature.attributes ||
                        {};

                    const row =
                        document.createElement(
                            "tr"
                        );

                    const rank =
                        document.createElement(
                            "td"
                        );

                    const name =
                        document.createElement(
                            "td"
                        );

                    const score =
                        document.createElement(
                            "td"
                        );

                    rank.textContent =
                        index + 1;

                    name.textContent =
                        [
                            attributes[
                                firstNameField
                            ],

                            attributes[
                                lastNameField
                            ]
                        ]
                        .filter(
                            Boolean
                        )
                        .join(" ") ||
                        "Anonīms";

                    score.textContent =
                        attributes[
                            scoreField
                        ] ?? 0;

                    row.appendChild(
                        rank
                    );

                    row.appendChild(
                        name
                    );

                    row.appendChild(
                        score
                    );

                    leaderboardBody.appendChild(
                        row
                    );
                }
            );
        }

        async function showLeaderboard() {

            if (!leaderboardModal) {

                return;
            }

            leaderboardModal.hidden =
                false;

            if (leaderboardBody) {

                leaderboardBody.innerHTML =
                    `<tr>
                        <td colspan="3">
                            ${t(
                                "leaderboardLoadingText"
                            )}
                        </td>
                    </tr>`;
            }

            try {

                const features =
                    await fetchLeaderboardData();

                populateLeaderboard(
                    features
                );

            } catch (error) {

                console.error(
                    "Leaderboard error:",
                    error
                );

                if (
                    leaderboardBody
                ) {

                    leaderboardBody.innerHTML =
                        `<tr>
                            <td colspan="3">
                                ${t(
                                    "leaderboardError"
                                )}
                            </td>
                        </tr>`;
                }
            }
        }

        /* =========================================================================
         * MODALS
         * ========================================================================= */

        function closeModal(
            modal
        ) {

            if (modal) {

                modal.hidden =
                    true;
            }
        }

        /* =========================================================================
         * LANGUAGE
         * ========================================================================= */

        function toggleLanguage() {

            console.log(
                "Only Latvian language is configured."
            );
        }

        /* =========================================================================
         * STATIC CONFIG
         * ========================================================================= */

        function applyStaticConfig() {

            document.title =
                CONFIG.appName ||
                document.title;

            document
                .querySelectorAll(
                    "[data-config='appName']"
                )
                .forEach(
                    (element) => {

                        element.textContent =
                            CONFIG.appName ||
                            "";
                    }
                );

            document
                .querySelectorAll(
                    "[data-config='tagline']"
                )
                .forEach(
                    (element) => {

                        element.textContent =
                            CONFIG.tagline ||
                            "";
                    }
                );

            document
                .querySelectorAll(
                    "[data-scoring-summary]"
                )
                .forEach(
                    (element) => {

                        element.innerHTML =
                            buildScoringSummary();
                    }
                );

            if (startButton) {

                startButton.textContent =
                    t("startButton");
            }

            if (confirmButton) {

                confirmButton.textContent =
                    t("confirmButton");
            }

            if (nextButton) {

                nextButton.textContent =
                    t("nextButton");
            }

            if (finishEarlyButton) {

                finishEarlyButton.textContent =
                    t("finishEarlyButton");
            }

            if (gameOverButton) {

                gameOverButton.textContent =
                    t("gameOverButton");
            }

            if (playAgainButton) {

                playAgainButton.textContent =
                    t("playAgainButton");
            }

            if (shareButton) {

                shareButton.textContent =
                    t("shareButton");
            }

            if (submitScoreButton) {

                submitScoreButton.textContent =
                    t("submitScoreButton");
            }

            if (viewLeaderboardButton) {

                viewLeaderboardButton.textContent =
                    t("viewLeaderboardButton");
            }
        }

        /* =========================================================================
         * INIT
         * ========================================================================= */

        async function init() {

            try {

                console.log(
                    "===================================="
                );

                console.log(
                    "ArcGIGuess starting..."
                );

                console.log(
                    "WebMap ID:",
                    CONFIG.webMapItemId
                );

                console.log(
                    "Landmark layer:",
                    CONFIG.landmarkLayerTitle
                );

                console.log(
                    "===================================="
                );

                /* ================================================================
                 * PORTAL
                 * ================================================================ */

                if (
                    CONFIG.portalUrl
                ) {

                    esriConfig.portalUrl =
                        CONFIG.portalUrl;
                }

                /* ================================================================
                 * WEBMAP
                 * ================================================================ */

                if (
                    !CONFIG.webMapItemId
                ) {

                    throw new Error(
                        "webMapItemId nav norādīts config.js."
                    );
                }

                webmap =
                    new WebMap(
                        {
                            portalItem:
                                {
                                    id:
                                        CONFIG.webMapItemId
                                }
                        }
                    );

                mapEl.map =
                    webmap;

                console.log(
                    "Loading WebMap..."
                );

                await webmap.load();

                console.log(
                    "WebMap loaded successfully."
                );

                /* ================================================================
                 * LIST LAYERS
                 * ================================================================ */

                console.log(
                    "===================================="
                );

                console.log(
                    "WEBMAP LAYERS:"
                );

                webmap.layers.forEach(
                    (layer) => {

                        console.log(
                            "Layer:",
                            layer.title,
                            "| type:",
                            layer.type
                        );
                    }
                );

                console.log(
                    "===================================="
                );

                /* ================================================================
                 * FIND LANDMARK LAYER
                 * ================================================================ */

                const landmarkLayerTitle =
                    CONFIG.landmarkLayerTitle ||
                    "Vietas";

                landmarksLayer =
                    webmap.layers.find(
                        (layer) =>
                            layer.title ===
                            landmarkLayerTitle
                    );

                if (!landmarksLayer) {

                    console.error(
                        `Slānis "${landmarkLayerTitle}" netika atrasts.`
                    );

                    console.error(
                        "Pieejamie slāņi:"
                    );

                    webmap.layers.forEach(
                        (layer) => {

                            console.error(
                                layer.title
                            );
                        }
                    );

                    throw new Error(
                        `Slānis "${landmarkLayerTitle}" netika atrasts WebMap.`
                    );
                }

                console.log(
                    "Landmark layer found:",
                    landmarksLayer.title
                );

                /* ================================================================
                 * HIDE LANDMARK LAYER
                 * ================================================================ */

                landmarksLayer.visible =
                    false;

                /* ================================================================
                 * MAP VIEW
                 * ================================================================ */

                await mapEl.viewOnReady();

                console.log(
                    "MapView ready."
                );

                /* ================================================================
                 * BASEMAP
                 * ================================================================ */

                await setupBasemapSwitching();

                /* ================================================================
                 * LANDMARK DATA
                 * ================================================================ */

                console.log(
                    "Loading landmark data..."
                );

                await loadGameData();

                console.log(
                    "Landmark data loaded successfully."
                );

                /* ================================================================
                 * UI
                 * ================================================================ */

                applyStaticConfig();

                updateUI();

                showPanel(
                    welcomePanel
                );

                console.log(
                    "===================================="
                );

                console.log(
                    "ArcGIGuess initialized successfully."
                );

                console.log(
                    "===================================="
                );

            } catch (error) {

                console.error(
                    "===================================="
                );

                console.error(
                    "ArcGIGuess initialization error:"
                );

                console.error(
                    error
                );

                console.error(
                    "===================================="
                );

                alert(
                    "Neizdevās ielādēt spēles datus.\n\n" +
                    "Atver F12 → Console, lai redzētu precīzu kļūdu."
                );
            }
        }

        /* =========================================================================
         * EVENTS
         * ========================================================================= */

        mapEl.addEventListener(
            "arcgisViewClick",
            (event) => {

                handleMapClick(
                    event
                );
            }
        );

        if (startButton) {

            startButton.addEventListener(
                "click",
                startGame
            );
        }

        if (confirmButton) {

            confirmButton.addEventListener(
                "click",
                confirmGuess
            );
        }

        if (nextButton) {

            nextButton.addEventListener(
                "click",
                nextRound
            );
        }

        if (finishEarlyButton) {

            finishEarlyButton.addEventListener(
                "click",
                finishEarly
            );
        }

        if (gameOverButton) {

            gameOverButton.addEventListener(
                "click",
                endGame
            );
        }

        if (playAgainButton) {

            playAgainButton.addEventListener(
                "click",
                startGame
            );
        }

        if (shareButton) {

            shareButton.addEventListener(
                "click",
                shareResults
            );
        }

        if (submitScoreButton) {

            submitScoreButton.addEventListener(
                "click",
                showSubmitModal
            );
        }

        if (viewLeaderboardButton) {

            viewLeaderboardButton.addEventListener(
                "click",
                showLeaderboard
            );
        }

        if (languageButton) {

            languageButton.addEventListener(
                "click",
                toggleLanguage
            );
        }

        document
            .querySelectorAll(
                "[data-close-submit-modal]"
            )
            .forEach(
                (button) => {

                    button.addEventListener(
                        "click",
                        () => {

                            closeModal(
                                submitModal
                            );
                        }
                    );
                }
            );

        document
            .querySelectorAll(
                "[data-close-leaderboard-modal]"
            )
            .forEach(
                (button) => {

                    button.addEventListener(
                        "click",
                        () => {

                            closeModal(
                                leaderboardModal
                            );
                        }
                    );
                }
            );

        document
            .querySelectorAll(
                "[data-close-share-modal]"
            )
            .forEach(
                (button) => {

                    button.addEventListener(
                        "click",
                        () => {

                            closeModal(
                                shareModal
                            );
                        }
                    );
                }
            );

        /* =========================================================================
         * START
         * ========================================================================= */

        applyStaticConfig();

        updateUI();

        await init();

        /* =========================================================================
         * DEBUG
         * ========================================================================= */

        window.skipToResults =
            function () {

                endGame();

            };

        window.arcgisGuess =
            {

                startGame,

                startRound,

                endGame,

                setOpenStreetMap,

                setHybridBasemap,

                updateBasemapForZoom
            };
    }
)
.catch(
    (error) => {

        console.error(
            "Failed to load ArcGIS modules:",
            error
        );

        alert(
            "Neizdevās ielādēt ArcGIS komponentes."
        );
    }
);
