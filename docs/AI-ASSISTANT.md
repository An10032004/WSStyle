# Trợ lý AI (chatbot + tìm kiếm) — WSSTYLE B2BWL

Tài liệu mô tả **cách hệ thống dùng AI hiện tại**, **RAG (kiểu tài liệu nguồn)**, API, cấu hình và hướng mở rộng. Phù hợp quy mô **1–2 người dùng thử nghiệm**; chưa tối ưu cho traffic lớn.

---

## 1. Tổng quan kiến trúc

```
[Angular: bubble chat / trang /assistant / shop “Tìm AI”]
        │  POST /api/ai/chat  |  POST /api/ai/search
        ▼
[Spring: AIProductHelperService]
        │  ① Prompt = site-context.md + danh mục (id:tên) + câu user
        │  ② Gemini trả **một JSON** (intent + message + tham số tìm kiếm)
        │  ③ Nếu intent = product_search → ProductSpecification + DB
        ▼
[MySQL]  sản phẩm / danh mục
```

- **Không còn luật if/else tiếng Việt** (offline) trong `AIProductHelperService`.
- Model **không** kết nối DB trực tiếp: chỉ sinh **JSON có kiểm soát**; **Spring** chạy truy vấn JPA.

---

## 2. “RAG” trong repo này nghĩa là gì?

**RAG đầy đủ** (Retrieval-Augmented Generation) thường gồm: *embedding* văn bản → *vector store* → truy vấn theo độ tương đồng → đưa *chunk* vào prompt.

**Hiện tại** dùng **RAG kiểu tài liệu tĩnh (không vector)**:

| Nguồn | File / cơ chế | Vai trò |
|--------|----------------|--------|
| Mô tả web (route, luồng UX) | `Fashion-B2BWL-/src/main/resources/ai/site-context.md` | Được nạp lúc startup (`AiSiteContextLoader`), đưa vào prompt để intent `site_help` trả lời **đúng theo tài liệu** |
| Danh mục | `CategoryRepository.findAll()` (tối đa 80 dòng `id: tên`) | Giúp model chọn `categoryId` / `categoryIds` trong JSON |
| Sản phẩm | `ProductSpecification` + `ProductRepository` | Sau khi model trả `product_search`, server lọc DB (tên/mã, giá, brand, danh mục) |

**Chưa có:** embedding, pgvector/Pinecone, chunking tự động từ DB.

---

## 3. API

| Phương thức | Đường dẫn | Body | Mô tả |
|-------------|-----------|------|--------|
| POST | `/api/ai/chat` | `{ "message": "..." }` — tùy chọn `userId`, `sessionId` (tiếp tục phiên), `storefrontContext` (markdown) | `userId` map giá rule + **lưu lịch sử**; `sessionId` gắn tin vào phiên hiện có; response có `sessionId` |
| POST | `/api/ai/search` | `{ "query": "..." }` hoặc `{ "message": "..." }` — cùng tùy chọn `userId`, `storefrontContext`, `sessionId` (optional) | Cùng pipeline; server thêm prefix `[Tìm kiếm cửa hàng]` để model ưu tiên `product_search` |
| GET | `/api/ai/sessions?userId=&limit=` | — | Danh sách phiên Luxe Assistant của user (lịch sử). |
| GET | `/api/ai/sessions/{id}/messages?userId=` | — | Các lượt USER/ASSISTANT trong phiên (chỉ khi `id` thuộc `userId`). |

Sau mỗi lần **POST** `/api/ai/chat` hoặc `/api/ai/search` có `userId`, server ghi **2 lượt** (user + assistant) vào bảng `luxe_assistant_*`; trả về `data.sessionId` để FE gửi lại ở lần sau.

**Tìm sản phẩm:** nếu truy vấn chính trả về 0 dòng, `AIProductHelperService.runProductSearch` thử lại từng từ khóa rút từ câu (vd. `áo navy` → `áo`, `navy`) với cùng bộ lọc giá/danh mục.

Response bọc trong `ApiResponse`:

```json
{
  "success": true,
  "data": {
    "message": "…",
    "products": [ … ]
  }
}
```

Trang **Shop**: ô “Tìm AI” gọi `aiSemanticSearch` → nhận `products` → gọi lại `GET /api/products/search?productIds=…` để áp **giá rule engine** (B2B) đúng với user.

---

## 4. Cấu hình

Trong `application.properties` (hoặc biến môi trường):

