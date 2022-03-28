import { JWTSignOptions, RemoteUser, IBasicAuth } from "@verdaccio/types"
import merge from "lodash/merge"
import { getMajorVersion, VerdaccioConfig } from "../plugin/Config"

interface IAuth {
  jwtEncrypt(user: RemoteUser, signOptions: JWTSignOptions): Promise<string>
}

// Most of this is duplicated Verdaccio code because it is unfortunately not availabel via API.
// https://github.com/verdaccio/verdaccio/blob/master/src/lib/auth-utils.ts#L129

const TIME_EXPIRATION_7D = "7d" as const

const defaultSecurity = {
  api: {
    legacy: true,
  },
  web: {
    sign: {
      expiresIn: TIME_EXPIRATION_7D,
    },
    verify: {},
  },
} as const

function getSecurity(config: VerdaccioConfig) {
  return merge({}, defaultSecurity, config.security)
}

/**
 * Abstract Verdaccio version differences and usage of all Verdaccio objects.
 */
export class Verdaccio {
  readonly majorVersion = getMajorVersion()
  readonly security = getSecurity(this.config)

  private auth!: IBasicAuth<any>

  constructor(private readonly config: VerdaccioConfig) {}

  setAuth(auth: IBasicAuth<any>): Verdaccio {
    this.auth = auth
    return this
  }

  async issueNpmToken(token: string, user: RemoteUser) {
    const jwtSignOptions = this.security?.api?.jwt?.sign

    if (jwtSignOptions) {
      return this.issueVerdaccio4PlusJWT(user, jwtSignOptions)
    } else {
      return this.encrypt(user.name + ":" + token)
    }
  }

  async issueUiToken(user: RemoteUser): Promise<string> {
    const jwtSignOptions = this.security.web.sign

    return this.issueVerdaccio4PlusJWT(user, jwtSignOptions)
  }

  // https://github.com/verdaccio/verdaccio/blob/master/src/api/web/endpoint/user.ts#L31
  private async issueVerdaccio4PlusJWT(
    user: RemoteUser,
    jwtSignOptions: JWTSignOptions,
  ): Promise<string> {
    return ((this.auth) as unknown as IAuth).jwtEncrypt(user, jwtSignOptions)
  }

  private encrypt(text: string) {
    return this.auth.aesEncrypt(Buffer.from(text)).toString("base64")
  }
}
