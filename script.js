const state = {
    page: "xbla",
    xbla: [],
    isos: [],
    filtered: [],
    selected: 0,
    visibleCount: 60
};

const grid = document.getElementById("grid");
const search = document.getElementById("search");
const loading = document.getElementById("loading");
const count = document.getElementById("count");
const resultCount = document.getElementById("resultCount");
const title = document.getElementById("title");
const sectionType = document.getElementById("sectionType");
const source = document.getElementById("source");
const loadMoreButton = document.getElementById("loadMore");
const toast = document.getElementById("toast");
const toastText = document.getElementById("toastText");

let previousButtons = [];
let lastDpadTime = 0;


/* =========================================
   XBLA
========================================= */

async function loadXBLA() {

    loading.style.display = "flex";
    grid.innerHTML = "";

    try {

        const response = await fetch("/api/xbla");

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Resposta inválida");
        }

        state.xbla = data;
        state.filtered = data;
        state.selected = 0;
        state.visibleCount = 60;

        render();

    } catch (error) {

        console.error("XBLA:", error);

        showError(
            "Erro ao carregar o catálogo XBLA."
        );

    }
}


/* =========================================
   ISOS
========================================= */

async function loadISOs() {

    loading.style.display = "flex";
    grid.innerHTML = "";

    try {

        const response = await fetch("/api/isos");

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Resposta inválida");
        }

        state.isos = data;
        state.filtered = data;
        state.selected = 0;
        state.visibleCount = 60;

        render();

    } catch (error) {

        console.error("ISOS:", error);

        showError(
            "Erro ao carregar o catálogo ISO."
        );

    }
}


/* =========================================
   ERRO
========================================= */

function showError(message) {

    loading.style.display = "none";

    grid.innerHTML = `
        <div class="empty">
            <h3>${escapeHTML(message)}</h3>

            <p>
                Tente atualizar a página.
            </p>
        </div>
    `;

}


/* =========================================
   RENDER
========================================= */

function render() {

    loading.style.display = "none";

    const games = state.filtered;

    count.textContent =
        `${games.length.toLocaleString("pt-BR")} jogos`;

    resultCount.textContent =
        `${games.length.toLocaleString("pt-BR")} resultados`;


    if (!games.length) {

        grid.innerHTML = `
            <div class="empty">

                <h3>
                    Nenhum jogo encontrado
                </h3>

                <p>
                    Tente pesquisar por outro nome.
                </p>

            </div>
        `;

        loadMoreButton.style.display = "none";

        return;
    }


    if (state.selected < 0) {
        state.selected = 0;
    }


    if (state.selected >= games.length) {
        state.selected = games.length - 1;
    }


    const visible =
        games.slice(0, state.visibleCount);


    grid.innerHTML = visible.map(
        (game, index) => {

            const letter =
                escapeHTML(
                    game.name
                        .charAt(0)
                        .toUpperCase()
                );


            const name =
                escapeHTML(game.name);


            const size =
                escapeHTML(
                    game.size || "Xbox 360"
                );


            /*
             * BOTÃO DE DOWNLOAD
             */

            return `
                <article
                    class="card ${
                        index === state.selected
                            ? "selected"
                            : ""
                    }"
                    data-index="${index}"
                >

                    <div class="cover">

                        <div class="cover-letter">
                            ${letter}
                        </div>

                    </div>


                    <div class="info">

                        <h3>
                            ${name}
                        </h3>


                        <div class="meta">
                            ${size}
                        </div>


                        <a
                            class="download"
                            href="${escapeAttribute(game.url)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ⬇ Download
                        </a>

                    </div>

                </article>
            `;

        }
    ).join("");


    if (state.visibleCount < games.length) {

        loadMoreButton.style.display = "flex";

    } else {

        loadMoreButton.style.display = "none";

    }


    updateSelection(false);
}


/* =========================================
   MOSTRAR MAIS
========================================= */

function loadMore() {

    state.visibleCount += 60;

    render();

}


/* =========================================
   SELEÇÃO
========================================= */

function updateSelection(scroll = true) {

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


    if (selected && scroll) {

        selected.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
        });

        showToast(
            state.filtered[state.selected]?.name
        );
    }

}


/* =========================================
   DOWNLOAD DO JOGO SELECIONADO
========================================= */

function openSelectedGame() {

    const game =
        state.filtered[state.selected];


    if (!game) {
        return;
    }


    window.open(
        game.url,
        "_blank",
        "noopener,noreferrer"
    );

}


/* =========================================
   TOAST
========================================= */

let toastTimer;

function showToast(name) {

    if (!name) {
        return;
    }


    toastText.textContent = name;

    toast.classList.add("show");


    clearTimeout(toastTimer);


    toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 1200);

}


/* =========================================
   COLUNAS
========================================= */

