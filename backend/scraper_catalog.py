import asyncio
import json
from playwright.async_api import async_playwright
from getpass import getpass

async def scrape_full_catalog(username, password):
    all_courses = {}
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        # ==========================================
        # NETWORK INTERCEPTOR (Hunting for the Catalog)
        # ==========================================
        async def handle_response(response):
            if "api" in response.url and response.request.method == "GET":
                try:
                    if "application/json" in response.headers.get("content-type", ""):
                        data = await response.json()
                        
                        # We look for large payloads containing course info
                        data_str = str(data)
                        if 'course' in data_str and 'displaycode' in data_str.lower():
                            
                            # Universis sometimes wraps it in 'value'
                            items = data.get('value', data) if isinstance(data, dict) else data
                            
                            if isinstance(items, list):
                                for item in items:
                                    # Course info might be nested under 'course'
                                    course_obj = item.get('course', item)
                                    if isinstance(course_obj, dict) and 'displayCode' in course_obj:
                                        code = course_obj['displayCode']
                                        name = course_obj.get('name', 'Unknown')
                                        all_courses[code] = name
                                        
                                print(f"  [API HIT] Intercepted {len(items)} courses from {response.url}")
                except Exception:
                    pass
        
        page.on("response", handle_response)
        # ==========================================
        
        try:
            print("Navigating to AUTh SSO...")
            await page.goto("https://students.auth.gr/", wait_until="networkidle", timeout=30000)
            
            print("Filling credentials...")
            await page.wait_for_selector("#username", timeout=30000)
            await page.fill("#username", username)
            await page.fill("#password", password)
            
            submit_button = await page.query_selector("button[type='submit'], input[type='submit'], button[name='submit']")
            if submit_button:
                await submit_button.click()
            else:
                await page.press("#password", "Enter")
            
            print("Waiting for dashboard...")
            await page.wait_for_url("**/dashboard**", timeout=30000)
            
            print("Teleporting to Study Guide (Πρόγραμμα Σπουδών)...")
            await page.goto("https://students.auth.gr/#/studyGuide", wait_until="networkidle")
            await asyncio.sleep(4) # Give the heavy API time to download
            
            # If the first URL didn't trigger it, try the courses tab
            if len(all_courses) < 10:
                print("Teleporting to alternative Courses tab (Μαθήματα)...")
                await page.goto("https://students.auth.gr/#/courses", wait_until="networkidle")
                await asyncio.sleep(4)
            
        except Exception as e:
            print(f"Error: {e}")
        finally:
            await browser.close()
            
    return all_courses

async def main():
    print("=== AUTh Course Catalog Scraper ===\n")
    username = input("Enter your AUTh username: ")
    password = getpass("Enter your password: ")
    
    courses = await scrape_full_catalog(username, password)
    
    if courses:
        print("\n" + "="*50)
        print(f"SUCCESS! Extracted {len(courses)} unique courses.")
        print("="*50)
        
        with open('auth_catalog.json', 'w', encoding='utf-8') as f:
            json.dump(courses, f, ensure_ascii=False, indent=2)
            
        print("Saved dictionary to 'auth_catalog.json'.")
    else:
        print("\nFailed to intercept the course catalog API.")

if __name__ == "__main__":
    asyncio.run(main())