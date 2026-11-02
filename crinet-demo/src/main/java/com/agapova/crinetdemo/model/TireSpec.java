package com.agapova.crinetdemo.model;

import java.math.BigDecimal;
import java.util.List;

/**
 * Définition technique simplifiée d'un pneu : nomenclature + gamme de fabrication.
 *
 * @param scrapRate taux de rebut (0 ≤ scrapRate < 0,5)
 */
public record TireSpec(String code,
                       String label,
                       String dimension,
                       List<BomLine> bom,
                       List<ProcessStep> steps,
                       BigDecimal scrapRate) {
    public TireSpec {
        Validation.requireText(code, "code");
        if (bom == null || bom.isEmpty()) {
            throw new IllegalArgumentException("bom must not be empty");
        }
        if (steps == null || steps.isEmpty()) {
            throw new IllegalArgumentException("steps must not be empty");
        }
        Validation.requireNonNegative(scrapRate, "scrapRate");
        if (scrapRate.compareTo(new BigDecimal("0.5")) >= 0) {
            throw new IllegalArgumentException("scrapRate must be < 0.5");
        }
        bom = List.copyOf(bom);
        steps = List.copyOf(steps);
    }
}
