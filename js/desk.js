(function () {
    "use strict";

    var pcOnly = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 700px)");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var htmlEl = document.documentElement;
    var main = document.querySelector("main");
    var resetBtn = document.getElementById("reset-ui");
    var els = Array.prototype.slice.call(document.querySelectorAll(".window"));
    if (!main || !resetBtn || !els.length) return;

    var MIN_W = 150;
    var MIN_BODY = 48;
    var KEEP = 80;

    var DIRS = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
    var frozen = false;
    var order = [];

    var items = els.map(function (el) {
        return {
            el: el,
            bar: el.querySelector(".titlebar"),
            geo: null,
            def: null,
            exp: null,
            collapsed: false,
            timer: 0
        };
    });

    function enabled() {
        return pcOnly.matches;
    }

    function copy(g) {
        return { left: g.left, top: g.top, width: g.width, height: g.height };
    }

    function clamp(v, lo, hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    function viewW() { return htmlEl.clientWidth; }
    function viewH() { return htmlEl.clientHeight; }

    function setGeo(it, g) {
        it.geo = copy(g);
        it.el.style.left = g.left + "px";
        it.el.style.top = g.top + "px";
        it.el.style.width = g.width + "px";
        it.el.style.height = g.height + "px";
    }

    function applyZ() {
        order.forEach(function (it, i) {
            it.el.style.zIndex = String(10 + i);
        });
    }

    function bringToFront(it) {
        if (!frozen) return;
        var i = order.indexOf(it);
        if (i !== -1) order.splice(i, 1);
        order.push(it);
        applyZ();
    }

    function differs(a, b) {
        return Math.abs(a.left - b.left) > 1 || Math.abs(a.top - b.top) > 1 ||
            Math.abs(a.width - b.width) > 1 || Math.abs(a.height - b.height) > 1;
    }

    function isDirty() {
        return frozen && items.some(function (it) {
            return it.collapsed || differs(it.geo, it.def);
        });
    }

    function freeze() {
        if (frozen) return;

        var mainHeight = main.getBoundingClientRect().height;
        var rects = items.map(function (it) { return it.el.getBoundingClientRect(); });
        main.style.minHeight = mainHeight + "px";
        items.forEach(function (it, i) {
            var r = rects[i];
            var w = Math.min(Math.ceil(r.width), viewW());
            var h = Math.min(Math.ceil(r.height), viewH());

            var g = {
                left: clamp(r.left, 0, viewW() - w),
                top: clamp(r.top, 0, viewH() - h),
                width: w,
                height: h
            };
            it.def = copy(g);
            setGeo(it, g);
            it.el.classList.add("is-free");
        });
        frozen = true;
        order = items.slice();
        applyZ();
    }

    function unfreeze() {
        items.forEach(function (it) {
            window.clearTimeout(it.timer);
            it.el.classList.remove("is-free", "collapsed", "animating");
            ["left", "top", "width", "height", "zIndex"].forEach(function (p) {
                it.el.style[p] = "";
            });
            it.collapsed = false;
            it.geo = null;
            it.def = null;
            it.exp = null;
            if (enabled()) it.bar.setAttribute("aria-expanded", "true");
        });
        main.style.minHeight = "";
        frozen = false;
        order = [];
        resetBtn.hidden = true;
    }

    function afterChange() {
        if (frozen && !isDirty()) unfreeze();
        resetBtn.hidden = !isDirty();
    }

    function keepInViewport(it) {
        var g = it.geo;
        var w = Math.min(g.width, viewW());
        var h = Math.min(g.height, viewH());
        var left = clamp(g.left, 0, viewW() - w);
        var top = clamp(g.top, 0, viewH() - h);
        if (w !== g.width || h !== g.height || left !== g.left || top !== g.top) {
            setGeo(it, { left: left, top: top, width: w, height: h });
        }
    }

    function toggle(it) {
        var el = it.el;
        var animate = !reduceMotion.matches;
        window.clearTimeout(it.timer);
        el.classList.remove("animating");

        if (!it.collapsed) {
            it.exp = copy(it.geo);
            it.collapsed = true;
            el.classList.add("collapsed");

            el.style.width = "max-content";
            el.style.height = "auto";
            var r = el.getBoundingClientRect();
            var small = { left: it.exp.left, top: it.exp.top, width: Math.ceil(r.width), height: Math.ceil(r.height) };
            el.style.width = it.exp.width + "px";
            el.style.height = it.exp.height + "px";
            void el.offsetWidth;
            if (animate) el.classList.add("animating");
            setGeo(it, small);
        } else {
            it.collapsed = false;
            el.classList.remove("collapsed");
            if (animate) {
                void el.offsetWidth;
                el.classList.add("animating");
            }
            setGeo(it, { left: it.geo.left, top: it.geo.top, width: it.exp.width, height: it.exp.height });
            keepInViewport(it);
        }
        it.bar.setAttribute("aria-expanded", String(!it.collapsed));

        if (animate) {
            it.timer = window.setTimeout(function () {
                el.classList.remove("animating");
                afterChange();
            }, 260);
        } else {
            afterChange();
        }
    }

    function onBarDown(it, e) {
        if (!enabled() || e.button !== 0) return;
        e.preventDefault();
        freeze();
        it.el.classList.remove("animating");
        bringToFront(it);

        var startX = e.clientX;
        var startY = e.clientY;
        var start = copy(it.geo);
        var moved = false;
        var bar = it.bar;
        try { bar.setPointerCapture(e.pointerId); } catch (err) {}

        function move(ev) {
            var dx = ev.clientX - startX;
            var dy = ev.clientY - startY;
            if (!moved) {
                if (Math.sqrt(dx * dx + dy * dy) < 4) return;
                moved = true;
                htmlEl.classList.add("ui-dragging");
            }
            setGeo(it, {
                left: clamp(start.left + dx, KEEP - start.width, viewW() - KEEP),
                top: clamp(start.top + dy, 0, Math.max(0, viewH() - bar.offsetHeight)),
                width: start.width,
                height: start.height
            });
        }

        function end(ev, cancelled) {
            bar.removeEventListener("pointermove", move);
            bar.removeEventListener("pointerup", up);
            bar.removeEventListener("pointercancel", cancel);
            try { bar.releasePointerCapture(e.pointerId); } catch (err) {}
            htmlEl.classList.remove("ui-dragging");
            if (!moved && !cancelled) {
                toggle(it);
            } else {
                afterChange();
            }
        }
        function up(ev) { end(ev, false); }
        function cancel(ev) { end(ev, true); }

        bar.addEventListener("pointermove", move);
        bar.addEventListener("pointerup", up);
        bar.addEventListener("pointercancel", cancel);
    }

    function onHandleDown(it, dir, handle, e) {
        if (!enabled() || e.button !== 0 || it.collapsed) return;
        e.preventDefault();
        freeze();
        it.el.classList.remove("animating");
        bringToFront(it);

        var startX = e.clientX;
        var startY = e.clientY;
        var s = copy(it.geo);
        var minH = it.bar.offsetHeight + MIN_BODY;
        htmlEl.classList.add("ui-dragging");
        try { handle.setPointerCapture(e.pointerId); } catch (err) {}

        function move(ev) {
            var dx = ev.clientX - startX;
            var dy = ev.clientY - startY;
            var g = copy(s);
            if (dir.indexOf("e") !== -1) g.width = Math.max(MIN_W, s.width + dx);
            if (dir.indexOf("s") !== -1) g.height = Math.max(minH, s.height + dy);
            if (dir.indexOf("w") !== -1) {
                g.width = Math.max(MIN_W, s.width - dx);
                g.left = s.left + (s.width - g.width);
            }
            if (dir.indexOf("n") !== -1) {
                g.height = Math.max(minH, s.height - dy);
                g.top = s.top + (s.height - g.height);
            }

            if (dir.indexOf("w") !== -1 && g.left < 0) { g.width += g.left; g.left = 0; }
            if (dir.indexOf("n") !== -1 && g.top < 0) { g.height += g.top; g.top = 0; }
            if (dir.indexOf("e") !== -1 && g.left + g.width > viewW()) g.width = viewW() - g.left;
            if (dir.indexOf("s") !== -1 && g.top + g.height > viewH()) g.height = viewH() - g.top;
            setGeo(it, g);
        }

        function end() {
            handle.removeEventListener("pointermove", move);
            handle.removeEventListener("pointerup", end);
            handle.removeEventListener("pointercancel", end);
            try { handle.releasePointerCapture(e.pointerId); } catch (err) {}
            htmlEl.classList.remove("ui-dragging");
            afterChange();
        }

        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", end);
        handle.addEventListener("pointercancel", end);
    }

    items.forEach(function (it) {
        it.bar.addEventListener("pointerdown", function (e) { onBarDown(it, e); });

        it.bar.addEventListener("keydown", function (e) {
            if (!enabled() || (e.key !== "Enter" && e.key !== " ")) return;
            e.preventDefault();
            freeze();
            bringToFront(it);
            toggle(it);
        });

        it.el.addEventListener("pointerdown", function () {
            if (enabled()) bringToFront(it);
        });

        DIRS.forEach(function (dir) {
            var handle = document.createElement("div");
            handle.className = "rz rz-" + dir;
            handle.setAttribute("aria-hidden", "true");
            handle.addEventListener("pointerdown", function (e) { onHandleDown(it, dir, handle, e); });
            it.el.appendChild(handle);
        });
    });

    resetBtn.addEventListener("click", function () {
        unfreeze();
    });

    window.addEventListener("resize", function () {
        if (!frozen) return;
        if (!isDirty()) {
            unfreeze();
            return;
        }
        items.forEach(keepInViewport);
        afterChange();
    });

    function setEnabled() {
        var on = enabled();
        htmlEl.classList.toggle("desk-on", on);
        items.forEach(function (it) {
            if (on) {
                it.bar.setAttribute("role", "button");
                it.bar.setAttribute("tabindex", "0");
                it.bar.setAttribute("aria-expanded", String(!it.collapsed));
            } else {
                it.bar.removeAttribute("role");
                it.bar.removeAttribute("tabindex");
                it.bar.removeAttribute("aria-expanded");
            }
        });
        if (!on) unfreeze();
    }

    if (pcOnly.addEventListener) {
        pcOnly.addEventListener("change", setEnabled);
    } else if (pcOnly.addListener) {
        pcOnly.addListener(setEnabled);
    }
    setEnabled();
})();
