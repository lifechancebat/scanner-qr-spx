import { GoogleGenAI } from "@google/genai";
import { ScanRecord } from "../types";

function getApiKeys(): string[] {
  const keysStr = localStorage.getItem('gemini_api_keys');
  let keys: string[] = [];
  if (keysStr) {
    keys = keysStr.split('\n').map(k => k.trim()).filter(k => k.length > 0);
  }
  // Always fallback to environment key if available
  if (process.env.GEMINI_API_KEY && !keys.includes(process.env.GEMINI_API_KEY)) {
    keys.push(process.env.GEMINI_API_KEY);
  }
  return keys;
}

async function withFallback<T>(operation: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error("Không tìm thấy API Key nào. Vui lòng thêm trong phần Cài Đặt.");
  }

  let lastError: any;

  for (const key of keys) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      return await operation(ai);
    } catch (error: any) {
      lastError = error;
      console.warn("Lỗi với API Key hiện tại:", error);
      // Check for rate limit (429) or quota errors
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('exhausted')) {
        console.log("Chuyển sang API Key tiếp theo...");
        continue;
      }
      // If it's another type of error, we still might want to try the next key just in case,
      // but usually we'd throw. For robustness, let's try the next key anyway.
      continue;
    }
  }
  throw lastError || new Error("Tất cả API Keys đều thất bại.");
}

export async function analyzePackingPerformance(history: ScanRecord[]) {
  if (!history || history.length === 0) return "Chưa có đủ dữ liệu để phân tích. Hãy quét thêm vài đơn hàng nhé!";
  
  const recentHistory = history.slice(0, 50).map(r => ({
    code: r.code,
    durationSeconds: Math.round((r.finishTime - r.scanTime) / 1000),
    autoFinished: r.autoFinished
  }));

  const prompt = `Tôi là nhân viên kho hàng. Dưới đây là dữ liệu đóng gói các đơn hàng gần đây của tôi (định dạng JSON):
  ${JSON.stringify(recentHistory)}
  
  Hãy đóng vai một người quản lý kho thân thiện, phân tích ngắn gọn (khoảng 3-4 câu) bằng tiếng Việt:
  1. Đánh giá tổng quan tốc độ đóng gói (tính trung bình).
  2. Chỉ ra đơn hàng nào tốn nhiều thời gian nhất (nếu có).
  3. Đưa ra 1 lời động viên hoặc mẹo nhỏ để làm việc hiệu quả hơn.
  Lưu ý: Không dùng markdown in đậm quá nhiều, viết tự nhiên như đang trò chuyện.`;

  try {
    return await withFallback(async (ai) => {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-preview",
        contents: prompt,
      });
      return response.text;
    });
  } catch (error) {
    console.error("AI Error:", error);
    return "Xin lỗi, hệ thống AI đang bận hoặc hết lượt sử dụng. Vui lòng kiểm tra lại API Key.";
  }
}

export async function extractLabelInfo(base64Image: string, mimeType: string) {
  return await withFallback(async (ai) => {
    const prompt = `Trích xuất thông tin từ tem vận chuyển này và trả về định dạng JSON chính xác với các trường: "trackingNumber", "recipientName", "phone", "address". Nếu không thấy trường nào, để chuỗi rỗng. Chỉ trả về JSON, không có markdown.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-preview",
      contents: [
        { inlineData: { data: base64Image, mimeType } },
        prompt
      ],
      config: {
        responseMimeType: "application/json",
      }
    });
    
    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      console.error("Failed to parse JSON from AI", e);
      return {};
    }
  });
}