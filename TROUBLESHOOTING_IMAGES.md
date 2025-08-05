# 🔧 Image Loading Troubleshooting Guide

## 🚨 Common Issues and Solutions

### Issue 1: Images Not Loading from Figma API

**Symptoms:**
- Images show as placeholders
- Console shows "No images found in design"
- Debug panel shows 0 images loaded

**Possible Causes:**
1. **Invalid Figma Token**
2. **Incorrect File Key**
3. **No Image Nodes in Design**
4. **API Rate Limiting**
5. **CORS Issues**

**Solutions:**

#### 1. Check Figma Token
```bash
# Verify your token format
# Should start with: figd_
# Example: figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 2. Verify File Key
```bash
# Extract from Figma URL
# https://figma.com/file/ABC123DEF456/My-Design
#                    ^^^^^^^^^^^^^^^^
#                    This is your file key
```

#### 3. Check Browser Console
Open Developer Tools (F12) and look for:
- ✅ Success messages: "Found X image nodes"
- ❌ Error messages: "Figma API error"
- ⚠️ Warning messages: "Rate limit hit"

#### 4. Test API Connection
Use the "Test API Connection" button in the debug panel.

### Issue 2: Images Load but Don't Display

**Symptoms:**
- Console shows images loaded successfully
- Debug panel shows image URLs
- But images still show as placeholders

**Possible Causes:**
1. **CORS Issues**
2. **Invalid Image URLs**
3. **Image Loading Errors**

**Solutions:**

#### 1. Check Image URLs
In the debug panel, verify image URLs:
- Should start with: `https://figma-alpha-api.s3.amazonaws.com/`
- Should not be null or empty

#### 2. Test Image URLs Directly
Copy an image URL from the debug panel and paste it in a new browser tab to see if it loads.

#### 3. Check CORS
Look for CORS errors in the browser console:
```
Access to fetch at 'https://figma-alpha-api.s3.amazonaws.com/...' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

### Issue 3: Partial Image Loading

**Symptoms:**
- Some images load, others don't
- Inconsistent behavior

**Possible Causes:**
1. **Mixed Image Sources**
2. **Different Node Types**
3. **API Rate Limiting**

**Solutions:**

#### 1. Check Node Types
Verify all image nodes have:
```json
{
  "fills": [
    {
      "type": "IMAGE"
    }
  ]
}
```

#### 2. Check Node IDs
Ensure all image nodes have valid IDs:
```json
{
  "id": "123:456",
  "name": "Image Node"
}
```

## 🔍 Debug Steps

### Step 1: Enable Debug Mode
1. Open the output page
2. Click the debug button (🔧)
3. Enable "Dev Mode" in the debug panel

### Step 2: Check Console Logs
Look for these specific messages:

**✅ Success Messages:**
```
🚀 Starting Figma image export process...
🖼️ Found image node: 123:456 (Image Name)
📊 Found 3 image nodes: ["123:456", "789:012", "345:678"]
🔗 Calling Figma API: https://api.figma.com/v1/images/...
✅ Successfully loaded 3 images from Figma API
📦 Image map: {"123:456": "https://..."}
```

**❌ Error Messages:**
```
❌ Error loading Figma images: Figma API error: 403 Forbidden
❌ Error loading Figma images: Figma API error: 401 Unauthorized
❌ Error loading Figma images: Figma API error: 429 Too Many Requests
```

### Step 3: Verify Data Flow

1. **Check Upload Process:**
   - Verify Figma JSON contains image nodes
   - Check that file key is extracted correctly
   - Confirm token is stored in localStorage

2. **Check API Call:**
   - Verify API URL construction
   - Check request headers
   - Monitor response status

3. **Check Image Rendering:**
   - Verify imageMap is populated
   - Check imageUrl is set correctly
   - Monitor image loading events

## 🧪 Testing Checklist

### Pre-Test Setup
- [ ] Valid Figma token with proper permissions
- [ ] Figma design with actual image elements
- [ ] Correct file key extracted from URL
- [ ] Browser console open for debugging

### Test Steps
1. **Upload Test File:**
   - [ ] Upload `public/test-figma-with-images.json`
   - [ ] Add valid Figma URL and token
   - [ ] Click "Generate Output with Images"

2. **Check Console Output:**
   - [ ] Look for "Found X image nodes" message
   - [ ] Verify API call is made
   - [ ] Check for successful response

3. **Verify Image Display:**
   - [ ] Images should load and display
   - [ ] No placeholder images visible
   - [ ] Debug panel shows correct image count

### Manual API Test
```bash
# Test with curl (replace with your values)
curl --location 'https://api.figma.com/v1/images/YOUR_FILE_KEY?ids=YOUR_NODE_ID&format=png&scale=2' \
--header 'X-Figma-Token: YOUR_TOKEN'
```

## 🛠️ Quick Fixes

### Fix 1: Clear Cache and Reload
```javascript
// In browser console
localStorage.clear();
window.location.reload();
```

### Fix 2: Regenerate Token
1. Go to Figma → Settings → Account
2. Delete old token
3. Create new token
4. Update in the app

### Fix 3: Check File Permissions
1. Ensure Figma file is accessible
2. Check if file is private/public
3. Verify token has proper permissions

### Fix 4: Use Different Browser
- Try Chrome, Firefox, or Safari
- Disable browser extensions
- Clear browser cache

## 📞 Getting Help

If issues persist:

1. **Collect Debug Information:**
   - Screenshot of debug panel
   - Console logs (copy all messages)
   - Figma file URL (if public)
   - Browser and OS information

2. **Test with Sample Data:**
   - Use the provided test file
   - Try with a simple Figma design
   - Verify with known working setup

3. **Check Network Tab:**
   - Open Developer Tools → Network
   - Look for failed API requests
   - Check response status codes

## 🔄 Common Workarounds

### Workaround 1: Manual Image Loading
If automatic loading fails:
1. Open debug panel
2. Click "Load Images from API" button
3. Check if images load manually

### Workaround 2: Use Plugin Export
If API loading fails:
1. Use Figma plugin to export with images
2. Upload plugin export data
3. Images should be included in the export

### Workaround 3: External Image URLs
For testing purposes:
1. Replace image URLs with external URLs
2. Test image rendering functionality
3. Verify display logic works 