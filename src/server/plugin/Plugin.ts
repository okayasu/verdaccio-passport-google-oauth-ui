import { AllowAccess, PackageAccess, RemoteUser } from "@verdaccio/types"
import { pluginUtils, errorUtils } from "@verdaccio/core"
import { Application, static as expressServeStatic } from "express"
import { WebFlow } from "../flows"
import { AuthCore } from "./AuthCore"
import { VerdaccioGoogleOAuthConfig, ParsedPluginConfig } from "./Config"
import { PatchHtml } from "./PatchHtml"
import { registerGlobalProxyAgent } from "./ProxyAgent"
import { publicRoot, staticPath } from "../constants"
import { Verdaccio } from "./Verdaccio"

/**
 * Implements the verdaccio plugin interfaces.
 */
export class Plugin
  extends pluginUtils.Plugin<VerdaccioGoogleOAuthConfig>
  implements
    pluginUtils.ExpressMiddleware<VerdaccioGoogleOAuthConfig, any, any>,
    pluginUtils.Auth<VerdaccioGoogleOAuthConfig>
{
  private readonly parsedConfig = new ParsedPluginConfig(this.config)
  private readonly verdaccio = new Verdaccio(this.config)
  private readonly core = new AuthCore()

  constructor(
    readonly config: VerdaccioGoogleOAuthConfig,
    options?: any,
  ) {
    super(config, options)
    registerGlobalProxyAgent()
  }

  /**
   * pluginUtils.ExpressMiddleware
   */
  register_middlewares(app: Application, auth: any) {
    this.verdaccio.setAuth(auth)

    // use static files.
    app.use(staticPath, expressServeStatic(publicRoot))

    const children = [
      new PatchHtml(this.parsedConfig),
      new WebFlow(this.verdaccio, this.parsedConfig, this.core),
    ]

    for (const child of children) {
      child.register_middlewares(app)
    }
  }

  private async userNameAndTokenMatch(
    userName: string,
    userToken: string,
  ): Promise<boolean> {
    return true
  }

  /**
   * pluginUtils.Auth
   */
  async authenticate(
    userName: string,
    userToken: string,
    callback: pluginUtils.AuthCallback,
  ): Promise<void> {
    callback(new Error("Signup/Login Not Implemented") as errorUtils.VerdaccioError, false)
  }

  /**
   * pluginUtils.Auth
   */
  async allow_access(
    user: RemoteUser,
    pkg:
      | (VerdaccioGoogleOAuthConfig & PackageAccess)
      | (AllowAccess & PackageAccess),
    callback: pluginUtils.AuthAccessCallback,
  ): Promise<void> {
    if (!user.name) {
      // let other auth plugins and verdaccio's default handler deal with unauthenticated users
      callback(null, false)
      return
    }

    const userGroups = await this.cache.getGroups(user.name)

    // pkg.access cannot be undefined here due to normalisePackageAccess() in @verdaccio/config
    const grant = pkg.access!.some((group) => userGroups.includes(group))
    callback(null, grant)
  }

  /**
   * IPluginAuth
   */
  async allow_publish(
    user: RemoteUser,
    pkg:
      | (VerdaccioGoogleOAuthConfig & PackageAccess)
      | (AllowAccess & PackageAccess),
    callback: pluginUtils.AccessCallback,
  ): Promise<void> {
    if (!user.name) {
      // let other auth plugins and verdaccio's default handler deal with unauthenticated users
      callback(null, false)
      return
    }

    const userGroups = await this.cache.getGroups(user.name)

    // pkg.publish cannot be undefined here due to normalisePackageAccess() in @verdaccio/config
    const grant = pkg.publish!.some((group) => userGroups.includes(group))
    callback(null, grant)
  }

  /**
   * IPluginAuth
   */
  async allow_unpublish(
    user: RemoteUser,
    pkg:
      | (VerdaccioGoogleOAuthConfig & PackageAccess)
      | (AllowAccess & PackageAccess),
    callback: pluginUtils.AccessCallback,
  ): Promise<void> {
    if (!user.name) {
      // let other auth plugins and verdaccio's default handler deal with unauthenticated users
      callback(null, false)
      return
    }

    if (pkg.unpublish === false) {
      // let verdaccio's default behavior call allow_publish() for authentication
      callback(null, undefined)
      return
    }

    if (pkg.unpublish === true) {
      // `true` is not a valid value - this should never happen - Verdaccio shouldn't even allow us to end up here
      // this here mostly to satisfy TypeScript and avoid an `as string[]` cast below
      callback(
        errorUtils.getInternalError("Invalid package unpublish configuration"),
        false,
      )
      return
    }

    const userGroups = await this.cache.getGroups(user.name)

    // pkg.unpublish cannot be undefined here due to normalisePackageAccess() in @verdaccio/config
    const grant = pkg.unpublish!.some((group) => userGroups.includes(group))
    callback(null, grant)
  }
}
