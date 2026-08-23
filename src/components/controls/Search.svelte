<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { navigateToPage } from "@utils/navigation-utils";
import { onMount } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import type { SearchResult } from "@/global";
import { url as formatUrl, getSearchUrl } from "@/utils/url-utils";

// --- State ---
let keyword = "";
let result: SearchResult[] = [];
let isSearching = false;
let initialized = false;
let debounceTimer: NodeJS.Timeout;
let searchRequestId = 0;

// --- Mocks for Dev Mode ---
const fakeResult: SearchResult[] = [
	{
		url: formatUrl("/"),
		meta: { title: "This Is a Fake Search Result" },
		excerpt: "Because Pagefind cannot work in the <mark>dev</mark> environment.",
	},
	{
		url: formatUrl("/"),
		meta: { title: "If You Want to Test the Search" },
		excerpt: "Try running <mark>npm build && npm preview</mark> instead.",
	},
];

// --- UI Logic ---
// 打开模态框
const openModal = () => {
	const modal = document.getElementById("searchModal");
	if (modal) {
		modal.showModal();
		// 聚焦输入框
		setTimeout(() => {
			const input = document.getElementById("searchInput") as HTMLInputElement;
			if (input) input.focus();
		}, 100);
	}
};

// 关闭模态框
const closeModal = () => {
	const modal = document.getElementById("searchModal");
	if (modal) modal.close();
};

// 重置状态（关闭面板时清空结果）
const resetSearch = () => {
	keyword = "";
	result = [];
	isSearching = false;
};

const cancelPendingSearch = (): void => {
	clearTimeout(debounceTimer);
	searchRequestId += 1;
	isSearching = false;
};

const handleResultClick = (event: Event, url: string): void => {
	event.preventDefault();
	closeModal();
	resetSearch();
	navigateToPage(url);
};

// --- Core Search Logic ---
const search = async (keyword: string): Promise<void> => {
	if (!keyword) {
		cancelPendingSearch();
		result = [];
		return;
	}
	if (!initialized) return;

	clearTimeout(debounceTimer);
	const requestId = ++searchRequestId;
	isSearching = true;

	debounceTimer = setTimeout(async () => {
		try {
			let searchResults: SearchResult[] = [];

			if (import.meta.env.PROD && window.pagefind) {
				const response = await window.pagefind.search(keyword);
				searchResults = await Promise.all(
					response.results.map((item) => item.data()),
				);
			} else if (import.meta.env.DEV) {
				searchResults = fakeResult;
			}

			if (requestId !== searchRequestId) return;

			result = searchResults;
		} catch (error) {
			if (requestId !== searchRequestId) return;
			console.error("Search error:", error);
			result = [];
		} finally {
			if (requestId === searchRequestId) {
				isSearching = false;
			}
		}
	}, 300);
};

// --- Initialization onMount ---
onMount(() => {
	const initializePagefind = () => {
		initialized = true;
		if (keyword) search(keyword);
	};

	if (import.meta.env.DEV) {
		console.log("Pagefind mock enabled in development mode.");
		initializePagefind();
	} else {
		if (window.pagefind) {
			initializePagefind();
		} else {
			document.addEventListener("pagefindready", initializePagefind, { once: true });
			document.addEventListener("pagefindloaderror", initializePagefind, { once: true });
		}
	}

	return () => {
		document.removeEventListener("pagefindready", initializePagefind);
		document.removeEventListener("pagefindloaderror", initializePagefind);
		cancelPendingSearch();
	};
});

// --- Reactive ---
$: if (initialized && (keyword || keyword === "")) {
	search(keyword);
}
</script>

<!-- search toggle btn -->
<button on:click={openModal} aria-label="Search" id="search-switch"
		class="btn-plain scale-animation rounded-full w-9 h-9 md:w-11 md:h-11 active:scale-90">
    <Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
</button>

<!-- Modal Dialog (中央弹窗) -->
<dialog id="searchModal" style="
	background: rgba(0,0,0,0.6);
	border: none;
	border-radius: 16px;
	padding: 0;
	backdrop-filter: blur(8px);
	width: 90%;
	max-width: 520px;
	margin: auto;
	top: 50%;
	transform: translateY(-50%);
">
	<div style="
		background: var(--page-bg, #1a1a2e);
		border-radius: 16px;
		padding: 24px;
		box-shadow: 0 20px 60px rgba(0,0,0,0.5);
	">
		<!-- 输入框 -->
		<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
			<Icon icon="material-symbols:search" class="text-[1.5rem] text-(--text-secondary)" />
			<input
				id="searchInput"
				placeholder={i18n(I18nKey.search)}
				bind:value={keyword}
				style="
					flex: 1;
					padding: 12px 0;
					background: transparent;
					border: none;
					border-bottom: 2px solid rgba(255,255,255,0.1);
					color: #fff;
					font-size: 18px;
					outline: none;
					transition: border-color 0.2s;
				"
				on:focus={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
				on:blur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
			/>
			<button
				on:click={closeModal}
				style="
					background: transparent;
					border: none;
					color: #888;
					font-size: 24px;
					cursor: pointer;
					padding: 0 8px;
				"
				aria-label="关闭搜索"
			>
				✕
			</button>
		</div>

		<!-- 搜索结果 -->
		{#if isSearching}
			<div style="padding: 20px 0; color: #888; text-align: center;">
				{i18n(I18nKey.searchLoading)}
			</div>
		{:else if result.length > 0}
			<div style="max-height: 400px; overflow-y: auto;">
				{#each result.slice(0, 10) as item}
					<a
						href={item.url}
						on:click={(e) => handleResultClick(e, item.url)}
						style="
							display: block;
							padding: 10px 12px;
							border-radius: 8px;
							transition: background 0.15s;
							color: #eee;
							text-decoration: none;
							margin-bottom: 2px;
						"
						on:mouseenter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
						on:mouseleave={(e) => e.currentTarget.style.background = 'transparent'}
					>
						<div style="font-weight: 600; color: var(--primary);">
							{@html item.meta.title}
						</div>
						{#if item.excerpt.includes('<mark>')}
							<div style="font-size: 13px; color: #aaa; margin-top: 2px;">
								{@html item.excerpt}
							</div>
						{/if}
					</a>
				{/each}
				{#if result.length > 10}
					<a
						href={getSearchUrl(keyword)}
						on:click={(e) => handleResultClick(e, getSearchUrl(keyword))}
						style="
							display: block;
							padding: 12px;
							text-align: center;
							color: var(--primary);
							font-weight: bold;
							text-decoration: none;
						"
					>
						{i18n(I18nKey.searchViewMore).replace('{count}', (result.length - 10).toString())}
					</a>
				{/if}
			</div>
		{:else if keyword}
			<div style="padding: 20px 0; color: #888; text-align: center;">
				{i18n(I18nKey.searchNoResults)}
			</div>
		{/if}
	</div>
</dialog>

<style>
	input::placeholder {
		color: #666;
	}
	/* 确保 dialog 背景透明，只显示内容区域 */
	#searchModal::backdrop {
		background: rgba(0,0,0,0.6);
	}
</style>