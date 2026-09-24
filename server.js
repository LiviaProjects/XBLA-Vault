const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));

const XBLA =
    "https://archive.org/download/XBOX_360_XBLA";

const XBLA_API =
    "https://archive.org/metadata/XBOX_360_XBLA";

const ISOS =
    "https://minerva-archive.org/browse/Redump/Microsoft%20-%20Xbox%20360/";

const CACHE_DIR =
    path.join(__dirname, "cache");

if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR);
}

const XBLA_CACHE =
    path.join(CACHE_DIR, "xbla.json");

const ISO_CACHE =
    path.join(CACHE_DIR, "isos.json");

/*
 * Cache válido por 6 horas.
 */
const CACHE_TIME = 6 * 60 * 60 * 1000;

/* =========================
   CACHE
========================= */

function readCache(file) {

    if (!fs.existsSync(file)) {
        return null;
    }

    try {

        const data =
            JSON.parse(
                fs.readFileSync(
                    file,
                    "utf8"
                )
            );

        if (
            !data.time ||
            !Array.isArray(data.games)
        ) {
            return null;
        }

        if (
            Date.now() - data.time >
            CACHE_TIME
        ) {
            return null;
        }

        return data.games;

    } catch {
        return null;
    }
}

function saveCache(file, games) {

    fs.writeFileSync(
        file,
        JSON.stringify({
            time: Date.now(),
            games
        }),
        "utf8"
    );
}

/* =========================
   TAMANHO
========================= */

function formatSize(bytes) {

    if (!bytes) {
        return "";
    }

    const number =
        Number(bytes);

    if (!Number.isFinite(number)) {
        return "";
    }

    const units = [
        "B",
        "KB",
        "MB",
        "GB",
        "TB"
    ];

    let size = number;
    let unit = 0;

    while (
        size >= 1024 &&
        unit < units.length - 1
    ) {

        size /= 1024;
        unit++;

    }

    return `${size.toFixed(
        unit === 0 ? 0 : 2
    )} ${units[unit]}`;
}

/* =========================
   XBLA
========================= */

async function getXBLA() {

    const cached =
        readCache(XBLA_CACHE);

    if (cached) {

        console.log(
            `XBLA: usando cache (${cached.length} jogos)`
        );

        return cached;
    }

    console.log(
        "XBLA: baixando catálogo..."
    );

    const response =
        await axios.get(
            XBLA_API,
            {
                timeout: 60000,
                headers: {
                    "User-Agent":
                        "XboxVault/1.0"
                }
            }
        );

    const data =
        response.data;

    if (
        !data.files ||
        !Array.isArray(data.files)
    ) {

        throw new Error(
            "Internet Archive não retornou arquivos."
        );

    }

    const games = [];

    for (const file of data.files) {

        if (!file.name) {
            continue;
        }

        const filename =
            file.name;

        if (
            !filename
                .toLowerCase()
                .endsWith(".rar")
        ) {
            continue;
        }

        const encodedPath =
            filename
                .split("/")
                .map(
                    part =>
                        encodeURIComponent(part)
                )
                .join("/");

        games.push({

            name:
                filename.replace(
                    /\.rar$/i,
                    ""
                ),

            file:
                filename,

            size:
                formatSize(file.size),

            url:
                `${XBLA}/${encodedPath}`

        });
    }

    games.sort(
        (a, b) =>
            a.name.localeCompare(
                b.name,
                "en",
                {
                    sensitivity: "base"
                }
            )
    );

    saveCache(
        XBLA_CACHE,
        games
    );

    console.log(
        `XBLA: ${games.length} jogos salvos no cache.`
    );

    return games;
}

/* =========================
   ISOS
========================= */

async function getISOs() {

    const cached =
        readCache(ISO_CACHE);

    if (cached) {

        console.log(
            `ISOs: usando cache (${cached.length} arquivos)`
        );

        return cached;
    }

    console.log(
        "ISOs: baixando catálogo..."
    );

    const response =
        await axios.get(
            ISOS,
            {
                timeout: 60000,

                headers: {
                    "User-Agent":
                        "Mozilla/5.0 XboxVault/1.0",

                    "Accept":
                        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                }
            }
        );

    const $ =
        cheerio.load(
            response.data
        );

    const games = [];

    const seen =
        new Set();

    $("a").each(
        (_, element) => {

            const name =
                $(element)
                    .text()
                    .trim();

            const href =
                $(element)
                    .attr("href");

            if (!name || !href) {
                return;
            }

            if (
                name === ".." ||
                name === "." ||
                name
                    .toLowerCase()
                    .includes("parent")
            ) {
                return;
            }

            if (
                !/\.(iso|7z|zip|rar)$/i
                    .test(name)
            ) {
                return;
            }

            const url =
                new URL(
                    href,
                    ISOS
                ).href;

            if (seen.has(url)) {
                return;
            }

            seen.add(url);

            games.push({

                name:
                    name.replace(
                        /\.(iso|7z|zip|rar)$/i,
                        ""
                    ),

                file:
                    name,

                size:
                    "",

                url

            });

        }
    );

    games.sort(
        (a, b) =>
            a.name.localeCompare(
                b.name,
                "en",
                {
                    sensitivity: "base"
                }
            )
    );

    saveCache(
        ISO_CACHE,
        games
    );

    console.log(
        `ISOs: ${games.length} arquivos salvos no cache.`
    );

    return games;
}

/* =========================
   API XBLA
========================= */

app.get(
    "/api/xbla",
    async (req, res) => {

        try {

            const games =
                await getXBLA();

            res.json(games);

        } catch (error) {

            console.error(
                "ERRO XBLA:",
                error.message
            );

            res.status(500).json({

                error:
                    "Não foi possível carregar o catálogo XBLA.",

                details:
                    error.message

            });

        }

    }
);

/* =========================
   API ISO
========================= */

app.get(
    "/api/isos",
    async (req, res) => {

        try {

            const games =
                await getISOs();

            res.json(games);

        } catch (error) {

            console.error(
                "ERRO ISO:",
                error.message
            );

            res.status(500).json({

                error:
                    "Não foi possível carregar o catálogo ISO.",

                details:
                    error.message

            });

        }

    }
);

/* =========================
   ATUALIZAR CACHE
========================= */

app.get(
    "/api/refresh",
    async (req, res) => {

        try {

            if (
                fs.existsSync(XBLA_CACHE)
            ) {
                fs.unlinkSync(
                    XBLA_CACHE
                );
            }

            if (
                fs.existsSync(ISO_CACHE)
            ) {
                fs.unlinkSync(
                    ISO_CACHE
                );
            }

            res.json({

                success: true,

                message:
                    "Cache apagado. O catálogo será atualizado na próxima consulta."

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

/* =========================
   STATUS
========================= */

app.get(
    "/api/status",
    (req, res) => {

        res.json({

            online: true,

            server:
                "XboxVault 360",

            cache:
                true

        });

    }
);

/* =========================
   SERVIDOR
========================= */

app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "================================"
        );
        console.log(
            "       XBOXVAULT 360"
        );
        console.log(
            "================================"
        );
        console.log("");
        console.log(
            `Site: http://localhost:${PORT}`
        );
        console.log("");
        console.log(
            "Cache ativado: 6 horas"
        );
        console.log("");

    }
);