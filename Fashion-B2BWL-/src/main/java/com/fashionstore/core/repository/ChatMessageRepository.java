package com.fashionstore.core.repository;

import com.fashionstore.core.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Integer> {
    
    @org.springframework.data.jpa.repository.Query("SELECT m FROM ChatMessage m WHERE " +
            "(m.senderId = :u1 AND m.receiverId = :u2) OR " +
            "(m.senderId = :u2 AND m.receiverId = :u1) " +
            "ORDER BY m.createdAt ASC")
    List<ChatMessage> findConversation(@org.springframework.data.repository.query.Param("u1") Integer u1, 
                                      @org.springframework.data.repository.query.Param("u2") Integer u2);

    List<ChatMessage> findByReceiverIdAndIsReadFalse(Integer receiverId);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT m.senderId FROM ChatMessage m WHERE m.receiverId = :adminId")
    List<Integer> findUserIdsWhoMessagedAdmin(@org.springframework.data.repository.query.Param("adminId") Integer adminId);
    
    @org.springframework.data.jpa.repository.Query("SELECT m FROM ChatMessage m WHERE m.id IN (" +
            "SELECT MAX(m2.id) FROM ChatMessage m2 GROUP BY " +
            "CASE WHEN m2.senderId < m2.receiverId THEN m2.senderId ELSE m2.receiverId END, " +
            "CASE WHEN m2.senderId < m2.receiverId THEN m2.receiverId ELSE m2.senderId END" +
            ") ORDER BY m.createdAt DESC")
    List<ChatMessage> findLatestMessagesGroupByConversation();
}
