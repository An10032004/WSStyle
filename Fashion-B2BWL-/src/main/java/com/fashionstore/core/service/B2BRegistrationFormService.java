package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.B2BRegistrationFormRequest;
import com.fashionstore.core.model.B2BRegistrationForm;
import com.fashionstore.core.model.User;
import com.fashionstore.core.repository.B2BRegistrationFormRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class B2BRegistrationFormService {

    private final B2BRegistrationFormRepository b2bRegistrationFormRepository;
    private final UserService userService;

    public List<B2BRegistrationForm> getAllForms() {
        return b2bRegistrationFormRepository.findAll();
    }

    public B2BRegistrationForm getFormById(Integer id) {
        return b2bRegistrationFormRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("B2B Registration Form not found with id: " + id));
    }

    @Transactional
    public B2BRegistrationForm createForm(B2BRegistrationFormRequest request) {
        User user = userService.getUserById(request.getUserId());
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
        return b2bRegistrationFormRepository.save(form);
    }

    @Transactional
    public void deleteForm(Integer id) {
        b2bRegistrationFormRepository.deleteById(id);
    }
}
