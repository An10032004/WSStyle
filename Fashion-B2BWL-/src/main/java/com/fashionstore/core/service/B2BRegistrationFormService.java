package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.B2BRegistrationFormRequest;
import com.fashionstore.core.model.B2BRegistrationForm;
import com.fashionstore.core.model.User;
import com.fashionstore.core.repository.B2BRegistrationFormRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class B2BRegistrationFormService {

    private final B2BRegistrationFormRepository b2bRegistrationFormRepository;
    private final UserService userService;
    /** Không inject bean — project có thể không đăng ký ObjectMapper (Jackson 3 / cấu hình tối giản). */
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<B2BRegistrationForm> getAllForms() {
        return b2bRegistrationFormRepository.findAll();
    }

    public B2BRegistrationForm getFormById(Integer id) {
        return b2bRegistrationFormRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("B2B Registration Form not found with id: " + id));
    }

    /**
     * Đồng bộ hồ sơ đại lý lên User: vai trò WHOLESALE, tên công ty, MST; không gán nhóm khách (admin tự cập nhật).
     * Địa chỉ / loại hình / mô tả lưu trong tags.b2bRegistrationDetails để admin xem.
     * Bản ghi formData giữ nguyên trong bảng hồ sơ.
     */
    private void syncUserProfileFromB2BJson(User user, String formDataJson) {
        if (formDataJson == null || formDataJson.isBlank()) {
            return;
        }
        try {
            JsonNode node = objectMapper.readTree(formDataJson);

            if (node.has("companyName")) {
                String v = node.get("companyName").asText("");
                if (!v.isBlank()) {
                    user.setCompanyName(v);
                }
            }
            if (node.has("taxCode")) {
                String v = node.get("taxCode").asText("");
                if (!v.isBlank()) {
                    user.setTaxCode(v);
                }
            }

            user.setRole("WHOLESALE");
            // customerGroup: không đụng — để null hoặc giữ nguyên giá trị admin đã gán trước đó
            // Nếu user chưa có nhóm, vẫn null cho tới khi admin gán (rule GROUP mới áp dụng)

            ObjectNode root;
            if (user.getTags() != null && !user.getTags().isBlank()) {
                JsonNode existing = objectMapper.readTree(user.getTags());
                root = existing.isObject() ? (ObjectNode) existing : objectMapper.createObjectNode();
            } else {
                root = objectMapper.createObjectNode();
            }

            ObjectNode extra = objectMapper.createObjectNode();
            if (node.has("address")) {
                extra.set("address", node.get("address"));
            }
            if (node.has("businessType")) {
                extra.set("businessType", node.get("businessType"));
            }
            if (node.has("description")) {
                extra.set("description", node.get("description"));
            }
            if (extra.size() > 0) {
                root.set("b2bRegistrationDetails", extra);
            }

            user.setTags(objectMapper.writeValueAsString(root));
            userService.save(user);
        } catch (Exception e) {
            log.error("Error syncing B2B registration JSON to user profile: {}", e.getMessage());
        }
    }

    @Transactional
    public B2BRegistrationForm createForm(B2BRegistrationFormRequest request) {
        User user = userService.getUserById(request.getUserId());
        syncUserProfileFromB2BJson(user, request.getFormData());

        B2BRegistrationForm form = B2BRegistrationForm.builder()
                .user(user)
                .formData(request.getFormData())
                .build();
        return b2bRegistrationFormRepository.save(form);
    }

    @Transactional
    public B2BRegistrationForm updateForm(Integer id, B2BRegistrationFormRequest request) {
        B2BRegistrationForm form = getFormById(id);
        form.setFormData(request.getFormData());
        User user = userService.getUserById(form.getUser().getId());
        syncUserProfileFromB2BJson(user, request.getFormData());
        return b2bRegistrationFormRepository.save(form);
    }

    @Transactional
    public void deleteForm(Integer id) {
        b2bRegistrationFormRepository.deleteById(id);
    }
}
