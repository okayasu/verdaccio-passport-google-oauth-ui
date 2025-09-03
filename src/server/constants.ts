import url from "url"
import path from "path"
import { pluginKey } from "../constants"

const __filename = url.fileURLToPath(new URL('./constants.ts', import.meta.url))
export const publicRoot = path.resolve(path.dirname(__filename) + "/../client")
export const staticPath = "/-/static/" + pluginKey