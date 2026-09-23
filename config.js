/* =============================================================================
 * ArcGIGuess — Configuration
 * =============================================================================
 * This is the ONLY file you should need to edit to make ArcGIGuess your own.
 *
 * ArcGIGuess is a "guess where it is" geography game built on the ArcGIS Maps SDK
 * for JavaScript. Players are shown a landmark's name and photo and must click
 * the map where they think it is. Points are awarded based on how close they get.
 *
 * Everything the game needs — the web map, the layer of landmarks, scoring rules,
 * languages, on-screen text, branding, and the optional leaderboard — is defined
 * below. Change the values, refresh the page, and the game updates.
 *
 * The object is exposed as a global (window.ARCGIGUESS_CONFIG) and is read by
 * script.js. Keep this file loaded BEFORE script.js in index.html.
 * ========================================================================== */

window.ARCGIGUESS_CONFIG = {
    /* -------------------------------------------------------------------------
     * 1. BRANDING
     * ---------------------------------------------------------------------- */

    // The name of your game. Shown in the browser tab, share card, and messages.
    appName: "Pazudusī Latvija: Atrodi vietu kartēs",

    // A short tagline used in the page title and as the default share-card footer.
    tagline: "Pārbaudiet savas zināšanas",

    // Text shown at the bottom of the shareable results card.
    // Set to null to fall back to `tagline`.
    shareCardFooter: null,

    // Note: the logo, guess-pin, and README/social screenshot are plain files
    // in the /assets folder — just REPLACE them (keeping the same filenames)
    // rather than pointing config at new paths:
    //   assets/logo.svg        the start-screen & results-card logo
    //   assets/pin.svg         the marker dropped where the player guesses
    //   assets/screenshot.png  the README image and social link-preview

    /* -------------------------------------------------------------------------
     * 2. THE MAP & LANDMARK DATA
     * ---------------------------------------------------------------------- */

    // The portal that hosts your web map. Leave null to use ArcGIS Online.
    // To use ArcGIS Enterprise, set this to your portal's URL, e.g.
    // "https://gis.example.com/portal". The web map, its layers, and any
    // sign-in prompts will all target this portal.
    portalUrl: null,

    // The ArcGIS web map that provides the basemap the player sees.
    // This is the item ID of a web map in ArcGIS Online / Enterprise.
    // If the web map is private, ArcGIS will automatically prompt the player
    // to sign in when the app loads.
    webMapItemId: "c61a0c96c36a4397aa8542fce258a4b4",

    // The title of the layer (inside the web map above) that holds your
    // landmarks. This layer is hidden during play — its features are the
    // "answers". Each feature should be a polygon (the landmark's footprint).
    landmarkLayerTitle: "Vietas",

    // Field names on the landmark layer.
    //   idField   — the unique ID field (used to fetch each landmark's photo).
    //   The per-language name fields are defined in the `languages` array below.
    landmarkIdField: "OBJECTID",

    // How many landmarks to play per game. Set to null to use every landmark
    // in the layer. If you have 40 landmarks and set this to 10, each game
    // picks 10 at random.
    roundsPerGame: null,

    // Whether to randomize landmark order each game. Set to false to always
    // play them in the layer's natural order (handy for a guided/curated tour).
    shuffleLandmarks: true,

    // Let players bail out mid-game: accept their current score (remaining
    // landmarks count as missed) and jump straight to the results screen.
    // Set to false to require finishing every round.
    allowFinishEarly: true,

    /* -------------------------------------------------------------------------
     * 3. SCORING
     * ---------------------------------------------------------------------- */
    // The intro text shown to players is generated automatically from these
    // values, so the explanation can never drift out of sync with the rules.
    //
    // How it works: a guess inside the landmark polygon (or within `bucketMeters`
    // of it) scores the full `pointsForHit`. Beyond that, the player loses
    // `penaltyPerBucket` point(s) for every `bucketMeters` they are off, never
    // dropping below `minScore`.
    scoring: {
        pointsForHit: 10, // Points for a perfect / very close guess.
        bucketMeters: 500, // Size of each distance "band", in meters.
        penaltyPerBucket: 1, // Points lost per band you are off.
        minScore: 0, // The lowest a single round can score.
    },

    /* -------------------------------------------------------------------------
     * 4. LANGUAGES
     * ---------------------------------------------------------------------- */
    // ArcGIGuess is multilingual. The first language in this array is the default.
    // A toggle button lets players switch between them. To go English-only,
    // simply delete the second entry. To use a different second language,
    // replace the Arabic entry with your own.
    //
    // Each language defines:
    //   code             — a short language code (used for <html lang> and Survey123).
    //   dir              — text direction: "ltr" or "rtl".
    //   toggleLabel      — what the switch-language button says while THIS
    //                      language is active (usually the name of the OTHER language).
    //   landmarkNameField— the field on the landmark layer holding the name in
    //                      this language.
    //   surveyLang       — (optional) language code to pass to the Survey123
    //                      form so it opens in this language. Leave null if not needed.
    //   strings          — every piece of on-screen text, in this language.
    //                      Placeholders in {curly braces} are filled in by the app.
    languages: [
        {
            code: "lv",
            dir: "ltr",
            landmarkNameField: "name",
            surveyLang: null,
            strings: {
                welcomeTitle: "Laipni lūdzam “Pazudusī Latvija”!",
                // {scoringSummary} is generated from the `scoring` block above.
                welcomeDesc:
                    "Atrodi vietu. Atceries vēsturi. Pārbaudi sevi! Mēs parādīsim vēsturiskas vietas nosaukumu un attēlu. Vai vari to atrast kartē? <br><br>{scoringSummary}",
                // Template for the auto-generated scoring explanation.
                // Placeholders: {points} {bucket} {penalty} {min}
                scoringSummaryTemplate:
                    "- Atrodi vietu (vai nokļūsti {bucket}m attālumā): <strong>+{points} punkti</strong><br><strong>-{penalty} punkti</strong> par katriem {bucket}m no pareizās vietas, līdz pat {min} punktiem.",
                startButton: "Sākt spēli",
                loadingText: "Vietu ielādēšana...",
                findLandmarkText: "Atrodi šo vietu:",
                scoreDisplay: "Score: {score}",
                roundDisplay: "Spēles kārta {current} / {total}",
                confirmButton: "Apstiprināt minējumu",
                correctTitle: "Pareizi!",
                correctMessage:
                    "Ideāli! Tu nopelnīji <strong>+{roundScore} punktus</strong>.",
                incorrectTitle: "Tik tuvu!",
                incorrectMessage:
                    "Tu biji <strong>{distance}m</strong> prom no pareizās vietas. Tu nopelnīji <strong>{roundScore} punktus </strong>. Šeit ir pareizā lokācija.",
                nextButton: "Nākamā vieta.",
                finishEarlyButton: "Pabeigt ātrāk",
                finishEarlyConfirm: "Uzspiediet vēlreiz, lai noslēgtu spēli",
                gameOverButton: "Rezultāti",
                gameOverTitle: "Spēlē beidzās!",
                finalScoreText: "Luk, tavi rezultāti:",
                totalScoreLabel: "Kopējais punktu skaits",
                accuracyLabel: "Precizitāte",
                foundLabel: "Vietas atrastas",
                playAgainButton: "Spēlēt atkal",
                shareButton: "Dalīties ar rezultātiem",
                // {score}, {appName}, and {url} (from social.url) are available.
                shareText:
                    "Es nopelnīju {score} punktus spēlē {appName}! Cik vietas tu vari atrast? Spēlē: {url}",
                shareCardTitle: "Mans {appName} Rezultāts!",
                shareCardScoreLabel: "Kopējie punkti",
                shareCardAccuracyLabel: "Precizitāte",
                shareModalTitle: "Dalīties ar rezultātiem!",
                shareModalDesc:
                    "Ar labo peles pogu noklikšķini uz attēla vai turi to nospiestu, lai to saglabātu un kopīgotu.",
                webMapError: "Neizdevās ielādēt tīmekļa karti. Lūdzu, pārbaudi kartes ID.",
                layerError:
                    "Tīmekļa kartē neizdevās atrast apskates vietu slāni. Pārbaudi slāņa nosaukumu failā config.js.",
                submitScoreButton: "Iesniegt rezultātu",
                viewLeaderboardButton: "Rezultātu tabula",
                submitModalTitle: "Iesniegt rezultātu",
                leaderboardModalTitle: "Labākie spēlētāji",
                leaderboardLoadingText: "Ielādē rezultātu tabulu...",
                leaderboardError:
                    "Neizdevās ielādēt labāko rezultātu datus. Lūdzu, mēģini vēlreiz vēlāk.",
                noScores: "Pagaidām nav iesniegts neviens rezultāts.",
                points: "punkti",
            },
        },
        
        },
    ],

    /* -------------------------------------------------------------------------
     * 5. SOCIAL SHARING (link previews)
     * ---------------------------------------------------------------------- */
    // Controls the preview card shown when your game's LINK is shared on
    // WhatsApp, LinkedIn, Facebook, X/Twitter, Slack, iMessage, etc.
    //
    // ⚠️ IMPORTANT: those services scrape your page WITHOUT running JavaScript,
    // so they read the <meta> tags in index.html — not this file. The values
    // below are mirrored into those tags at runtime (handy for local use and
    // JS-aware tools), but for guaranteed link previews you should ALSO paste
    // the same values into the matching <meta> tags in index.html <head>.
    // See the README's "Social sharing" section.
    social: {
        // Headline shown on the preview card.
        title: "Pazudusī Latvija: Atrodi vietu kartē",
        // One-line description under the headline.
        description:
            "Atrodi vietu. Atceries vēsturi. Pārbaudi sevi! Mēs parādīsim vēsturiskas vietas nosaukumu un attēlu.",
        // Preview image. Use an ABSOLUTE URL for reliable previews.
        // Recommended size: ~1200×630px. Reusing the README screenshot here.
        image: "https://aelhussiny.github.io/ArcGIGuess/assets/screenshot.png",
        // The public URL where the game is hosted (used for og:url).
        url: "https://aelhussiny.github.io/ArcGIGuess",
        // Your X/Twitter handle including the @ (optional).
        twitterHandle: "",
    },

    /* -------------------------------------------------------------------------
     * 6. LEADERBOARD (optional)
     * ---------------------------------------------------------------------- */
    // ArcGIGuess can let players submit their score through an ArcGIS Survey123
    // form and view a public leaderboard. This is completely optional.
    //
    // Set `enabled: false` to hide the "Submit Score" and "Leaderboard" buttons
    // entirely — the game works fine without it.
    //
    // To use it you need:
    //   1. A Survey123 form that collects a name and a score.
    //   2. A public (or shared) view of that form's feature layer to read scores from.
    leaderboard: {
        enabled: false,

        // The share URL of your Survey123 form.
        survey123Url:
            "https://survey123.arcgis.com/share/c4317eb262934df4b2fe38cb42a3d1d1",

        // The Survey123 field to pre-fill with the player's score.
        // Format is "field:<your_field_name>".
        submitScoreFieldId: "field:score",

        // The FeatureServer query endpoint used to READ the leaderboard.
        // Point this at a public view of your survey's results layer.
        dataApiUrl:
            "https://services1.arcgis.com/zu8dBGfmKCvrZHh2/arcgis/rest/services/survey123_c4317eb262934df4b2fe38cb42a3d1d1_results/FeatureServer/0/query",

        // The fields in that layer used to display the leaderboard.
        firstNameField: "first_name",
        lastNameField: "last_name",
        scoreField: "score",

        // How many top scores to show.
        topN: 10,
    },
};
