<h1 align="center">
  📦🔐 Verdaccio Google OAuth - With UI Support
</h1>

<p align="center">
  A Google OAuth Plugin for Verdaccio – <a href="https://www.verdaccio.org">https://www.verdaccio.org</a>
</p>

## About

This is a Verdaccio plugin that offers Google OAuth integragtion for both the browser and the command line.

### Features

- Use the Verdaccio default login and logout button. The login button redirects you to Google. When you return, you are logged-in.
- The default Verdaccio usage info is updated with working copy-to-clipboard for setup commands. 
- The plugin ships with a small CLI for quick-and-easy npm configuration.

### Compatibility

- Verdaccio 5
- Node 14, 16
- Chrome, Firefox, Firefox ESR, Edge, Safari

## Setup

### Install

```
$ npm install verdaccio-passport-google-oauth-ui
```

### Google Config

- Create an OAuth 2.0 client credentials from https://console.developers.google.com/

### Verdaccio Config

Merge the below options with your existing Verdaccio config:

```yml
middlewares:
  passport-google-oauth-ui:
    client-id: GOOGLE_CLIENT_ID
    client-secret: GOOGLE_CLIENT_SECRET
    redirect-uri: http://localhost:4873/-/oauth/callback
    enabled: true

auth:
  passport-google-oauth-ui:
    enabled: true

```

Notes:

- The configured plugin options can either be the actual value or the name of an environment variable that contains the value.
- The plugin options can be specified under either the `middlewares` or the `auth` node.
- Ensure the plugin name is included under both `middlewares` and `auth`.

#### `client-id` and `client-secret`

These values can be obtained from Google Credentials list. https://console.developers.google.com/

#### `redirect-uri`

Redirect URI from Google's OAuth server.

## Login

### Verdaccio UI

- Click the login button and get redirected to Google.
- Authorize the registry to access your Google user and org info. You only need to do this once. If your org is private, make sure to click the <kbd>Request</kbd> or <kbd>Grant</kbd> button to get `email` access when prompted to authorize.
- Once completed, you'll be redirected back to the Verdaccio registry.

You are now logged in.

### Command Line

#### Copy commands from the UI

- Verdaccio 5:

Open the "Register Info" dialog and klick "Copy to clipboard":

![](screenshots/register-info.png)

- Run the copied commands on your terminal:

```
$ npm config set //localhost:4873:_authToken "SECRET_TOKEN"
```

- Verify npm is set up correctly by running the `whoami` command. Example:

```
$ npm whoami --registry http://localhost:4873
okayasu
```

If you see your Google username, you are ready to start installing and publishing packages.

## Logout

### Verdaccio UI

Click the <kbd>Logout</kbd> button as per usual.

### Command Line

Unless OAuth access is revoked in the Google settings, the token is valid indefinitely.
