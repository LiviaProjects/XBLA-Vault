const state = {
    page: "xbla",
    xbla: [],
    isos: [],
    filtered: [],
    selected: 0,
    gamepad: null,
    lastButtons: [],
    lastMove: 0
};

const grid = document.getElementById("grid");
const search = document.getElementById("search");
const loading = document.getElementById("loading");
const count = document.getElementById("count");
const title = document.getElementById("title");
const sectionType = document.getElementById("sectionType");
const source = document.getElementById("source");

/* =========================
   SOM DOS CARDS
========================= */

const cardSound = new Audio("/audio/card.mp3");
cardSound.volume = 0.5;

function playCardSound() {
    cardSound.currentTime = 0;

    cardSound.play().catch(() => {});
}

/* =========================
   CARREGAMENTO
========================= */

async function loadXBLA() {
    loading.style.display = "flex";

    try {
        const response = await fetch("/api/xbla");

        if (!response.ok) {
            throw new Error("Erro HTTP");
        }

        state.xbla = await response.json();
        state.filtered = state.xbla;
        state.selected = 0;

        render();
    } catch (error) {
        showError("Erro ao carregar o catálogo XBLA.");
        console.error(error);
    }
}

async function loadISOs() {
    loading.style.display = "flex";

    try {
        const response = await fetch("/api/isos");

        if (!response.ok) {
            throw new Error("Erro HTTP");
        }

        state.isos = await response.json();
        state.filtered = state.isos;
        state.selected = 0;

        render();
    } catch (error) {
        showError("A fonte ISO não pôde ser carregada.");
        console.error(error);
    }
}

/* =========================
   ERRO
========================= */

function showError(message) {
    loading.style.display = "none";

    grid.innerHTML = `
        <div class="empty">
            <h3>${message}</h3>
            <p style="margin-top:10px">
                Tente atualizar a página.
            </p>
        </div>
    `;
}

/* =========================
   RENDER
========================= */

function render() {
    loading.style.display = "none";

    const games = state.filtered;

    count.textContent =
        `${games.length.toLocaleString("pt-BR")} jogos`;

    if (!games.length) {
        grid.innerHTML =
            `<div class="empty">Nenhum jogo encontrado.</div>`;
        return;
    }

    if (state.selected >= games.length) {
        state.selected = games.length - 1;
    }

    grid.innerHTML = games.map((game, index) => {
        const letter =
            escapeHTML(
                game.name.charAt(0).toUpperCase()
            );

        const name =
            escapeHTML(game.name);

        const size =
            escapeHTML(
                game.size || "Xbox 360"
            );

        const selected =
            index === state.selected
                ? " selected"
                : "";

        return `
            <article
                class="card${selected}"
                data-index="${index}"
                tabindex="0"
            >
                <div class="cover">
                    <div class="cover-letter">
                        ${letter}
                    </div>
                </div>

                <div class="info">
                    <h3>${name}</h3>

                    <div class="meta">
                        ${size}
                    </div>

                    <a
                        class="download"
                        href="${game.url}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        ⬇ Download
                    </a>
                </div>
            </article>
        `;
    }).join("");

    updateSelection();
}

/* =========================
   SELEÇÃO
========================= */

