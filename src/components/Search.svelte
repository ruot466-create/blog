<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import { onMount, tick } from "svelte";
import type { SearchResult } from "@/global";

let keyword = "";
let result: SearchResult[] = [];
let status: "idle" | "loading" | "ready" | "error" | "dev" = "idle";
let initialized = false;
let requestId = 0;
let searchTimer: ReturnType<typeof setTimeout>;
let mobileInput: HTMLInputElement;

const setPanelVisibility = (show: boolean): void => {
	const panel = document.getElementById("search-panel");
	panel?.classList.toggle("float-panel-closed", !show);
	document
		.getElementById("search-switch")
		?.setAttribute("aria-expanded", String(show));
};

const togglePanel = async () => {
	const panel = document.getElementById("search-panel");
	const show = panel?.classList.contains("float-panel-closed");
	setPanelVisibility(!!show);
	if (show) {
		await tick();
		mobileInput?.focus();
	}
};

const search = async (query: string, id: number): Promise<void> => {
	if (import.meta.env.DEV) {
		status = "dev";
		return;
	}
	try {
		if (window.pagefindLoadError || !window.pagefind) {
			throw new Error("Search index is unavailable");
		}
		const response = await window.pagefind.search(query);
		const items = await Promise.all(
			response.results.map((item) => item.data()),
		);
		if (id !== requestId) return;
		result = items;
		status = "ready";
	} catch (error) {
		if (id !== requestId) return;
		console.error("Search error:", error);
		result = [];
		status = "error";
	}
};

const scheduleSearch = (value: string): void => {
	const id = ++requestId;
	clearTimeout(searchTimer);
	result = [];
	const query = value.trim();
	if (!query) {
		status = "idle";
		// Keep the mobile input accessible while clearing a search.
		if (window.matchMedia("(min-width: 1024px)").matches)
			setPanelVisibility(false);
		return;
	}
	status = "loading";
	setPanelVisibility(true);
	if (initialized) searchTimer = setTimeout(() => search(query, id), 180);
};

onMount(() => {
	const initializeSearch = () => {
		if (initialized) scheduleSearch(keyword);
		else initialized = true;
	};
	if (import.meta.env.DEV || window.pagefind || window.pagefindLoadError) {
		initializeSearch();
	}
	document.addEventListener("pagefindready", initializeSearch);
	document.addEventListener("pagefindloaderror", initializeSearch);
	const fallback = setTimeout(() => {
		if (!initialized) initializeSearch();
	}, 2000);
	return () => {
		++requestId;
		clearTimeout(searchTimer);
		clearTimeout(fallback);
		document.removeEventListener("pagefindready", initializeSearch);
		document.removeEventListener("pagefindloaderror", initializeSearch);
	};
});

$: if (initialized) scheduleSearch(keyword);
</script>

<!-- search bar for desktop view -->
<div id="search-bar" class="hidden lg:flex transition-all items-center h-11 mr-2 rounded-lg
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
">
    <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
    <input placeholder="{i18n(I18nKey.search)}" bind:value={keyword} aria-label={i18n(I18nKey.search)} on:focus={() => { if (keyword.trim()) setPanelVisibility(true); }}
           class="transition-all pl-10 text-sm bg-transparent outline-0
         h-full w-40 active:w-60 focus:w-60 text-black/50 dark:text-white/50"
    >
</div>

<!-- toggle btn for phone/tablet view -->
<button on:click={togglePanel} aria-label={i18n(I18nKey.search)} aria-controls="search-panel" aria-expanded="false" id="search-switch"
        class="btn-plain scale-animation lg:!hidden rounded-lg w-11 h-11 active:scale-90">
    <Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
</button>

<!-- search panel -->
<div id="search-panel" class="float-panel float-panel-closed search-panel absolute md:w-[30rem]
top-20 left-4 md:left-[unset] right-4 shadow-2xl rounded-2xl p-2">

    <!-- search bar inside panel for phone/tablet -->
    <div id="search-bar-inside" class="flex relative lg:hidden transition-all items-center h-11 rounded-xl
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
  ">
        <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
        <input placeholder={i18n(I18nKey.search)} aria-label={i18n(I18nKey.search)} bind:value={keyword} bind:this={mobileInput}
               class="pl-10 absolute inset-0 text-sm bg-transparent outline-0
               focus:w-60 text-black/50 dark:text-white/50"
        >
    </div>

    <div role="status" aria-live="polite" aria-atomic="true" class="text-sm text-75 px-3 py-2">
        {#if status === "loading"}
            正在搜索…
        {:else if status === "error"}
            搜索暂时不可用，请刷新后重试。也可以前往归档查看文章。
        {:else if status === "dev"}
            本地开发模式不提供搜索。请运行 pnpm build 和 pnpm preview 后测试。
        {:else if status === "ready" && result.length === 0}
            没有找到相关内容，试试其他关键词。
        {:else if status === "ready"}
            找到 {result.length} 条结果
        {:else}
            输入关键词搜索文章
        {/if}
    </div>
    <!-- search results -->
    {#each result as item}
        <a href={item.url}
           class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block
       rounded-xl text-lg px-3 py-2 hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)]">
            <div class="transition text-90 inline-flex font-bold group-hover:text-[var(--primary)]">
                {item.meta.title}<Icon icon="fa6-solid:chevron-right" class="transition text-[0.75rem] translate-x-1 my-auto text-[var(--primary)]"></Icon>
            </div>
            <div class="transition text-sm text-50">
                {@html item.excerpt}
            </div>
        </a>
    {/each}
</div>

<style>
  input:focus {
    outline: 0;
  }
  .search-panel {
    max-height: calc(100vh - 100px);
    overflow-y: auto;
  }
</style>
