const canvas = document.querySelector("[data-ambient-canvas]");
const projectIndex = document.body.classList.contains("project-index-page");

if (canvas && !projectIndex) {
    const context = canvas.getContext("2d", { alpha: true });
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const pointer = { x: 0.72, y: 0.48, targetX: 0.72, targetY: 0.48 };
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let ink = "255,255,255";
    let darkSurface = true;
    let frameId = 0;
    let lastFrame = 0;

    const updatePalette = () => {
        const values = getComputedStyle(document.body).color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
        darkSurface = values ? values.reduce((total, value) => total + value, 0) / 3 > 127 : true;
        ink = darkSurface ? "255,255,255" : "0,0,0";
    };

    const resize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        updatePalette();

        if (reducedMotionQuery.matches) {
            draw(0);
        }
    };

    const pointOnSignal = (y, index, lineCount, time) => {
        const progress = (y + 40) / (height + 80);
        const clampedProgress = Math.max(0, Math.min(1, progress));
        const envelope = Math.sin(clampedProgress * Math.PI);
        const mobile = width < 680;
        const center = width * (mobile ? 0.74 : 0.76) + (pointer.x - 0.5) * width * 0.08;
        const spread = Math.max(mobile ? 7 : 9, width * (mobile ? 0.017 : 0.009));
        const lineOffset = (index - (lineCount - 1) / 2) * spread;
        const slowWave = Math.sin(clampedProgress * Math.PI * 2.15 + time * 0.34 + index * 0.055);
        const fineWave = Math.sin(clampedProgress * Math.PI * 5.1 - time * 0.48 + index * 0.1);
        const breathing = Math.sin(time * 0.22 + clampedProgress * Math.PI) * width * 0.022;
        const amplitude = width * (mobile ? 0.13 : 0.095);
        const pointerLift = (pointer.y - 0.5) * height * 0.08 * envelope;
        const adjustedY = y + pointerLift * Math.sin(clampedProgress * Math.PI * 1.35);
        const x = center + lineOffset + envelope * (slowWave * amplitude + fineWave * amplitude * 0.24 + breathing);

        return { x, y: adjustedY };
    };

    const draw = (timestamp) => {
        const time = timestamp * 0.001;
        context.clearRect(0, 0, width, height);
        context.globalCompositeOperation = darkSurface ? "screen" : "multiply";

        pointer.x += (pointer.targetX - pointer.x) * 0.035;
        pointer.y += (pointer.targetY - pointer.y) * 0.035;

        const glowX = width * 0.76 + (pointer.x - 0.5) * width * 0.08;
        const glowY = height * 0.48 + (pointer.y - 0.5) * height * 0.08;
        const glowRadius = Math.max(width, height) * 0.52;
        const glow = context.createRadialGradient(glowX, glowY, 0, glowX, glowY, glowRadius);
        glow.addColorStop(0, `rgba(${ink},${darkSurface ? 0.095 : 0.07})`);
        glow.addColorStop(0.46, `rgba(${ink},${darkSurface ? 0.035 : 0.025})`);
        glow.addColorStop(1, `rgba(${ink},0)`);
        context.fillStyle = glow;
        context.fillRect(0, 0, width, height);

        const lineCount = width < 680 ? 17 : 27;
        const sampleStep = Math.max(7, Math.round(height / 120));

        context.lineWidth = 0.65;
        context.strokeStyle = `rgba(${ink},${darkSurface ? 0.045 : 0.035})`;
        for (let row = 0; row <= 13; row += 1) {
            const y = (height / 13) * row - 16 + Math.sin(time * 0.3 + row) * 8;
            context.beginPath();
            for (let index = 0; index < lineCount; index += 1) {
                const point = pointOnSignal(y, index, lineCount, time);
                if (index === 0) context.moveTo(point.x, point.y);
                else context.lineTo(point.x, point.y);
            }
            context.stroke();
        }

        for (let index = 0; index < lineCount; index += 1) {
            const distanceFromCenter = Math.abs(index - (lineCount - 1) / 2) / ((lineCount - 1) / 2);
            const alpha = (1 - distanceFromCenter * 0.68) * (darkSurface ? 0.19 : 0.15);
            context.beginPath();

            for (let y = -40; y <= height + 40; y += sampleStep) {
                const point = pointOnSignal(y, index, lineCount, time);
                if (y === -40) context.moveTo(point.x, point.y);
                else context.lineTo(point.x, point.y);
            }

            context.lineWidth = index === Math.floor(lineCount / 2) ? 1.45 : 0.72;
            context.strokeStyle = `rgba(${ink},${alpha})`;
            context.shadowColor = `rgba(${ink},${alpha * 0.75})`;
            context.shadowBlur = index === Math.floor(lineCount / 2) ? 18 : 4;
            context.stroke();
        }

        context.shadowBlur = 0;
        context.globalCompositeOperation = "source-over";
    };

    const animate = (timestamp) => {
        if (timestamp - lastFrame >= 1000 / 30) {
            draw(timestamp);
            lastFrame = timestamp;
        }
        frameId = window.requestAnimationFrame(animate);
    };

    const restartAnimation = () => {
        window.cancelAnimationFrame(frameId);
        if (reducedMotionQuery.matches || document.hidden) {
            draw(0);
            return;
        }
        frameId = window.requestAnimationFrame(animate);
    };

    window.addEventListener("pointermove", (event) => {
        pointer.targetX = event.clientX / Math.max(width, 1);
        pointer.targetY = event.clientY / Math.max(height, 1);
    }, { passive: true });
    window.addEventListener("pointerleave", () => {
        pointer.targetX = 0.72;
        pointer.targetY = 0.48;
    });
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", restartAnimation);
    reducedMotionQuery.addEventListener("change", restartAnimation);
    systemThemeQuery.addEventListener("change", () => {
        updatePalette();
        if (reducedMotionQuery.matches) draw(0);
    });
    new MutationObserver(() => {
        updatePalette();
        if (reducedMotionQuery.matches) draw(0);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    resize();
    restartAnimation();
}