function updateSelection() {
    const cards =
        grid.querySelectorAll(".card");

    cards.forEach((card, index) => {
        card.classList.toggle(
            "selected",
            index === state.selected
        );
    });

    const selected =
        cards[state.selected];

    if (selected) {
        selected.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}

/* =========================
   ABRIR JOGO
========================= */

function openSelectedGame() {
    const game =
        state.filtered[state.selected];

    if (!game) return;

    window.open(
        game.url,
        "_blank",
        "noopener,noreferrer"
    );
}

/* =========================
   NAVEGAÇÃO
========================= */

function moveSelection(direction) {
    const games = state.filtered;

    if (!games.length) return;

    const cards =
        grid.querySelectorAll(".card");

    if (!cards.length) return;

    const firstTop =
        cards[0].getBoundingClientRect().top;

    let columns = 1;

    for (let i = 1; i < cards.length; i++) {
        const top =
            cards[i].getBoundingClientRect().top;

        if (Math.abs(top - firstTop) < 5) {
            columns++;
        } else {
            break;
        }
    }

    let next =
        state.selected;

    if (direction === "left") {
        next--;
    }

    if (direction === "right") {
        next++;
    }

    if (direction === "up") {
        next -= columns;
    }

    if (direction === "down") {
        next += columns;
    }

    if (next < 0) {
        next = 0;
    }

    if (next >= games.length) {
        next = games.length - 1;
    }

    if (next !== state.selected) {
        state.selected = next;

        updateSelection();

        /* SOM AO PASSAR PARA OUTRO CARD */
        playCardSound();
    }
}

/* =========================
   TROCAR ABA
========================= */

async function changePage(page) {
    document
        .querySelectorAll(".nav")
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.page === page
            );
        });

    state.page = page;
    state.selected = 0;
    search.value = "";

    if (page === "xbla") {
        title.textContent =
            "Biblioteca XBLA";

        sectionType.textContent =
            "XBOX LIVE ARCADE";

        source.textContent =
            "Internet Archive ↗";

        source.href =
            "https://archive.org/download/XBOX_360_XBLA";

        if (!state.xbla.length) {
            await loadXBLA();
        } else {
            state.filtered = state.xbla;
            render();
        }
    }

    if (page === "isos") {
        title.textContent =
            "Biblioteca ISO";

        sectionType.textContent =
            "REDUMP • XBOX 360";

        source.textContent =
            "Minerva Archive ↗";

        source.href =
            "https://minerva-archive.org/browse/Redump/Microsoft%20-%20Xbox%20360/";

        if (!state.isos.length) {
            await loadISOs();
        } else {
            state.filtered = state.isos;
            render();
        }
    }
}

/* =========================
   PESQUISA
========================= */

search.addEventListener("input", () => {
    const term =
        search.value
            .toLowerCase()
            .trim();

    const sourceGames =
        state.page === "xbla"
            ? state.xbla
            : state.isos;

    state.filtered =
        sourceGames.filter(game =>
            game.name
                .toLowerCase()
                .includes(term)
        );

    state.selected = 0;

    render();
});

/* =========================
   CLIQUE NOS CARDS
========================= */

grid.addEventListener("click", event => {
    const card =
        event.target.closest(".card");

    if (!card) return;

    const index =
        Number(card.dataset.index);

    state.selected = index;

    updateSelection();
});

/* =========================
   NAVEGAÇÃO POR TECLADO
========================= */

document.addEventListener("keydown", event => {

    if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
    ) {
        event.preventDefault();

        search.focus();

        return;
    }

    if (
        document.activeElement === search &&
        event.key !== "Escape"
    ) {
        return;
    }

    switch (event.key) {

        case "ArrowLeft":
            event.preventDefault();

            moveSelection("left");

            break;

        case "ArrowRight":
            event.preventDefault();

            moveSelection("right");

            break;

        case "ArrowUp":
            event.preventDefault();

            moveSelection("up");

            break;

        case "ArrowDown":
            event.preventDefault();

            moveSelection("down");

            break;

        case "Enter":
            event.preventDefault();

            openSelectedGame();

            break;

        case "Escape":
            search.blur();

            break;

        case "Tab":
            break;
    }
});

/* =========================
   CONTROLE XBOX 360
========================= */

window.addEventListener(
    "gamepadconnected",
    event => {

        state.gamepad =
            event.gamepad;

        console.log(
            "🎮 Controle conectado:",
            event.gamepad.id
        );

        showControllerMessage(
            "🎮 Controle conectado"
        );
    }
);

window.addEventListener(
    "gamepaddisconnected",
    event => {

        if (
            state.gamepad &&
            state.gamepad.index ===
                event.gamepad.index
        ) {
            state.gamepad = null;
        }

        console.log(
            "🎮 Controle desconectado"
        );
    }
);

/* =========================
   ENCONTRAR GAMEPAD
========================= */

function findGamepad() {

    const pads =
        navigator.getGamepads
            ? navigator.getGamepads()
            : [];

    for (const pad of pads) {

        if (pad) {

            state.gamepad = pad;

            return pad;
        }
    }

    return state.gamepad;
}

