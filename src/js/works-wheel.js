const wheels = document.querySelectorAll("[data-works-wheel]");

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (start, end, amount) => start + (end - start) * amount;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

const CARD_RATIO = 1.45;
const STEP = 40;
const DRUM_RADIUS = 2.22;
const LENS = 2.7;
const RING_RADIUS = 1.14;
const BOW = 1.82;
const CULL_DISTANCE = 1.6;
const WHEEL_UNITS = 900;
const DRAG_UNITS = 420;
const SETTLE_DELAY = 140;
const EASE = 0.12;

const bowAt = (degrees, radius) => -radius * (1 - Math.cos(toRadians(degrees)));

function placeCard(ringDegrees, drumDegrees, ringRadius, drumRadius, bow, morph) {
    return [
        `translateX(${morph * bowAt(drumDegrees, bow)}px)`,
        `rotateZ(${(1 - morph) * ringDegrees}deg)`,
        `translateY(${-(1 - morph) * ringRadius}px)`,
        `rotateX(${morph * drumDegrees}deg)`,
        `translateZ(${morph * drumRadius}px)`
    ].join(" ");
}

wheels.forEach((wheel) => {
    const stage = wheel.querySelector("[data-works-wheel-stage]");
    const drum = wheel.querySelector("[data-works-wheel-drum]");
    const cards = [...wheel.querySelectorAll("[data-works-wheel-card]")];
    const faces = [...wheel.querySelectorAll("[data-works-wheel-face]")];
    const label = wheel.querySelector("[data-works-wheel-label]");
    const current = wheel.querySelector("[data-works-wheel-current]");
    const currentNumber = wheel.querySelector("[data-works-wheel-number]");
    const currentTitle = wheel.querySelector("[data-works-wheel-title]");
    const currentMetric = wheel.querySelector("[data-works-wheel-metric]");
    const indexButtons = [...wheel.querySelectorAll("[data-works-wheel-index]")];
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!stage || !drum || !cards.length) return;

    const last = cards.length - 1;
    let turn = 0;
    let target = 0;
    let active = -1;
    let animationFrame = 0;
    let settleTimer = 0;
    let dragStart = null;
    let draggedDistance = 0;
    let metrics = null;

    function measure() {
        const width = stage.clientWidth;
        const height = stage.clientHeight;
        const narrow = width < 600;
        const cardHeightRatio = narrow ? 0.42 : 0.38;
        const cardWidthLimit = narrow ? 0.72 : 0.34;
        const cardWidth = Math.min(height * cardHeightRatio * CARD_RATIO, width * cardWidthLimit);
        const cardHeight = cardWidth / CARD_RATIO;
        const ringRadius = cardHeight * RING_RADIUS;
        const ringScale = clamp(
            (((2 * Math.PI * ringRadius) / cards.length) * 0.82) / (cardWidth || 1),
            0.16,
            1
        );

        metrics = {
            cardWidth,
            cardHeight,
            ringRadius,
            ringScale,
            drumRadius: cardHeight * DRUM_RADIUS,
            bow: cardHeight * BOW,
            depth: cardHeight * LENS
        };

        stage.style.perspective = `${metrics.depth}px`;
        cards.forEach((card) => {
            card.style.width = `${metrics.cardWidth}px`;
            card.style.height = `${metrics.cardHeight}px`;
            card.style.marginLeft = `${-metrics.cardWidth / 2}px`;
            card.style.marginTop = `${-metrics.cardHeight / 2}px`;
        });
        draw();
    }

    function updateActive(nextActive) {
        if (nextActive === active && currentTitle.textContent === cards[nextActive].dataset.title) return;
        active = nextActive;
        const project = cards[active];
        currentNumber.textContent = project.dataset.number || "";
        currentTitle.textContent = project.dataset.title;
        currentMetric.textContent = project.dataset.metric || "";

        cards.forEach((card, index) => {
            card.classList.toggle("is-active", index === active);
            card.setAttribute("aria-current", index === active ? "true" : "false");
        });
        indexButtons.forEach((button, index) => {
            button.classList.toggle("is-active", index === active);
            if (index === active) button.setAttribute("aria-current", "true");
            else button.removeAttribute("aria-current");
        });
    }

    function draw() {
        if (!metrics) return;

        const morph = clamp(turn, 0, 1);
        const position = Math.max(0, turn - 1);

        drum.style.transform = `translateZ(${-morph * metrics.drumRadius}px)`;
        cards.forEach((card, index) => {
            const distance = index - position;
            const drumDegrees = distance * STEP;
            card.style.transform = placeCard(
                distance * (360 / cards.length),
                drumDegrees,
                metrics.ringRadius,
                metrics.drumRadius,
                metrics.bow,
                morph
            );
            card.style.opacity = morph > 0.5 && Math.abs(distance) > CULL_DISTANCE ? "0" : "1";
            card.style.zIndex = `${Math.round(100 - Math.abs(distance) * 2)}`;
            card.style.pointerEvents = morph > 0.5 && Math.abs(distance) > 0.55 ? "none" : "auto";
            faces[index].style.transform = `scale(${lerp(metrics.ringScale, 1, morph)})`;
        });

        label.style.opacity = `${1 - morph}`;
        current.style.opacity = `${morph}`;
        wheel.classList.toggle("is-turned", morph > 0.5);
        updateActive(clamp(Math.round(position), 0, last));
    }

    function animate() {
        animationFrame = 0;
        const gap = target - turn;
        if (Math.abs(gap) < 0.0005 || reducedMotionQuery.matches) {
            turn = target;
            draw();
            return;
        }
        turn += gap * EASE;
        draw();
        animationFrame = requestAnimationFrame(animate);
    }

    function moveTo(next) {
        target = clamp(next, 0, last + 1);
        if (!animationFrame) animationFrame = requestAnimationFrame(animate);
    }

    function settle() {
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => moveTo(Math.round(target)), SETTLE_DELAY);
    }

    stage.addEventListener("wheel", (event) => {
        const delta = event.deltaMode === 1 ? event.deltaY * 18 : event.deltaY;
        const next = target + delta / WHEEL_UNITS;
        if (next > 0 && next < last + 1) event.preventDefault();
        moveTo(next);
        settle();
    }, { passive: false });

    stage.addEventListener("pointerdown", (event) => {
        if (event.target.closest("[data-works-wheel-index], [data-works-wheel-card]")) return;
        dragStart = event.clientY;
        draggedDistance = 0;
        stage.setPointerCapture(event.pointerId);
    });

    stage.addEventListener("pointermove", (event) => {
        if (dragStart === null) return;
        const delta = dragStart - event.clientY;
        draggedDistance += Math.abs(delta);
        moveTo(target + delta / DRAG_UNITS);
        dragStart = event.clientY;
    });

    function finishDrag() {
        if (dragStart === null) return;
        dragStart = null;
        if (target > 1) moveTo(Math.round(target));
    }

    stage.addEventListener("pointerup", finishDrag);
    stage.addEventListener("pointercancel", finishDrag);

    stage.addEventListener("click", (event) => {
        if (draggedDistance > 8 && event.target.closest("[data-works-wheel-card]")) {
            event.preventDefault();
            draggedDistance = 0;
        }
    }, true);

    stage.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowRight") {
            moveTo(Math.round(target) + 1);
        } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
            moveTo(Math.round(target) - 1);
        } else if (event.key === "Home") {
            moveTo(0);
        } else if (event.key === "End") {
            moveTo(last + 1);
        } else {
            return;
        }
        event.preventDefault();
    });

    indexButtons.forEach((button, index) => {
        button.addEventListener("click", () => moveTo(index + 1));
    });

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(stage);
    reducedMotionQuery.addEventListener("change", () => moveTo(target));
    updateActive(0);
    measure();
});
