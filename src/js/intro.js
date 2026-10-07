const intro = document.querySelector("[data-site-intro]");
const enterButtons = document.querySelectorAll("[data-enter-portfolio]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (intro && enterButtons.length && !document.documentElement.classList.contains("portfolio-entered")) {
    const enterPortfolio = (event) => {
        event.preventDefault();

        const destination = new URL(event.currentTarget.href, window.location.href);
        const staysOnHome = destination.pathname === window.location.pathname && destination.hash;

        try {
            sessionStorage.setItem("portfolio-entered", "true");
        } catch (error) {
            console.warn("The intro state could not be saved.", error);
        }

        // Destination links should navigate immediately. Hiding the intro first
        // briefly exposed the Home page before the Projects page loaded.
        if (!staysOnHome) {
            window.location.assign(destination.href);
            return;
        }

        intro.classList.add("is-leaving");

        window.setTimeout(() => {
            document.documentElement.classList.add("portfolio-entered");
            document.querySelector("#main-content")?.focus({ preventScroll: true });
        }, reducedMotion ? 0 : 850);
    };

    enterButtons.forEach((button) => button.addEventListener("click", enterPortfolio));
}

if (!reducedMotion) {
    document.querySelectorAll(".intro-magnetic").forEach((button) => {
        button.addEventListener("pointermove", (event) => {
            const rect = button.getBoundingClientRect();
            const x = event.clientX - rect.left - rect.width / 2;
            const y = event.clientY - rect.top - rect.height / 2;
            button.style.transform = `translate(${x * 0.12}px, ${y * 0.18}px) scale(1.025)`;
        });
        button.addEventListener("pointerleave", () => {
            button.style.transform = "";
        });
    });
}
