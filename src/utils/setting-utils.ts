import {
	AUTO_MODE,
	DARK_MODE,
	DEFAULT_THEME,
	LIGHT_MODE,
} from "@constants/constants.ts";
import { expressiveCodeConfig } from "@/config";
import type { LIGHT_DARK_MODE } from "@/types/config";

// Settings remain usable in private/embedded contexts that deny persistence.
const sessionSettings = new Map<string, string>();

function readSetting(key: string): string | null {
	if (sessionSettings.has(key)) return sessionSettings.get(key) ?? null;
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function writeSetting(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
		sessionSettings.delete(key);
	} catch {
		sessionSettings.set(key, value);
	}
}

export function getDefaultHue(): number {
	const fallback = "250";
	const configCarrier = document.getElementById("config-carrier");
	return Number.parseInt(configCarrier?.dataset.hue || fallback, 10);
}

export function getHue(): number {
	const def = getDefaultHue();
	// 用户手动调过色，且站点配置自那以后没变过 → 沿用用户的选择；
	// 站主一改 config 里的 hue，存下的戳记就对不上，旧偏好自动失效。
	const stored = readSetting("hue");
	const stamp = readSetting("hue-config");
	const parsed = Number(stored);
	if (
		stored !== null &&
		stamp === String(def) &&
		Number.isFinite(parsed) &&
		parsed >= 0 &&
		parsed <= 360
	) {
		return parsed;
	}
	return def;
}

export function setHue(hue: number): void {
	const value =
		Number.isFinite(hue) && hue >= 0 && hue <= 360 ? hue : getDefaultHue();
	writeSetting("hue", String(value));
	writeSetting("hue-config", String(getDefaultHue()));
	const r = document.querySelector(":root") as HTMLElement;
	if (!r) {
		return;
	}
	r.style.setProperty("--hue", String(value));
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
	writeSetting("theme", theme);
	applyThemeToDocument(theme);
}

export function getStoredTheme(): LIGHT_DARK_MODE {
	const stored = readSetting("theme");
	return stored === LIGHT_MODE || stored === DARK_MODE || stored === AUTO_MODE
		? stored
		: DEFAULT_THEME;
}

/* ---------------- 字体 ---------------- */

export type FontChoice = "lxgw" | "pixel" | "system";

const FONT_CHOICES: FontChoice[] = ["lxgw", "pixel", "system"];

export function getFont(): FontChoice {
	const stored = readSetting("font") as FontChoice | null;
	return stored && FONT_CHOICES.includes(stored) ? stored : "lxgw";
}

export function setFont(font: FontChoice): void {
	writeSetting("font", font);
	document.documentElement.setAttribute("data-font", font);
}
