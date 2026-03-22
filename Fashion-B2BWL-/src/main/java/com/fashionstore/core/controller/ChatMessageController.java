package com.fashionstore.core.controller;

import com.fashionstore.core.model.ChatMessage;
import com.fashionstore.core.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "*")
public class ChatMessageController {

    @Autowired
    private ChatMessageRepository repository;

    @GetMapping("/chat/{user1}/{user2}")
    public List<ChatMessage> getChat(@PathVariable Integer user1, @PathVariable Integer user2) {
        return repository.findBySenderIdOrReceiverIdOrderByCreatedAtAsc(user1, user2);
    }

    @PostMapping
    public ChatMessage send(@RequestBody ChatMessage message) {
        return repository.save(message);
    }

    @GetMapping("/unread/{receiverId}")
    public List<ChatMessage> getUnread(@PathVariable Integer receiverId) {
        // Simple list, filtering in memory for demo
        return repository.findAll().stream()
                .filter(m -> m.getReceiverId().equals(receiverId) && !m.getIsRead())
                .toList();
    }
}