- `google.ai.api-key` — API key [Google AI Studio](https://aistudio.google.com/) (Gemini). **Không** commit key thật lên git; dùng env (ví dụ `GOOGLE_AI_API_KEY`) hoặc secret.
- `google.ai.url` — URL đầy đủ tới `…:generateContent` (mặc định `gemini-flash-latest`). Key được gửi qua header **`x-goog-api-key`** (giống `curl -H 'X-goog-api-key: …'`), không gắn `?key=` trên URL — hỗ trợ key có dấu chấm (ví dụ `AQ.xxx`).
- Nếu thiếu key: API trả message hướng dẫn cấu hình, không gọi Gemini.

**Lọc theo khoảng giá:** backend trích `minPrice`/`maxPrice` từ câu khách nếu model bỏ sót, và **không** dùng cả câu làm `LIKE` tên sản phẩm khi đã có bộ lọc giá/danh mục/thương hiệu — tránh danh sách rỗng dù có sản phẩm trong khoảng giá.

**Trả về sản phẩm:** `data.products` là `ProductResponseDTO` (giá đã áp rule + thuế hiển thị) khi gửi kèm `userId` hợp lệ; bubble hiển thị `calculatedPrice ?? basePrice`.

Model thử lần lượt (fallback): `gemini-flash-latest` → `gemini-2.0-flash` → `gemini-1.5-flash` → `gemini-pro` (xem `AIProductHelperService.ENDPOINTS`).

---

## 5. Intent JSON (Gemini phải trả)

Schema được mô tả trong prompt; tóm tắt:

- `intent`: `site_help` | `product_search` | `chat`
- `message`: luôn có (tiếng Việt)
- `product_search`: `search` / `keyword`, `categoryId`, `categoryIds`, `minPrice`, `maxPrice`, `brand`, `brands[]`, `sortBy` (`none` | `price_asc` | `price_desc`)

---

## 6. Hướng người dùng (UX)

1. **Chat bubble (storefront)**  
   Hỏi tự nhiên: cách vào giỏ, checkout, quên mật khẩu, đường dẫn… → intent `site_help` / `chat`.  
   Muốn xem sản phẩm → mô tả nhu cầu → intent `product_search` + thẻ sản phẩm (nếu có).  
   Nút **“Mở rộng”** → `/assistant` (cùng API, layout rộng: bảng ảnh / giá / link `/product/:id`).

2. **Trang Luxe Assistant — `/assistant`** (đăng nhập, `authGuard`)  
   Chat toàn chiều ngang + cột **“Sản phẩm gợi ý”** (bảng) cập nhật theo lần trả lời gần nhất có `products`.  
   Backend: nếu câu giống hỏi hàng (màu/size/có bán…/áo quần…) nhưng model trả `chat`/`site_help`, `AIProductHelperService.maybeForceProductSearch` **ép** `product_search` và điền `search`/`keyword` (đã bỏ từ dừng, gồm “màu”).  
   `ProductSpecification`: khi có `search`, join variant + `LIKE` trên màu/size/SKU + `distinct`.

3. **Trang Shop — “Tìm AI”**  
   Nhập câu mô tả (vd. “áo lụa dưới 1 triệu”) → kết quả lưới sản phẩm + dòng gợi ý từ `message`.  
   Bộ lọc tay (giá, brand, danh mục) vẫn dùng API `searchProducts` như cũ.

4. **Khi AI lỗi / hết quota**  
   Thông báo chung: không fallback luật cứng; người dùng thử lại hoặc dùng bộ lọc thủ công.

---

## 7. Cập nhật tài liệu web cho AI

Sửa file:

`Fashion-B2BWL-/src/main/resources/ai/site-context.md`

Thêm route, chính sách, flow mới → chatbot trả lời **site_help** sát với thực tế hơn (vẫn trong giới hạn “không bịa” đã nhắc trong prompt).

---

## 8. Tài liệu tham khảo

- [Google AI for Developers](https://ai.google.dev/) — Gemini API, model, quota.
- [Google AI Studio](https://aistudio.google.com/) — tạo API key, thử prompt.
- [Spring RestClient](https://docs.spring.io/spring-framework/reference/integration/rest-clients.html) — HTTP client (code có thể dùng song song `HttpClient` Java).
- RAG cổ điển: [LangChain RAG concepts](https://python.langchain.com/docs/concepts/rag/) (khái niệm retrieval + generation; stack Python nhưng ý tưởng áp dụng được cho Java).

---

## 9. Hướng mở rộng (khi tăng user / độ phức tạp)

1. **Vector RAG**: chunk `site-context` + mô tả sản phẩm dài → embedding (Gemini/OpenAI) → **pgvector** hoặc hosted vector DB.  
2. **Ghi analytics**: bảng `user_ai_events` (session, intent, query, productIds, latency) — async, không chặn request.  
3. **Function calling**: Gemini gọi “tool” `search_products` thay vì chỉ JSON text (ổn định hơn khi schema phức tạp).  
4. **Rate limit / cache** prompt ngắn cho câu hỏi trùng.

---

## 10. File code chính

| Thành phần | Đường dẫn |
|------------|-----------|
| Logic AI + DB | `Fashion-B2BWL-/…/service/AIProductHelperService.java` |
| Tải site markdown | `Fashion-B2BWL-/…/service/AiSiteContextLoader.java` |
| Tài liệu RAG tĩnh | `Fashion-B2BWL-/src/main/resources/ai/site-context.md` |
| REST | `Fashion-B2BWL-/…/controller/AIChatController.java` |
| FE chat bubble | `FE-Fashion-B2BWL/…/ai-assistant-bubble/` |
| FE trang assistant | `FE-Fashion-B2BWL/…/pages/ai-assistant-page/` — route `assistant` trong `app.routes.ts` |
| FE shop AI | `FE-Fashion-B2BWL/…/pages/shop/shop.ts` + `shop.html` |
| HTTP client | `FE-Fashion-B2BWL/…/services/api.service.ts` (`chatWithAI`, `aiSemanticSearch`) |
