package com.fashionstore.core.controller;

import com.fashionstore.core.model.ChatMessage;
import com.fashionstore.core.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.dto.response.ConversationResponseDTO;
import com.fashionstore.core.model.ChatMessage;
import com.fashionstore.core.model.User;
import com.fashionstore.core.repository.ChatMessageRepository;
import com.fashionstore.core.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "*")
public class ChatMessageController {

    @Autowired
    private ChatMessageRepository repository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/chat/{user1}/{user2}")
    public ResponseEntity<ApiResponse<List<ChatMessage>>> getChat(@PathVariable Integer user1, @PathVariable Integer user2) {
        return ResponseEntity.ok(ApiResponse.success(repository.findConversation(user1, user2)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ChatMessage>> send(@RequestBody ChatMessage message) {
        if (message.getCreatedAt() == null) {
            message.setCreatedAt(java.time.LocalDateTime.now());
        }
        if (message.getIsRead() == null) {
            message.setIsRead(false);
        }
        return ResponseEntity.ok(ApiResponse.success(repository.save(message)));
    }

    @PostMapping("/read-all/{senderId}/{receiverId}")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable Integer senderId, @PathVariable Integer receiverId) {
        List<ChatMessage> unread = repository.findByReceiverIdAndIsReadFalse(receiverId).stream()
                .filter(m -> m.getSenderId().equals(senderId))
                .collect(Collectors.toList());
        unread.forEach(m -> m.setIsRead(true));
        repository.saveAll(unread);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<ConversationResponseDTO>>> getConversations() {
        List<ChatMessage> latestMessages = repository.findLatestMessagesGroupByConversation();
        // Assuming current logged in admin ID is 1 or we just show all relative to any 'admin' receiver
        // For simplicity, let's assume we are looking for conversations involving common admin IDs or just all
        List<ConversationResponseDTO> dtos = latestMessages.stream().map(m -> {
            // Determine who the other person is (not admin)
            // If sender is not admin (e.g. ID 1), then other is sender.
            Integer otherId = m.getSenderId().equals(1) ? m.getReceiverId() : m.getSenderId();
            User other = userRepository.findById(otherId).orElse(null);
            
            return ConversationResponseDTO.builder()
                    .otherUserId(otherId)
                    .otherUserName(other != null ? other.getFullName() : "Khách hàng " + otherId)
                    .lastMessage(m.getMessage())
                    .lastMessageTime(m.getCreatedAt())
                    .hasUnread(!m.getIsRead() && m.getReceiverId().equals(1))
                    .build();
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }
}
