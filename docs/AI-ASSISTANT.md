# Trợ lý AI (chatbot + tìm kiếm) — WSSTYLE B2BWL

Tài liệu mô tả **cách hệ thống dùng AI hiện tại**, **RAG (kiểu tài liệu nguồn)**, API, luồng **giá / gợi ý rule giá sỉ**, cấu hình và hướng mở rộng. Phù hợp quy mô **1–2 người dùng thử nghiệm**; chưa tối ưu cho traffic lớn.

---

## 1. Tổng quan kiến trúc

```
[Angular: bubble chat / trang /assistant / shop “Tìm AI”]
        │  POST /api/ai/chat  |  POST /api/ai/search
        │  (tùy chọn: userId, sessionId, storefrontContext, pricingHint*)
        ▼
[Spring: AIProductHelperService]
        │  ① Prompt = site-context.md + danh mục (id:tên) + ngữ cảnh phiên + câu user
        │  ② Gemini trả **một JSON** (intent + message + tham số tìm kiếm)
        │  ③ intent = product_search → ProductSpecification + DB → rank → merge gợi ý giá sỉ
        │  ④ map ProductResponseDTO qua ProductMapperService (userId) + resolve bundles
        ▼
[MySQL]  sản phẩm / biến thể / danh mục / rule giá
```

- **Không còn luật if/else tiếng Việt** (offline) trong `AIProductHelperService` để quyết định intent chính; model sinh **JSON có kiểm soát**; **Spring** chạy truy vấn JPA và các bước hậu xử lý (ranking, hints, mapper).
- Model **không** kết nối DB trực tiếp.

---

## 2. “RAG” trong repo này nghĩa là gì?

**RAG đầy đủ** (Retrieval-Augmented Generation) thường gồm: *embedding* văn bản → *vector store* → truy vấn theo độ tương đồng → đưa *chunk* vào prompt.

**Hiện tại** dùng **RAG kiểu tài liệu tĩnh (không vector)**:

