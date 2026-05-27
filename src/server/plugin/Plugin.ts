import { AllowAccess, PackageAccess, RemoteUser } from "@verdaccio/types"
import { pluginUtils, errorUtils } from "@verdaccio/core"
import { Application, static as expressServeStatic } from "express"
import { logger } from "../../logger"
import { WebFlow } from "../flows"
import { VerdaccioGoogleOAuthConfig, ParsedPluginConfig } from "./Config"
import { PatchHtml } from "./PatchHtml"
import { registerGlobalProxyAgent } from "./ProxyAgent"
import { publicRoot, staticPath } from "../constants"
import { Verdaccio } from "./Verdaccio"
import { createAuthenticatedUser } from "../helpers"

type Package = PackageAccess & (AllowAccess | VerdaccioGoogleOAuthConfig)
type Action = "access" | "publish" | "unpublish"

function logAccess(
  user: RemoteUser,
  pkg: Package,
  action: Action,
  grant: boolean,
) {
  logger.debug({
    package: pkg.name,
    action: action,
    user: user.name,
    grant: grant,
  })
}

/**
 * Implements the verdaccio plugin interfaces.
 */
export class Plugin
  extends pluginUtils.Plugin<VerdaccioGoogleOAuthConfig>
  implements
    pluginUtils.ExpressMiddleware<VerdaccioGoogleOAuthConfig, any, any>,
    pluginUtils.Auth<VerdaccioGoogleOAuthConfig>
{
  private readonly parsedConfig: ParsedPluginConfig
  private readonly verdaccio: Verdaccio

  constructor(
    readonly config: VerdaccioGoogleOAuthConfig,
    options?: any,
  ) {
    super(config, options)
    const fullConfig = (options?.config as VerdaccioGoogleOAuthConfig) ?? config
    this.parsedConfig = new ParsedPluginConfig(fullConfig)
    this.verdaccio = new Verdaccio(fullConfig)
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
      new WebFlow(this.verdaccio, this.parsedConfig),
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

  private async _allow(
    user: RemoteUser,
    pkg: Package,
    action: Action,
    callback: pluginUtils.AccessCallback,
  ) {
    if (!user.name) {
      // let other auth plugins and verdaccio's default handler deal with unauthenticated users
      logAccess(user, pkg, action, false)
      callback(null, false)
      return
    }

    /*
    const requiredGroups = pkg[action] as string[] | undefined
    const userGroups = await this.cache.getGroups(user.name)
    const grant = !!requiredGroups?.some((group) => userGroups.includes(group))

    const grant = pkgAccess?.some((group) => userGroups.includes(group))
    */
    const grant = true
    logAccess(user, pkg, action, grant)
    callback(null, grant)
  }

  /**
   * pluginUtils.Auth
   */
  async allow_access(
    user: RemoteUser,
    pkg: Package,
    callback: pluginUtils.AuthAccessCallback,
  ): Promise<void> {
    await this._allow(user, pkg, "access", callback)
  }

  /**
   * IPluginAuth
   */
  async allow_publish(
    user: RemoteUser,
    pkg: Package,
    callback: pluginUtils.AccessCallback,
  ): Promise<void> {
    await this._allow(user, pkg, "publish", callback)
  }

  /**
   * IPluginAuth
   */
  async allow_unpublish(
    user: RemoteUser,
    pkg: Package,
    callback: pluginUtils.AccessCallback,
  ): Promise<void> {
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

    await this._allow(user, pkg, "unpublish", callback)
  }
}
