import copy from "copy-to-clipboard"

export function copyToClipboard(text: string) {
  copy(text)
}

/*
export async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text)
}
*/
