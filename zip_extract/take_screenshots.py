import os
from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 1024})

        # Get absolute path to the local HTML file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        html_file = f"file:///{current_dir}/screenshot_container.html".replace("\\", "/")

        print("Loading local HTML container...")
        page.goto(html_file, wait_until="networkidle")
        
        # Wait for the iframes to settle
        page.wait_for_timeout(3000)

        print("Taking Map screenshot...")
        map_element = page.locator("#map-container")
        map_element.screenshot(path="map_placeholder.jpg", type="jpeg", quality=90)

        print("Taking Tally form screenshot...")
        tally_element = page.locator("#tally-container")
        tally_element.screenshot(path="tally_placeholder.jpg", type="jpeg", quality=90)

        browser.close()
        print("Done!")

if __name__ == "__main__":
    main()
