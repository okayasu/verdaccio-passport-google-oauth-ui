import plugin from "../package.json"

export { plugin }

export const cliName = Object.keys(plugin.bin)[0]
export const pluginKey = plugin.name.replace("verdaccio-", "")
export const authorizePath = "/-/oauth/authorize"
export const callbackPath = "/-/oauth/callback"
export const loginHref = authorizePath
export const logoutHref = "/"

export const cliPort = 8239
export const cliProviderId = "cli"
export const cliAuthorizeUrl = "/oauth/authorize"

/**
 * See https://verdaccio.org/docs/en/packages
 */
export const authenticatedUserGroups = [
  "$all",
  "@all",
  "$authenticated",
  "@authenticated",
] as const
