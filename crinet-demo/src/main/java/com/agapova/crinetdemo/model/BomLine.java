package com.agapova.crinetdemo.model;

import java.math.BigDecimal;

/** Ligne de nomenclature : quantité de matière (kg) consommée par pneu. */
public record BomLine(String materialCode, BigDecimal kgPerTire) {
    public BomLine {
        Validation.requireText(materialCode, "materialCode");
        Validation.requirePositive(kgPerTire, "kgPerTire");
    }
}
