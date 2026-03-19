import asyncio
import json
import re
from playwright.async_api import async_playwright


async def scrape_ece_courses():
    """
    Scrape course information from ECE AUTH website using raw text parsing.
    Returns a JSON object with semester numbers as keys and course lists as values.
    """
    url = "https://ece.auth.gr/ekpaidefsi/proptyxiaka/odigos-spoudon/organosi-spoudon/"
    
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Navigate to the page
        await page.goto(url, wait_until="networkidle")
        
        # Get the raw visible text content
        text_content = await page.inner_text('body')
        
        # Close browser
        await browser.close()
    
    # Dictionary to store results
    courses_by_semester = {}
    
    # Regex patterns
    # Pattern to match semester headers (e.g., '1ο ΕΞΑΜΗΝΟ', '2ο ΕΞΑΜΗΝΟ')
    semester_pattern = re.compile(r'(\d+)ο\s+ΕΞΑΜΗΝΟ', re.IGNORECASE)
    
    # Pattern to match course lines: text followed by (number)
    # This pattern ensures we only match lines with just digits in parentheses
    # and excludes patterns like "(30 ECTS)" by requiring the parentheses contain ONLY digits
    course_pattern = re.compile(r'^(.+?)\s*\((\d+)\)\s*$')
    
    # Split text into individual lines
    lines = text_content.split('\n')
    
    current_semester = None
    
    # Loop through each line
    for line in lines:
        line = line.strip()
        
        # Skip empty lines
        if not line:
            continue
        
        # Check if this line is a semester header
        semester_match = semester_pattern.search(line)
        if semester_match:
            semester_num = semester_match.group(1)
            current_semester = semester_num
            # Initialize the semester list if not exists
            if semester_num not in courses_by_semester:
                courses_by_semester[semester_num] = []
            continue
        
        # If we're in a semester, try to match course lines
        if current_semester:
            course_match = course_pattern.match(line)
            if course_match:
                course_name = course_match.group(1).strip()
                ects = int(course_match.group(2))
                
                # Additional validation: skip if it contains "ECTS" in the parentheses part
                # or if the course name is too short (likely noise)
                if len(course_name) > 3 and not re.search(r'ECTS', line, re.IGNORECASE):
                    course_dict = {
                        'name': course_name,
                        'ects': ects
                    }
                    # Avoid duplicates
                    if course_dict not in courses_by_semester[current_semester]:
                        courses_by_semester[current_semester].append(course_dict)
    
    return courses_by_semester


async def main():
    """Main function to run the scraper and print results."""
    print("Scraping ECE AUTH course information...")
    courses = await scrape_ece_courses()
    
    # Convert to JSON
    json_output = json.dumps(courses, ensure_ascii=False, indent=2)
    print("\nCourses by Semester:")
    print(json_output)
    
    # Optionally save to file
    with open('courses.json', 'w', encoding='utf-8') as f:
        f.write(json_output)
    print("\nResults saved to courses.json")
    
    return courses


if __name__ == "__main__":
    asyncio.run(main())