function getColumns() {

    const cards =
        grid.querySelectorAll(".card");


    if (cards.length <= 1) {
        return 1;
    }


    const firstTop =
        cards[0]
            .getBoundingClientRect()
            .top;


    let columns = 1;


    for (
        let i = 1;
        i < cards.length;
        i++
    ) {

        const top =
            cards[i]
                .getBoundingClientRect()
                .top;


        if (
            Math.abs(top - firstTop) < 10
        ) {

            columns++;

        } else {

            break;

        }

    }


    return columns;
}


/* =========================================
   NAVEGAÇÃO
========================================= */

function moveSelection(direction) {

    const games =
        state.filtered;


    if (!games.length) {
        return;
    }


    const columns =
        getColumns();


    let next =
        state.selected;


    switch (direction) {

        case "left":
            next--;
            break;

        case "right":
            next++;
            break;

        case "up":
            next -= columns;
            break;

        case "down":
            next += columns;
            break;

    }


    if (next < 0) {
        next = 0;
    }


    if (next >= games.length) {
        next = games.length - 1;
    }


    if (
        next >= state.visibleCount - 5 &&
        state.visibleCount < games.length
    ) {

        state.visibleCount += 60;

        render();
    }


    if (next !== state.selected) {

        state.selected = next;

        updateSelection(true);
    }

}


/* =========================================
   TROCAR ABA
========================================= */

async function changePage(page) {

    state.page = page;
    state.selected = 0;
    state.visibleCount = 60;

    search.value = "";


    document
        .querySelectorAll(".nav")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page === page
            );

        });


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

        return;
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


/* =========================================
   PESQUISA
========================================= */

search.addEventListener("input", () => {

    const term =
        search.value
            .toLowerCase()
            .trim();


    const games =
        state.page === "xbla"
            ? state.xbla
            : state.isos;


    state.filtered =
        games.filter(game =>
            game.name
                .toLowerCase()
                .includes(term)
        );


    state.selected = 0;
    state.visibleCount = 60;

    render();

});


/* =========================================
   CLIQUE
========================================= */

grid.addEventListener("click", event => {

    const card =
        event.target.closest(".card");


    if (!card) {
        return;
    }


    /*
     * Se clicou no botão Download,
     * deixa o link funcionar normalmente.
     */

    if (
        event.target.closest(".download")
    ) {

        return;
    }


    const index =
        Number(card.dataset.index);


    state.selected = index;

    updateSelection(false);

});


/* =========================================
   TECLADO
========================================= */

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

    }

});


/* =========================================
   BOTÕES XBLA / ISO
========================================= */

document
    .querySelectorAll(".nav")
    .forEach(button => {

        button.addEventListener("click", () => {

            changePage(
                button.dataset.page
            );

        });

    });


/* =========================================
   GAMEPAD
========================================= */

/*

0  = A
1  = B
2  = X
3  = Y
4  = LB
5  = RB
6  = LT
7  = RT
8  = Back
9  = Start
10 = LS
11 = RS
12 = D-Pad Up
13 = D-Pad Down
14 = D-Pad Left
15 = D-Pad Right

*/


function getGamepad() {

    if (!navigator.getGamepads) {
        return null;
    }


    const pads =
        navigator.getGamepads();


    for (const pad of pads) {

        if (pad) {
            return pad;
        }

    }


    return null;
}


function buttonPressed(
    pad,
    index
) {

    const current =
        !!pad.buttons[index]?.pressed;


    const previous =
        !!previousButtons[index];


    return current && !previous;
}


function handleGamepad() {

    const pad =
        getGamepad();


    if (!pad) {
        return;
    }


    const now =
        Date.now();


    /* LB = XBLA */

    if (
        buttonPressed(pad, 4)
    ) {

        changePage("xbla");

    }


    /* RB = ISOS */

    if (
        buttonPressed(pad, 5)
    ) {

        changePage("isos");

    }


    /* A = DOWNLOAD */

    if (
        buttonPressed(pad, 0)
    ) {

        openSelectedGame();

    }


    /* D-PAD */

    if (
        now - lastDpadTime >= 180
    ) {

        if (
            buttonPressed(pad, 12)
        ) {

            moveSelection("up");

            lastDpadTime = now;

        }

        else if (
            buttonPressed(pad, 13)
        ) {

            moveSelection("down");

            lastDpadTime = now;

        }

        else if (
            buttonPressed(pad, 14)
        ) {

            moveSelection("left");

            lastDpadTime = now;

        }

        else if (
            buttonPressed(pad, 15)
        ) {

            moveSelection("right");

            lastDpadTime = now;

        }

    }


    previousButtons =
        pad.buttons.map(
            button => button.pressed
        );

}


/* =========================================
   LOOP CONTROLE
========================================= */

function gamepadLoop() {

    handleGamepad();

    requestAnimationFrame(
        gamepadLoop
    );

}


requestAnimationFrame(
    gamepadLoop
);


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function escapeAttribute(value) {

    return escapeHTML(value);

}


/* =========================================
   INICIAR
========================================= */

changePage("xbla");