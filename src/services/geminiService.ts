import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const getStockSummary = async (symbol: string, price: number) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the stock ${symbol} currently trading at ₹${price}. 
      Provide the following details for a fintech app named Aapa Capital:
      1. Company Summary: A brief professional overview.
      2. Technical Trend: Current market trend (e.g., Bullish, Bearish, Sideways).
      3. Support & Resistance: Key price levels.
      4. Targets: Short-term and long-term price targets.
      5. Sentiment: Overall market sentiment (Bullish / Bearish / Neutral).
      6. Risk Assessment: Potential risks.
      7. News Impact: Recent news affecting the stock.

      Format as JSON with keys: summary, trend, supportResistance, targets, sentiment, risks, newsImpact.`,
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      summary: "AI analysis currently unavailable.",
      trend: "Neutral",
      supportResistance: "N/A",
      targets: "N/A",
      sentiment: "Neutral",
      risks: "Market volatility is always a factor.",
      newsImpact: "No significant recent news."
    };
  }
};
