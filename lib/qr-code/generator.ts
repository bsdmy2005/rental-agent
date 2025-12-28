import QRCode from "qrcode"

/**
 * Generate QR code as data URL (for display in img tag)
 */
export async function generateQRCodeDataURL(
  text: string,
  options?: {
    width?: number
    margin?: number
    color?: {
      dark?: string
      light?: string
    }
  }
): Promise<string> {
  const defaultOptions = {
    width: 300,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF"
    }
  }

  const qrOptions = { ...defaultOptions, ...options }

  try {
    const dataURL = await QRCode.toDataURL(text, qrOptions)
    return dataURL
  } catch (error) {
    console.error("Error generating QR code:", error)
    throw new Error("Failed to generate QR code")
  }
}

/**
 * Generate QR code as SVG string
 */
export async function generateQRCodeSVG(
  text: string,
  options?: {
    width?: number
    margin?: number
    color?: {
      dark?: string
      light?: string
    }
  }
): Promise<string> {
  const defaultOptions = {
    width: 300,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF"
    }
  }

  const qrOptions = { ...defaultOptions, ...options }

  try {
    const svg = await QRCode.toString(text, { type: "svg", ...qrOptions })
    return svg
  } catch (error) {
    console.error("Error generating QR code SVG:", error)
    throw new Error("Failed to generate QR code SVG")
  }
}

/**
 * Generate QR code for property incident submission
 */
export async function generatePropertySubmissionQRCode(
  propertyCode: string,
  baseUrl?: string
): Promise<string> {
  const url = baseUrl || (typeof window !== "undefined" ? window.location.origin : "")
  const submissionUrl = `${url}/report-incident?code=${propertyCode}`
  return generateQRCodeDataURL(submissionUrl, {
    width: 400,
    margin: 3
  })
}

