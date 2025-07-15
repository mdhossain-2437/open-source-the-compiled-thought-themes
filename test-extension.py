import subprocess
import json
import time
import os

def test_extension_installation():
    """Test if extension is properly installed"""
    try:
        result = subprocess.run(['code', '--list-extensions'], capture_output=True, text=True)
        extensions = result.stdout.strip().split('\n')
        
        # Check if our extension is installed
        tct_installed = any('compiled-thought-themes' in ext.lower() for ext in extensions)
        print(f"✅ Extension Installation: {'PASS' if tct_installed else 'FAIL'}")
        return tct_installed
    except Exception as e:
        print(f"❌ Extension Installation Test Failed: {e}")
        return False

def test_theme_files():
    """Test if all theme files are valid JSON"""
    themes_dir = 'themes'
    valid_themes = 0
    total_themes = 0
    
    if not os.path.exists(themes_dir):
        print("❌ Themes directory not found")
        return False
    
    for filename in os.listdir(themes_dir):
        if filename.endswith('.json'):
            total_themes += 1
            try:
                with open(os.path.join(themes_dir, filename), 'r') as f:
                    theme_data = json.load(f)
                    
                # Check required fields
                if 'name' in theme_data and 'colors' in theme_data:
                    # Check for bracket colorization
                    colors = theme_data.get('colors', {})
                    has_brackets = any('editorBracketHighlight' in key for key in colors.keys())
                    has_cursor = 'editorCursor.foreground' in colors
                    
                    if has_brackets and has_cursor:
                        valid_themes += 1
                        print(f"✅ {filename}: Valid with brackets & cursor")
                    else:
                        print(f"⚠️  {filename}: Missing brackets or cursor color")
                else:
                    print(f"❌ {filename}: Missing required fields")
                    
            except json.JSONDecodeError as e:
                print(f"❌ {filename}: Invalid JSON - {e}")
            except Exception as e:
                print(f"❌ {filename}: Error - {e}")
    
    success_rate = (valid_themes / total_themes) * 100 if total_themes > 0 else 0
    print(f"\n📊 Theme Validation: {valid_themes}/{total_themes} themes valid ({success_rate:.1f}%)")
    return success_rate >= 90

def test_snippets():
    """Test snippet files"""
    snippet_dir = 'snippet'
    valid_snippets = 0
    total_snippets = 0
    
    if not os.path.exists(snippet_dir):
        print("❌ Snippet directory not found")
        return False
    
    for filename in os.listdir(snippet_dir):
        if filename.endswith('.json'):
            total_snippets += 1
            try:
                with open(os.path.join(snippet_dir, filename), 'r') as f:
                    snippet_data = json.load(f)
                    
                # Check if it has snippet structure
                if isinstance(snippet_data, dict) and len(snippet_data) > 0:
                    # Check if snippets have required fields
                    first_snippet = next(iter(snippet_data.values()))
                    if 'prefix' in first_snippet and 'body' in first_snippet:
                        valid_snippets += 1
                        print(f"✅ {filename}: Valid snippet file")
                    else:
                        print(f"❌ {filename}: Invalid snippet structure")
                else:
                    print(f"❌ {filename}: Empty or invalid format")
                    
            except json.JSONDecodeError as e:
                print(f"❌ {filename}: Invalid JSON - {e}")
            except Exception as e:
                print(f"❌ {filename}: Error - {e}")
    
    success_rate = (valid_snippets / total_snippets) * 100 if total_snippets > 0 else 0
    print(f"\n📊 Snippet Validation: {valid_snippets}/{total_snippets} snippets valid ({success_rate:.1f}%)")
    return success_rate >= 90

def test_package_json():
    """Test package.json structure"""
    try:
        with open('package.json', 'r') as f:
            package_data = json.load(f)
        
        # Check required fields
        required_fields = ['name', 'displayName', 'version', 'contributes']
        missing_fields = [field for field in required_fields if field not in package_data]
        
        if missing_fields:
            print(f"❌ Package.json missing fields: {missing_fields}")
            return False
        
        # Check contributes section
        contributes = package_data.get('contributes', {})
        themes_count = len(contributes.get('themes', []))
        snippets_count = len(contributes.get('snippets', []))
        commands_count = len(contributes.get('commands', []))
        
        print(f"✅ Package.json: {themes_count} themes, {snippets_count} snippets, {commands_count} commands")
        
        # Check if all themes are TCT prefixed
        themes = contributes.get('themes', [])
        tct_themes = [t for t in themes if t.get('label', '').startswith('TCT')]
        tct_percentage = (len(tct_themes) / len(themes)) * 100 if themes else 0
        
        print(f"📊 TCT Branding: {len(tct_themes)}/{len(themes)} themes have TCT prefix ({tct_percentage:.1f}%)")
        
        return themes_count >= 30 and snippets_count >= 2 and commands_count >= 3
        
    except Exception as e:
        print(f"❌ Package.json test failed: {e}")
        return False

def test_memory_optimization():
    """Test memory optimization by checking file sizes"""
    try:
        # Check if unwanted files are removed
        unwanted_files = [
            'themes/dark_plus.json',
            'themes/light_plus.json', 
            'fileicons/',
            'build.bat',
            'vsc-extension-quickstart.md'
        ]
        
        removed_count = 0
        for file_path in unwanted_files:
            if not os.path.exists(file_path):
                removed_count += 1
        
        optimization_rate = (removed_count / len(unwanted_files)) * 100
        print(f"✅ Memory Optimization: {removed_count}/{len(unwanted_files)} unwanted files removed ({optimization_rate:.1f}%)")
        
        # Check extension size
        if os.path.exists('compiled-thought-themes-2.0.0.vsix'):
            size_mb = os.path.getsize('compiled-thought-themes-2.0.0.vsix') / (1024 * 1024)
            print(f"📦 Extension Size: {size_mb:.2f} MB")
            return size_mb < 5.0  # Should be under 5MB for good performance
        
        return optimization_rate >= 80
        
    except Exception as e:
        print(f"❌ Memory optimization test failed: {e}")
        return False

def run_all_tests():
    """Run comprehensive test suite"""
    print("🧪 Starting Thorough Testing of TCT Extension\n")
    print("=" * 60)
    
    tests = [
        ("Extension Installation", test_extension_installation),
        ("Theme File Validation", test_theme_files),
        ("Snippet Validation", test_snippets),
        ("Package.json Structure", test_package_json),
        ("Memory Optimization", test_memory_optimization)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🔍 Testing: {test_name}")
        print("-" * 40)
        result = test_func()
        results.append((test_name, result))
        print(f"Result: {'✅ PASS' if result else '❌ FAIL'}")
    
    print("\n" + "=" * 60)
    print("📋 FINAL TEST RESULTS")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:<25} {status}")
    
    success_rate = (passed / total) * 100
    print(f"\n🎯 Overall Success Rate: {passed}/{total} ({success_rate:.1f}%)")
    
    if success_rate >= 90:
        print("🎉 EXTENSION READY FOR RELEASE!")
    elif success_rate >= 70:
        print("⚠️  EXTENSION NEEDS MINOR FIXES")
    else:
        print("❌ EXTENSION NEEDS MAJOR FIXES")
    
    return success_rate >= 90

if __name__ == "__main__":
    run_all_tests()
