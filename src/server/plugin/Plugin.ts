import { AuthCallback, IPluginAuth, IPluginMiddleware, IBasicAuth, AuthError, IStorageManager} from "@verdaccio/types"
import { Application, static as expressServeStatic} from "express"

import { WebFlow } from "../flows/WebFlow"
import { Verdaccio } from "../verdaccio"
import { AuthCore } from "./AuthCore"
import { Config, validateConfig } from "./Config"
import { PatchHtml } from "./PatchHtml"
import { registerGlobalProxyAgent } from "./ProxyAgent"
import { publicRoot, staticPath } from "../../constants"

/**
 * Implements the verdaccio plugin interfaces.
 */
export class Plugin implements IPluginMiddleware<any>, IPluginAuth<any> {
  private readonly verdaccio = new Verdaccio(this.config)
  private readonly core = new AuthCore(this.verdaccio)

  constructor(private readonly config: Config) {
    validateConfig(config)
    registerGlobalProxyAgent()
  }

  /**
   * IPluginMiddleware
   */
  register_middlewares(app: Application, auth: IBasicAuth<any>, storage: IStorageManager<any>) {
    this.verdaccio.setAuth(auth)

    // use static files.
    app.use(staticPath, expressServeStatic(publicRoot))

    // overwrite default html response.
    app.use(new PatchHtml(this.verdaccio).patchResponse)

    // add route method.
    new WebFlow(this.config, this.core).initialize(app)
  }

  /**
   * IPluginAuth
   */
  authenticate(username: string, token: string, callback: AuthCallback) {
    callback(new Error("Signup/Login Not Implemented") as AuthError, false)
  }

}
