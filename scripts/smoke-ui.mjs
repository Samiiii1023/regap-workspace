import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire("/tmp/regap-playwright/smoke-test.cjs");
const { chromium } = require("playwright");
const browser = await chromium.launch({
	headless: true,
	args: ["--no-sandbox"],
});

const baseURL = "http://127.0.0.1:3000";
const screenshotDir = "artifacts/observatory";

async function clickNav(page, name) {
	await page
		.getByRole("navigation", { name: "Main navigation" })
		.getByRole("button", { name })
		.click();
}

async function run() {
	await mkdir(screenshotDir, { recursive: true });
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		acceptDownloads: true,
	});
	const page = await context.newPage();
	const errors = [];

	page.on("pageerror", (error) => errors.push(error.message));
	for (let attempt = 0; attempt < 30; attempt++) {
		try {
			await page.goto(baseURL, {
				waitUntil: "domcontentloaded",
				timeout: 5000,
			});
			break;
		} catch (error) {
			if (attempt === 29) throw error;
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

	assert.equal(
		await page
			.getByRole("heading", { name: /Knowledge constellation/ })
			.count(),
		1,
	);
	// The atlas is rendered from real research records, not static mock data.
	assert.equal(await page.locator(".atlas-workspace").count(), 1);
	assert.equal(
		(await page.locator(".graph-node.atlas-node").count()) >= 5,
		true,
	);
	assert.equal(await page.locator(".regap-app.regap-light").count(), 1);
	await page.screenshot({
		path: `${screenshotDir}/01-desktop-daylight.png`,
		fullPage: true,
		animations: "disabled",
	});

	const graph = page.getByRole("region", { name: "Research knowledge graph" });
	await graph.getByRole("button", { name: "2D", exact: true }).click();
	assert.equal(
		await graph
			.getByRole("button", { name: "2D", exact: true })
			.getAttribute("aria-pressed"),
		"true",
	);
	await graph.getByRole("button", { name: "3D", exact: true }).click();
	await graph.getByRole("button", { name: "List", exact: true }).click();
	await graph.locator(".atlas-data-list > button").nth(4).waitFor();
	assert.equal(
		(await graph.locator(".atlas-data-list > button").count()) >= 5,
		true,
	);
	await graph.getByRole("button", { name: "Connections", exact: true }).click();
	await graph.locator(".atlas-data-list > button").first().waitFor();
	assert.equal(
		(await graph.locator(".atlas-data-list > button").count()) >= 1,
		true,
	);
	await graph.getByRole("button", { name: "Map", exact: true }).click();
	await graph.getByRole("button", { name: "Zoom in" }).click();
	await graph.getByRole("button", { name: "Reset graph orientation" }).click();
	await graph.getByRole("checkbox", { name: "Papers" }).uncheck();
	await graph.locator(".atlas-node--paper").first().waitFor({ state: "detached" });
	assert.equal(await graph.locator(".atlas-node--paper").count(), 0);
	await graph.getByRole("checkbox", { name: "Papers" }).check();
	await graph.locator(".atlas-node--paper").first().waitFor();
	assert.equal((await graph.locator(".atlas-node--paper").count()) > 0, true);

	await page.getByRole("button", { name: "Switch to dark theme" }).click();
	assert.equal(await page.locator(".regap-app.regap-light").count(), 0);
	await page.screenshot({
		path: `${screenshotDir}/02-desktop-night.png`,
		fullPage: true,
		animations: "disabled",
	});
	await page.reload();
	assert.equal(await page.locator(".regap-app.regap-light").count(), 0);
	await page.getByRole("button", { name: "Switch to light theme" }).click();
	assert.equal(await page.locator(".regap-app.regap-light").count(), 1);
	assert.equal((await page.locator(".graph-node").count()) > 0, true);

	// A researcher can add a paper with primary-source metadata.
	await clickNav(page, "Paper library");
	await page.getByRole("button", { name: "Add a paper" }).click();
	const paperDialog = page.getByRole("dialog", {
		name: "Add a research paper",
	});
	await paperDialog.getByLabel("Paper title").fill("Smoke-tested GPU paper");
	await paperDialog.getByLabel("Authors").fill("Browser Test");
	await paperDialog
		.getByLabel("Abstract or notes")
		.fill("Functional source record.");
	await paperDialog
		.getByLabel("Source URL (optional)")
		.fill("https://example.org/paper");
	await paperDialog.getByRole("button", { name: "Add to library" }).click();
	assert.equal(
		(await page.getByText("Smoke-tested GPU paper").count()) > 0,
		true,
	);

	// A candidate gap must be explicitly grounded in one or more papers.
	await clickNav(page, "Gap explorer");
	await page.getByRole("button", { name: "New research gap" }).click();
	const gapDialog = page.getByRole("dialog", { name: "New research gap" });
	await gapDialog
		.getByLabel("Research question / gap title")
		.fill("Smoke-tested research question");
	await gapDialog
		.getByLabel("Why might this be unanswered?")
		.fill("Paper suggests a limitation.");
	await gapDialog
		.getByLabel("What would you check next?")
		.fill("Read contradictory work.");
	await gapDialog.getByRole("checkbox").first().check();
	await gapDialog.getByRole("button", { name: "Create candidate gap" }).click();
	assert.equal(
		(await page.getByText("Smoke-tested research question").count()) > 0,
		true,
	);
	await page.getByRole("button", { name: "Close source inspector" }).click();
	await page
		.getByRole("button", { name: "Shortlist", exact: true })
		.first()
		.click();

	// The shortcut must actually show only shortlisted candidates.
	await page.getByRole("button", { name: /Shortlisted gaps/ }).click();
	assert.equal(
		await page
			.getByRole("button", { name: /All candidates/ })
			.getAttribute("aria-pressed"),
		"false",
	);
	assert.equal(
		(await page.getByText("Smoke-tested research question").count()) > 0,
		true,
	);

	const candidate = page
		.locator(".gap-card")
		.filter({ hasText: "Smoke-tested research question" });
	await candidate.getByRole("button", { name: /Plan a test/ }).click();
	const planDialog = page.getByRole("dialog", { name: "Plan an experiment" });
	await planDialog
		.getByLabel("Experiment title")
		.fill("Smoke-tested experiment");
	await planDialog.getByLabel("Hypothesis").fill("P95 latency should improve.");
	await planDialog.getByLabel("Baseline").fill("Static scheduler");
	await planDialog.getByLabel("Evaluation metric").fill("P95 latency");
	await planDialog
		.getByRole("button", { name: "Save experiment plan" })
		.click();
	assert.equal(
		await page
			.getByRole("heading", { name: "Smoke-tested experiment" })
			.count(),
		1,
	);

	// Saved data persists and is portable between browser sessions.
	await page.reload();
	await clickNav(page, "Experiments");
	assert.equal(
		await page
			.getByRole("heading", { name: "Smoke-tested experiment" })
			.count(),
		1,
	);
	const downloadPromise = page.waitForEvent("download");
	await page.getByRole("button", { name: "Export workspace" }).click();
	const download = await downloadPromise;
	const destination = "/tmp/regap-workspace-smoke.json";
	await download.saveAs(destination);
	const exportData = JSON.parse(await readFile(destination, "utf8"));
	assert.equal(exportData.customPapers.length, 1);
	assert.equal(exportData.customGaps.length, 1);
	assert.equal(exportData.experiments.length, 1);

	// Browser-side JSON import must restore all linked records.
	page.once("dialog", (dialog) => dialog.accept());
	await page
		.getByRole("button", { name: "Delete Smoke-tested experiment" })
		.click();
	page.once("dialog", (dialog) => dialog.accept());
	await page
		.locator('input[aria-label="Select Re:Gap backup JSON"]')
		.setInputFiles(destination);
	await page.waitForTimeout(200);
	await clickNav(page, "Experiments");
	assert.equal(
		await page
			.getByRole("heading", { name: "Smoke-tested experiment" })
			.count(),
		1,
	);
	assert.deepEqual(errors, []);

	const mobile = await browser.newContext({
		viewport: { width: 390, height: 844 },
	});
	const mobilePage = await mobile.newPage();
	mobilePage.on("pageerror", (error) => errors.push(error.message));
	await mobilePage.goto(baseURL, { waitUntil: "domcontentloaded" });
	await mobilePage.screenshot({
		path: `${screenshotDir}/03-mobile-daylight.png`,
		fullPage: true,
		animations: "disabled",
	});
	// The appearance control must remain available on narrow screens.
	const mobileThemeToggle = mobilePage.getByRole("button", {
		name: "Switch to dark theme",
	});
	assert.equal(await mobileThemeToggle.isVisible(), true);
	await mobileThemeToggle.click();
	assert.equal(await mobilePage.locator(".regap-app.regap-light").count(), 0);
	await mobilePage.screenshot({
		path: `${screenshotDir}/04-mobile-night.png`,
		fullPage: true,
		animations: "disabled",
	});
	await mobilePage.getByRole("button", { name: "Open navigation" }).click();
	assert.equal(
		await mobilePage.getByRole("button", { name: "Gap explorer" }).isVisible(),
		true,
	);
	await mobilePage.getByRole("button", { name: "Gap explorer" }).click();
	assert.equal(
		await mobilePage.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth + 2,
		),
		true,
	);
	assert.deepEqual(errors, []);
	await mobile.close();
	await context.close();
	console.log(
		"Re:Gap browser smoke test passed (desktop, mobile, records, gaps, experiments, persistence).",
	);
}

try {
	await run();
} finally {
	await browser.close();
}
