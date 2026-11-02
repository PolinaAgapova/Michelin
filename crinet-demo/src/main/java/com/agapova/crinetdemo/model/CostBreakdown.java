package com.agapova.crinetdemo.model;

import java.math.BigDecimal;
import java.util.List;

/** Résultat détaillé du calcul de coût d'un pneu (en €/pneu bon). */
public record CostBreakdown(String tireCode,
                            BigDecimal materials,
                            BigDecimal labor,
                            BigDecimal machine,
                            BigDecimal energy,
                            BigDecimal scrap,
                            BigDecimal overhead,
                            BigDecimal total,
                            List<MaterialCostLine> materialLines,
                            List<StepCostLine> stepLines) {

    public record MaterialCostLine(String materialCode, String label, MaterialCategory category,
                                   BigDecimal kg, BigDecimal pricePerKg, BigDecimal cost) {
    }

    public record StepCostLine(String step, BigDecimal labor, BigDecimal machine, BigDecimal energy) {
    }
}
