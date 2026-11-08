(function () {
    "use strict";

    var SCENE_W = 320;
    var SCENE_H = 180;
    var CABIN_X = 250;

    var WINDOWS_X = 250;
    var WINDOWS_Y = 128;

    var CHIMNEY_X = 264;
    var CHIMNEY_Y = 98;

    var root = document.documentElement;
    var scene = document.getElementById("scene");

    function placeGlow() {
        var vw = (scene && scene.clientWidth) || window.innerWidth;
        var vh = (scene && scene.clientHeight) || window.innerHeight;
        var scale = Math.max(vw / SCENE_W, vh / SCENE_H);
        var offsetX = (vw - SCENE_W * scale) * (CABIN_X / SCENE_W);
        var offsetY = vh - SCENE_H * scale;
        root.style.setProperty("--glow-x", offsetX + WINDOWS_X * scale + "px");
        root.style.setProperty("--glow-y", offsetY + WINDOWS_Y * scale + "px");
        root.style.setProperty("--glow-size", 70 * scale + "px");
        root.style.setProperty("--smoke-x", offsetX + CHIMNEY_X * scale + "px");
        root.style.setProperty("--smoke-y", offsetY + CHIMNEY_Y * scale + "px");
        root.style.setProperty("--u", scale + "px");
    }

    placeGlow();

    window.addEventListener("resize", placeGlow);
    if (scene && window.ResizeObserver) {
        new ResizeObserver(placeGlow).observe(scene);
    }

    var clock = document.getElementById("local-time");
    var diffEl = document.getElementById("time-diff");
    var TIME_ZONE = "Europe/Berlin";
    var formatter = null;
    var partsFormatter = null;
    try {
        formatter = new Intl.DateTimeFormat("en-GB", {
            timeZone: TIME_ZONE,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23"
        });
        partsFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: TIME_ZONE,
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hourCycle: "h23"
        });
    } catch (e) {
        formatter = null;
        partsFormatter = null;
    }

    function offsetFromVisitor(now) {
        var parts = {};
        partsFormatter.formatToParts(now).forEach(function (p) {
            parts[p.type] = parseInt(p.value, 10);
        });
        var asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
        var zoneOffset = Math.round((asUtc - (now.getTime() - now.getMilliseconds())) / 60000);
        var visitorOffset = -now.getTimezoneOffset();
        return zoneOffset - visitorOffset;
    }

    function describeDifference(minutes) {
        if (typeof minutes !== "number" || !isFinite(minutes)) return "";
        if (minutes === 0) return "that's the same time as yours";
        var abs = Math.abs(minutes);
        var h = Math.floor(abs / 60);
        var m = abs % 60;
        var amount;
        if (m === 0) {
            amount = h + (h === 1 ? " hour" : " hours");
        } else if (h === 0) {
            amount = m + " minutes";
        } else {
            amount = h + "h " + m + "m";
        }
        return "that's " + amount + (minutes > 0 ? " ahead of you" : " behind you");
    }

    function tick() {
        if (clock && formatter) {
            var now = new Date();
            clock.textContent = formatter.format(now);
            clock.setAttribute("datetime", now.toISOString());
            if (diffEl && partsFormatter) {
                try {
                    diffEl.textContent = describeDifference(offsetFromVisitor(now));
                } catch (e) {
                    diffEl.textContent = "";
                }
            }
        }
    }

    tick();

    (function schedule() {
        window.setTimeout(function () {
            tick();
            schedule();
        }, 1000 - (Date.now() % 1000) + 5);
    })();
})();
