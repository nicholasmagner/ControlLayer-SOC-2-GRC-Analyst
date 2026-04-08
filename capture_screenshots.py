import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Create a large viewport so the UI looks good and spacious
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        
        print("Navigating to http://localhost:3000...")
        await page.goto("http://localhost:3000", wait_until="networkidle")
        
        # Give it a second to render
        await asyncio.sleep(2)
        
        # 1. Dashboard Overview
        print("Capturing Dashboard...")
        await page.screenshot(path="screenshots/dashboard-overview.png")
        
        # 2. Controls Page
        print("Capturing Controls...")
        await page.click("text=Controls")
        await asyncio.sleep(1)
        await page.screenshot(path="screenshots/cmmc-controls.png")
        
        # 3. Findings
        print("Capturing Findings...")
        await page.click("text=Findings")
        await asyncio.sleep(1)
        await page.screenshot(path="screenshots/findings-remediation.png")
        
        # 4. Evidence
        print("Capturing Evidence...")
        await page.click("text=Evidence")
        await asyncio.sleep(1)
        await page.screenshot(path="screenshots/evidence-timeline.png")
        
        # 5. Connectors
        print("Capturing Connectors...")
        await page.click("text=Connectors")
        await asyncio.sleep(1)
        await page.screenshot(path="screenshots/cloud-integrations.png")

        # 6. AI Assistant
        print("Capturing AI...")
        await page.click("text=AI Assistant")
        await asyncio.sleep(1)
        await page.screenshot(path="screenshots/ai-analyst.png")
        
        await browser.close()
        print("Done capturing screenshots.")

if __name__ == "__main__":
    asyncio.run(main())
