/* =================================================================
 * BASEMAP
 * ================================================================= */

/*
 * ARC GIS ONLINE MĒROGS
 *
 * OSM:
 * 1:2257 un tālāk
 *
 * World Imagery:
 * tuvāk par 1:2257
 *
 * ArcGIS Online Web Mercator:
 *
 * Level 16 = 1:4514
 * Level 17 = 1:2257
 * Level 18 = 1:1128
 *
 * Tātad OSM tiek saglabāts līdz ielas mērogam.
 */

const IMAGERY_SCALE = 2257;

let currentBasemapType = null;

let basemapSwitchingReady = false;


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


/* =================================================================
 * OPENSTREETMAP
 * ================================================================= */


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


/* =================================================================
 * WORLD IMAGERY
 * ================================================================= */


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
                "satellite"
            );

        if (!basemap) {

            console.error(
                "ArcGIS Online World Imagery basemap could not be created."
            );

            return;
        }

        mapEl.map.basemap =
            basemap;

        currentBasemapType =
            "imagery";

        console.log(
            "BASEMAP -> World Imagery"
        );

    } catch (error) {

        console.error(
            "World Imagery basemap error:",
            error
        );
    }
}


/* =================================================================
 * BASEMAP SWITCHING
 * ================================================================= */


function updateBasemapForScale(
    scale
) {

    if (
        !mapEl ||
        !mapEl.map
    ) {
        return;
    }


    /*
     * Pārbaudām scale vērtību.
     */

    if (
        typeof scale !==
            "number" ||
        !Number.isFinite(
            scale
        ) ||
        scale <= 0
    ) {
        return;
    }


    console.log(
        "Checking basemap for scale:",
        scale
    );


    /*
     * ===============================================================
     * OPENSTREETMAP
     * ===============================================================
     *
     * Piemēri:
     *
     * 1:10000
     * 1:5000
     * 1:4514
     * 1:2257
     *
     * Šeit paliek OSM.
     */

    if (
        scale >=
        IMAGERY_SCALE
    ) {

        if (
            currentBasemapType !==
            "osm"
        ) {

            setOpenStreetMap();
        }

        return;
    }


    /*
     * ===============================================================
     * WORLD IMAGERY
     * ===============================================================
     *
     * Piemēri:
     *
     * 1:2000
     * 1:1500
     * 1:1128
     * 1:500
     *
     * Šeit tiek izmantots World Imagery.
     */

    if (
        currentBasemapType !==
        "imagery"
    ) {

        setWorldImagery();
    }
}


/* =================================================================
 * SETUP BASEMAP SWITCHING
 * ================================================================= */


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


    /*
     * Sākumā iestatām OSM.
     */

    setOpenStreetMap();


    /*
     * Iegūstam pašreizējo kartes mērogu.
     */

    const initialScale =
        mapEl.view.scale;


    console.log(
        "Initial map scale:",
        initialScale
    );


    /*
     * Ja scale jau ir pieejams,
     * uzreiz pārbaudām pareizo basemap.
     */

    if (
        typeof initialScale ===
            "number" &&
        Number.isFinite(
            initialScale
        ) &&
        initialScale > 0
    ) {

        basemapSwitchingReady =
            true;

        updateBasemapForScale(
            initialScale
        );

    } else {

        /*
         * Ja scale vēl nav pieejams,
         * pagaidām gaidām.
         */

        const waitForScale =
            () => {

                if (
                    !mapEl.view
                ) {

                    setTimeout(
                        waitForScale,
                        300
                    );

                    return;
                }


                const scale =
                    mapEl.view.scale;


                console.log(
                    "Waiting for map scale:",
                    scale
                );


                if (
                    typeof scale !==
                        "number" ||
                    !Number.isFinite(
                        scale
                    ) ||
                    scale <= 0
                ) {

                    setTimeout(
                        waitForScale,
                        300
                    );

                    return;
                }


                basemapSwitchingReady =
                    true;


                console.log(
                    "Map scale ready:",
                    scale
                );


                updateBasemapForScale(
                    scale
                );
            };


        waitForScale();
    }


    /*
     * ===============================================================
     * SCALE LISTENER
     * ===============================================================
     *
     * Sekojam līdzi kartes mērogam.
     */

    mapEl.view.watch(
        "scale",
        (
            newScale
        ) => {

            if (
                !basemapSwitchingReady
            ) {
                return;
            }


            if (
                typeof newScale !==
                    "number" ||
                !Number.isFinite(
                    newScale
                ) ||
                newScale <= 0
            ) {
                return;
            }


            console.log(
                "Map scale changed:",
                newScale
            );


            updateBasemapForScale(
                newScale
            );
        }
    );
}
