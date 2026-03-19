import asyncio
import json
from playwright.async_api import async_playwright
from getpass import getpass

async def scrape_student_grades(username, password):
    intercepted_api_data = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        # ==========================================
        # THE MAGIC: NETWORK API INTERCEPTOR
        # ==========================================
        async def handle_response(response):
            # We listen for any GET request that looks like an API call
            if "api" in response.url and response.request.method == "GET":
                try:
                    # Check if the response is JSON data
                    if "application/json" in response.headers.get("content-type", ""):
                        data = await response.json()
                        
                        # Universis API usually returns a list of dictionaries for grades
                        # Let's catch anything that looks like course data
                        data_str = str(data).lower()
                        if 'ects' in data_str or 'grade' in data_str or 'mark' in data_str:
                            print(f"\n[BINGO!] Intercepted Universis API: {response.url}")
                            intercepted_api_data.append(data)
                except Exception:
                    pass
        
        # Tell Playwright to start listening to all network traffic
        page.on("response", handle_response)
        # ==========================================
        
        try:
            print("Navigating to AUTh SSO...")
            await page.goto("https://students.auth.gr/", wait_until="networkidle", timeout=30000)
            
            print("Waiting for SSO login page...")
            await page.wait_for_url("**/login.auth.gr/**", timeout=30000)
            
            print("Filling credentials...")
            await page.wait_for_selector("#username", timeout=10000)
            await page.fill("#username", username)
            await page.fill("#password", password)
            
            print("Submitting login form...")
            submit_button = await page.query_selector("button[type='submit'], input[type='submit'], button[name='submit']")
            if submit_button:
                await submit_button.click()
            else:
                await page.press("#password", "Enter")
            
            print("Waiting for login to complete and dashboard to load...")
            await page.wait_for_url("**/dashboard**", timeout=30000)
            
            print("Login successful! Teleporting directly to Analytical Grades...")
            await page.goto("https://students.auth.gr/#/grades/all", wait_until="networkidle")
            
            print("Waiting for the grades table to render (triggering the API)...")
            await page.wait_for_selector("text=Βαθμός", state="visible", timeout=15000)
            
            # Give the network 3 seconds to finish downloading the intercepted JSON
            await asyncio.sleep(3)
            
        except Exception as e:
            print(f"Error occurred: {str(e)}")
            await page.screenshot(path="error_screenshot.png")
            raise
        
        finally:
            await browser.close()
            
    return intercepted_api_data

def parse_universis_data(raw_data_list):
    """Takes the messy Universis JSON and extracts profile info, plus passed/failed courses."""
    
    # Initialize with default values
    student_profile = {
        "name": "Άγνωστο Όνομα",
        "department": "Άγνωστο Τμήμα",
        "specialty": "Άγνωστη Κατεύθυνση"
    }
    clean_grades = {}  # Using a dictionary to easily check for duplicates

    for data in raw_data_list:
        # 1. Extract Profile Data
        if isinstance(data, dict) and "person" in data:
            person_data = data.get("person", {})
            # Try to get the full name, fallback to combining first/last name
            student_profile["name"] = person_data.get("name", f"{person_data.get('familyName', '')} {person_data.get('givenName', '')}".strip())
            
            dept_data = data.get("department", {})
            student_profile["department"] = dept_data.get("name", "Άγνωστο Τμήμα")
            
            student_profile["specialty"] = data.get("specialty", "Δεν έχει δηλωθεί")

        # 2. Extract Course Data
        elif isinstance(data, dict) and "value" in data:
            if len(data["value"]) > 0 and "courseTitle" in data["value"][0]:
                for item in data["value"]:
                    course_obj = item.get("course", {})
                    course_name = course_obj.get("name", "Άγνωστο Μάθημα")
                    course_code = course_obj.get("displayCode", "") # The Holy Grail
                    ects = course_obj.get("ects", 0)
                    is_passed = bool(item.get("isPassed") == 1)
                    
                    # Handle grades safely
                    grade_str = item.get("formattedGrade")
                    if grade_str:
                        try:
                            grade = float(grade_str.replace(",", "."))
                        except ValueError:
                            grade = 0.0
                    else:
                        grade = float(item.get("grade") or 0.0)

                    # Only add if we actually have a course code
                    if course_code:
                        if course_code in clean_grades:
                            # Keep the highest grade if taken multiple times
                            if grade > clean_grades[course_code]["grade"]:
                                clean_grades[course_code] = {
                                    "code": course_code,
                                    "name": course_name,
                                    "grade": grade,
                                    "ects": ects,
                                    "is_passed": is_passed
                                }
                        else:
                            clean_grades[course_code] = {
                                "code": course_code,
                                "name": course_name,
                                "grade": grade,
                                "ects": ects,
                                "is_passed": is_passed
                            }

    return {
        "profile": student_profile,
        "courses": list(clean_grades.values())
    }

async def main():
    print("=== AUTh Student Portal API Sniper ===\n")
    username = input("Enter your AUTh username: ")
    password = getpass("Enter your password: ")
    
    print("\nStarting scraper...\n")
    
    try:
        raw_api_data = await scrape_student_grades(username, password)
        
        if raw_api_data:
            final_data = parse_universis_data(raw_api_data)
            json_output = json.dumps(final_data, ensure_ascii=False, indent=2)
            
            print("\n" + "="*50)
            print("FINAL CLEAN DATA FOR REACT APP:")
            print("="*50)
            print(json_output)
            print("="*50)
            
            with open('student_data_clean.json', 'w', encoding='utf-8') as f:
                f.write(json_output)
                
            passed_courses = [c for c in final_data["courses"] if c["is_passed"]]
            total_ects = sum(course['ects'] for course in passed_courses)
            
            print(f"\nStudent Name: {final_data['profile']['name']}")
            print(f"Department: {final_data['profile']['department']}")
            print(f"Specialty: {final_data['profile']['specialty']}")
            print(f"Total Courses (Passed & Failed): {len(final_data['courses'])}")
            print(f"Passed Courses: {len(passed_courses)}")
            print(f"Total ECTS Acquired: {total_ects}")
            print("\nSaved to 'student_data_clean.json'!")

    except Exception as e:
        print(f"\nError: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())