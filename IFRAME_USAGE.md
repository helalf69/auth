# Iframe Integration Guide

## Iframe Size Recommendation

The login page is designed to be embedded in an iframe. Recommended dimensions:

**Minimum Size:**
- Width: 420px
- Height: 600px

**Recommended Size:**
- Width: 450px
- Height: 650px

**Optimal Size:**
- Width: 480px
- Height: 700px

The page is responsive and will adapt to the iframe size, but these dimensions provide the best user experience.

## How to Embed

### Basic HTML

```html
<iframe 
  src="https://yourdomain.com/login" 
  width="450" 
  height="650" 
  frameborder="0"
  allow="camera; microphone"
  style="border: none; border-radius: 8px;">
</iframe>
```

### Responsive Iframe (Recommended)

```html
<div style="position: relative; width: 100%; max-width: 450px; margin: 0 auto;">
  <div style="padding-bottom: 144.44%; height: 0; overflow: hidden; position: relative;">
    <iframe 
      src="https://yourdomain.com/login" 
      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;"
      allow="camera; microphone">
    </iframe>
  </div>
</div>
```

The padding-bottom percentage (144.44%) maintains a 450:650 aspect ratio.

### React Component Example

```jsx
function AuthIframe() {
  return (
    <div style={{ maxWidth: '450px', margin: '0 auto' }}>
      <iframe
        src="https://yourdomain.com/login"
        width="450"
        height="650"
        frameBorder="0"
        allow="camera; microphone"
        style={{ border: 'none', borderRadius: '8px' }}
        title="Authentication"
      />
    </div>
  );
}
```

### Vue Component Example

```vue
<template>
  <div class="auth-container">
    <iframe
      src="https://yourdomain.com/login"
      width="450"
      height="650"
      frameborder="0"
      allow="camera; microphone"
      class="auth-iframe"
    />
  </div>
</template>

<style scoped>
.auth-container {
  max-width: 450px;
  margin: 0 auto;
}

.auth-iframe {
  border: none;
  border-radius: 8px;
}
</style>
```

## Communication with Parent Window

The iframe can communicate with the parent window using postMessage:

### Listening for Authentication Status

```javascript
window.addEventListener('message', function(event) {
  // Verify origin for security
  if (event.origin !== 'https://yourdomain.com') {
    return;
  }

  if (event.data && event.data.type === 'authStatus') {
    if (event.data.authenticated) {
      console.log('User is authenticated');
      // Handle authenticated state
    } else {
      console.log('User is not authenticated');
      // Handle unauthenticated state
    }
  }
});
```

### Requesting Auth Status

```javascript
// Send message to iframe to check auth status
const iframe = document.querySelector('iframe');
iframe.contentWindow.postMessage({ type: 'checkAuth' }, 'https://yourdomain.com');
```

## Features

### Remember Me

- Users can check "Remember me for 30 days"
- If checked, a secure token is stored in the database
- On next visit, users are automatically authenticated
- Token expires after 30 days

### Provider Options

Users can choose from:
- **Google** - Google Sign-In
- **Facebook** - Facebook Login  
- **Microsoft** - Microsoft Account

### Links

All links (Privacy Policy, Terms of Service, Delete Account) open in a new tab (`target="_blank"`).

## Security Considerations

1. **Same-Origin Policy**: The iframe must be served from the same domain or CORS must be properly configured
2. **X-Frame-Options**: Ensure your server doesn't set `X-Frame-Options: DENY` (Express doesn't set this by default)
3. **Content Security Policy**: If using CSP, ensure `frame-ancestors` allows your domain
4. **HTTPS**: Use HTTPS in production for secure cookie transmission

## Styling Customization

The login page uses CSS variables that can be overridden. However, since it's in an iframe, you'll need to modify the source files directly or use CSS injection techniques.

## Testing

1. Test the iframe in different browsers
2. Test on mobile devices (responsive design)
3. Test with different iframe sizes
4. Verify "Remember Me" functionality
5. Test all three OAuth providers
6. Verify links open in new tabs correctly

## Troubleshooting

### Iframe Not Loading
- Check CORS settings
- Verify X-Frame-Options header
- Check Content Security Policy

### Authentication Not Working
- Ensure cookies are enabled
- Check if third-party cookies are blocked
- Verify OAuth callback URLs match exactly

### Remember Me Not Working
- Check MongoDB connection
- Verify database credentials in `.env`
- Check browser console for errors
