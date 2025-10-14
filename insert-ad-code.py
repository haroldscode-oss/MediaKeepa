"""
Simple script to automatically insert Monetag ad code into index.html
This bypasses the response length limit issue.
"""

def insert_ad_code():
    # Read the ad code from the text file
    print("Reading ad code from monetag-popunder.txt...")
    with open('monetag-popunder.txt', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find the line that starts with the ACTUAL ad code (the long obfuscated script)
    # It's around line 39, starts with <script data-cfasync="false" type="text/javascript">(()=>
    ad_code = None
    for i, line in enumerate(lines):
        if '<script data-cfasync="false" type="text/javascript">(() =>' in line or \
           '<script data-cfasync="false" type="text/javascript">(()=>' in line:
            ad_code = line.strip()
            print(f"Found ad code at line {i+1} ({len(ad_code)} characters)")
            break
    
    if not ad_code:
        print("ERROR: Could not find the actual ad code!")
        print("Looking for line starting with: <script data-cfasync=\"false\" type=\"text/javascript\">(()=>")
        return False
    
    # Read index.html
    print("Reading index.html...")
    with open('index.html', 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Find the placeholder comment
    placeholder = '<!-- Paste your Monetag pop-under code here -->'
    
    if placeholder not in html_content:
        print("ERROR: Could not find placeholder comment in index.html!")
        return False
    
    # Check if ad code is already inserted
    if 'data-zone="10037537"' in html_content:
        print("Ad code already exists in index.html - skipping")
        return True
    
    # Insert the ad code after the placeholder
    html_content = html_content.replace(
        placeholder,
        placeholder + '\n    ' + ad_code
    )
    
    # Write back to index.html
    print("Writing updated index.html...")
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print("\n✅ SUCCESS! Ad code inserted into index.html")
    print("Next steps:")
    print("1. Restart Flask server: Stop-Process -Name python; python server.py")
    print("2. Test on https://martmake.com - click anywhere to trigger pop-under ad")
    print("3. Check Monetag dashboard for impressions")
    return True

if __name__ == '__main__':
    try:
        insert_ad_code()
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
