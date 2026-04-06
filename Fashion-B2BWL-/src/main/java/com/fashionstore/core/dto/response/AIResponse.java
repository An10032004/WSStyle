package com.fashionstore.core.dto.response;

import java.util.List;

import com.fashionstore.core.model.Product;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AIResponse {
    private String message;
    private List<Product> products;
}
