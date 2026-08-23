<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { navigateToPage } from "@utils/navigation-utils";
import { onMount } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import type { SearchResult } from "@/global";
import { FLOATING_PANEL_CLOSE_EVENT } from "@/utils/floating-panel-utils";
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
		excerpt:
			"Because Pagefind cannot work in the <mark>dev</mark> environment.",
	},
	{
		url: formatUrl("/"),
		meta: { title: "If You Want to Test the Search" },
		excerpt: "Try running <mark>npm build && npm preview</mark> instead.",
	},
];

// --- UI Logic ---
let modalOpen = false;

const openModal = () => {
	modalOpen = true;
	// 聚焦输入框
	setTimeout(() => {
		const input = document.getElementById('search-input-modal') as HTMLInputElement;
		if (input) input.focus();
	}, 50);
};

const closeModal = () => {
	modalOpen = false;
	keyword = "";
	result = [];
};

const cancelPendingSearch = (): void => {
	clearTimeout(debounceTimer);
	searchRequestId += 1;
	isSearching = false;
};

const handleResultClick = (event: Event, url: string): void => {
	event.preventDefault();
	closeModal();
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
			document.addEventListener("pagefindready", initializePagefind, {
				once: true,
			});
			document.addEventListener("pagefindloaderror", initializePagefind, {
				once: true,
			});
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

<!-- 搜索按钮（点击打开模态框） -->
<button
	on:click={openModal}
	aria-label="Search"
	class="btn-plain scale-animation rounded-full w-9 h-9 md:w-11 md:h-11 active:scale-90"
>
	<Icon icon="material-symbols:search" class="text-[1.25rem]" />
</button>

<!-- 模态框 -->
{#if modalOpen}
	<div
		class="modal-overlay"
		on:click={closeModal}
		on:keydown={(e) => e.key === 'Escape' && closeModal()}
	>
		<div
			class="modal-content"
			on:click|stopPropagation
		>
			<!-- 搜索输入框 -->
			<div class="search-bar">
				<Icon icon="material-symbols:search" class="search-icon" />
				<input
					id="search-input-modal"
					type="text"
					placeholder={i18n(I18nKey.search)}
					bind:value={keyword}
					on:keydown={(e) => {
						if (e.key === 'Escape') closeModal();
						if (e.key === 'Enter' && result.length > 0) {
							handleResultClick(e, result[0].url);
						}
					}}
				/>
				<button
					class="close-btn"
					on:click={closeModal}
					aria-label="Close search"
				>
					<Icon icon="material-symbols:close" />
				</button>
			</div>

			<!-- 搜索结果 -->
			<div class="results">
				{#if isSearching}
					<div class="status">{i18n(I18nKey.searchLoading)}</div>
				{:else if result.length > 0}
					{#each result.slice(0, 8) as item}
						<a
							href={item.url}
							on:click={(e) => handleResultClick(e, item.url)}
							class="result-item"
						>
							<div class="result-title">
								{@html item.meta.title}
								<Icon icon="fa7-solid:chevron-right" class="arrow" />
							</div>
							{#if item.excerpt.includes('<mark>')}
								<div class="result-excerpt">{@html item.excerpt}</div>
							{/if}
							{#if item.content && item.content.includes('<mark>')}
								<div class="result-content">
									<span class="content-tag">{i18n(I18nKey.searchContent)}</span>
									{@html item.content}
								</div>
							{/if}
						</a>
					{/each}
					{#if result.length > 8}
						<a
							href={getSearchUrl(keyword)}
							on:click={(e) => handleResultClick(e, getSearchUrl(keyword))}
							class="view-more"
						>
							{i18n(I18nKey.searchViewMore).replace('{count}', (result.length - 8).toString())}
							<Icon icon="fa7-solid:arrow-right" />
						</a>
					{/if}
				{:else if keyword && result.length === 0}
					<div class="status">{i18n(I18nKey.searchNoResults)}</div>
				{:else if !keyword}
					<div class="status">{i18n(I18nKey.searchTypeSomething)}</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* 遮罩层 */
	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: fadeIn 0.2s ease;
	}

	.modal-content {
		background: var(--page-bg, #1a1a2e);
		border-radius: 16px;
		width: 90%;
		max-width: 560px;
		max-height: 80vh;
		padding: 24px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
		overflow-y: auto;
		animation: slideUp 0.25s ease;
	}

	/* 搜索栏 */
	.search-bar {
		display: flex;
		align-items: center;
		gap: 12px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 12px;
		padding: 0 16px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		transition: border-color 0.2s;
	}

	.search-bar:focus-within {
		border-color: rgba(100, 100, 255, 0.5);
	}

	.search-icon {
		font-size: 1.25rem;
		color: rgba(255, 255, 255, 0.3);
	}

	.search-bar input {
		flex: 1;
		background: transparent;
		border: none;
		padding: 14px 0;
		font-size: 16px;
		color: #fff;
		outline: none;
	}

	.search-bar input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}

	.close-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.4);
		cursor: pointer;
		padding: 4px;
		border-radius: 50%;
		transition: background 0.2s, color 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}

	/* 结果区域 */
	.results {
		margin-top: 16px;
		max-height: 55vh;
		overflow-y: auto;
	}

	.results::-webkit-scrollbar {
		width: 4px;
	}

	.results::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
	}

	.status {
		padding: 20px 0;
		text-align: center;
		color: rgba(255, 255, 255, 0.4);
		font-size: 14px;
	}

	.result-item {
		display: block;
		padding: 12px 14px;
		border-radius: 10px;
		margin-bottom: 2px;
		text-decoration: none;
		color: inherit;
		transition: background 0.15s;
	}

	.result-item:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.result-title {
		font-weight: 600;
		color: #fff;
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.result-title .arrow {
		font-size: 0.7rem;
		color: var(--primary, #6c63ff);
		opacity: 0;
		transition: opacity 0.2s, transform 0.2s;
	}

	.result-item:hover .result-title .arrow {
		opacity: 1;
		transform: translateX(4px);
	}

	.result-excerpt {
		font-size: 14px;
		color: rgba(255, 255, 255, 0.6);
		margin-top: 4px;
	}

	.result-content {
		font-size: 13px;
		color: rgba(255, 255, 255, 0.5);
		margin-top: 4px;
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}

	.content-tag {
		background: rgba(255, 255, 255, 0.08);
		color: var(--primary, #6c63ff);
		padding: 0.1em 0.5em;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: 600;
		white-space: nowrap;
		margin-top: 2px;
	}

	.view-more {
		display: block;
		text-align: center;
		padding: 12px;
		color: var(--primary, #6c63ff);
		font-weight: 600;
		text-decoration: none;
		border-radius: 10px;
		transition: background 0.15s;
	}

	.view-more:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.view-more svg {
		margin-left: 4px;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes slideUp {
		from { opacity: 0; transform: translateY(20px); }
		to { opacity: 1; transform: translateY(0); }
	}

	/* 移动端适配 */
	@media (max-width: 640px) {
		.modal-content {
			padding: 16px;
			width: 95%;
		}
		.search-bar input {
			font-size: 15px;
			padding: 12px 0;
		}
		.result-item {
			padding: 10px 12px;
		}
	}
</style>