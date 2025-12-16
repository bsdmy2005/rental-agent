import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface ExtractedBillData {
  waterUsage?: number
  waterAmount?: number
  electricityUsage?: number
  electricityAmount?: number
  levyAmount?: number
  municipalityCharges?: number
  totalAmount?: number
  period?: string
  accountNumber?: string
  [key: string]: any // For custom fields
}

export async function processPDFWithOpenAI(
  fileUrl: string,
  rawText: string,
  extractionConfig?: any
): Promise<ExtractedBillData> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set")
    }

    // Use OpenAI to extract structured data from the text
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at extracting structured data from bills and invoices. Extract all relevant information including water usage, electricity usage, levy amounts, municipality charges, and any other billable items. Return the data as JSON."
        },
        {
          role: "user",
          content: extractionConfig
            ? `Extract data from this bill text using these rules: ${JSON.stringify(extractionConfig)}. Return as JSON with fields: waterUsage, waterAmount, electricityUsage, electricityAmount, levyAmount, municipalityCharges, totalAmount, period, accountNumber, and any other relevant fields.\n\nBill Text:\n${rawText}`
            : `Extract all relevant data from this bill. Return as JSON with fields: waterUsage, waterAmount, electricityUsage, electricityAmount, levyAmount, municipalityCharges, totalAmount, period, accountNumber, and any other relevant fields.\n\nBill Text:\n${rawText}`
        }
      ],
      response_format: { type: "json_object" }
    })

    const extractedData = JSON.parse(completion.choices[0].message.content || "{}")
    return extractedData as ExtractedBillData
  } catch (error) {
    console.error("Error processing PDF with OpenAI:", error)
    throw error
  }
}

export async function extractTextFromPDF(fileUrl: string): Promise<string> {
  try {
    // TODO: Implement proper PDF text extraction
    // For MVP-1, we'll use a placeholder
    // In production, use a library like pdf-parse or pdfjs-dist
    // For now, return a placeholder that indicates text extraction is needed
    return "PDF text extraction - to be implemented with pdf-parse or similar library"
  } catch (error) {
    console.error("Error extracting text from PDF:", error)
    throw error
  }
}

