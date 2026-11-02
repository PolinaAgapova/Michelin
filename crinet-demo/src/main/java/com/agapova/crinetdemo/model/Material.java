package com.agapova.crinetdemo.model;

import java.math.BigDecimal;

/** Matière première avec son prix d'achat (€/kg). */
public record Material(String code, String label, MaterialCategory category, BigDecimal pricePerKg) {
    public Material {
        Validation.requireText(code, "code");
        Validation.requirePositive(pricePerKg, "pricePerKg");
    }
}
