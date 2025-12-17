import { AllowAccess, PackageAccess, RemoteUser } from "@verdaccio/types"
import { pluginUtils } from "@verdaccio/core"
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
  private readonly core = new AuthCore(this.verdaccio, this.parsedConfig)

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
    callback(new Error("Signup/Login Not Implemented") as AuthError, false)
  }

  /**
   * pluginUtils.Auth
   */
  allow_access(
    user: RemoteUser,
    pkg:
      | (VerdaccioGoogleOAuthConfig & PackageAccess)
      | (AllowAccess & PackageAccess),
    callback: pluginUtils.AuthAccessCallback,
  ): void {
    if (pkg.access) {
      const grant = pkg.access.some((group) => user.groups.includes(group))
      callback(null, grant)
    } else {
      callback(null, true)
    }
  }
}