/* =========================
   GAMEPAD LOOP
========================= */

function gamepadLoop(timestamp) {

    const pad =
        findGamepad();

    if (pad) {
        handleGamepad(
            pad,
            timestamp
        );
    }

    requestAnimationFrame(
        gamepadLoop
    );
}

/* =========================
   GAMEPAD
========================= */

function handleGamepad(
    pad,
    timestamp
) {

    if (!pad.buttons) return;

    const buttons =
        pad.buttons.map(
            button =>
                button.pressed
        );

    /*
     * Xbox:
     *
     * 0 = A
     * 1 = B
     * 2 = X
     * 3 = Y
     * 4 = LB
     * 5 = RB
     * 6 = LT
     * 7 = RT
     * 8 = View/Back
     * 9 = Menu/Start
     * 10 = LS
     * 11 = RS
     * 12 = D-pad Up
     * 13 = D-pad Down
     * 14 = D-pad Left
     * 15 = D-pad Right
     */

    const pressed = index =>
        buttons[index] &&
        !state.lastButtons[index];

    /* A */

    if (pressed(0)) {
        openSelectedGame();
    }

    /* B */

    if (pressed(1)) {
        search.blur();
    }

    /* LB = XBLA */

    if (pressed(4)) {
        changePage("xbla");
    }

    /* RB = ISOs */

    if (pressed(5)) {
        changePage("isos");
    }

    /* START = PESQUISA */

    if (pressed(9)) {
        search.focus();
    }

    /* D-PAD */

    if (pressed(12)) {
        moveSelection("up");
    }

    if (pressed(13)) {
        moveSelection("down");
    }

    if (pressed(14)) {
        moveSelection("left");
    }

    if (pressed(15)) {
        moveSelection("right");
    }

    /* ANALÓGICO ESQUERDO */

    const axisX =
        pad.axes[0] || 0;

    const axisY =
        pad.axes[1] || 0;

    const deadzone = 0.5;

    if (
        timestamp -
        state.lastMove >
        180
    ) {

        if (axisX < -deadzone) {

            moveSelection("left");

            state.lastMove =
                timestamp;
        }

        else if (axisX > deadzone) {

            moveSelection("right");

            state.lastMove =
                timestamp;
        }

        else if (axisY < -deadzone) {

            moveSelection("up");

            state.lastMove =
                timestamp;
        }

        else if (axisY > deadzone) {

            moveSelection("down");

            state.lastMove =
                timestamp;
        }
    }

    state.lastButtons =
        buttons;
}

/* =========================
   AVISO DO CONTROLE
========================= */

function showControllerMessage(message) {

    let notification =
        document.getElementById(
            "controllerNotification"
        );

    if (!notification) {

        notification =
            document.createElement("div");

        notification.id =
            "controllerNotification";

        notification.style.position =
            "fixed";

        notification.style.bottom =
            "25px";

        notification.style.left =
            "50%";

        notification.style.transform =
            "translateX(-50%)";

        notification.style.padding =
            "12px 20px";

        notification.style.borderRadius =
            "12px";

        notification.style.background =
            "#111715";

        notification.style.border =
            "1px solid rgba(139,245,45,.3)";

        notification.style.color =
            "#8bf52d";

        notification.style.fontWeight =
            "800";

        notification.style.fontSize =
            "13px";

        notification.style.zIndex =
            "9999";

        notification.style.boxShadow =
            "0 10px 40px rgba(0,0,0,.4)";

        document.body.appendChild(
            notification
        );
    }

    notification.textContent =
        message;

    clearTimeout(
        notification._timer
    );

    notification._timer =
        setTimeout(() => {
            notification.remove();
        }, 2500);
}

/* =========================
   HTML ESCAPE
========================= */

function escapeHTML(value) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}

/* =========================
   BOTÕES DA NAVEGAÇÃO
========================= */

document
    .querySelectorAll(".nav")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                changePage(
                    button.dataset.page
                );
            }
        );

    });

/* =========================
   INICIAR
========================= */

loadXBLA();

requestAnimationFrame(
    gamepadLoop
);