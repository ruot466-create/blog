import {
	AUTO_MODE,
	DARK_MODE,
	DEFAULT_THEME,
	LIGHT_MODE,
} from "@constants/constants.ts";
import { expressiveCodeConfig } from "@/config";
import type { LIGHT_DARK_MODE } from "@/types/config";

export function getDefaultHue(): number {
	const fallback = "250";
	const configCarrier = document.getElementById("config-carrier");
	return Number.parseInt(configCarrier?.dataset.hue || fallback, 10);
}

export function getHue(): number {
	const def = getDefaultHue();
	// 用户手动调过色，且站点配置自那以后没变过 → 沿用用户的选择；
	// 站主一改 config 里的 hue，存下的戳记就对不上，旧偏好自动失效。
	const stored = localStorage.getItem("hue");
	const stamp = localStorage.getItem("hue-config");
	if (stored && stamp === String(def)) {
		return Number.parseInt(stored, 10);
	}
	return def;
}

export function setHue(hue: number): void {
	localStorage.setItem("hue", String(hue));
	localStorage.setItem("hue-config", String(getDefaultHue()));
	const r = document.querySelector(":root") as HTMLElement;
	if (!r) {
		return;
	}
	r.style.setProperty("--hue", String(hue));
}

export function applyThemeToDocument(theme: LIGHT_DARK_MODE) {
	switch (theme) {
		case LIGHT_MODE:
			document.documentElement.classList.remove("dark");
			break;
		case DARK_MODE:
			document.documentElement.classList.add("dark");
			break;
		case AUTO_MODE:
			if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
			break;
	}

	// Set the theme for Expressive Code
	document.documentElement.setAttribute(
		"data-theme",
		expressiveCodeConfig.theme,
	);
}

export function setTheme(theme: LIGHT_DARK_MODE): void {
	localStorage.setItem("theme", theme);
	applyThemeToDocument(theme);
}

export function getStoredTheme(): LIGHT_DARK_MODE {
	return (localStorage.getItem("theme") as LIGHT_DARK_MODE) || DEFAULT_THEME;
}

/* ---------------- 字体 ---------------- */

export type FontChoice = "lxgw" | "pixel" | "system";

const FONT_CHOICES: FontChoice[] = ["lxgw", "pixel", "system"];

export function getFont(): FontChoice {
	const stored = localStorage.getItem("font") as FontChoice | null;
	return stored && FONT_CHOICES.includes(stored) ? stored : "lxgw";
}

export function setFont(font: FontChoice): void {
	localStorage.setItem("font", font);
	document.documentElement.setAttribute("data-font", font);
}
