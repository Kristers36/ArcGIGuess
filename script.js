/* =============================================================================
 * ArcGIGuess — Main Script
 * =============================================================================
 * Pazudusī Latvija — Atrodi vietu kartē
 * ============================================================================= */

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
         * DOM ELEMENTS
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
         * Zoom < 17:
         * OpenStreetMap
         *
         * Zoom >= 17:
         * ArcGIS Online World Imagery + labels / streets
         *
         * "hybrid" = satellite imagery + reference information.
         */

        const IMAGERY_ZOOM = 17;

        let currentBasemapType = null;

        let basemapSwitchingReady = false;

        /* =========================================================================
         * PIN SETTINGS
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
         * SCORING
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
                distance <=
                bucketMeters
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
         * BASEMAP — OPENSTREETMAP
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
                    Basemap.fromId(
                        "osm"
                    );

                if (!basemap) {

                    console.error(
                        "OpenStreetMap basemap could not be created."
                    );

                    return;
                }

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
         * BASEMAP — SATELLITE + INFORMATION
         * ========================================================================= */

        async function setWorldImagery() {

            if (
                !mapEl ||
                !mapEl.map
            ) {

                return;
            }

            try {

                /*
                 * "hybrid" = World Imagery +
                 * Hybrid Reference Layer.
                 *
                 * Tas nozīmē:
                 * - satelītattēls
                 * - ielu nosaukumi
                 * - vietu nosaukumi
                 * - administratīvā informācija
                 * - cita reference informācija
                 */

                const basemap =
                    Basemap.fromId(
                        "hybrid"
                    );

                if (!basemap) {

                    console.error(
                        "Hybrid basemap could not be created."
                    );

                    return;
                }

                mapEl.map.basemap =
                    basemap;

                currentBasemapType =
                    "hybrid";

                console.log(
                    "BASEMAP → Satellite + labels"
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
                typeof zoom !==
                "number"
            ) {

                return;
            }

            if (
                zoom >=
                IMAGERY_ZOOM
            ) {

                if (
                    currentBasemapType !==
                    "hybrid"
                ) {

                    await setWorldImagery();
                }

            } else {

                if (
                    currentBasemapType !==
                    "osm"
                ) {

                    await setOpenStreetMap();
                }
            }
        }

        async function setupBasemapSwitching() {

            if (
                !mapEl ||
                !mapEl.map
            ) {

                return;
            }

            try {

                /*
                 * Sākumā izmantojam OSM.
                 */

                await setOpenStreetMap();

                await mapEl.viewOnReady();

                const view =
                    mapEl.view;

                if (!view) {

                    console.error(
                        "MapView was not found."
                    );

                    return;
                }

                basemapSwitchingReady =
                    true;

                /*
                 * Iestata pareizo karti
                 * atbilstoši pašreizējam zoom.
                 */

                await updateBasemapForZoom(
                    view.zoom
                );

                /*
                 * Maina karti, kad lietotājs
                 * pietuvina vai attālina.
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
         * SYMBOLS
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
                    `${PIN_HEIGHT / 2}px`,

                outline: {
                    color: [
                        255,
                        255,
                        255,
                        0
                    ],
                    width: 0
                }
            };
        }

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

                const total =
                    landmarkPool.length;

                roundEl.textContent =
                    t(
                        "roundDisplay",
                        {
                            current:
                                currentRoundIndex + 1,

                            total:
                                total
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
                gameOverPanel,
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
                feature.attributes?.Name ||
                "Nezināma vieta"
            );
        }

        function getLandmarkPhoto(
            feature
        ) {

            if (!feature) {

                return "";
            }

            /*
             * Ja iepriekš jau saglabāts imageUrl,
             * izmanto to.
             */

            if (
                feature.attributes?.imageUrl
            ) {

                return (
                    feature.attributes.imageUrl
                );
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

            return feature?.geometry ||
                null;
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
                ] =
                [
                    result[j],
                    result[i]
                ];
            }

            return result;
        }

        /* =========================================================================
         * LOAD GAME DATA
         * ========================================================================= */

        async function loadGameData() {

            if (!landmarksLayer) {

                throw new Error(
                    "Landmarks layer was not found."
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

            const result =
                await landmarksLayer.queryFeatures(
                    query
                );

            if (
                !result ||
                !result.features
            ) {

                throw new Error(
                    "No landmark features returned."
                );
            }

            const features =
                result.features.filter(
                    (feature) =>
                        !!feature.geometry
                );

            /*
             * Izmanto config.js norādīto Photo lauku.
             */

            features.forEach(
                (feature) => {

                    feature.attributes.imageUrl =
                        getLandmarkPhoto(
                            feature
                        );
                }
            );

            allLandmarks =
                features;

            if (
                CONFIG.shuffleLandmarks !== false
            ) {

                landmarkPool =
                    shuffleArray(
                        allLandmarks
                    );

            } else {

                landmarkPool =
                    [...allLandmarks];
            }

            /*
             * Ja roundsPerGame ir norādīts,
             * ierobežo spēles kārtu skaitu.
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
                "Loaded landmarks:",
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

            landmarkPool =
                CONFIG.shuffleLandmarks === false
                    ? [...allLandmarks]
                    : shuffleArray(
                        allLandmarks
                    );

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

                try {

                    mapEl.graphics.remove(
                        currentResultGraphic
                    );

                } catch (
                    error
                ) {

                    console.warn(
                        error
                    );
                }

                currentResultGraphic =
                    null;
            }

            if (
                mapEl.graphics
            ) {

                mapEl.graphics.removeAll();
            }

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

                    landmarkImageEl.removeAttribute(
                        "src"
                    );

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
             * Atgriež karti uz spēles sākuma
             * skatījumu, bet nemaina basemap.
             */

            try {

                if (
                    currentLandmark.geometry
                ) {

                    await mapEl.goTo(
                        {
                            center:
                                currentLandmark.geometry,
                            zoom: 10
                        },
                        {
                            duration:
                                700
                        }
                    );
                }

            } catch (
                error
            ) {

                console.warn(
                    "Could not move map to round starting position.",
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

            if (
                !targetGeometry
            ) {

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

            } catch (
                error
            ) {

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

            if (
                currentResultGraphic
            ) {

                mapEl.graphics.remove(
                    currentResultGraphic
                );
            }

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
                        ? t(
                            "correctTitle"
                        )
                        : t(
                            "incorrectTitle"
                        );
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
             * Parāda pareizo lokāciju.
             */

            try {

                await mapEl.goTo(
                    {
                        target:
                            targetGeometry,
                        zoom: 17
                    },
                    {
                        duration:
                            800
                    }
                );

            } catch (
                error
            ) {

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
                    ) *
                    100
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
         * SHARE RESULTS
         * ========================================================================= */

        async function shareResults() {

            const shareConfig =
                CONFIG.social || {};

            const appName =
                CONFIG.appName ||
                "ArcGIGuess";

            const url =
                shareConfig.url ||
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

            /*
             * Ja pārlūks atbalsta Web Share API,
             * izmanto to.
             */

            if (
                navigator.share
            ) {

                try {

                    await navigator.share(
                        {
                            title:
                                shareConfig.title ||
                                appName,

                            text:
                                shareText,

                            url:
                                url
                        }
                    );

                    return;

                } catch (
                    error
                ) {

                    /*
                     * Lietotājs varēja aizvērt
                     * share logu.
                     */

                    console.log(
                        "Share cancelled or failed.",
                        error
                    );
                }
            }

            /*
             * Ja Web Share nav pieejams,
             * mēģina nokopēt tekstu.
             */

            try {

                await navigator.clipboard.writeText(
                    shareText
                );

                alert(
                    "Rezultāta teksts ir nokopēts!"
                );

            } catch (
                error
            ) {

                console.error(
                    "Could not copy share text:",
                    error
                );

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

            /*
             * SVARĪGI:
             *
             * config.js:
             * submitScoreFieldId: "field:score"
             *
             * Nevis:
             * "field: score"
             */

            const fieldId =
                LEADERBOARD.submitScoreFieldId ||
                "field:score";

            const separator =
                LEADERBOARD.survey123Url.includes(
                    "?"
                )
                    ? "&"
                    : "?";

            let url =
                `${LEADERBOARD.survey123Url}${separator}` +
                `${fieldId}=${encodeURIComponent(
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

            const params = {

                f: "json",

                where: "1=1",

                outFields:
                    [
                        LEADERBOARD.firstNameField ||
                            "first_name",

                        LEADERBOARD.lastNameField ||
                            "last_name",

                        LEADERBOARD.scoreField ||
                            "score"
                    ].join(","),

                orderByFields:
                    `${
                        LEADERBOARD.scoreField ||
                        "score"
                    } DESC`,

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
                    4;

                cell.textContent =
                    t(
                        "noScores"
                    );

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
                        ] ??
                        0;

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

            if (
                !leaderboardModal
            ) {

                return;
            }

            leaderboardModal.hidden =
                false;

            if (leaderboardBody) {

                leaderboardBody.innerHTML =
                    `<tr>
                        <td colspan="4">
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

            } catch (
                error
            ) {

                console.error(
                    "Leaderboard error:",
                    error
                );

                if (
                    leaderboardBody
                ) {

                    leaderboardBody.innerHTML =
                        `<tr>
                            <td colspan="4">
                                ${t(
                                    "leaderboardError"
                                )}
                            </td>
                        </tr>`;
                }
            }
        }

        /* =========================================================================
         * CLOSE MODALS
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

            /*
             * Šobrīd config.js satur tikai LV,
             * tāpēc šeit nav ko pārslēgt.
             */

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

            const appNameElements =
                document.querySelectorAll(
                    "[data-config='appName']"
                );

            appNameElements.forEach(
                (element) => {

                    element.textContent =
                        CONFIG.appName ||
                        "";
                }
            );

            const taglineElements =
                document.querySelectorAll(
                    "[data-config='tagline']"
                );

            taglineElements.forEach(
                (element) => {

                    element.textContent =
                        CONFIG.tagline ||
                        "";
                }
            );

            const scoringElements =
                document.querySelectorAll(
                    "[data-scoring-summary]"
                );

            scoringElements.forEach(
                (element) => {

                    element.innerHTML =
                        buildScoringSummary();
                }
            );

            if (
                startButton
            ) {

                startButton.textContent =
                    t(
                        "startButton"
                    );
            }

            if (
                confirmButton
            ) {

                confirmButton.textContent =
                    t(
                        "confirmButton"
                    );
            }

            if (
                nextButton
            ) {

                nextButton.textContent =
                    t(
                        "nextButton"
                    );
            }

            if (
                finishEarlyButton
            ) {

                finishEarlyButton.textContent =
                    t(
                        "finishEarlyButton"
                    );
            }

            if (
                gameOverButton
            ) {

                gameOverButton.textContent =
                    t(
                        "gameOverButton"
                    );
            }

            if (
                playAgainButton
            ) {

                playAgainButton.textContent =
                    t(
                        "playAgainButton"
                    );
            }

            if (
                shareButton
            ) {

                shareButton.textContent =
                    t(
                        "shareButton"
                    );
            }

            if (
                submitScoreButton
            ) {

                submitScoreButton.textContent =
                    t(
                        "submitScoreButton"
                    );
            }

            if (
                viewLeaderboardButton
            ) {

                viewLeaderboardButton.textContent =
                    t(
                        "viewLeaderboardButton"
                    );
            }
        }

        /* =========================================================================
         * INIT
         * ========================================================================= */

        async function init() {

            try {

                console.log(
                    "ArcGIGuess starting..."
                );

                /*
                 * ArcGIS Portal URL
                 */

                if (
                    CONFIG.portalUrl
                ) {

                    esriConfig.portalUrl =
                        CONFIG.portalUrl;
                }

                /*
                 * WebMap
                 */

                if (
                    !CONFIG.webMapItemId
                ) {

                    throw new Error(
                        "webMapItemId is missing in config.js"
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

                await webmap.load();

                console.log(
                    "WebMap loaded."
                );

                /*
                 * Atrodam spēles slāni,
                 * izmantojot config.js.
                 */

                const landmarkLayerTitle =
                    CONFIG.landmarkLayerTitle ||
                    "Vietas";

                landmarksLayer =
                    webmap.layers.find(
                        (layer) =>
                            layer.title ===
                            landmarkLayerTitle
                    );

                if (
                    !landmarksLayer
                ) {

                    throw new Error(
                        `Tīmekļa kartē neizdevās atrast slāni "${landmarkLayerTitle}".`
                    );
                }

                console.log(
                    "Landmark layer found:",
                    landmarksLayer.title
                );

                /*
                 * Slānis tiek paslēpts,
                 * lai pareizās vietas nebūtu redzamas.
                 */

                landmarksLayer.visible =
                    false;

                /*
                 * Sagaidām MapView.
                 */

                await mapEl.viewOnReady();

                console.log(
                    "MapView ready."
                );

                /*
                 * Ieslēdz OSM / Hybrid
                 * automātisko pārslēgšanu.
                 */

                await setupBasemapSwitching();

                /*
                 * Ielādē vietas.
                 */

                await loadGameData();

                /*
                 * Sākuma UI.
                 */

                applyStaticConfig();

                updateUI();

                showPanel(
                    welcomePanel
                );

                console.log(
                    "ArcGIGuess initialized successfully."
                );

            } catch (
                error
            ) {

                console.error(
                    "ArcGIGuess initialization error:",
                    error
                );

                alert(
                    t(
                        "webMapError"
                    )
                );
            }
        }

        /* =========================================================================
         * EVENTS
         * ========================================================================= */

        if (
            mapEl
        ) {

            mapEl.addEventListener(
                "arcgisViewClick",
                (
                    event
                ) => {

                    handleMapClick(
                        event
                    );
                }
            );
        }

        if (
            startButton
        ) {

            startButton.addEventListener(
                "click",
                startGame
            );
        }

        if (
            confirmButton
        ) {

            confirmButton.addEventListener(
                "click",
                confirmGuess
            );
        }

        if (
            nextButton
        ) {

            nextButton.addEventListener(
                "click",
                nextRound
            );
        }

        if (
            finishEarlyButton
        ) {

            finishEarlyButton.addEventListener(
                "click",
                finishEarly
            );
        }

        if (
            gameOverButton
        ) {

            gameOverButton.addEventListener(
                "click",
                endGame
            );
        }

        if (
            playAgainButton
        ) {

            playAgainButton.addEventListener(
                "click",
                startGame
            );
        }

        if (
            shareButton
        ) {

            shareButton.addEventListener(
                "click",
                shareResults
            );
        }

        if (
            submitScoreButton
        ) {

            submitScoreButton.addEventListener(
                "click",
                showSubmitModal
            );
        }

        if (
            viewLeaderboardButton
        ) {

            viewLeaderboardButton.addEventListener(
                "click",
                showLeaderboard
            );
        }

        if (
            languageButton
        ) {

            languageButton.addEventListener(
                "click",
                toggleLanguage
            );
        }

        /*
         * Aizver Submit modal.
         */

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

        /*
         * Aizver leaderboard modal.
         */

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

        /*
         * Aizver share modal.
         */

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
         * APPLY CONFIG + START
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
                setWorldImagery,
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
    }
);