| Nguồn | File / cơ chế | Vai trò |
|--------|----------------|--------|
| Mô tả web (route, luồng UX) | `Fashion-B2BWL-/src/main/resources/ai/site-context.md` | Nạp lúc startup (`AiSiteContextLoader`), đưa vào prompt để intent `site_help` trả lời **đúng theo tài liệu** |
| Danh mục | `CategoryRepository.findAll()` (tối đa 80 dòng `id: tên`) | Giúp model chọn `categoryId` / `categoryIds` trong JSON |
| Sản phẩm | `ProductSpecification` + `ProductRepository` | Sau `product_search`, server lọc DB (tên/mã, giá, brand, danh mục; join variant cho màu/size/SKU/**search_tags** khi có `search`) |

**Chưa có:** embedding, pgvector/Pinecone, chunking tự động từ DB.

---

## 3. API

### 3.1. Chat & tìm kiếm AI

| Phương thức | Đường dẫn | Body (JSON) | Mô tả |
|-------------|-----------|-------------|--------|
| POST | `/api/ai/chat` | `message` (bắt buộc). Tùy chọn: `userId`, `sessionId`, `storefrontContext` (markdown), **`pricingHintProductIds`** (mảng số), **`pricingHintCategoryIds`** (mảng số) | Pipeline Gemini → JSON → nếu `product_search` thì truy vấn DB + map giá. Có `userId` thì **lưu lịch sử** và trả `sessionId`. |
| POST | `/api/ai/search` | `query` hoặc `message` (một trong hai). Cùng tùy chọn như `/chat` | Server thêm prefix `[Tìm kiếm cửa hàng]` vào câu để ưu tiên `product_search`; cùng pipeline với `/chat`. |

**Lịch sử phiên (Luxe Assistant):**

| Phương thức | Đường dẫn | Mô tả |
|-------------|-----------|--------|
| GET | `/api/ai/sessions?userId=&limit=` | Danh sách phiên của user. |
| GET | `/api/ai/sessions/{id}/messages?userId=` | Các lượt USER/ASSISTANT trong phiên (chỉ khi phiên thuộc user). |

Sau mỗi **POST** `/api/ai/chat` hoặc `/api/ai/search` có `userId`, `LuxeAssistantHistoryService` ghi **2 lượt** (user + assistant); response `data.sessionId` để FE gửi lại ở lần sau.

### 3.2. Gợi ý phạm vi rule giá (QB / B2B) cho AI

| Phương thức | Đường dẫn | Query | Mô tả |
|-------------|-----------|--------|--------|
| GET | `/api/pricing-rules/assistant-hints` | `userId` (optional; guest = không gửi) | Trả `pricingHintProductIds` + `pricingHintCategoryIds`: rule **ACTIVE**, loại **QUANTITY_BREAK** hoặc **B2B_PRICE**, khách khớp **`RuleCoreService.isCustomerMatch`**, phạm vi **CATEGORY/GROUP** (JSON `categoryIds`) hoặc **SPECIFIC** (`productIds` và/hoặc **`variantIds`** → resolve sang `product_id` qua `ProductVariantRepository`). Giới hạn 80 SP / 30 danh mục. |

**FE:** `ApiService.getAssistantPricingHints(userId)`; `CartService` sau mỗi lần tải pricing rules gọi API và giữ **snapshot** (`BehaviorSubject`) — `getAssistantPricingHints()` đọc snapshot để gửi kèm `chatWithAI` / `aiSemanticSearch` (song song với BE tự tính lại trong `AIProductHelperService`, xem mục 11).

Response bọc `ApiResponse`:

```json
{
  "success": true,
  "data": {
    "message": "…",
    "products": [ … ],
    "bundles": [ … ],
    "sessionId": 123
  }
}
```

- **`products`:** `ProductResponseDTO` — khi có `userId` hợp lệ, giá qua **`ProductMapperService`** (cùng logic storefront); có thể có `totalStock` (tổng tồn SKU đang bán), `quantityBreaksJson`, `discountLabel`, v.v.
- **`bundles`:** combo/bundle ACTIVE gợi ý kèm (`AIBundleSummaryDTO`); prompt hướng dẫn model dùng link `/bundle/{id}`.

**Shop — ô “Tìm AI”:** `aiSemanticSearch` → nhận `products` → thường gọi lại `searchProducts` theo `productIds` để đồng bộ giá rule trên lưới.

**Gợi ý rule giá (pricing hints):** FE/backend có thể gửi `pricingHintProductIds` / `pricingHintCategoryIds`. `mergePricingHints` **chỉ** thay đổi thứ tự / ưu tiên danh sách khi câu khách có ý **giá sỉ / B2B** (từ khóa như «giá sỉ», «mua sỉ», …); tìm hàng chung không chèn SP trong phạm vi rule lên đầu nữa.

**Tìm sản phẩm (fallback từ khóa):** nếu truy vấn chính trả 0 dòng, `runProductSearch` thử lại từng từ/cụm rút từ câu với cùng bộ lọc giá/danh mục/thương hiệu.

**Xếp hạng sau DB:** `relevanceScore` dùng tên, mã và chuỗi gộp từ variant (SKU, màu, size, `search_tags`) so với `rankingQuery`, rồi tổng tồn, rồi id — để SP khớp chủ yếu qua tag vẫn được xếp cao hơn SP chỉ trùng từ xa.

---

## 4. Cấu hình

Trong `application.properties` (hoặc biến môi trường):

- **`google.ai.api-key`** — API key [Google AI Studio](https://aistudio.google.com/) (Gemini). **Không** commit key thật; dùng env (ví dụ `GOOGLE_AI_API_KEY`) hoặc secret.
- **`google.ai.url`** — URL đầy đủ tới `…:generateContent` (mặc định `gemini-flash-latest`). Key gửi qua header **`x-goog-api-key`**, không gắn `?key=` trên URL (hỗ trợ key có dấu chấm).
- Nếu thiếu/sai key: API trả message hướng dẫn cấu hình, không gọi Gemini.

**Thử endpoint theo thứ tự:** URL cấu hình trước, sau đó fallback cố định trong `AIProductHelperService` (v1beta `generateContent`):

- `gemini-flash-latest`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`
- `gemini-2.0-flash`

(Không dùng `gemini-1.5-flash` / `gemini-pro` trên URL mặc định cũ vì thường 404 trên API mới.)

**Lọc theo khoảng giá:** backend trích `minPrice`/`maxPrice` từ câu khách nếu model bỏ sót; khi đã có bộ lọc giá/danh mục/thương hiệu thì **không** dùng cả câu làm `LIKE` tên SP — tránh danh sách rỗng dù có hàng trong khoảng giá.

---

## 5. Intent JSON (Gemini phải trả)

Schema được mô tả chi tiết trong prompt trong `AIProductHelperService.buildPrompt`; tóm tắt:

- **`intent`:** `site_help` | `product_search` | `chat`
- **`message`:** luôn có (tiếng Việt; cho phép HTML an toàn trong chuỗi theo quy tắc prompt)
- **`product_search`:** `search` / `keyword`, `categoryId`, `categoryIds`, `minPrice`, `maxPrice`, `brand`, `brands[]`, `sortBy` (`none` | `price_asc` | `price_desc`)

**Ép `product_search`:** nếu câu khách rõ ràng là hỏi hàng (màu, size, “sản phẩm…”, giá sỉ, tồn kho, v.v.) nhưng model trả `chat`/`site_help`, `maybeForceProductSearch` đổi intent và điền `search`/`keyword` từ `extractProductSearchHint`.

**Prompt — điểm đã gắn với giá / B2B / gợi ý:**

- Giá trên thẻ lấy từ API sau map; không bịa số nếu ngữ cảnh không có.
- **Không** khẳng định kiểu “toàn bộ SP hiển thị đã áp giá sỉ” trừ khi từng mục có dấu hiệu (`discountLabel`, `quantityBreaksJson`, hoặc `calculatedPrice` vs `basePrice`).
- Request có thể kèm **`pricingHintProductIds` / `pricingHintCategoryIds`**; backend cũng **tự tính** cùng logic (mục 11); model chỉ nên nói về SP thực sự có trong payload khi hỏi danh sách giá sỉ.

---

## 6. Hướng người dùng (UX)

1. **Chat bubble (storefront)**  
   Hỏi tự nhiên: giỏ, checkout, đường dẫn… → `site_help` / `chat`.  
   Xem/tìm SP → `product_search` + thẻ sản phẩm (và bundle nếu có).  
   Gửi kèm **`storefrontContext`** (markdown: user, nhóm B2B, quote thuế mẫu) + **`pricingHint*`** từ `CartService`.  
   Nút mở rộng → `/assistant`.

2. **Trang Luxe Assistant — `/assistant`** (thường bảo vệ `authGuard`)  
   Chat rộng + cột “Sản phẩm gợi ý”; phiên + `sessionId`; mở phiên cũ nạp turn + `searchProducts` theo `productIds` lưu trong lịch sử.

3. **Shop — “Tìm AI”**  
   `aiSemanticSearch` + gợi ý `pricingHint*`; sau đó lọc lại `searchProducts` theo id.

4. **Lỗi / quota**  
   Thông báo chung; không fallback luật cứng tiếng Việt.

---

## 7. Cập nhật tài liệu web cho AI

Sửa file:

`Fashion-B2BWL-/src/main/resources/ai/site-context.md`

Thêm route, chính sách, flow mới → `site_help` sát thực tế hơn (vẫn trong giới hạn “không bịa” trong prompt).

---

## 8. Tài liệu tham khảo

- [Google AI for Developers](https://ai.google.dev/) — Gemini API, model, quota.
- [Google AI Studio](https://aistudio.google.com/) — tạo API key, thử prompt.
- RAG cổ điển: [LangChain RAG concepts](https://python.langchain.com/docs/concepts/rag/) (ý tưởng retrieval + generation).

---

## 9. Hướng mở rộng (khi tăng user / độ phức tạp)

1. **Vector RAG:** chunk `site-context` + mô tả SP dài → embedding → pgvector / hosted vector DB.  
2. **Analytics:** bảng sự kiện (session, intent, query, productIds, latency).  
3. **Function calling:** tool `search_products` thay vì chỉ JSON text.  
4. **Rate limit / cache** cho câu trùng.

---

## 10. File code chính

| Thành phần | Đường dẫn |
|------------|-----------|
| Logic AI + DB + ranking + merge hints + bundles | `Fashion-B2BWL-/…/service/AIProductHelperService.java` |
| Gợi ý id SP/danh mục rule QB/B2B (variant → product) | `Fashion-B2BWL-/…/service/AssistantPricingHintService.java` |
| DTO gợi ý | `Fashion-B2BWL-/…/dto/response/AssistantPricingHintsDTO.java` |
| Khớp khách/SP rule (dùng lại cho hints) | `Fashion-B2BWL-/…/service/RuleCoreService.java` |
| Tải site markdown | `Fashion-B2BWL-/…/service/AiSiteContextLoader.java` |
| Tài liệu RAG tĩnh | `Fashion-B2BWL-/src/main/resources/ai/site-context.md` |
| REST AI + lịch sử | `Fashion-B2BWL-/…/controller/AIChatController.java` |
| REST gợi ý + CRUD rule | `Fashion-B2BWL-/…/controller/PricingRuleController.java` (`GET …/assistant-hints`) |
| Lịch sử phiên | `Fashion-B2BWL-/…/service/LuxeAssistantHistoryService.java` |
| Map giá SP cho AI | `Fashion-B2BWL-/…/service/ProductMapperService.java` |
| Response AI + bundles | `Fashion-B2BWL-/…/dto/response/AIResponse.java`, `AIBundleSummaryDTO.java` |
| FE bubble | `FE-Fashion-B2BWL/…/shared/components/ai-assistant-bubble/` |
| FE trang assistant | `FE-Fashion-B2BWL/…/pages/ai-assistant-page/` |
| FE shop AI | `FE-Fashion-B2BWL/…/pages/shop/shop.ts` |
| FE API + hints type | `FE-Fashion-B2BWL/…/services/api.service.ts` (`chatWithAI`, `aiSemanticSearch`, `getAssistantPricingHints`) |
| FE giỏ + snapshot hints | `FE-Fashion-B2BWL/…/services/cart.service.ts` |

---

## 11. Luồng “giá sỉ” và gợi ý sản phẩm (kỹ thuật)

### 11.1. Vấn đề ban đầu

- Giá rule (B2B, quantity break) được áp trên storefront qua **`CartService`** + API rules; **AI chỉ search DB** nên dễ trả **SP không thuộc rule** hoặc model **nói lan** “đã áp giá sỉ” cho cả danh sách.
- Rule **SPECIFIC theo `variantIds`** không có `productIds` trong JSON → gợi ý chỉ tính trên FE **bỏ sót** nếu chỉ parse `productIds`.

### 11.2. Giải pháp đã triển khai

1. **`AssistantPricingHintService`**  
   Đọc toàn bộ `PricingRule` ACTIVE, lọc `QUANTITY_BREAK` / `B2B_PRICE`, `isCustomerMatch`, parse `applyProductValue`, **resolve `variantIds` → `productId`**, giới hạn trần (`MAX_HINT_PRODUCT_IDS` / `MAX_HINT_CATEGORY_IDS`).

2. **`GET /api/pricing-rules/assistant-hints`**  
   Trả DTO cho FE và cho bất kỳ client nào cần cùng tập id với logic giỏ.

3. **`AIProductHelperService` — mỗi `product_search`:**  
   - Gọi `computeHints(storefrontUserId)` và **union** với `pricingHint*` từ request (trần cùng hằng số service).  
   - Như vậy kể cả FE chưa kịp gửi hints (race sau load rules), **BE vẫn có phạm vi rule** nếu có `userId`.

4. **`mergePricingHints`**  
   - Có gợi ý (request ∪ server): load `Product` theo id + theo danh mục (`ProductSpecification`), `rankProductsForAi`.  
   - Nếu **`looksLikeWholesaleIntent`** (gồm cụm như `giá sỉ`, `áp dụng giá sỉ`, `mua sỉ`, …): **chỉ trả danh sách từ gợi ý** (tối đa 40), **không** nối thêm kết quả search chung — tránh 15 SP “ngẫu nhiên” khi hỏi “SP đang áp giá sỉ”.  
   - Intent không phải wholesale: vẫn có thể prepend một phần hint vào ranked như trước.

5. **FE**  
   - `chatWithAI` / `aiSemanticSearch`: body `pricingHintProductIds`, `pricingHintCategoryIds`.  
   - `CartService`: sau `getPricingRules()` gọi `getAssistantPricingHints` lưu snapshot; các màn chat/shop đọc `getAssistantPricingHints()` khi gửi (bổ sung cho BE union).

6. **Prompt**  
   Siết cách nói về giá sỉ/B2B và về payload `products` / nhóm khách (không suy diễn cả catalog).

---

## 12. Changelog — tính năng AI đã làm (tổng hợp)

*(Mục này ghi lại phạm vi đã triển khai liên quan AI; thứ tự gần logic hơn là thứ tự thời gian tuyệt đối.)*

- **Gemini:** một vòng gọi API JSON; fallback URL model; key qua `x-goog-api-key`; cấu hình `google.ai.*`.
- **Intent:** `site_help` | `product_search` | `chat`; schema trong prompt; **`maybeForceProductSearch`** khi câu giống hỏi catalog nhưng model không trả `product_search`.
- **Tìm SP:** `ProductSpecification` + `ProductRepository`; fallback tách từ khóa khi 0 kết quả; trích khoảng giá từ câu; sort theo model; **ranking** sau DB (`rankProductsForAi`: điểm khớp tên/mã + **`totalStock`** từ native query tồn SKU).
- **Giá trên thẻ AI:** `userId` → `User` → **`ProductMapperService.toDTOs`** (cùng engine rule/thuế với shop); DTO có **`totalStock`**, `quantityBreaksJson`, `discountLabel`, v.v.
- **Response:** **`AIResponse`** gồm `message`, `products`, **`bundles`**, **`sessionId`**; resolve bundle ACTIVE liên quan từ khóa / SP trong kết quả.
- **RAG tĩnh:** `site-context.md` + `AiSiteContextLoader`; danh mục trong prompt.
- **Ngữ cảnh phiên FE:** `storefrontContext` (markdown: user, nhóm B2B, quote thuế mẫu) trên bubble + trang assistant.
- **Lịch sử:** `LuxeAssistantHistoryService` + REST `/api/ai/sessions` / `.../messages`; FE `/assistant` mở phiên cũ + map `productIds` → `searchProducts`.
- **Gợi ý giá sỉ / QB / B2B:** `AssistantPricingHintService` + **`GET /pricing-rules/assistant-hints`**; resolve **`variantIds` → productId**; FE snapshot trong **`CartService`**; **`AIProductHelperService`** union server + request mỗi lần `product_search`; **`mergePricingHints`** chế độ wholesale chỉ SP trong phạm vi rule; mở rộng **`looksLikeWholesaleIntent`**; cập nhật quy tắc prompt (không khẳng định cả catalog).
- **REST chat/search:** parse **`pricingHintProductIds`** / **`pricingHintCategoryIds`** từ body (`AIChatController`).

---

*Tài liệu này nên cập nhật khi thêm intent, đổi schema JSON, đổi URL model, hoặc thay đổi luồng hints / map giá.*
