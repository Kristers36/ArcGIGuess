/* =============================================================================
 * ArcGIGuess — Configuration
 * =============================================================================
 * Pazudusī Latvija — Atrodi vietu kartē
 * ========================================================================== */

window.ARCGIGUESS_CONFIG = {
    /* -------------------------------------------------------------------------
     * 1. BRANDING
     * ---------------------------------------------------------------------- */

    appName: "Vietas, kuras nedrīkstam aizmirst!",

    tagline: "Pārbaudi savas zināšanas",

    shareCardFooter: null,

    /* -------------------------------------------------------------------------
     * 2. THE MAP & LANDMARK DATA
     * ---------------------------------------------------------------------- */

    // ArcGIS Online
    portalUrl: null,

    // Tava ArcGIS Web Map
    webMapItemId: "3c98953dd6b5425bbf3ab1db5b1db82b",

    // Slāņa nosaukums Web Map
    landmarkLayerTitle: "Vietas",

    // Tavā slānī ID lauks ir FID
    landmarkIdField: "FID",

    // Foto URL atrodas laukā Photo
    landmarkPhotoField: "Photo",

    // null = izmantot visas vietas
    roundsPerGame: null,

    // Nejauša vietu secība
    shuffleLandmarks: true,

    // Atļaut pabeigt spēli ātrāk
    allowFinishEarly: true,
   customLandmarkPrompts: {
  "Ventas rumba": "Kur atrodas Eiropas platākais ūdenskritums?",
  "Staburags": "Kur Daugavas ūdeņi paslēpa Staburagu?",
  "Aglonas bazilika": "Kur atrodas Latvijas slavenākā svētvieta?",
  "Turaidas pils": "Kur Siguldas pusē slēpjas sarkanā pils?",
  "Zvārtes iezis": "Kur pie Amatas upes ir novērojams viens no skaistākajiem iežiem?",
  "Āraišu ezerpils": "Kur ezera vidū reiz dzīvoja senie latgaļi?",
  "Ķemeru Nacionālais parks": "Kurš parks ir atpazīstams ar sēravotiem?"
},
 noFullScoreBufferLandmarks: [
    "Abavas senleja",
    "Ķemeru Nacionālais parks",
    "Ķemeru nacionālais parks",
],
    /* -------------------------------------------------------------------------
     * 3. SCORING
     * ---------------------------------------------------------------------- */

    scoring: {
        // Maksimālais punktu skaits par vietu
        pointsForHit: 10,

        // Attāluma josla metros
        bucketMeters: 500,

        // Par katriem 500 m nost -1 punkts
        penaltyPerBucket: 1,

        // Minimālais punktu skaits par kārtu
        minScore: 0,
    },

    /* -------------------------------------------------------------------------
     * 4. LANGUAGES
     * ---------------------------------------------------------------------- */

    languages: [
        {
            code: "lv",

            dir: "ltr",

            // Lauks ArcGIS slānī ar vietas nosaukumu
            landmarkNameField: "Name",

            surveyLang: null,

            strings: {
                /* START SCREEN */

                welcomeTitle:
                    "Laipni lūdzam “Vietas, kuras nedrīkstam aizmirst”!",

                welcomeDesc:
                    "Atrodi vietu. Atceries vēsturi. Pārbaudi sevi! Mēs parādīsim vēsturiskas vietas nosaukumu un attēlu. Vai vari to atrast kartē?<br><br>{scoringSummary}",

                scoringSummaryTemplate:
    "<strong>Atrodi vietu un nopelni punktus!</strong><br>Atrodi norādītā objekta atrašanās vietu kartē.<br><strong>{points} punkti</strong> – ja vieta atrasta precīzi.<br>Par katriem {bucket} m no pareizās vietas tiek atņemts {penalty} punkts.",
                startButton:
                    "Sākt spēli",

                /* LOADING */

                loadingText:
                    "Vietu ielādēšana...",

                /* GAME */

                findLandmarkText:
                    "Atrodi šo vietu:",

                scoreDisplay:
                    "Punkti: {score}",

                roundDisplay:
                    "Kārta {current} no {total}",

                confirmButton:
                    "Apstiprināt minējumu",

                /* ROUND RESULT */

                correctTitle:
                    "Pareizi!",

                correctMessage:
                    "Ideāli! Tu nopelnīji <strong>+{roundScore} punktus</strong>.",
                
       distanceTitles: {
 almost: "Gandrīz izdevās!",
  close: "Labs mēģinājums, esi tuvu!",
  medium: "Virziens ir labs, precizē atrašanās vietu!",
  far: "Pamēģini paskatīties plašākā apkārtnē!",
  veryFar: "Nākreiz sanāks!"
},

                incorrectMessage:
                    "Tu biji <strong>{distance} m</strong> prom no pareizās vietas. Tu nopelnīji <strong>{roundScore} punktus</strong>. Šeit ir pareizā lokācija.",

                nextButton:
                    "Nākamā vieta",

                finishEarlyButton:
                    "Pabeigt ātrāk",

                finishEarlyConfirm:
                    "Nospied vēlreiz, lai noslēgtu spēli",

                gameOverButton:
                    "Rezultāti",

                /* GAME OVER */

                gameOverTitle:
                    "Paldies par piedalīšanos!",

                finalScoreText:
                    "Lūk, tavi rezultāti:",

                totalScoreLabel:
                    "Kopējais punktu skaits",

                accuracyLabel:
                    "Precizitāte",

                foundLabel:
                    "Vietas atrastas",

                playAgainButton:
                    "Spēlēt vēlreiz",

                shareButton:
                    "Dalīties ar rezultātiem",

                /* SHARING */

                shareText:
                    "Es nopelnīju {score} punktus spēlē {appName}! Cik vietas tu vari atrast? Spēlē: {url}",

                shareCardTitle:
                    "Mans {appName} rezultāts!",

                shareCardScoreLabel:
                    "Kopējie punkti",

                shareCardAccuracyLabel:
                    "Precizitāte",

                shareModalTitle:
                    "Dalīties ar rezultātiem!",

                shareModalDesc:
                    "Ar labo peles pogu noklikšķini uz attēla vai turi to nospiestu, lai to saglabātu un kopīgotu.",

                /* ERRORS */

                webMapError:
                    "Neizdevās ielādēt karti. Lūdzu, pārbaudi ArcGIS Web Map ID.",

                layerError:
                    "Tīmekļa kartē neizdevās atrast slāni “Vietas”. Pārbaudi slāņa nosaukumu config.js failā.",

                /* LEADERBOARD */

                submitScoreButton:
                    "Iesniegt rezultātu",

                viewLeaderboardButton:
                    "Rezultātu tabula",

                submitModalTitle:
                    "Iesniegt rezultātu",

                leaderboardModalTitle:
                    "Labākie spēlētāji",

                leaderboardLoadingText:
                    "Notiek rezultātu tabulas ielāde...",

                leaderboardError:
                    "Neizdevās ielādēt labāko rezultātu datus. Lūdzu, mēģini vēlreiz vēlāk.",

                noScores:
                    "Pagaidām nav iesniegts neviens rezultāts.",

                points:
                    "punkti",
            },
        },
    ],

    /* -------------------------------------------------------------------------
     * 5. SOCIAL SHARING
     * ---------------------------------------------------------------------- */

    social: {
        title:
            "Vietas, kuras nedrīkstam aizmirst!: Atrodi vietu kartē",

        description:
            "Atrodi vietu. Atceries vēsturi. Pārbaudi sevi! Mēs parādīsim vēsturiskas vietas nosaukumu un attēlu.",

        image:
            "https://aelhussiny.github.io/ArcGIGuess/assets/screenshot.png",

        url:
            "https://aelhussiny.github.io/ArcGIGuess",

        twitterHandle:
            "",
    },

    /* -------------------------------------------------------------------------
     * 6. LEADERBOARD
     * ---------------------------------------------------------------------- */

 leaderboard: {
    enabled: true,

    survey123Url:
        "https://survey123.arcgis.com/share/ca86560c30ff4566a52adfd45b829fd0?portalUrl=https://envirotech.maps.arcgis.com",

    /*
     * Survey123 jautājuma/lauka īstais nosaukums rezultātam.
     * Spēles kods ģenerēs:
     * field:rezult_ts=123
     */
    submitScoreFieldId:
        "rezult_ts",

    /*
     * Šim jābūt tās pašas Survey123 rezultātu tabulas /query URL,
     * kurā tiek iesniegti dati.
     *
     * Ja rezultātu tabula pēc iesniegšanas nerāda jaunos ierakstus,
     * šis URL, visticamāk, norāda uz nepareizu slāni.
     */
    dataApiUrl:
        "https://services1.arcgis.com/zu8dBGfmKCvrZHh2/arcgis/rest/services/survey123_c4317eb262934df4b2fe38cb42a3d1d1_results/FeatureServer/0/query",

    firstNameField:
        "v_rds",

    lastNameField:
        "uzv_rds",

    scoreField:
        "rezult_ts",

    topN:
        10,
},
    };
