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
import java.util.Optional;

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
     * Ghi thông tin doanh nghiệp / MST / chi tiết form vào User (tags.b2bRegistrationDetails).
     * Không gán WHOLESALE — quyền đại lý chỉ khi admin duyệt ({@link UserService#grantWholesaleSecondaryRoleIfAbsent}).
     */
    private void mergeB2BFormJsonIntoUser(User user, String formDataJson) {
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
        } catch (Exception e) {
            log.error("Error merging B2B registration JSON to user profile: {}", e.getMessage());
        }
    }

    private void validateFormPayload(String formDataJson) {
        if (formDataJson == null || formDataJson.isBlank()) {
            throw new IllegalArgumentException("Thiếu dữ liệu form.");
        }
        try {
            JsonNode node = objectMapper.readTree(formDataJson);
            String[] keys = {"companyName", "taxCode", "address", "businessType"};
            for (String k : keys) {
                if (!node.has(k) || node.get(k).asText("").isBlank()) {
                    throw new IllegalArgumentException("Thiếu hoặc trống trường bắt buộc: " + k);
                }
            }
            String tax = node.get("taxCode").asText("").trim().replace("-", "");
            if (!tax.matches("\\d{10}|\\d{13}")) {
                throw new IllegalArgumentException("Mã số thuế phải gồm 10 hoặc 13 chữ số.");
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Dữ liệu form không hợp lệ.");
        }
    }

    @Transactional
    public B2BRegistrationForm createForm(B2BRegistrationFormRequest request) {
        validateFormPayload(request.getFormData());

        User user = userService.getUserById(request.getUserId());

        Optional<B2BRegistrationForm> existingOpt = b2bRegistrationFormRepository.findByUser_Id(user.getId());
        if (existingOpt.isPresent()) {
            String st = user.getRegistrationStatus();
            if (st != null && "REJECTED".equalsIgnoreCase(st)) {
                b2bRegistrationFormRepository.delete(existingOpt.get());
            } else {
                throw new IllegalStateException(
                        "Bạn đã gửi hồ sơ đăng ký đại lý. Không thể gửi lại cho đến khi có kết quả xử lý.");
            }
        }

        mergeB2BFormJsonIntoUser(user, request.getFormData());
        user.setRegistrationStatus("PENDING");
        userService.save(user);

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
        mergeB2BFormJsonIntoUser(user, request.getFormData());
        userService.save(user);
        return b2bRegistrationFormRepository.save(form);
    }

    @Transactional
    public void deleteForm(Integer id) {
        b2bRegistrationFormRepository.deleteById(id);
    }
}
